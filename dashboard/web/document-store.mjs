import {cloudAccount,cloudRequest,cloudRead,cloudWrite,encodeCloud,decodeCloud,cloudNotice} from './cloud-client.mjs';
import {currentBriefLabels} from './lantern-brief.mjs';
let database;
function openDatabase(){if(!database)database=new Promise((resolve,reject)=>{const request=indexedDB.open('centring-lantern-documents-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('files',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('Document storage is unavailable in this browser.'));});return database;}
async function transact(mode,operation){const db=await openDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction('files',mode),request=operation(tx.objectStore('files'));let result;request.onsuccess=()=>{result=request.result};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(new Error('Could not save this document. Browser storage may be full.'));tx.onabort=()=>reject(new Error('Document changes were not saved.'));});}
export const localDocuments=()=>transact('readonly',store=>store.getAll());
const cacheDocument=doc=>transact('readwrite',store=>store.put(doc));
export const getDocument=id=>transact('readonly',store=>store.get(id));
export async function allDocuments(){
 const local=await localDocuments(),owner=cloudAccount();if(!owner)return Promise.all(local.filter(d=>!d._cloudOwner).map(currentBriefLabels));
 const rows=(await (await cloudRequest('records/document')).json()).records,byId=new Map(local.filter(d=>d._cloudOwner===owner).map(d=>[d.id,d]));
 for(const row of rows){const cached=byId.get(row.record_id);if(cached?._cloudPending)continue;if(row.deleted){byId.delete(row.record_id);if(cached)await transact('readwrite',s=>s.delete(row.record_id));continue;}if(cached?._cloudRevision===row.revision)continue;
  const record=await cloudRead('document',row.record_id);const doc={...await decodeCloud(record.data),_cloudOwner:owner,_cloudRevision:record.revision};await cacheDocument(doc);byId.set(doc.id,doc);
 }
 const docs=[...byId.values()];if(docs.some(d=>d._cloudPending))cloudNotice('Some documents have local changes to sync');return Promise.all(docs.map(currentBriefLabels));
}
// A second browser opening the walkthrough must never overwrite the first team's edits.
export async function createSampleIfMissing(doc){
 const owner=cloudAccount();
 if(!owner){await transact('readwrite',store=>store.add(doc)).catch(async error=>{if(!await getDocument(doc.id))throw error;});return;}
 try{await cloudWrite('document',doc.id,0,await encodeCloud(doc));}
 catch(error){if(error.status!==409)throw error;}
}

// An old browser may still hold the previously displayed client upload.
export async function removeRetiredClientBrief(){
 if(!indexedDB.databases || !(await indexedDB.databases()).some(db=>db.name==='centring-documents'))return;
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('centring-documents');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 try{
  if(!db.objectStoreNames.contains('files'))return;
  await new Promise((resolve,reject)=>{
   const tx=db.transaction('files','readwrite'),cursor=tx.objectStore('files').openCursor();
   cursor.onsuccess=()=>{const row=cursor.result;if(!row)return;
    if(/^final bell kar(?:a)?(?: \(local copy\))?\.docx$/i.test(String(row.value.name).trim()))row.delete();
    row.continue();
   };
   tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);
  });
 }finally{db.close();}
}
export async function putDocument(doc){
 const owner=cloudAccount();if(!owner){await cacheDocument(doc);cloudNotice('Saved on this device; cloud is not connected');return doc.id;}
 const cached=await getDocument(doc.id);if(cached?._cloudOwner&&cached._cloudOwner!==owner)throw new Error('This document belongs to another account.');
 const revision=cached?._cloudRevision||0;const next={...doc,_cloudOwner:owner,_cloudRevision:revision,_cloudPending:true};await cacheDocument(next);cloudNotice('Saving document…');
 try{const saved=await cloudWrite('document',doc.id,revision,await encodeCloud(next));await cacheDocument({...next,_cloudRevision:saved.revision,_cloudPending:false});cloudNotice('Saved to cloud');return doc.id;}catch(e){cloudNotice(e.status===409?'Document conflict: local changes kept':'Document saved locally; cloud sync needed');throw e;}
}
export async function deleteDocument(id){const cached=await getDocument(id);if(cloudAccount()&&cached?._cloudOwner===cloudAccount())await cloudWrite('document',id,cached._cloudRevision||0,null,true);return transact('readwrite',store=>store.delete(id));}
export async function migrateLocalDocuments(){const all=await localDocuments();let count=0;for(const doc of all.filter(d=>!d._cloudOwner)){
 const existing=await cloudRead('document',doc.id); // Preserve both copies when a teammate imported the same legacy ID.
 const copy=existing.revision?{...doc,id:crypto.randomUUID(),name:doc.name.replace(/(\.[^.]+)$/, ' (local copy)$1')}:doc;
 await putDocument(copy);count++;
 // Retain the old local original until cloud save is confirmed.
 if(copy.id!==doc.id)await cacheDocument({...doc,_cloudOwner:'legacy-archived'});
 }return count;}
export async function retryLocalDocuments(){for(const d of await localDocuments())if(d._cloudOwner===cloudAccount()&&d._cloudPending)await putDocument(d);}
export async function saveConflictedDocumentsAsCopies(){let count=0;for(const d of await localDocuments())if(d._cloudOwner===cloudAccount()&&d._cloudPending){const { _cloudOwner,_cloudRevision,_cloudPending,...clean}=d;await putDocument({...clean,id:crypto.randomUUID(),name:clean.name.replace(/(\.[^.]+)$/, ' (recovered copy)$1')});await cacheDocument({...d,_cloudPending:false,_cloudRevision:-1});count++;}return count;}

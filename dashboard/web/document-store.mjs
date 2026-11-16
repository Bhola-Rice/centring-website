let database;
function openDatabase(){if(!database)database=new Promise((resolve,reject)=>{const request=indexedDB.open('centring-documents',1);request.onupgradeneeded=()=>request.result.createObjectStore('files',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('Document storage is unavailable in this browser.'));});return database;}
async function transact(mode,operation){const db=await openDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction('files',mode),request=operation(tx.objectStore('files'));let result;request.onsuccess=()=>{result=request.result};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(new Error('Could not save this document. Browser storage may be full.'));tx.onabort=()=>reject(new Error('Document changes were not saved.'));});}
export const allDocuments=()=>transact('readonly',store=>store.getAll());
export const putDocument=doc=>transact('readwrite',store=>store.put(doc));
export const getDocument=id=>transact('readonly',store=>store.get(id));

export const deleteDocument=id=>transact('readwrite',store=>store.delete(id));

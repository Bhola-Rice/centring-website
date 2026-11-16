let cloudOwner=null;
const blobs=new WeakMap(),downloads=new Map();
export const cloudAccount=()=>cloudOwner;
export async function cloudRequest(path,options={}){const r=await fetch('/api/storage/'+path,{cache:'no-store',...options});if(!r.ok){const data=await r.json().catch(()=>({}));throw Object.assign(new Error(data.error||'Cloud connection unavailable. Your local copy is kept.'),{status:r.status});}return r;}
export async function connectCloud(){const data=await (await cloudRequest('status')).json();cloudOwner=data.owner;return data;}
export async function encodeCloud(value){
 if(value instanceof Blob){if(blobs.has(value))return blobs.get(value);const bytes=await value.arrayBuffer(),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');const r=await (await cloudRequest('files/'+hash,{method:'PUT',body:value})).json();const ref={__cloudBlob:r.key,type:value.type};blobs.set(value,ref);return ref;}
 if(Array.isArray(value))return Promise.all(value.map(encodeCloud));
 if(value&&typeof value==='object'){const result={};for(const [k,v] of Object.entries(value))if(!k.startsWith('_cloud'))result[k]=await encodeCloud(v);return result;}return value;
}
export async function decodeCloud(value){
 if(value&&typeof value==='object'&&value.__cloudBlob){const key=value.__cloudBlob;if(!key.startsWith(cloudOwner+'/files/'))throw new Error('Invalid file account.');if(!downloads.has(key))downloads.set(key,cloudRequest('files/'+key.split('/').pop()).then(r=>r.blob()).then(b=>{const blob=new Blob([b],{type:value.type});blobs.set(blob,value);return blob;}).catch(e=>{downloads.delete(key);throw e;}));return downloads.get(key);}
 if(Array.isArray(value))return Promise.all(value.map(decodeCloud));if(value&&typeof value==='object'){const out={};for(const [k,v] of Object.entries(value))out[k]=await decodeCloud(v);return out;}return value;
}
export async function cloudRead(kind,id){return (await cloudRequest('records/'+kind+'/'+id)).json();}
export async function cloudWrite(kind,id,revision,data,deleted=false){return (await cloudRequest('records/'+kind+'/'+id,{method:deleted?'DELETE':'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision,data})})).json();}
export function cloudNotice(message){window.dispatchEvent(new CustomEvent('cloud-status',{detail:message}));}
// Three-way merge only disjoint changes. Conflicting edits never silently win.
export function mergeCloud(base,local,remote,path=''){
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 if(same(local,base))return {value:remote,conflicts:[]};if(same(remote,base)||same(local,remote))return {value:local,conflicts:[]};
 if([base,local,remote].every(v=>v&&typeof v==='object'&&!Array.isArray(v))){const value={},conflicts=[];for(const k of new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])){const m=mergeCloud(base[k],local[k],remote[k],path?path+'.'+k:k);if(m.value!==undefined)value[k]=m.value;conflicts.push(...m.conflicts);}return {value,conflicts};}
 // Lists of records can merge additions and edits to different IDs.
 if([base,local,remote].every(v=>Array.isArray(v)&&v.every(x=>x&&typeof x.id==='string'))){const map=a=>Object.fromEntries(a.map(x=>[x.id,x]));const m=mergeCloud(map(base),map(local),map(remote),path);return {value:Object.values(m.value),conflicts:m.conflicts};}
 return {value:local,conflicts:[path||'workspace']};
}

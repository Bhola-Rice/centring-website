import {beedyIdentity} from './auth.mjs';
import {knowledgeOwner} from './knowledge.mjs';
const storageReply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const storageError=(message,status)=>Object.assign(new Error(message),{status});
export async function storageOwner(identity){const raw=new TextEncoder().encode(knowledgeOwner(identity));return [...new Uint8Array(await crypto.subtle.digest('SHA-256',raw))].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function storageBody(request,limit){const reader=request.body?.getReader();if(!reader)throw storageError('Missing content.',400);const chunks=[];let size=0;while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw storageError('This file is too large to save.',413);}chunks.push(value);}const result=new Uint8Array(size);let offset=0;for(const c of chunks){result.set(c,offset);offset+=c.length;}return result;}
function storageRefs(value,owner){if(!value||typeof value!=='object')return;if(Object.hasOwn(value,'__cloudBlob')){if(!new RegExp('^'+owner+'/files/[a-f0-9]{64}$').test(value.__cloudBlob))throw storageError('Invalid file reference.',400);return;}for(const v of Object.values(value))storageRefs(v,owner);}
export async function handleStorage(request,env){
 const identity=await beedyIdentity(request,env);if(!identity)return storageReply({error:'Sign in to access your workspace.'},401);
 if(!env.DB||!env.BUCKET)return storageReply({error:'Cloud storage is temporarily unavailable. Your local copy is kept.'},503);
 const url=new URL(request.url),parts=url.pathname.split('/').filter(Boolean).slice(2),owner=await storageOwner(identity);
 try{
  if(!['GET','HEAD'].includes(request.method)&&request.headers.get('origin')!==url.origin)return storageReply({error:'Use your workspace to save changes.'},403);
  if(parts[0]==='status'&&request.method==='GET')return storageReply({owner,available:true});
  if(parts[0]==='files'&&/^[a-f0-9]{64}$/.test(parts[1]||'')&&parts.length===2){
   const key=owner+'/files/'+parts[1];
   if(request.method==='PUT'){
    const bytes=await storageBody(request,10*1024*1024);const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');if(hash!==parts[1])throw storageError('File integrity check failed.',400);
    if(!await env.BUCKET.head(key))await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:'application/octet-stream'}});
    return storageReply({key});
   }
   if(request.method==='GET'){const object=await env.BUCKET.get(key);if(!object)return storageReply({error:'File not found.'},404);return new Response(object.body,{headers:{'Content-Type':'application/octet-stream','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'attachment'}});}
   return storageReply({error:'Method not allowed'},405);
  }
  if(parts[0]!=='records'||!['document','workspace'].includes(parts[1]))return storageReply({error:'Not found'},404);
  const kind=parts[1],id=parts[2];
  if(!id&&request.method==='GET'){
   const rows=await env.DB.prepare('SELECT record_id, revision, name, deleted, updated_at FROM cloud_records WHERE owner = ? AND kind = ? LIMIT 501').bind(owner,kind).all();return storageReply({records:rows.results||[]});
  }
  if(!/^[a-zA-Z0-9-]{1,100}$/.test(id||'')||parts.length!==3)return storageReply({error:'Invalid record'},400);
  const key=owner+':'+kind+':'+id;
  const row=await env.DB.prepare('SELECT * FROM cloud_records WHERE key = ?').bind(key).first();
  if(request.method==='GET'){
   if(!row)return storageReply({revision:0,data:null});
   if(row.deleted)return storageReply({revision:row.revision,data:null,deleted:true});
   const object=await env.BUCKET.get(row.object_key);if(!object)throw storageError('Saved content could not be opened. Try again.',503);
   return storageReply({revision:row.revision,data:JSON.parse(await object.text())});
  }
  if(!['PUT','DELETE'].includes(request.method))return storageReply({error:'Method not allowed'},405);
  const body=JSON.parse(new TextDecoder().decode(await storageBody(request,4*1024*1024)));
  if(!Number.isSafeInteger(body.revision)||body.revision<0)throw storageError('Reload this record before saving.',400);
  if((row?.revision||0)!==body.revision)throw storageError('A teammate saved a newer version. Your changes are kept locally; reload before continuing.',409);
  if(!row){const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM cloud_records WHERE owner = ?').bind(owner).first();if(count.n>=500)throw storageError('Workspace storage limit reached. Export or contact your administrator.',413);}
  const deleted=request.method==='DELETE',data=body.data;
  if(deleted&&!row)return storageReply({revision:0,deleted:true});
  if(!deleted){if(!data||typeof data!=='object'||Array.isArray(data))throw storageError('Invalid saved content.',400);if(kind==='document'&&(data.id!==id||typeof data.name!=='string'||data.name.length>500))throw storageError('Invalid document.',400);storageRefs(data,owner);}
  const revision=body.revision+1,objectKey=owner+'/versions/'+kind+'/'+id+'/'+revision+'-'+crypto.randomUUID()+'.json',updated=new Date().toISOString();
  // Immutable version objects keep earlier content available for recovery.
  await env.BUCKET.put(objectKey,JSON.stringify(deleted?{deleted:true,previous:row?.object_key}:data),{httpMetadata:{contentType:'application/json'}});
  const result=row?await env.DB.prepare('UPDATE cloud_records SET revision = ?, object_key = ?, name = ?, deleted = ?, updated_at = ? WHERE key = ? AND revision = ?').bind(revision,objectKey,deleted?row.name:String(data.name||kind).slice(0,500),Number(deleted),updated,key,body.revision).run():await env.DB.prepare('INSERT OR IGNORE INTO cloud_records (key,owner,kind,record_id,revision,object_key,name,deleted,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(key,owner,kind,id,revision,objectKey,String(data.name||kind).slice(0,500),0,updated).run();
  if(!result.meta?.changes)throw storageError('A teammate saved a newer version. Your local changes are kept.',409);
  return storageReply({revision,updatedAt:updated});
 }catch(e){return storageReply({error:e.status?e.message:'Could not save or open cloud content. Your local copy is kept.'},e.status||500);}
}

import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
import {localDatabase} from '../scripts/local-db.mjs';import {localBucket} from '../scripts/local-bucket.mjs';import {handleStorage} from '../worker/storage.mjs';import {mergeCloud} from '../web/cloud-client.mjs';import {importMissing} from '../web/shared-workspace.mjs';
async function setup(){const dir=await mkdtemp(path.join(tmpdir(),'centring-cloud-'));return {DB:localDatabase(path.join(dir,'db.sqlite')),BUCKET:localBucket(path.join(dir,'files')),async close(){this.DB.close();await rm(dir,{recursive:true,force:true});}};}
const req=(route,method='GET',data,identity='team-one',origin='https://example.test')=>new Request('https://example.test/api/storage/'+route,{method,headers:{...(identity?{'oai-authenticated-user-id':identity}:{}),origin,'Content-Type':'application/json'},...(data!==undefined?{body:typeof data==='string'?data:JSON.stringify(data)}:{})});
test('cloud requires authentication and same-origin writes; accounts never see other records',async()=>{const env=await setup();try{
 assert.equal((await handleStorage(req('records/workspace/main','GET',undefined,null),env)).status,401);
 assert.equal((await handleStorage(req('records/workspace/main','PUT',{revision:0,data:{tasks:[]}},'team-one','https://evil.test'),env)).status,403);
 assert.equal((await handleStorage(req('records/workspace/main','PUT',{revision:0,data:{tasks:[{id:'one'}]}}),env)).status,200);
 assert.equal((await (await handleStorage(req('records/workspace/main','GET',undefined,'team-two'),env)).json()).data,null);
 assert.equal((await (await handleStorage(req('records/workspace/main'),env)).json()).data.tasks[0].id,'one');
 }finally{await env.close();}});
test('stale writes conflict, earlier objects survive, and deletion is a versioned tombstone',async()=>{const env=await setup();try{
 const data={id:'doc1',name:'Grant.docx',text:'original'};
 let r=await handleStorage(req('records/document/doc1','PUT',{revision:0,data}),env);assert.equal(r.status,200);
 const before=await env.DB.prepare('SELECT * FROM cloud_records WHERE record_id = ?').bind('doc1').first();
 r=await handleStorage(req('records/document/doc1','PUT',{revision:1,data:{...data,text:'accepted edits'}}),env);assert.equal(r.status,200);
 assert.equal((await handleStorage(req('records/document/doc1','PUT',{revision:1,data:{...data,text:'stale'}}),env)).status,409);
 assert.equal(JSON.parse(await (await env.BUCKET.get(before.object_key)).text()).text,'original');
 assert.equal((await handleStorage(req('records/document/doc1','DELETE',{revision:2}),env)).status,200);
 assert.deepEqual(await (await handleStorage(req('records/document/doc1'),env)).json(),{revision:3,data:null,deleted:true});
 }finally{await env.close();}});
test('uploaded original bytes survive intact and cannot be downloaded from a different account',async()=>{const env=await setup();try{
 const bytes=new TextEncoder().encode('original file bytes'),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
 assert.equal((await handleStorage(req('files/'+hash,'PUT','original file bytes'),env)).status,200);
 assert.equal(await (await handleStorage(req('files/'+hash),env)).text(),'original file bytes');
 assert.equal((await handleStorage(req('files/'+hash,'GET',undefined,'other'),env)).status,404);
 assert.equal((await handleStorage(req('files/'+hash,'PUT','tampered'),env)).status,400);
 const foreign={id:'doc1',name:'x.txt',original:{__cloudBlob:'wrong/files/'+hash}};
 assert.equal((await handleStorage(req('records/document/doc1','PUT',{revision:0,data:foreign}),env)).status,400);
 }finally{await env.close();}});
test('disjoint teammate edits merge while same-field edits remain explicit conflicts',()=>{
 const base={tasks:[{id:'a',title:'A'},{id:'b',title:'B'}]};
 const local={tasks:[{id:'a',title:'Edited A'},{id:'b',title:'B'}]},remote={tasks:[{id:'a',title:'A'},{id:'b',title:'Edited B'}]};
 const merged=mergeCloud(base,local,remote);assert.deepEqual(merged.conflicts,[]);assert.deepEqual(merged.value.tasks.map(t=>t.title),['Edited A','Edited B']);
 assert.deepEqual(mergeCloud({x:1},{x:2},{x:3}).conflicts,['x']);
 assert.deepEqual(importMissing({tasks:[{id:'a',title:'Team'}]},{tasks:[{id:'a',title:'Old local'},{id:'b'}]}).tasks,[{id:'a',title:'Team'},{id:'b'}]);
});

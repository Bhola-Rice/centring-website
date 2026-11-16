import test from 'node:test';
import assert from 'node:assert/strict';
import {createSharedWorkspace} from '../web/shared-workspace.mjs';
test('two clients merge independent workspace edits and retain conflicts',async()=>{
 const originalFetch=globalThis.fetch;let record={revision:1,data:{org:'Team',tasks:[{id:'a',title:'First'},{id:'b',title:'Second'}]}};
 const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
 globalThis.window={dispatchEvent(){}};globalThis.CustomEvent=class{constructor(type,options){Object.assign(this,{type,...options})}};
 globalThis.fetch=async(url,options={})=>{
  if(url.endsWith('/status'))return Response.json({owner:'test'});
  if(options.method==='PUT'){const body=JSON.parse(options.body);if(body.revision!==record.revision)return Response.json({error:'Conflict'},{status:409});record={revision:record.revision+1,data:body.data};return Response.json({revision:record.revision});}
  return Response.json(structuredClone(record));
 };
 try{
 let a={},b={};const ca=createSharedWorkspace({getState:()=>a,apply:d=>a=structuredClone(d),status(){}}),cb=createSharedWorkspace({getState:()=>b,apply:d=>b=structuredClone(d),status(){}});
 await ca.start();await cb.start();a.tasks[0].title='A changed';await ca.flush();b.tasks[1].title='B changed';await cb.flush();assert.equal(record.data.tasks[0].title,'A changed');assert.equal(record.data.tasks[1].title,'B changed');
 await ca.refresh();a.org='Local team';b.org='Other team';await cb.flush();await ca.flush();assert.equal(record.data.org,'Other team');assert.deepEqual(ca.conflicts,['org']);assert.equal(a.org,'Local team');assert.ok(ca.pending);
 // Reload restores unsent local work instead of overwriting it with the team version.
 let restored={};const cc=createSharedWorkspace({getState:()=>restored,apply:d=>restored=d,status(){}});await cc.start();assert.equal(restored.org,'Local team');assert.deepEqual(cc.conflicts,['org']);
 await cc.flush();assert.equal(record.data.org,'Other team');assert.deepEqual(cc.conflicts,['org']);
 restored.tasks[0].title='Changed after reload';await cc.flush();assert.equal(record.data.org,'Other team');assert.ok(cc.pending);
 // A new edit arriving during a save must not silently replace a teammate's change.
 await cc.useCloud();let inFlightState={};const cd=createSharedWorkspace({getState:()=>inFlightState,apply:d=>inFlightState=structuredClone(d),status(){}});await cd.start();
 const regularFetch=globalThis.fetch;let releaseWrite,startedWrite;
 const started=new Promise(resolve=>startedWrite=resolve),release=new Promise(resolve=>releaseWrite=resolve);
 globalThis.fetch=async(url,options={})=>{if(options.method==='PUT'){startedWrite();await release;}return regularFetch(url,options);};
 record={revision:record.revision+1,data:{...record.data,org:'Remote rename'}};
 inFlightState.tasks[1].title='My independent task change';const save=cd.flush();await started;
 inFlightState.org='Typed during save';releaseWrite();await save;
 assert.equal(record.data.org,'Remote rename');assert.equal(inFlightState.org,'Typed during save');assert.deepEqual(cd.conflicts,['org']);assert.ok(cd.pending);
 await cd.flush();assert.equal(record.data.org,'Remote rename');assert.ok(cd.pending);
 }finally{globalThis.fetch=originalFetch;}
});

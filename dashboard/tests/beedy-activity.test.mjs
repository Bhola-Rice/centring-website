import test from 'node:test';
import assert from 'node:assert/strict';
import {readBeedyResponse} from '../web/beedy-activity.mjs';

function activityStream(parts){
 const encoder=new TextEncoder();
 return new Response(new ReadableStream({start(controller){
  parts.forEach(part=>controller.enqueue(encoder.encode(part)));controller.close();
 }}),{headers:{'Content-Type':'application/x-ndjson'}});
}

test('activity events arrive in order across chunk boundaries with a separate final result',async()=>{
 const steps=[];
 const response=activityStream(['{"type":"st','ep","label":"Read grant","detail":"Grant 42","state":"active"}\n{"type":"result","result":{"answer":"Ready"}}\n']);
 assert.deepEqual(await readBeedyResponse(response,(...step)=>steps.push(step)),{answer:'Ready'});
 assert.deepEqual(steps,[['Read grant','Grant 42','active']]);
});
test('an interrupted run or a streamed failure never reports success',async()=>{
 await assert.rejects(readBeedyResponse(activityStream([]),()=>{}),/connection ended/);
 await assert.rejects(readBeedyResponse(activityStream(['{"type":"error","message":"Source unavailable"}\n']),()=>{}),/Source unavailable/);
 assert.deepEqual(await readBeedyResponse(Response.json({error:'Sign in'}),()=>{}),{error:'Sign in'});
});

test('chat streams the actual workspace tool call before the model finishes its answer',async t=>{
 const {handleAgent}=await import('../worker/agent.mjs');
 let calls=0,release;
 const hold=new Promise(resolve=>{release=resolve;});
 t.mock.method(globalThis,'fetch',async()=>{
  if(++calls===1)return Response.json({output:[{type:'function_call',call_id:'inspect',name:'inspect_workspace',arguments:'{"section":"tasks"}'}]});
  await hold;
  return Response.json({output:[{type:'message',content:[{type:'output_text',text:'Done.'}]}]});
 });
 const workspace={tasks:[],applications:{},readiness:{},opportunities:[],calendar:[],team:[]};
 const req=new Request('https://dashboard.test/api/beedy/chat',{method:'POST',headers:{origin:'https://dashboard.test','content-type':'application/json',accept:'application/x-ndjson','oai-authenticated-user-id':'test-account'},body:JSON.stringify({message:'Review tasks',context:'Tasks',workspace})});
 const response=await handleAgent(req,{OPENAI_API_KEY:'test'});
 const seen=[];
 const result=await readBeedyResponse(response,(label,detail)=>{
  seen.push([label,detail]);
  if(label==='Read workspace records')release();
 });
 assert.ok(seen.some(([label,detail])=>label==='Read workspace records'&&detail==='tasks'));
 assert.equal(result.answer,'Done.');
});

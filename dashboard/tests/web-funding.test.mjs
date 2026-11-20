import test from 'node:test';
import assert from 'node:assert/strict';
import {searchFundingWeb} from '../worker/web-funding.mjs';

const request=()=>new Request('https://app.test/api/funding/project',{method:'POST'});
const asEvent=e=>'data: '+JSON.stringify(e)+'\n\n';
const part={type:'output_text',text:'A funder supports the proposed pilot.',annotations:[
 {type:'url_citation',start_index:2,end_index:9,title:'Funder notice',url:'https://funder.test/pilot'},
 {type:'url_citation',start_index:12,end_index:18,title:'Invalid URL',url:'javascript:alert(1)'}
]};
const response={status:'completed',output:[{type:'web_search_call',status:'completed'},{type:'message',content:[part]}]};
test('web search delivers text before completion and only returns clickable web citations',async()=>{
 let push;const body=new ReadableStream({start(c){push=c;}});
 const encoder=new TextEncoder();const emit=o=>push.enqueue(encoder.encode(asEvent(o)));
 const res=await searchFundingWeb(request(),{OPENAI_API_KEY:'test'},{brief:'Pilot funding'},{name:'Upbring'},async(_url,init)=>{
  const payload=JSON.parse(init.body);assert.equal(payload.stream,true);assert.equal(payload.tool_choice,'required');assert.equal(payload.tools[0].type,'web_search');
  return new Response(body);
 });
 const reader=res.body.pipeThrough(new TextDecoderStream()).getReader();emit({type:'response.output_text.delta',delta:'A funder'});
 assert.equal(JSON.parse((await reader.read()).value).detail,'A funder');
 emit({type:'response.completed',response});push.close();const result=JSON.parse((await reader.read()).value).result;
 assert.match(result.answer,/\[funder.test\]\(https:\/\/funder.test\/pilot\)/);assert.equal(result.sources.length,1);assert.equal((await reader.read()).done,true);
});
test('an interrupted provider stream never yields a completed search result',async()=>{
 const res=await searchFundingWeb(request(),{OPENAI_API_KEY:'test'},{brief:'Youth'},{name:'Upbring'},async()=>new Response(asEvent({type:'response.output_text.delta',delta:'partial'})));
 const events=(await res.text()).trim().split('\n').map(line=>JSON.parse(line));assert.deepEqual(events.map(e=>e.type),['step','error']);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {documentContext,selectContextDocument,connectionState,signInPath,discussionContextSnapshot} from '../web/beedy-context.mjs';
import {handleAgent,validatePayload,executeTool,runAgent} from '../worker/agent.mjs';
const workspace=()=>({tasks:[],applications:{},readiness:{},opportunities:[],calendar:[],team:[]});
test('a configured key never implies a guest has signed in',async()=>{
 const guest=await handleAgent(new Request('https://demo.test/api/beedy/status'),{OPENAI_API_KEY:'test'});
 const status=await guest.json();assert.deepEqual(status,{configured:true,authenticated:false,signInMethod:'chatgpt'});assert.equal(connectionState(status),'signin');
 const signed=await handleAgent(new Request('https://demo.test/api/beedy/status',{headers:{'oai-authenticated-user-id':'member'}}),{OPENAI_API_KEY:'test'});
 assert.equal(connectionState(await signed.json()),'ready');
 const expired=await handleAgent(new Request('https://demo.test/api/beedy/chat',{method:'POST',headers:{origin:'https://demo.test'},body:'{}'}),{OPENAI_API_KEY:'test'});
 assert.equal(expired.status,401);assert.equal((await expired.json()).code,'sign_in_required');
});
test('sign-in returns to the open document using a relative platform URL',()=>{const p=new URL(signInPath('studio/doc-123'),'https://demo.test');assert.equal(p.pathname,'/signin');assert.equal(p.searchParams.get('return_to'),'/#studio/doc-123');assert.equal(new URL(p.searchParams.get('return_to'),'https://demo.test').origin,'https://demo.test');});
test('active document wins, selected file follows across pages, and detaching is respected',()=>{
 const docs=[{id:'a',name:'a.pdf'},{id:'b',name:'b.docx'}];
 assert.equal(selectContextDocument('studio/b',docs,'a',null).id,'b');
 for(const page of ['tasks','applications','calendar','timeline','readiness','discussions','reports','opportunities','plugins','settings'])assert.equal(selectContextDocument(page,docs,'b',null).id,'b');
 assert.equal(selectContextDocument('studio/b',docs,null,'b'),null);
 assert.equal(selectContextDocument('studio/missing',docs,'a',null),null);
});
test('facts after the old 20k cutoff and draft context reach the actual tool loop',async()=>{
 const doc=documentContext({id:'long',name:'Long grant.docx',text:'Background. '.repeat(2000)+'\n\nTeaching artists: 7.',draft:{text:'Working draft sentence.'}});
 assert.equal(doc.truncated,false);assert.ok(doc.text.indexOf('Teaching artists')>20000);
 const payload={message:'How many teaching artists?',workspace:{...workspace(),documents:[doc],currentPage:{route:'studio/long'}}};let count=0,read;
 const result=await runAgent(payload,{OPENAI_API_KEY:'test'},async(url,opts)=>{const body=JSON.parse(opts.body);if(count++===0){assert.equal(JSON.parse(body.input.at(-1).content).selected_document.name,'Long grant.docx');}if(count===1)return Response.json({status:'completed',output:[{type:'function_call',name:'inspect_workspace',call_id:'doc',arguments:'{"section":"documents"}'}]});read=JSON.parse(body.input.find(i=>i.call_id==='doc'&&i.type==='function_call_output').output);return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'7 teaching artists (Long grant.docx).'}]}]});});
 assert.ok(read[0].paragraphs.some(p=>p.text.includes('Teaching artists: 7.')));assert.equal(read[0].draft,'Working draft sentence.');assert.match(result.answer,/7 teaching artists/);
});
test('full source remains bounded and OCR warnings stay visible',()=>{
 const d=documentContext({id:'scan',name:'scan.pdf',sourcePages:[{number:1,text:'x'.repeat(119900),method:'text'},{number:2,text:'Seven artists',method:'ocr',warning:'Verify the count.'}]});
 assert.match(d.text,/Verify the count/);assert.equal(d.truncated,false);
 const big=documentContext({id:'big',name:'big.txt',text:'x'.repeat(120010)});assert.equal(big.text.length,120000);assert.equal(big.truncated,true);
 const w=validatePayload({message:'read',workspace:{...workspace(),documents:[d]}}).workspace;assert.equal(executeTool('inspect_workspace',{section:'documents'},w,[])[0].name,'scan.pdf');
});
test('current page and discussions are available without claiming real message delivery',()=>{
 const discussions=discussionContextSnapshot([{id:'one',title:'Budget',messages:[{author:'alex',body:'Please check artist fees.',at:'2026-11-10'}]}],'one');
 const w={...workspace(),currentPage:{route:'discussions/one'},discussions};assert.equal(executeTool('inspect_workspace',{section:'currentPage'},w,[]).route,'discussions/one');assert.match(executeTool('inspect_workspace',{section:'discussions'},w,[]).items[0].messages[0].body,/artist fees/);assert.match(discussions.delivery,/not delivered/);
});

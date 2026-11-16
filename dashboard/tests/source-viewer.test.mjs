import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.location={href:'http://localhost/'};
const {mountSourceViewer,stopSourceViewer,shouldMountSourceViewer}=await import('../web/source-viewer.mjs');

test('initial application draft opens even after text view was selected for another document',()=>{
 assert.equal(shouldMountSourceViewer({applicationDraft:{}},'source','text'),true);
 assert.equal(shouldMountSourceViewer({},'source','text'),false);
 assert.equal(shouldMountSourceViewer({},'source','original'),true);
 assert.equal(shouldMountSourceViewer({},'draft','original'),false);
});

test('Word preview creates its missing status and handles render and read failures',async()=>{
 const previousDocument=globalThis.document,previousWindow=globalThis.window;
 const nodes=[],listeners=new Map();
 const element=tag=>({tag,textContent:'',setAttribute(){},classList:{add(){},remove(){}},after(node){nodes.push(node)},remove(){},contentWindow:{postMessage(message){this.sent=message}}});
 const host={querySelector:()=>null,prepend:n=>nodes.unshift(n),append:n=>nodes.push(n)};
 globalThis.document={querySelector:()=>host,createElement:element};
 globalThis.window={addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type)};
 try{
  await mountSourceViewer({id:'application',name:'application.docx',original:new Blob(['word'])});
  assert.equal(nodes[0].textContent,'Opening Word layout…');
  const frame=nodes.find(n=>n.tag==='iframe');assert.ok(frame);
  await listeners.get('message')({source:frame.contentWindow,data:{type:'docx-ready'}});
  assert.equal(frame.contentWindow.sent.type,'docx-open');
  await listeners.get('message')({source:frame.contentWindow,data:{type:'docx-rendered'}});
  assert.match(nodes[0].textContent,/Word preview/);
  stopSourceViewer();assert.equal(listeners.size,0);
  nodes.length=0;
  await mountSourceViewer({id:'bad',name:'bad.docx',original:{arrayBuffer:async()=>{throw new Error('Read failed')}}});
  const badFrame=nodes.find(n=>n.tag==='iframe');
  await listeners.get('message')({source:badFrame.contentWindow,data:{type:'docx-ready'}});
  assert.match(nodes[0].textContent,/Read failed/);
  assert.equal(nodes.find(n=>n.tag==='button').textContent,'Retry preview');
  stopSourceViewer();nodes.length=0;
  await mountSourceViewer({name:'missing.docx'});
  assert.match(nodes[0].textContent,/original file is not available/);
 }finally{stopSourceViewer();globalThis.document=previousDocument;globalThis.window=previousWindow;}
});

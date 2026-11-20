import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../web/grants-ui.mjs',import.meta.url),'utf8').replace(/^import .*\n/gm,'').replace('export function','function');
test('every saved opportunity and its deadline stay inside the results container',()=>{
 const listeners={};
 const context=vm.createContext({document:{addEventListener:(type,fn)=>listeners[type]=fn},Date,Intl});
 vm.runInContext(source,context);
 const grants=Array.from({length:12},(_,i)=>({id:String(i),name:'A long research opportunity '.repeat(12),agency:'Research agency',number:'A-123',deadline:'2027-01-01',status:'posted'}));
 const ui=context.createGrantBrowser({esc:s=>String(s??''),heading:()=>'<h1>Find grants</h1>',render(){},getSaved:()=>grants});
 listeners.click({target:{closest:()=>({dataset:{action:'federal-view',view:'saved'}})}});
 const html=ui.page(),stack=[];let rows=0,deadlines=0;
 for(const match of html.matchAll(/<(\/?)([a-z][a-z0-9]*)([^>]*)>/gi)){
  const [,closing,tag,attrs]=match;
  if(closing){assert.equal(stack.pop()?.tag,tag,`Unbalanced closing ${tag}`);continue;}
  if(attrs.includes('class="federal-row"')){rows++;assert.ok(stack.some(e=>e.attrs.includes('class="federal-results')));}
  if(attrs.includes('class="federal-deadline"')){deadlines++;assert.ok(stack.some(e=>e.attrs.includes('class="federal-row"')));}
  if(!['input','br','hr','img','meta','link'].includes(tag))stack.push({tag,attrs});
 }
 assert.equal(rows,12);assert.equal(deadlines,12);assert.equal(stack.length,0);
});

test('a slow live notice cannot replace the opportunity selected afterwards',async()=>{
 let selected,finish;
 const reader={
  show(key,label,title){selected={key,title};return true;},
  current(key){return selected?.key===key;}
 };
 const context=vm.createContext({
  document:{addEventListener(){}},
  fetch:()=>new Promise(resolve=>{finish=resolve;})
 });
 vm.runInContext(source,context);
 const ui=context.createGrantBrowser({reader,esc:String,showDialog(){assert.fail('Opening a notice inside Opportunities must use the side reader');}});
 const pending=ui.open('357524');
 assert.equal(selected.key,'357524');
 reader.show('another','Pharos','Another listing');
 finish({ok:true,json:async()=>({id:'357524',name:'Stale notice'})});
 await pending;
 assert.equal(selected.title,'Another listing');
});

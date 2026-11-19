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

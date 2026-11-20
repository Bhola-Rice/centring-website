// One reading surface for all Opportunities views. Selecting a different notice
// replaces only the reader so that list scroll, filters and typed queries survive.
export function createNoticeReader({esc,onSelect}){
 let entry=null,trigger=null;
 const root=()=>document.querySelector('.opportunity-split');
 const pane=()=>document.querySelector('#notice-content');
 function contents(){
  if(!entry)return '<div class="reader-empty"><h2>Opportunity details</h2><p>Select a listing to read its notice and check the fit for Upbring.</p></div>';
  return `<header class="notice-heading"><span>${esc(entry.label)}</span><button type="button" data-close-notice aria-label="Back to results">Back to results</button></header><h2 id="notice-title" tabindex="-1">${esc(entry.title)}</h2>${entry.body()}`;
 }
 function highlight(){
  for(const button of root()?.querySelectorAll('.opportunity-list [data-funding-id],.opportunity-list [data-id]')||[]){
   const key=button.dataset.fundingId||button.dataset.id;
   if(key===entry?.key)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');
  }
 }
 function update(){
  const target=pane();if(!target)return;
  target.innerHTML=contents();root().classList.toggle('show-notice',Boolean(entry));
  highlight();entry?.attach?.(target);
 }
 function clear(){entry=null;trigger=null;}
 function back(){
  const previous=trigger;clear();update();
  if(previous?.isConnected)previous.focus({preventScroll:true});else root()?.querySelector('.opportunity-list button')?.focus();
 }
 document.addEventListener('click',e=>{if(e.target.closest('[data-close-notice]'))back();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&entry&&pane()?.contains(document.activeElement)&&!document.querySelector('dialog[open]'))back();});
 return {
  wrap(list,projectConversation=''){
   if(projectConversation)return `<div class="opportunity-split project-split ${entry?'show-notice':''}">
    <section class="project-work" tabindex="-1" aria-label="Project search results"><div class="opportunity-list">${list}</div><div id="notice-content">${entry?contents():''}</div></section>
    <aside class="opportunity-side project-side" aria-label="Project conversation">${projectConversation}</aside></div>`;
   return `<div class="opportunity-split ${entry?'show-notice':''}"><div class="opportunity-list">${list}</div><aside class="opportunity-side" aria-label="Opportunity reader"><div id="notice-content">${contents()}</div><div id="opportunity-chat-slot"></div></aside></div>`;
  },
  show(key,label,title,body,attach){
   if(!root())return false;
   const active=document.activeElement;
   if(!entry||active?.closest('.opportunity-list'))trigger=active;
   entry={key,label,title,body,attach};onSelect();update();
   pane().scrollTop=0;document.getElementById('notice-title')?.focus({preventScroll:true});
   if(window.matchMedia('(max-width: 679px)').matches)pane().scrollIntoView({block:'start'});
   return true;
  },
  current:key=>entry?.key===key&&Boolean(root()),clear,
  mounted(){highlight();if(entry&&pane())entry.attach?.(pane());},
  context:()=>entry?{id:entry.key,title:entry.title,source:entry.label}:null
 };
}

const sentenceSegmenter=new Intl.Segmenter('en',{granularity:'sentence'});
export function noticePreview(text,limit=280){
 const full=String(text||'').trim();if(!full)return '';
 const first=Array.from(sentenceSegmenter.segment(full),s=>s.segment.trim())[0]||full;
 return first.length<=limit?first:first.slice(0,limit-1).replace(/\s+\S*$/,'')+'…';
}
export function noticeParagraphs(text,esc){
 return String(text||'').trim().split(/\n+/).filter(Boolean).flatMap(line=>{
  const paragraphs=[];let group='';
  for(const {segment} of sentenceSegmenter.segment(line)){
   if(group.length>220){paragraphs.push(group.trim());group='';}group+=segment;
  }
  if(group.trim())paragraphs.push(group.trim());
  return paragraphs;
 }).map(p=>{
  const list=p.match(/^(.*?)([^.!?]*?include the following:)\s*(.+)$/i);
  if(!list||!list[3].includes(';'))return '<p>'+esc(p)+'</p>';
  return '<p>'+esc(list[1]+list[2])+'</p><ul>'+list[3].split(/;\s*/).filter(Boolean).map(item=>'<li>'+esc(item)+'</li>').join('')+'</ul>';
 }).join('');
}

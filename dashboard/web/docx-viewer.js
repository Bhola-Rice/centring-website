// This viewer runs in an opaque-origin sandbox: no parent DOM access, forms,
// navigation, network requests, or document-supplied scripts are allowed.
window.addEventListener('message',async event=>{
 if(event.source!==parent||event.data?.type!=='docx-open'||!(event.data.buffer instanceof ArrayBuffer))return;
 try{
  const body=document.createElement('div'),styles=document.createElement('div');
  await docx.renderAsync(event.data.buffer,body,styles,{useBase64URL:true,renderAltChunks:false,renderComments:false,renderHeaders:true,renderFooters:true,renderFootnotes:true,renderEndnotes:true,ignoreWidth:false,ignoreHeight:false,breakPages:true});
  const safe=DOMPurify.sanitize(styles.innerHTML+body.innerHTML,{ADD_TAGS:['style'],FORBID_TAGS:['script','iframe','object','embed','form','input','button','video','audio','link','meta'],FORBID_ATTR:['srcset','action','formaction'],RETURN_DOM_FRAGMENT:true});
  safe.querySelectorAll('a').forEach(a=>{a.removeAttribute('href');a.removeAttribute('target');});
  safe.querySelectorAll('img').forEach(img=>{if(!/^data:image\/(png|jpeg|gif|webp|bmp);base64,/i.test(img.getAttribute('src')||''))img.removeAttribute('src');});
  document.getElementById('document').replaceChildren(safe);if(typeof event.data.citation==='string' && event.data.citation){
    const quote=event.data.citation;
    let found=false;
    for(const paragraph of document.querySelectorAll('#document p')){
     const at=paragraph.textContent.indexOf(quote);
     if(at<0)continue;
     const walker=document.createTreeWalker(paragraph,NodeFilter.SHOW_TEXT), range=document.createRange();
     let pos=0,node;
     while(node=walker.nextNode()){
      if(pos<=at && at<pos+node.length)range.setStart(node,at-pos);
      if(pos<at+quote.length && at+quote.length<=pos+node.length){range.setEnd(node,at+quote.length-pos);break;}
      pos+=node.length;
     }
     const mark=document.createElement('mark');mark.append(range.extractContents());range.insertNode(mark);
     requestAnimationFrame(()=>mark.scrollIntoView({block:'center'}));found=true;break;
    }
    parent.postMessage({type:'citation-result',found},'*');
   }if(event.data.review)annotateReview(event.data.review,event.data.mode);document.getElementById('notice').textContent='Word layout preview. Pagination and unavailable fonts can differ from Microsoft Word; the original file is unchanged.';if(event.data.review){document.getElementById('notice').textContent=event.data.mode==='clean'?'Preview of accepted wording · Pending changes are not yet saved.':'Suggestions · Select a highlight to review it.';requestAnimationFrame(()=>window.scrollTo(0,event.data.scroll||0));}parent.postMessage({type:'docx-rendered'},'*');
 }catch{document.getElementById('notice').textContent='This Word document could not be previewed. Download the original or upload a PDF export.';parent.postMessage({type:'docx-error'},'*');}
});
parent.postMessage({type:'docx-ready'},'*');
function fitWordPages(){const wrapper=document.querySelector('.docx-wrapper');if(!wrapper)return;wrapper.style.zoom='1';wrapper.style.zoom=String(Math.min(1,(window.innerWidth-12)/wrapper.scrollWidth));}
window.addEventListener('resize',fitWordPages);
new MutationObserver(fitWordPages).observe(document.getElementById('document'),{childList:true});

function annotateReview(review,mode){
 for(const edit of review.edits.filter(e=>e.status==='pending')){
  const anchor=document.getElementById('centring-review-'+edit.blockId),p=anchor?.closest('p');
  if(!p||p.textContent!==edit.before)continue;
  if(mode==='clean'){replaceMarkedText(p,edit.before,edit.after,false);continue;}
  replaceMarkedText(p,edit.before,edit.after,true);p.classList.add('has-suggestion');p.dataset.suggestion=edit.id;p.tabIndex=0;p.setAttribute('role','button');p.setAttribute('aria-label','Review suggestion: '+edit.reason);p.title=edit.reason;
  const select=()=>{document.querySelectorAll('.has-suggestion').forEach(x=>x.classList.toggle('selected',x===p));parent.postMessage({type:'review-select',id:edit.id},'*');};p.addEventListener('click',select);p.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();select();}});
 }
}
function replaceMarkedText(p,before,after,mark){
 let start=0;while(start<before.length&&start<after.length&&before[start]===after[start])start++;
 let end=before.length,ae=after.length;while(end>start&&ae>start&&before[end-1]===after[ae-1]){end--;ae--;}
 while(start>0&&/\S/.test(before[start-1])&&/\S/.test(before[start]||''))start--;
 while(end<before.length&&ae<after.length&&/\S/.test(before[end])&&/\S/.test(before[end-1]||'')){end++;ae++;}
 const walker=document.createTreeWalker(p,NodeFilter.SHOW_TEXT),nodes=[];let n;while(n=walker.nextNode())nodes.push(n);if(!nodes.length)return;
 const point=offset=>{let at=0;for(const n of nodes){if(at+n.length>=offset)return [n,offset-at];at+=n.length;}return [nodes.at(-1),nodes.at(-1).length];};
 const [sn,so]=point(start),[en,eo]=point(end),range=document.createRange();range.setStart(sn,so);range.setEnd(en,eo);const old=range.extractContents(),fragment=document.createDocumentFragment();
 if(mark&&end>start){const del=document.createElement('del');del.className='review-deletion';del.append(old);fragment.append(del);}
 if(ae>start){const ins=document.createElement(mark?'ins':'span');if(mark)ins.className='review-insertion';ins.textContent=after.slice(start,ae);fragment.append(ins);}range.insertNode(fragment);
}
window.addEventListener('message',e=>{if(e.source!==parent||e.data?.type!=='review-focus')return;const p=Array.from(document.querySelectorAll('[data-suggestion]')).find(p=>p.dataset.suggestion===e.data.id);if(p){p.scrollIntoView({block:'center'});p.focus({preventScroll:true});}});
window.addEventListener('scroll',()=>parent.postMessage({type:'review-scroll',top:window.scrollY},'*'),{passive:true});

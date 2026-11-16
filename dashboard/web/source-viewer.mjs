import {anchoredReviewBlob} from './document-working-copy.mjs';
import {openPdf,pageCanvas} from './document-reader.mjs';
let cleanup=()=>{};
const positions=new Map();
export function stopSourceViewer(){cleanup();cleanup=()=>{};}
export function shouldMountSourceViewer(doc,tab,mode){return tab==='review'||(tab==='source'&&(!!doc?.applicationDraft||mode==='original'));}
export async function mountSourceViewer(doc,options={}){
 stopSourceViewer();const host=document.querySelector('#source-preview');if(!host)return;
 let status=host.querySelector('[role="status"]');if(!status){status=document.createElement('p');status.setAttribute('role','status');host.prepend(status);}status.setAttribute('aria-live','polite');
 if(!doc?.original){status.textContent='The original file is not available in this browser. Upload the downloaded Word file in Documents to view it here.';status.classList.add('preview-error');return;}
 let disposed=false,reader,blobUrl,loadTimer,retry;cleanup=()=>{disposed=true;clearTimeout(loadTimer);retry?.remove();reader?.close();if(blobUrl)URL.revokeObjectURL(blobUrl);};
 const ext=doc.name.split('.').pop().toLowerCase();
 const fail=error=>{if(!disposed){clearTimeout(loadTimer);status.textContent='The preview could not open. Your saved file is unchanged. '+error.message;status.classList.add('preview-error');if(!retry){retry=document.createElement('button');retry.type='button';retry.className='btn preview-retry';retry.textContent='Retry preview';retry.onclick=()=>{host.replaceChildren();mountSourceViewer(doc,options);};status.after(retry);}}};
 try{
 if(ext==='pdf'){
  reader=await openPdf(doc.original);if(disposed){await reader.close();return;}
  const total=reader.pdf.numPages;let current=Math.min(positions.get(doc.id)||1,total),zoom=1,busy=false;
  const toolbar=document.createElement('div');toolbar.className='pdf-controls';toolbar.innerHTML='<button type="button" aria-label="Previous page">←</button><label>Page <select aria-label="PDF page"></select></label><span>of '+total+'</span><button type="button" aria-label="Next page">→</button><label class="pdf-zoom">Zoom <select aria-label="PDF zoom"><option value="1">Fit width</option><option value="1.25">125%</option><option value="1.5">150%</option></select></label>';
  const [prev,next]=toolbar.querySelectorAll('button');const [select,zoomSelect]=toolbar.querySelectorAll('select');for(let n=1;n<=total;n++){const o=new Option(String(n),String(n));select.add(o);}
  const surface=document.createElement('div');surface.className='pdf-page-surface';host.append(toolbar,surface);
  async function draw(){if(busy||disposed)return;busy=true;prev.disabled=next.disabled=select.disabled=zoomSelect.disabled=true;status.textContent=`Opening page ${current} of ${total}…`;
   try{const page=await reader.pdf.getPage(current);const canvas=await pageCanvas(page,2);page.cleanup();if(disposed)return;canvas.style.width=`${zoom*100}%`;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${doc.name}, original page ${current} of ${total}. Use Text for Beedy for accessible extracted text.`);surface.replaceChildren(canvas);select.value=String(current);positions.set(doc.id,current);status.textContent=`Original PDF · Page ${current} of ${total} · Layout preserved`;}
   catch(error){fail(error);}finally{busy=false;if(!disposed){prev.disabled=current<=1;next.disabled=current>=total;select.disabled=zoomSelect.disabled=false;}}
  }
  prev.onclick=()=>{current--;draw();};next.onclick=()=>{current++;draw();};select.onchange=()=>{current=Number(select.value);draw();};zoomSelect.onchange=()=>{zoom=Number(zoomSelect.value);draw();};await draw();
 }else if(ext==='docx'){
  status.textContent='Opening Word layout…';loadTimer=setTimeout(()=>fail(new Error('Try again or download the file above.')),25000);const frame=document.createElement('iframe');frame.title='Word document preview';frame.className='word-preview';frame.setAttribute('sandbox','allow-scripts');frame.referrerPolicy='no-referrer';frame.src='./docx-viewer.html';
  const receive=async e=>{if(disposed||e.source!==frame.contentWindow)return;try{if(e.data?.type==='docx-ready'){const preview=options.review&&doc.review?await anchoredReviewBlob(doc):doc.original;const buffer=await preview.arrayBuffer();if(!disposed)frame.contentWindow.postMessage({type:'docx-open',buffer,review:options.review?doc.review:null,mode:options.mode,scroll:options.review?(positions.get('review:'+doc.id)||0):0},'*',[buffer]);}if(e.data?.type==='review-select'&&options.review&&doc.review?.edits.some(x=>x.id===e.data.id))options.onSelect?.(e.data.id);if(e.data?.type==='review-scroll'&&options.review&&Number.isFinite(e.data.top))positions.set('review:'+doc.id,Math.max(0,e.data.top));if(e.data?.type==='docx-rendered'){clearTimeout(loadTimer);retry?.remove();retry=null;status.classList.remove('preview-error');status.textContent=options.review?'Working document · Suggestions shown in context':doc.workingPreview?'Edited Word copy · Original file unchanged':'Word preview · Original file unchanged';}if(e.data?.type==='docx-error')fail(new Error('Try downloading the Word file or uploading a PDF export.'));}catch(error){fail(error);}};
  window.addEventListener('message',receive);const previous=cleanup;cleanup=()=>{previous();window.removeEventListener('message',receive);};host.append(frame);
 }else if(['png','jpg','jpeg'].includes(ext)){
  blobUrl=URL.createObjectURL(doc.original);const img=document.createElement('img');img.src=blobUrl;img.alt=doc.name+' — original image';img.className='source-image';host.append(img);status.textContent='Original image · Unchanged';
 }else{const pre=document.createElement('pre');pre.className='plain-source';pre.textContent=await doc.original.text();if(!disposed){host.append(pre);status.textContent='Original text · Line breaks preserved';}}
 }catch(error){fail(error);}
}

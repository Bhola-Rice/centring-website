import {createPdfReaderLoader, pdfTextFromItems, sourceTextForContext} from './document-core.mjs';
const loadPdf=createPdfReaderLoader(location.href,url=>import(url));
const asset=path=>new URL(path,import.meta.url).href;
export async function openPdf(file,{signal}={}){
 stopped(signal);
 const pdfjs=await loadPdf();
 pdfjs.GlobalWorkerOptions.workerSrc=asset('./vendor/pdf.worker.min.mjs');
 const job=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,useWorkerFetch:false,standardFontDataUrl:asset('./vendor/standard_fonts/'),verbosity:0});
 const close=async()=>{signal?.removeEventListener('abort',abort);await job.destroy();};const abort=()=>{job.destroy();};signal?.addEventListener('abort',abort,{once:true});
 try{return {pdf:await bounded(job.promise,signal),close};}catch(error){await close();if(error.name==='AbortError')throw error;throw new Error(error.name==='PasswordException'?'This PDF is password protected. Upload an unlocked copy.':error.message);}
}
function stopped(signal){if(signal?.aborted)throw new DOMException('Reading cancelled.','AbortError');}
function bounded(promise,signal,ms=60000){return new Promise((resolve,reject)=>{const abort=()=>finish(reject,new DOMException('Reading cancelled.','AbortError'));const timer=setTimeout(()=>finish(reject,new Error('This page took too long to read.')),ms);function finish(fn,value){clearTimeout(timer);signal?.removeEventListener('abort',abort);fn(value);}signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)return abort();promise.then(v=>finish(resolve,v),e=>finish(reject,e));});}
export async function pageCanvas(page,scale=2){const initial=page.getViewport({scale:1});const viewport=page.getViewport({scale:Math.min(scale,Math.sqrt(4000000/(initial.width*initial.height)))});const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;return canvas;}
function ocrReader(signal,onProgress){let worker,pending,closed=false;return {
 async read(image){stopped(signal);if(!pending)pending=(async()=>{onProgress('Loading the on-device OCR reader…');const {default:{createWorker}}=await import('./vendor/tesseract.mjs');const w=await createWorker('eng',1,{workerPath:asset('./vendor/ocr/worker.min.js'),corePath:asset('./vendor/ocr/tesseract-core-lstm.js'),langPath:asset('./vendor/ocr/'),workerBlobURL:false,logger:m=>{if(m.status==='recognizing text')onProgress('Reading scanned text · '+Math.round(m.progress*100)+'%');}});if(closed||signal?.aborted){await w.terminate();throw new DOMException('Reading cancelled.','AbortError');}worker=w;return w;})();const w=await bounded(pending,signal);const {data}=await bounded(w.recognize(image),signal);return {text:data.text.trim(),confidence:Math.round(data.confidence)};},
 async close(){closed=true;if(worker)await worker.terminate();}
};}
export async function readPdf(file,{signal,onProgress=()=>{},forceOcr=false}={}){
 const {pdf,close}=await openPdf(file,{signal});const ocr=ocrReader(signal,onProgress),sourcePages=[];let total=0;
 try{if(pdf.numPages>80)throw new Error('Please upload a PDF of 80 pages or fewer.');for(let n=1;n<=pdf.numPages;n++){
  stopped(signal);onProgress(`Reading page ${n} of ${pdf.numPages}…`);const page=await pdf.getPage(n);let text='',method='text',confidence=null,warning='';
  try{const content=await bounded(page.getTextContent(),signal);text=pdfTextFromItems(content.items);
   if(forceOcr||text.replace(/\s/g,'').length<35){let canvas;try{onProgress(`Reading scan on page ${n} of ${pdf.numPages}…`);canvas=await pageCanvas(page);const result=await ocr.read(canvas);text=result.text;confidence=result.confidence;method='ocr';if(confidence<75)warning='Low-confidence OCR. Check this page against the original.';}finally{if(canvas){canvas.width=0;canvas.height=0;}}}
   if(!text.trim())warning='No readable text detected on this page.';
  }catch(error){stopped(signal);warning=error.message;method=text?'text':'unreadable';}
  finally{page.cleanup();}
  if(total+text.length>120000){text=text.slice(0,Math.max(0,120000-total));warning='Text limit reached. This page or later pages may be incomplete.';}
  total+=text.length;sourcePages.push({number:n,text,method,confidence,warning});
 }
 return {text:sourceTextForContext(sourcePages,120000).text,pages:pdf.numPages,sourcePages,extractionVersion:2};
 }finally{await ocr.close();await close();}
}
export async function readImage(file,{signal,onProgress=()=>{}}={}){
 const ocr=ocrReader(signal,onProgress);let bitmap,canvas;
 try{bitmap=await createImageBitmap(file);const scale=Math.min(1,Math.sqrt(4000000/(bitmap.width*bitmap.height)));canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);const result=await ocr.read(canvas);const sourcePages=[{number:1,...result,method:'ocr',warning:!result.text?'No readable text detected.':result.confidence<75?'Low-confidence OCR. Check against the original.':''}];return {text:result.text.slice(0,120000),pages:1,sourcePages,extractionVersion:2};}
 finally{bitmap?.close();if(canvas){canvas.width=0;canvas.height=0;}await ocr.close();}
}

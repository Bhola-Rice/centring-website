export const DOCUMENT_LIMIT=120000;
export function validateDocumentFile(file){
 const ext=String(file.name||'').split('.').pop().toLowerCase();
 if(!['pdf','docx','txt','md','png','jpg','jpeg'].includes(ext))throw new Error('Choose a PDF, DOCX, TXT, Markdown, PNG or JPG document.');
 if(!file.size||file.size>10*1024*1024)throw new Error('Choose a document between 1 byte and 10 MB.');
 return ext;
}
export function cleanDocumentText(text){
 const clean=String(text||'').replace(/\u0000/g,'').replace(/\r\n?/g,'\n').trim();
 if(!clean)throw new Error('No readable text found. For scanned PDFs, use a text-searchable PDF or paste the text into a TXT file.');
 if(clean.length>DOCUMENT_LIMIT)throw new Error('This document is too long. Please upload a shorter section (under 120,000 characters).');
 return clean;
}
export function wordCount(text){return String(text||'').trim().match(/\S+/g)?.length||0;}
export function buildGrantOutline(fields){
 const sections=[['Programme',fields.title],['Purpose and community need',fields.purpose],['People and place',fields.people],['Activities',fields.activities],['Outcomes and how we will measure them',fields.impact],['Budget and funding request',fields.budget],['Timeline',fields.timeline]];
 return sections.map(([label,value])=>label+'\n'+(String(value||'').trim()||'[Add '+label.toLowerCase()+'.]')).join('\n\n');
}
export function draftReview(text){
 const words=wordCount(text),gaps=(String(text).match(/\[Add [^\]]+\]/g)||[]).length;
 return {words,gaps,items:[{title:'A working draft',ready:words>=30,detail:words+' words in your draft.'},{title:'Complete the outline',ready:words>0&&!gaps,detail:gaps?gaps+' placeholders still need your words.':'No outline placeholders found. Check all funder questions yourself.'},{title:'Check the funder’s requirements',ready:false,detail:'Confirm eligibility, word limits, attachments and the actual deadline.'},{title:'Verify your figures',ready:false,detail:'Match costs and the funding request to your approved budget.'}]};
}
export function planTasksForDocument(document,rows,existingTasks,now,idFactory){
 if(!document?.id||!Array.isArray(rows)||rows.length>5)throw new Error('Invalid preparation plan.');
 const result=[];
 for(const row of rows){if(!row.selected)continue;if(existingTasks.some(t=>t.studioPlanId===document.id+':'+row.key))continue;
 if(!['source','budget','review'].includes(row.key)||!['sarah','alex','jordan'].includes(row.owner))throw new Error('Choose a team member for every step.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||Number.isNaN(Date.parse(row.date))||new Date(row.date).toISOString().slice(0,10)!==row.date||row.date<now)throw new Error('Give each selected step a valid due date, today or later.');
 const titles={source:'Review source and grant requirements',budget:'Confirm programme budget',review:'Give the grant draft a final review'};
 result.push({id:idFactory(),title:titles[row.key],owner:row.owner,start:now,date:row.date,type:'task',status:'todo',done:false,related:document.application||'',studioPlanId:document.id+':'+row.key,documentId:document.id,notes:'Preparation for '+document.name,checks:[{name:titles[row.key],done:false}]});
 }return result;
}

// Failed dynamic imports are cached by browsers. A new attempt URL allows recovery
// after connectivity (or the local preview server) returns, without losing drafts.
export function createPdfReaderLoader(pageUrl, importModule) {
 let pending, attempt=0;
 return function loadPdfReader() {
  if(pending)return pending;
  const url=new URL('./vendor/pdf.min.mjs',pageUrl);
  if(attempt++)url.searchParams.set('retry',String(attempt));
  pending=importModule(url.href).catch(error=>{
   pending=undefined;
   const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
   throw new Error(local
    ? 'The local preview’s PDF reader is unavailable. Restart the preview, or open the published dashboard and choose your file there. Your file has not been imported.'
    : 'The PDF reader could not load. Check your connection and choose your file again. Your file has not been imported.',{cause:error});
  });
  return pending;
 };
}

// Keep text geometry separate from the faithful visual preview. PDF content
// streams may split a single printed line into many unrelated text items.
export function pdfTextFromItems(items){
 const lines=[];
 for(const item of items){if(!item.str?.trim())continue;const [,,,,x,y]=item.transform||[1,0,0,1,0,0],height=Math.max(1,Math.abs(item.height||item.transform?.[3]||12));let line=lines.find(l=>Math.abs(l.y-y)<Math.min(l.height,height)*0.35);if(!line){line={y,height,items:[]};lines.push(line);}line.items.push({text:item.str,x,width:item.width||0});}
 lines.sort((a,b)=>b.y-a.y);let result='',previous;
 for(const line of lines){line.items.sort((a,b)=>a.x-b.x);let text='',last;for(const item of line.items){const gap=last?item.x-(last.x+last.width):0;const separator=last?(gap>line.height*2?'\t':/\s$/.test(text)||/^\s/.test(item.text)?'':' '):'';text+=separator+item.text;last=item;}
 const paragraph=previous&&(previous.y-line.y>Math.max(previous.height,line.height)*1.65||Math.abs(previous.height-line.height)>2);
 result+=(result?(paragraph?'\n\n':'\n'):'')+text.trim();previous=line;}
 return result.trim();
}
export function sourceTextForContext(pages,limit=20000){
 const full=pages.map(p=>`[${p.label||'Page '+p.number}${p.method==='ocr'?' · OCR':''}${p.warning?' · Check original':''}]\n${p.text||'[No readable text]'}${p.warning?'\nReading note: '+p.warning:''}`).join('\n\n');
 return {text:full.slice(0,limit),truncated:full.length>limit};
}

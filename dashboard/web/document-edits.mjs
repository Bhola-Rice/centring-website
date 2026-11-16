// Shared validation: model suggestions never write to documents directly.
export function validateDocumentEdits(args,doc){
 if(!doc||args.document_id!==doc.id)throw new Error('Select the document you want to edit.');
 if(!Array.isArray(args.edits)||!args.edits.length||args.edits.length>6)throw new Error('Suggest between one and six edits at a time.');
 const ids=new Set();
 return args.edits.map(e=>{
  const block=doc.editableBlocks?.find(b=>b.id===e.block_id);
  if(!block||block.editable===false||typeof e.before!=='string'||e.before!==block.text)throw new Error('The paragraph changed or cannot be edited safely. Read the document again.');
  if(ids.has(e.block_id))throw new Error('Only one suggestion per paragraph is allowed.');ids.add(e.block_id);
  if(typeof e.after!=='string'||!e.after.trim()||e.after.length>10000||e.after===e.before||/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(e.after))throw new Error('Provide a different, non-empty replacement paragraph.');
  if(typeof e.reason!=='string'||!e.reason.trim()||e.reason.length>1000)throw new Error('Explain why the wording should change.');
  return {blockId:e.block_id,before:e.before,after:e.after,reason:e.reason,page:block.page||null};
 });
}
export function workingBlocks(doc){return doc.review?.blocks||[];}
export function applyReviewedEdit(doc,editId,decision){
 const review=structuredClone(doc.review),edit=review?.edits.find(e=>e.id===editId);
 if(!edit)throw new Error('This suggestion is no longer available.');
 const block=review.blocks.find(b=>b.id===edit.blockId);
 if(!block)throw new Error('The source paragraph is unavailable.');
 if(decision==='accept'){
  if(edit.status!=='pending'||block.text!==edit.before)throw new Error('This paragraph has changed. Ask Beedy for a fresh suggestion.');
  block.text=edit.after;edit.status='accepted';
 }else if(decision==='reject'){
  if(edit.status!=='pending')throw new Error('This suggestion has already been reviewed.');edit.status='rejected';
 }else if(decision==='undo'){
  if(edit.status!=='accepted'||block.text!==edit.after)throw new Error('A newer edit affects this paragraph. Undo that edit first.');
  block.text=edit.before;edit.status='pending';
 }else throw new Error('Unknown review action.');
 review.revision=(review.revision||0)+1;
 return {...doc,review};
}
// Retain untouched run text. New wording inherits the run at the start of the edit.
export function replaceRunText(runs,before,after){
 if(runs.join('')!==before)throw new Error('The Word paragraph no longer matches its saved source.');
 let start=0;while(start<before.length&&start<after.length&&before[start]===after[start])start++;
 let end=before.length,afterEnd=after.length;while(end>start&&afterEnd>start&&before[end-1]===after[afterEnd-1]){end--;afterEnd--;}
 const insert=after.slice(start,afterEnd);let pos=0,inserted=false;
 return runs.map((run,i)=>{const a=pos,b=pos+run.length;pos=b;let out='';
  if(a<start)out+=run.slice(0,Math.min(run.length,start-a));
  if(!inserted&&start<=b&&(start<b||i===runs.length-1)){out+=insert;inserted=true;}
  if(b>end)out+=run.slice(Math.max(0,end-a));return out;
 });
}
export function draftForOpportunity(grant,mission,organisation){
 return `${grant.name}\n\nOrganisation mission\n${mission.trim()||'[Add your organisation’s mission.]'}\n\nProposed programme\n[Describe the programme, who it serves, and where it will run.]\n\nConnection to this opportunity\n[Explain how the programme addresses the funder’s stated priorities. Confirm eligibility before applying.]\n\nActivities and outcomes\n[Add activities, expected results, and how you will measure them.]\n\nBudget\n[Add verified costs and the amount requested.]\n\nTimeline\n[Add programme dates. The application deadline is separate.]\n\nApplication reference\nOrganisation: ${organisation}\nOpportunity: ${grant.name}\nFunder: ${grant.agency||grant.funder||'Not specified'}\nListed closing date: ${grant.deadline||'Not specified'}\n${grant.url?'Official notice: '+grant.url:'Sample opportunity — not a live funding notice.'}\n\nItems to confirm\nEligibility, geographic restrictions, required attachments, budget rules, and submission instructions.\n`;
}

// Batch decisions are atomic: validate all pending paragraphs before saving.
export function reviewAll(doc,decision){
 if(!['accept','reject'].includes(decision))throw new Error('Unknown review action.');
 let next=doc;
 for(const edit of doc.review?.edits||[])if(edit.status==='pending')next=applyReviewedEdit(next,edit.id,decision);
 return next;
}
export function changedText(before,after){
 let start=0;while(start<before.length&&start<after.length&&before[start]===after[start])start++;
 let end=before.length,afterEnd=after.length;while(end>start&&afterEnd>start&&before[end-1]===after[afterEnd-1]){end--;afterEnd--;}
 while(start>0&&/\S/.test(before[start-1])&&/\S/.test(before[start]||''))start--;
 while(end<before.length&&afterEnd<after.length&&/\S/.test(before[end])&&/\S/.test(before[end-1]||'')){end++;afterEnd++;}
 return {prefix:before.slice(0,start),removed:before.slice(start,end),added:after.slice(start,afterEnd),suffix:before.slice(end)};
}

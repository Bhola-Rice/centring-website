const appEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function applicationText(a,{includeReview=true}={}){
 const blocks=[a.title+'\n'+a.organisation,...a.sections.map(s=>s.question+'\n'+s.answer)];
 if(includeReview){blocks.push('Review notes\n'+(a.form_status==='working_outline'?'Provisional outline: confirm the full funder application before submitting.':'Draft answers to sourced application questions. Review before submitting.')+'\n'+a.fit.summary);for(const s of a.sections){if(s.missing.length&&s.status!=='approved')blocks.push(s.question+'\n'+s.missing.map(x=>'To confirm: '+x).join('\n'));}blocks.push('Sources\n'+a.sources.map(s=>s.name+(s.url?'\n'+s.url:'')).join('\n'));}
 if(a.retrievalWarnings?.length)blocks.push('Application materials to check\n'+a.retrievalWarnings.join('\n'));
 return blocks.join('\n\n');
}
// A disconnected workspace can still assemble the confirmed parts of a narrative.
export function sourceBasedDraft({grant, organisation, mission, programmes=[], source, projectId, facts=[]}){
 const sources=[],sections=[];
 function section(question,answer,sourceId,name,quote,role,url){
  sources.push({id:sourceId,name,role,text:quote,url});
  sections.push({id:'answer-'+sections.length,question,answer,status:'draft',verifiedQuestion:false,
   missing:[],evidence:[{source_id:sourceId,quote}]});
 }
 if(mission?.trim())section('Organisation and mission',mission.trim(),'organisation',organisation,mission.trim(),'organisation');
 if(programmes.length){
  const context=programmes.map(p=>p.name+' — '+p.description).join('\n');
  section('Our programmes',context,'programmes',organisation+' programme profile',context,'organisation');
 }
 if(source?.text?.trim()){
  const excerpt=source.text.trim().split(/\n\s*\n/).filter(Boolean).slice(0,3).join('\n\n').slice(0,2000);
  // Preserve the original contiguous passage for source navigation.
  const passage=source.text.trim().slice(0,excerpt.length);
  section('Project background',passage,'support',source.name,passage,'support');
 }
 if(facts.length){
  const context=facts.map(f=>f.question+'\n'+f.answer).join('\n\n').slice(0,6000);
  section('Confirmed project details',context,'facts','Saved workspace details',context,'project');
 }
 const notice=grant.summary||grant.description||grant.name;
 sources.push({id:'notice',role:'notice',name:grant.name,url:grant.url,text:notice});
 if(!sections.length)throw new Error('No organisation or project text is available to prepare a draft.');
 return {title:grant.name,organisation,grant,researchId:grant.researchId,projectId:projectId||null,
  preparation:'source',form_status:'working_outline',sources,sections,fit:{assessment:'uncertain',
   summary:'The available notice does not establish applicant eligibility.',eligibility_checks:[]}};
}
export function applicationPanel(doc){
 const a=doc.applicationDraft;
 const criteria=a.fit.eligibility_checks.map(check=>`<li>${appEsc(check)} ${(a.fit.citations||[]).map((c,i)=>c.check===check?`<button type="button" class="source-marker" data-fit-citation="${i}" aria-label="Read eligibility source">§</button>`:'').join('')}</li>`).join('');
 return `<header class="draft-paper-head"><div><small>${appEsc(a.organisation)}</small><h2>Application narrative</h2></div></header>
 ${a.preparation==='source'?`<div class="draft-reading-note"><span>This starting draft uses your saved sources. Connect Beedy to tailor it to the funder’s questions.</span>${!a.sourceEdited?'<button class="textlink" data-action="generate-full-draft" data-id="'+appEsc(doc.id)+'">Generate full draft</button>':''}</div>`:a.form_status==='working_outline'?'<p class="draft-reading-note">Prepared from the available requirements. The full funder form is still unverified.</p>':''}
 <div class="draft-narrative">${a.sections.map(s=>{
  const id=appEsc(s.id);
  const citations=s.evidence.map((item,i)=>`<button type="button" class="source-marker" data-evidence-index="${i}" title="${appEsc(a.sources?.find(src=>src.id===item.source_id)?.name||'Source')}" aria-label="Read supporting source ${i+1}">${i+1}</button>`).join(' ');
  return `<article class="application-answer" id="application-${id}"><header><h3>${appEsc(s.question)} ${s.verifiedQuestion&&s.question_quote?`<button class="source-marker" aria-label="Read funder question" data-question-source="${appEsc(s.questionSourceId)}">§</button>`:''}</h3><button type="button" class="textlink" data-action="edit-passage" data-answer="${id}" aria-label="Edit ${appEsc(s.question)}">Edit</button></header>
  <div class="draft-passage">${appEsc(s.answer||'No supported wording is available for this section yet.')} ${citations}</div>
  ${s.missing.length&&s.status!=='approved'?`<details class="draft-check"><summary>Details to confirm (${s.missing.length})</summary><ul>${s.missing.map(m=>'<li>'+appEsc(m)+'</li>').join('')}</ul></details>`:''}
  ${s.answer.trim()?`<details class="draft-review-action"><summary>${s.status==='approved'?'Reviewed':'Review section'}</summary>${s.missing.length&&s.status!=='approved'?`<label><input type="checkbox" data-confirm-answer="${id}"> I have checked the outstanding details.</label>`:''}<button class="textlink" data-action="application-approve" data-id="${appEsc(doc.id)}" data-answer="${id}">${s.status==='approved'?'Reopen review':'Mark reviewed'}</button></details>`:''}</article>`;
 }).join('')}</div><details class="draft-fit-note"><summary>Fit and eligibility</summary><p>${appEsc(a.fit.summary)}</p><ul>${criteria}</ul></details>
 ${a.retrievalWarnings?.length?`<details class="draft-fit-note"><summary>Source notes</summary><ul>${a.retrievalWarnings.map(w=>'<li>'+appEsc(w)+'</li>').join('')}</ul></details>`:''}`;
}
export function updateApplicationAnswer(application,id,text){
 if(typeof text!=='string'||text.length>16000)throw new Error('Keep each answer under 16,000 characters.');
 return {...application,...(application.preparation==='source'?{sourceEdited:true}:{}),sections:application.sections.map(s=>s.id===id?{...s,answer:text,status:'draft'}:s)};
}
export function approveApplicationAnswer(application,id,confirmed=false){
 const section=application.sections.find(s=>s.id===id);if(!section)throw new Error('Answer not found.');
 if(section.status!=='approved'){
  if(!section.answer.trim()||/\[(?:Confirm|Add|Describe|Insert|Provide)\b[^\]]*\]/i.test(section.answer))throw new Error('Complete the marked details before approving this answer.');
  if(section.word_limit&&section.answer.trim().split(/\s+/).length>section.word_limit)throw new Error('Shorten this answer to the funder’s word limit before approving.');
  if(section.missing.length&&!confirmed)throw new Error('Check the outstanding details before approving this answer.');
 }
 return {...application,sections:application.sections.map(s=>s.id===id?{...s,status:s.status==='approved'?'draft':'approved'}:s)};
}

// Use the same normalization as server-side quotation verification.
export function citationPanel(source, quote){
 const normalize=value=>String(value||'').normalize('NFKC').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/\s+/g,' ').trim();
 const passage=normalize(source.text), excerpt=normalize(quote);
 const offset=excerpt?passage.indexOf(excerpt):-1;
 const content=offset<0
  ? `<p class="citation-note">${passage?'This quotation could not be located in the saved source.':'Source text was not saved with this older draft. Recreate the draft to capture its sources.'}</p>${excerpt?'<blockquote>'+appEsc(quote)+'</blockquote>':''}${passage?'<p>'+appEsc(passage)+'</p>':''}`
  : `<p class="citation-note">Saved source text · cited passage highlighted${source.truncated?' · source is incomplete':''}</p><p>${appEsc(passage.slice(0,offset))}<mark>${appEsc(passage.slice(offset,offset+excerpt.length))}</mark>${appEsc(passage.slice(offset+excerpt.length))}</p>`;
 return `<header><h2 id="citation-title">${appEsc(source.name)}</h2><button type="button" aria-label="Close source">×</button></header><div class="citation-body">${content}</div>${/^https:\/\//i.test(source.url||'')?'<a target="_blank" rel="noopener noreferrer" href="'+appEsc(source.url)+'">Open original source</a>':''}`;
}

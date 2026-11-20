export function createProjectSearch({esc,render,dateLabel,getProjects,mark,format,readStream,reader}){
 let projectId='',description='',answer='',choice='',plan=null,report=null,busy='',error='',compare=false;
 let mode='web',webQuery='',searched='',draftText='',webResult=null,webRequest=null,webError='';
 const webRows=()=> (webResult?.sources||[]).map(s=>({id:'web-'+s.url,source:'web',title:s.title,funder:s.host,url:s.url,status:'Research source',summary:sourceExcerpt(s.url),reference:s.url,date:null}));
 function sourceExcerpt(url){
  const line=webResult?.answer?.split(/\n+/).find(line=>line.includes(url)&&line.replace(/\[[^\]]*\]\([^)]*\)/g,'').trim().length>30);
  return line?.replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/^[#>*\s-]+/,'').replace(/\*\*/g,'').trim()||'Source cited in the search for “'+searched+'”.';
 }
 let confirmedAnswer='',matchedBrief='';
 const newDiscussion=()=>({turns:[],draft:'',pending:false,error:''});
 const discussions={web:newDiscussion(),catalogue:newDiscussion()};
 const userTurn=text=>`<div class="project-user-turn"><span class="sr-only">You</span><p>${esc(text)}</p></div>`;
 const assistantTurn=text=>`<div class="project-agent-turn"><span class="sr-only">Beedy</span><div class="answer-body">${format(text)}</div></div>`;
 const lock=()=>busy?'disabled':'';
 const byline=()=>`<div class="discovery-byline"><span class="discovery-mark">${mark()}</span>Beedy</div>`;
 function intake(){
  const projects=getProjects();
  const picker=projects.length?`<select name="projectId" aria-label="Project context" ${lock()}><option value="">New project</option>${projects.map(p=>`<option value="${esc(p.id)}" ${p.id===projectId?'selected':''}>${esc(p.name)}</option>`).join('')}</select>`:'';
  return `<h2 class="discovery-question"><label for="discovery-need">What would you like to fund?</label></h2>
   <div class="discovery-composer"><textarea id="discovery-need" name="description" maxlength="4500" rows="3" required placeholder="Describe the work, who it serves, and where." ${lock()}>${esc(description)}</textarea>
   <div class="discovery-toolbar">${picker}<button class="btn primary" ${lock()}>Review brief</button></div></div>`;
 }
 function review(){
  const choices=(plan.question&&Array.isArray(plan.choices)?plan.choices:[]).slice(0,5);
  const submitted=Boolean(report||busy);
  const question=plan.question||'Ready to find matches?';
  const prompt=`${userTurn(description)}${plan.brief?assistantTurn(plan.brief):''}<p class="project-question" tabindex="-1">${esc(question)}</p>`;
  if(submitted){
   const reply=report?confirmedAnswer:[choice,answer.trim()].filter(Boolean).join('. ');
   return prompt+userTurn(reply||'Find matches')+(report?assistantTurn(report.summary||(!report.results.length?'I found no supported matches. Try a broader project brief.':'Your matches are ready.')):'');
  }
  return `${prompt}
   <div class="discovery-replies" role="group" aria-label="Suggested answers">${choices.map(c=>`<button type="button" data-project-choice="${esc(c)}" aria-pressed="${choice===c}" ${lock()}>${esc(c)}</button>`).join('')}</div>
   <div class="discovery-composer compact"><textarea id="project-clarification" name="answer" aria-label="Additional project details" maxlength="900" rows="1" placeholder="${choices.length?'Or add your own detail…':'Add a detail (optional)…'}" ${lock()}>${esc(answer)}</textarea>
   <div class="discovery-toolbar"><button class="btn primary" ${lock()}>Find matches</button></div></div>`;
 }
 function webComposer(){
  const projects=getProjects();
  const select=projects.length?`<select name="projectId" aria-label="Project context"><option value="">New project</option>${projects.map(p=>`<option value="${esc(p.id)}" ${p.id===projectId?'selected':''}>${esc(p.name)}</option>`).join('')}</select>`:'';
  return `<form id="funding-web-search"><h2 class="discovery-question"><label for="funding-query">What would you like to fund?</label></h2>
   <div class="discovery-composer"><textarea id="funding-query" name="q" maxlength="4500" rows="2" required placeholder="Describe the project, who it serves and where.">${esc(webQuery)}</textarea>
   <div class="discovery-toolbar">${select}<button class="btn primary">Search the web</button></div></div></form>`;
 }
 function readerPanel(){
  const web=mode==='web',discussion=discussions[mode];
  const done=Boolean(web?webResult:report),working=web?webRequest:busy;
  let conversation;
  if(web){
   conversation=webRequest||webResult||webError?userTurn(searched):'';
   conversation+=webRequest||webResult?`<div class="project-agent-turn web-reply"><div id="funding-web-answer" class="answer-body">${webResult?format(webResult.answer):esc(draftText)}</div></div>`:'';
   if(webError)conversation+=`<p role="alert">${esc(webError)}</p>`;
   if(!webRequest&&!webResult)conversation+=webComposer();
  }else{
   const dialogue=plan?review():busy?userTurn(description):intake();
   conversation=`<form id="project-search">${dialogue}</form>`+(error?`<p role="alert">${esc(error)}</p>`:'');
  }
  const turns=discussion.turns.map(t=>t.role==='user'?userTurn(t.text):assistantTurn(t.text)).join('');
  const status=working?`<p class="discovery-progress" role="status"><i aria-hidden="true"></i>${web?'Searching public funding sources…':esc(busy)}</p>`:'';
  const follow=done?`<form id="project-followup" class="project-followup"><label class="sr-only" for="project-followup-text">Ask Beedy about these results</label><div class="discovery-composer compact"><textarea id="project-followup-text" rows="1" maxlength="1200" required placeholder="Ask about fit, eligibility or next steps…" ${discussion.pending?'disabled':''}>${esc(discussion.draft)}</textarea><div class="discovery-toolbar"><button class="btn primary" ${discussion.pending?'disabled':''}>Send</button></div></div></form>`:'';
  const controls=working?(web?'<button class="textlink" data-stop-search>Stop search</button>':''):discussion.pending?'':`${(web?webResult:plan)?'<button type="button" class="textlink" data-edit-search>Edit search</button>':''}<button type="button" class="textlink" data-search-mode="${web?'catalogue':'web'}">${web?'Search the research catalogue':'Search the web'}</button>`;
  return `<section class="discovery project-thread" data-mode="${mode}"><header>${byline()}${done?'<button class="textlink mobile-work-link" type="button" data-jump-work>View results</button>':''}</header><div class="project-transcript" aria-label="Search conversation">${conversation}${status}${turns}${discussion.pending?'<p role="status">Beedy is replying…</p>':''}${discussion.error?`<p role="alert">${esc(discussion.error)}</p>`:''}</div>${follow}<div class="thread-actions">${controls}</div></section>`;
 }
 document.addEventListener('input',e=>{if(e.target.id==='funding-query')webQuery=e.target.value;if(e.target.id==='project-followup-text')discussions[mode].draft=e.target.value;});
 document.addEventListener('click',e=>{
  if(e.target.closest('[data-jump-work]')){const work=document.querySelector('.project-work');work?.focus({preventScroll:true});work?.scrollIntoView({block:'start'});return;}
  if(e.target.closest('[data-stop-search]'))webRequest?.abort();
  if(e.target.closest('[data-edit-search]')&&!busy&&!webRequest&&!discussions[mode].pending){
   reader.clear();discussions[mode]=newDiscussion();
   if(mode==='web'){webResult=null;webError='';draftText='';}
   else{plan=null;report=null;error='';answer='';choice='';confirmedAnswer='';compare=false;}
   render();document.querySelector('#funding-query,#discovery-need')?.focus();return;
  }
  const toggle=e.target.closest('[data-search-mode]');
  if(toggle&&!busy&&!webRequest&&!discussions[mode].pending){reader.clear();mode=toggle.dataset.searchMode;render();}
 });
 document.addEventListener('submit',async e=>{
  if(e.target.id!=='funding-web-search')return;e.preventDefault();
  if(webRequest||!webQuery.trim())return;
  reader.clear();discussions.web=newDiscussion();const controller=new AbortController();webRequest=controller;webResult=null;webError='';draftText='';searched=webQuery.trim();render();
  try{
   const response=await fetch('/api/funding/project',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({action:'web',brief:searched,projectId})});
   if(!response.ok)throw Error((await response.json()).error||'Search unavailable.');
   webResult=await readStream(response,(label,delta)=>{
    if(label!=='text'||controller.signal.aborted)return;
    draftText+=delta;const target=document.getElementById('funding-web-answer');if(target)target.textContent=draftText;
   });
   if(!webResult?.answer||!webResult.sources?.length)throw Error('No cited response was received. Please retry.');
  }catch(error){webResult=null;draftText='';webError=controller.signal.aborted?'Search stopped.':error.message||'Search unavailable.';}
  finally{webRequest=null;render();}
 });
 function panel(){
  if(mode==='catalogue'&&report)return `<section class="discovery has-results">${matchList()}</section>`;
  const rows=mode==='web'?webRows():[];
  if(rows.length)return `<section class="web-source-list"><h2>Cited sources <small>${rows.length}</small></h2>${rows.map(r=>`<article class="source-result-row"><small>${esc(r.funder)}</small>${titleButton(r)}</article>`).join('')}</section>`;
  return `<section class="project-await"><h2>${mode==='web'?'Funding sources':'Project matches'}</h2><p>${webRequest||busy?'Results will appear here as Beedy finishes the search.':'Describe your project to Beedy to find relevant funding.'}</p></section>`;
 }
 const titleButton=r=>`<button type="button" class="federal-title" data-funding-id="${esc(r.id)}">${esc(r.title)}</button>`;
 function matchList(){
  const rows=report.results;
  const cards=rows.map(r=>`<article class="match-record"><p class="match-kicker">${esc(r.insight.decision)} <span>· ${esc(r.funder)}</span></p>${titleButton(r)}<p>${esc(r.insight.reason)}</p>
   ${r.insight.award||r.date?`<dl class="match-terms">${r.insight.award?'<div><dt>Award</dt><dd>'+esc(r.insight.award)+'</dd></div>':''}${r.date?'<div><dt>Listed date</dt><dd>'+dateLabel(r.date)+'</dd></div>':''}</dl>`:''}
   </article>`).join('');
  const table=compare?`<div class="match-comparison" role="region" tabindex="0" aria-label="Opportunity comparison"><table><thead><tr><th>Opportunity</th><th>Award</th><th>Listed date</th><th>Next step</th></tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">${titleButton(r)}</th><td>${esc(r.insight.award||'Unspecified')}</td><td>${r.date?dateLabel(r.date):'Unspecified'}</td><td>${esc(r.insight.nextStep)}</td></tr>`).join('')}</tbody></table></div>`:cards;
  return `<section class="project-results"><header><div><h2 tabindex="-1">${rows.length?rows.length+' project match'+(rows.length===1?'':'es'):'No supported matches'}</h2></div><div class="discovery-tools">${rows.length>1?`<button class="btn" data-project-compare aria-pressed="${compare}">${compare?'Show details':'Compare matches'}</button>`:''}</div></header>
   <small>Reviewed ${report.reviewed} of ${report.total} candidate listings</small>${table}</section>`;
 }
 async function call(action,brief,terms){
  const response=await fetch('/api/funding/project',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,brief,terms,projectId})});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Search failed. Please retry.');return data;
 }
 document.addEventListener('change',e=>{if(['project-search','funding-web-search'].includes(e.target.form?.id)&&e.target.name==='projectId')projectId=e.target.value;});
 document.addEventListener('input',e=>{
  if(e.target.form?.id!=='project-search')return;
  if(e.target.name==='description')description=e.target.value;
  if(e.target.name==='answer')answer=e.target.value;
 });
 document.addEventListener('click',e=>{
  if(busy)return;
  const button=e.target.closest('[data-project-choice],[data-project-compare]');if(!button)return;
  if(button.hasAttribute('data-project-choice')){
   choice=choice===button.dataset.projectChoice?'':button.dataset.projectChoice;
   for(const opt of button.parentElement.children)opt.setAttribute('aria-pressed',String(opt.dataset.projectChoice===choice));
   return;
  }
  if(button.hasAttribute('data-project-compare')){compare=!compare;render();document.querySelector('[data-project-compare]')?.focus({preventScroll:true});return;}

 });
 document.addEventListener('submit',async e=>{
  if(e.target.id!=='project-search')return;e.preventDefault();if(busy||report)return;
  reader.clear();const matching=Boolean(plan),extra=[choice,answer.trim()].filter(Boolean).join('. ');
  busy=matching?(extra?'Updating search terms…':'Reviewing candidate listings…'):'Reading your project…';error='';render();
  try{
   if(!matching)plan=await call('brief',description);
   else{
    const detailed=extra?description+'\n'+(plan.question||'Additional detail')+'\n'+extra:description;
    if(detailed.length>4500)throw Error('Shorten your project description to keep the combined brief under 4,500 characters.');
    const revised=extra?await call('brief',detailed):plan;
    busy='Reviewing candidate listings…';render();
    report=await call('match',detailed,revised.terms);
    confirmedAnswer=extra;matchedBrief=detailed;answer='';choice='';
   }
  }catch(e){error=e.message||'Search failed. Please retry.';}
  finally{busy='';render();if(!error)document.querySelector(report?'#project-followup-text':'.project-question')?.focus({preventScroll:true});}
 });
 document.addEventListener('keydown',e=>{
  if(e.target.id==='project-followup-text'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();e.target.form.requestSubmit();}
 });
 document.addEventListener('submit',async e=>{
  if(e.target.id!=='project-followup')return;
  e.preventDefault();
  const discussion=discussions[mode],question=discussion.draft.trim(),web=mode==='web';
  if(discussion.pending||!question)return;
  const evidence=web?webResult.answer:[report.summary,...report.results.map((r,i)=>[i+1,r.title,r.funder,r.date,r.insight.decision,r.insight.reason,r.insight.evidence,r.insight.award,r.insight.nextStep,r.url].filter(Boolean).join(' · '))].filter(Boolean).join('\n');
  const prior=discussion.turns.slice(-6).map(t=>t.role+' — '+t.text.slice(0,450)).join('\n');
  discussion.pending=true;discussion.error='';discussion.turns.push({role:'user',text:question});discussion.draft='';render();
  try{
   const selected=reader.context()?.title?.slice(0,1500);
   const response=await fetch('/api/funding/project',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'followup',brief:web?searched:matchedBrief,question,evidence:evidence.slice(0,9000),history:prior,selected,projectId})});
   const result=await response.json();if(!response.ok||!result.answer)throw Error(result.error||'Beedy could not answer. Try again.');
   discussion.turns.push({role:'assistant',text:result.answer});
  }catch(err){discussion.turns.pop();discussion.draft=question;discussion.error=err.message;}
  finally{discussion.pending=false;render();const log=document.querySelector('.project-transcript');if(log)log.scrollTop=log.scrollHeight;}
 });
 return {panel,readerPanel,row:id=>webRows().find(r=>r.id===id)||report?.results.find(r=>r.id===id),context:()=>mode==='web'?(webResult?{brief:searched,answer:webResult.answer,matches:webRows()}:null):report?{brief:matchedBrief,matches:report.results.map(({title,funder,url,summary,insight,date,status})=>({title,funder,url,summary:summary.slice(0,1000),insight,date,status}))}:null};
}

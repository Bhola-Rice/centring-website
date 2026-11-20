export function createProjectSearch({esc,render,dateLabel,getProjects,mark}){
 let projectId='',description='',answer='',choice='',plan=null,report=null,busy='',error='',compare=false;
 let userBrief='',confirmedAnswer='';
 const lock=()=>busy?'disabled':'';
 const byline=()=>`<div class="discovery-byline"><span class="discovery-mark">${mark()}</span>Beedy</div>`;
 function intake(){
  const projects=getProjects();
  const picker=projects.length?`<select name="projectId" aria-label="Project context" ${lock()}><option value="">New project</option>${projects.map(p=>`<option value="${esc(p.id)}" ${p.id===projectId?'selected':''}>${esc(p.name)}</option>`).join('')}</select>`:'';
  return `${byline()}<h2 class="discovery-question"><label for="discovery-need">What would you like to fund?</label></h2>
   <div class="discovery-composer"><textarea id="discovery-need" name="description" maxlength="4500" rows="3" required placeholder="Describe the work, who it serves, and where." ${lock()}>${esc(description)}</textarea>
   <div class="discovery-toolbar">${picker}<button class="btn primary" ${lock()}>Review brief</button></div></div>`;
 }
 function review(){
  if(report)return `<details class="reviewed-brief"><summary>Project brief</summary><p>${esc(userBrief)}</p>${confirmedAnswer?`<p>${esc(confirmedAnswer)}</p>`:''}<button class="textlink" data-project-edit type="button">Edit brief</button></details>`;
  const choices=(plan.question&&Array.isArray(plan.choices)?plan.choices:[]).slice(0,5);
  return `<div class="discovery-user"><p>${esc(description)}</p><button type="button" class="textlink" data-project-edit ${lock()}>Edit</button></div>
   ${byline()}<h2 class="discovery-question" tabindex="-1">${esc(plan.question||'Ready to find matches?')}</h2>
   ${plan.facts?.length?`<ul class="discovery-facts" aria-label="Search criteria">${plan.facts.slice(0,4).map(f=>`<li>${esc(f)}</li>`).join('')}</ul>`:''}
   <div class="discovery-replies" role="group" aria-label="Suggested answers">${choices.map(c=>`<button type="button" data-project-choice="${esc(c)}" aria-pressed="${choice===c}" ${lock()}>${esc(c)}</button>`).join('')}</div>
   <div class="discovery-composer compact"><textarea name="answer" aria-label="Additional project details" maxlength="900" rows="1" placeholder="${choices.length?'Or add your own detail…':'Add a detail (optional)…'}" ${lock()}>${esc(answer)}</textarea>
   <div class="discovery-toolbar"><details class="discovery-summary"><summary>Search brief</summary><p>${esc(plan.brief)}</p></details><button class="btn primary" ${lock()}>Find matches</button></div></div>`;
 }
 function panel(){
  return `<section class="discovery ${report?'has-results':''}"><form id="project-search">${plan?review():intake()}
   ${busy?`<p class="discovery-progress" role="status"><i aria-hidden="true"></i>${esc(busy)}</p>`:''}${error?`<p role="alert">${esc(error)}</p>`:''}</form>${report?matchList():''}</section>`;
 }
 const titleButton=r=>`<button type="button" class="federal-title" data-funding-id="${esc(r.id)}">${esc(r.title)}</button>`;
 function matchList(){
  const rows=report.results;
  const cards=rows.map(r=>`<article class="match-record"><p class="match-kicker">${esc(r.insight.decision)} <span>· ${esc(r.funder)}</span></p>${titleButton(r)}<p>${esc(r.insight.reason)}</p>
   <dl class="match-terms"><div><dt>Award</dt><dd>${esc(r.insight.award||'Unspecified')}</dd></div><div><dt>Listed date</dt><dd>${r.date?dateLabel(r.date):'Unspecified'}</dd></div></dl>
   <p><strong>Next step</strong> ${esc(r.insight.nextStep)}</p><details><summary>Source evidence · ${r.source==='pharos'?'Pharos':'Arachne'}</summary><blockquote>${esc(r.insight.evidence)}</blockquote><p>${esc(r.reference||r.status)}</p></details></article>`).join('');
  const table=compare?`<div class="match-comparison" role="region" tabindex="0" aria-label="Opportunity comparison"><table><thead><tr><th>Opportunity</th><th>Award</th><th>Listed date</th><th>Next step</th></tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">${titleButton(r)}</th><td>${esc(r.insight.award||'Unspecified')}</td><td>${r.date?dateLabel(r.date):'Unspecified'}</td><td>${esc(r.insight.nextStep)}</td></tr>`).join('')}</tbody></table></div>`:cards;
  return `<section class="project-results"><header><div>${byline()}<h2 tabindex="-1">${rows.length?rows.length+' project match'+(rows.length===1?'':'es'):'No supported matches'}</h2></div><div class="discovery-tools">${rows.length>1?`<button class="btn" data-project-compare aria-pressed="${compare}">${compare?'Show details':'Compare matches'}</button>`:''}${rows.length?'<button class="btn" data-action="ask-project-matches">Ask Beedy</button>':''}</div></header>
   <p>${esc(report.summary||(!rows.length?'Try adjusting the project scope or searching another funding source.':''))}</p><small>Reviewed ${report.reviewed} of ${report.total} candidate listings</small>${table}</section>`;
 }
 async function call(action,brief,terms){
  const response=await fetch('/api/funding/project',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,brief,terms,projectId})});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Search failed. Please retry.');return data;
 }
 document.addEventListener('change',e=>{if(e.target.form?.id==='project-search'&&e.target.name==='projectId')projectId=e.target.value;});
 document.addEventListener('input',e=>{
  if(e.target.form?.id!=='project-search')return;
  if(e.target.name==='description')description=e.target.value;
  if(e.target.name==='answer')answer=e.target.value;
 });
 document.addEventListener('click',e=>{
  if(busy)return;
  const button=e.target.closest('[data-project-choice],[data-project-edit],[data-project-compare]');if(!button)return;
  if(button.hasAttribute('data-project-choice')){
   choice=choice===button.dataset.projectChoice?'':button.dataset.projectChoice;
   for(const opt of button.parentElement.children)opt.setAttribute('aria-pressed',String(opt.dataset.projectChoice===choice));
   return;
  }
  if(button.hasAttribute('data-project-compare')){compare=!compare;render();document.querySelector('[data-project-compare]')?.focus({preventScroll:true});return;}
  plan=null;report=null;error='';answer='';choice='';compare=false;render();document.querySelector('#discovery-need')?.focus();
 });
 document.addEventListener('submit',async e=>{
  if(e.target.id!=='project-search')return;e.preventDefault();if(busy||report)return;
  const matching=Boolean(plan),extra=[choice,answer.trim()].filter(Boolean).join('. ');
  busy=matching?(extra?'Updating search terms…':'Reviewing candidate listings…'):'Reading your project…';error='';render();
  try{
   if(!matching)plan=await call('brief',description);
   else{
    const detailed=extra?description+'\n'+(plan.question||'Additional detail')+'\n'+extra:description;
    if(detailed.length>4500)throw Error('Shorten your project description to keep the combined brief under 4,500 characters.');
    const revised=extra?await call('brief',detailed):plan;
    busy='Reviewing candidate listings…';render();
    report=await call('match',detailed,revised.terms);
    userBrief=description;confirmedAnswer=extra;plan=revised;description=detailed;answer='';choice='';
   }
  }catch(e){error=e.message||'Search failed. Please retry.';}
  finally{busy='';render();if(!error)document.querySelector(report?'.project-results h2':'.discovery-question[tabindex]')?.focus({preventScroll:true});}
 });
 return {panel,row:id=>report?.results.find(r=>r.id===id),context:()=>report?{brief:description,matches:report.results.map(({title,funder,url,summary,insight,date,status})=>({title,funder,url,summary:summary.slice(0,1000),insight,date,status}))}:null};
}

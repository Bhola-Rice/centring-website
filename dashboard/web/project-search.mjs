export function createProjectSearch({esc,render,dateLabel,getProjects}){
 let projectId='',description='',answer='',plan=null,report=null,busy='',error='';
 function panel(){
  const lock=busy?'disabled':'';
  const projects=getProjects();
  const projectPicker=projects.length?`<label class="field">Project<select name="projectId" ${lock}><option value="">New project brief</option>${projects.map(p=>`<option value="${esc(p.id)}" ${p.id===projectId?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label>`:'';
  const controls=plan?`<h2>Project brief</h2><p class="project-brief-text">${esc(plan.brief)}</p>
   ${report?'':`<label class="field">${esc(plan.question||'Anything to refine before searching?')}<textarea name="answer" rows="2" maxlength="900" placeholder="Optional detail" ${lock}>${esc(answer)}</textarea></label>`}
   <div class="project-actions">${report?'':'<button class="btn primary" '+lock+'>Find project matches</button>'}<button type="button" class="btn" data-project-edit ${lock}>Edit brief</button></div>`:
   `<h2>What is Upbring raising funds for?</h2>${projectPicker}<label class="field">Funding need<textarea name="description" maxlength="4500" rows="3" required placeholder="For example, mentoring and job training for young adults leaving foster care in Houston. We need $75,000 and can combine smaller awards." ${lock}>${esc(description)}</textarea></label><button class="btn primary" ${lock}>Review project brief</button>`;
  return `<form id="project-search" class="glass-panel project-search">${controls}
   ${busy?'<p role="status">'+esc(busy)+'</p>':''}${error?'<p role="alert">'+esc(error)+'</p>':''}</form>${report?matchList():''}`;
 }
 function matchList(){
  const count=report.results.length;
  return `<section class="glass-panel project-results"><header><div><h2>${count} project match${count===1?'':'es'}</h2><p>${esc(report.summary||'')}</p><p>Reviewed ${report.reviewed} of ${report.total} candidate listings from Pharos and Arachne.</p></div>${count?'<button class="btn" data-action="ask-project-matches">Ask Beedy about matches</button>':''}</header>
   ${count?report.results.map(r=>`<article><span class="project-decision">${esc(r.insight.decision)}</span><button class="federal-title" data-funding-id="${esc(r.id)}">${esc(r.title)}</button><p>${esc(r.funder)} · ${r.source==='pharos'?'Pharos':'Arachne'} · ${esc(r.status.replaceAll('_',' '))}</p>
   <p>${esc(r.insight.award||'Award unspecified')} · ${r.date?'Listed date '+dateLabel(r.date):'Date unspecified'}</p><p>${esc(r.insight.reason)}</p><blockquote>${esc(r.insight.evidence)}</blockquote><p><strong>Next step</strong> ${esc(r.insight.nextStep)}</p></article>`).join(''):'<p>No supported matches surfaced. Edit the service area, funding use or other constraints to try another search.</p>'}</section>`;
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
  if(!e.target.closest('[data-project-edit]')||busy)return;
  plan=null;report=null;error='';answer='';render();document.querySelector('#project-search textarea')?.focus();
 });
 document.addEventListener('submit',async e=>{
  if(e.target.id!=='project-search')return;e.preventDefault();if(busy)return;
  const matching=Boolean(plan);
  busy=matching?'Checking the research catalogue against your brief…':'Reading your project description…';error='';render();
  try{
   if(!matching)plan=await call('brief',description);
   else{
    const extra=answer.trim();
    const detailed=extra?description+'\n'+(plan.question||'Additional detail')+'\n'+extra:description;
    if(detailed.length>4500)throw Error('Edit your brief to keep the combined description under 4,500 characters.');
    const revised=extra?await call('brief',detailed):plan;
    report=await call('match',detailed,revised.terms);
    plan=revised;description=detailed;answer='';
   }
  }catch(e){error=e.message||'Search failed. Please retry.';}
  finally{busy='';render();}
 });
 return {panel,row:id=>report?.results.find(r=>r.id===id),context:()=>report?{brief:description,matches:report.results.map(({title,funder,url,summary,insight,date,status})=>({title,funder,url,summary:summary.slice(0,1000),insight,date,status}))}:null};
}

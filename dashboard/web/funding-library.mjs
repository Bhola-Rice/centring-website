import {noticeParagraphs,noticePreview} from './notice-reader.mjs';
import {createProjectSearch} from './project-search.mjs';
const names={pharos:'Pharos',arachne:'Arachne'};
export function createFundingLibrary({reader,esc,render,mark,format,readStream,showDialog,dateLabel,fitControls,startDraft,openFederal,getSaved=()=>[],getProjects=()=>[],save}){
 const project=createProjectSearch({esc,render,dateLabel,getProjects,mark,format,readStream,getSaved,reader});
 let fit=true,source='',query='',page=1,results=[],total=0,busy=false,error='',request=0,started=false;
 let includeClosed=false,draftQuery='';
 document.addEventListener('input',e=>{
  if(e.target.form?.id==='research-search'&&e.target.name==='q')draftQuery=e.target.value;
 });
 const statusLabel=value=>String(value).replaceAll('_',' ').toLowerCase();
 const selectSource=(value,label)=>`<option value="${value}" ${source===value?'selected':''}>${label}</option>`;
 async function search(){
  const ticket=++request;
  started=true;busy=true;error='';reader.clear();render();
  try{
   const response=await fetch('/api/funding?'+new URLSearchParams({source,q:query,fit:fit?'1':'0',page:String(page),closed:includeClosed?'1':'0'}));
   if(!response.ok)throw new Error();
   const data=await response.json();
   if(ticket===request){results=data.results;total=data.total;}
  }catch{if(ticket===request)error='Couldn’t load funding research.';}
  finally{if(ticket===request){busy=false;render();}}
 }
 function findRow(id){return project.row(id)||results.find(r=>r.id===id)||getSaved().find(r=>r.id===id);}
 function detailBody(row){
  const url=/^https?:\/\//i.test(row.url||'')?`<a class="textlink" href="${esc(row.url)}" target="_blank" rel="noopener noreferrer">Open funder notice ↗</a>`:'';
  if(row.source==='web')return `<p>${esc(row.summary)}</p><div class="notice-actions">${url}<button class="btn" data-save-research="${esc(row.id)}">${getSaved().some(r=>r.id===row.id)?'Remove from saved':'Save source'}</button></div>`;
  const federalId=row.id.match(/^pharos-grants_gov\/(\d+)$/)?.[1];
  const draftButton=`<button class="btn primary" data-draft-research="${esc(row.id)}">Draft in Documents</button>`;
  const notice=federalId?`<button class="btn" data-live-notice="${federalId}">Review live notice</button>`:url;
  const reference=row.reference?`<p class="note">${esc(row.reference)}</p>`:'';
  const summary=row.summary||'';
  const preview=noticePreview(summary);
  return `<p class="research-funder">${esc(row.funder)}</p><div class="notice-facts"><div><small>Source status</small><strong>${esc(statusLabel(row.status))}</strong></div><div><small>Listed date</small><strong>${row.date?dateLabel(row.date):'No date listed'}</strong></div></div>
   ${row.insight?`<section class="notice-purpose"><h3>${esc(row.insight.decision)}</h3><p>${esc(row.insight.reason)}</p><h3>Next step</h3><p>${esc(row.insight.nextStep)}</p><details><summary>Supporting evidence</summary><blockquote>${esc(row.insight.evidence)}</blockquote></details></section>`:fitControls({researchId:row.id})}<div class="notice-actions">${draftButton}<button type="button" class="btn" data-save-research="${esc(row.id)}">${getSaved().some(r=>r.id===row.id)?'Remove from saved':'Save opportunity'}</button>${notice}</div>
   ${preview?'<section class="notice-purpose"><h3>What it funds</h3><p>'+esc(preview)+'</p></section>':''}
   ${summary.trim()!==preview?'<details class="notice-original"><summary>Read full notice text</summary>'+noticeParagraphs(summary,esc)+'</details>':''}${reference}`;
 }
 function open(id){
  const row=findRow(id);if(!row)return;
  if(reader.show(id,names[row.source]||'Web source',row.title,()=>detailBody(row)))return;
  showDialog(`<h2 id="dialog-title">${esc(row.title)}</h2>`,detailBody(row));
 }

 function panel(){
  return `<section class="federal-search glass-panel"><form id="research-search"><label class="field federal-keyword">Programme, funder or topic<input type="search" name="q" maxlength="180" value="${esc(draftQuery)}" placeholder="Search foster care, education or a foundation"></label><div class="federal-controls"><label class="field">Funding source<select name="source">${selectSource('','All research sources')}${Object.entries(names).map(([k,v])=>selectSource(k,v)).join('')}</select></label><label class="research-archive"><input type="checkbox" name="closed" ${includeClosed?'checked':''}> Include closed listings</label><button class="btn primary">Search</button></div></form></section><div class="research-workspace"><section class="federal-results glass-panel" aria-label="Funding research results"><div role="status" class="federal-result-meta">${busy?'Searching funding research…':error?esc(error):total.toLocaleString()+(fit?' programme matches':' opportunities')}</div>${error?'<button class="btn" data-research="retry">Try again</button>':busy?'':results.length?results.map(r=>`<article class="federal-row"><div><span class="federal-status">${esc(names[r.source])}</span><button class="federal-title" data-funding-id="${esc(r.id)}">${esc(r.title)}</button><p>${esc(r.funder)}</p>${r.matches?.length?'<small class="match-note">Matches your profile · '+esc(r.matches.slice(0,2).join(' · '))+'</small>':''}</div><div class="federal-deadline"><strong>${r.date?dateLabel(r.date):'No date listed'}</strong><small>${esc(statusLabel(r.status))}</small></div></article>`).join(''):`<p class="empty">${fit?'No programme matches for this search.':'No matching opportunities.'} ${fit?'<button class="textlink" data-research="all">Search all opportunities</button>':''}</p>`}${!busy&&!error&&total>12?`<div class="federal-pagination"><button class="btn" data-research="prev" ${page===1?'disabled':''}>← Previous</button><span>Page ${page} of ${Math.ceil(total/12)}</span><button class="btn" data-research="next" ${page*12>=total?'disabled':''}>Next →</button></div>`:''}</section></div>`;
 }
 document.addEventListener('submit',e=>{
  if(e.target.id!=='research-search')return;
  e.preventDefault();const data=new FormData(e.target);
  draftQuery=query=String(data.get('q')).trim();source=String(data.get('source'));includeClosed=data.has('closed');page=1;void search();
 });
 document.addEventListener('click',e=>{
  const button=e.target.closest('[data-save-research],[data-research],[data-funding-id],[data-draft-research],[data-live-notice]');if(!button)return;
  if(button.dataset.saveResearch){
   const row=findRow(button.dataset.saveResearch);if(!row)return;
   const saved=getSaved(),exists=saved.some(r=>r.id===row.id),dialog=button.closest('dialog');
   if(save(exists?saved.filter(r=>r.id!==row.id):[row,...saved])){
    if(exists&&reader.current(row.id)&&!findRow(row.id))reader.clear();
    render();
    if(dialog && exists && !findRow(row.id))dialog.close();
    else if(dialog)showDialog(`<h2 id="dialog-title">${esc(row.title)}</h2>`,detailBody(row));
   }
   return;
  }
  if(button.dataset.liveNotice){void openFederal(button.dataset.liveNotice);return;}
  if(button.dataset.draftResearch){
   const row=findRow(button.dataset.draftResearch);
   if(row)startDraft({researchId:row.id,name:row.title,agency:row.funder,url:row.url,summary:row.summary});
   return;
  }
  if(button.dataset.fundingId){open(button.dataset.fundingId);return;}
  if(button.dataset.research==='all'){fit=false;page=1;}
  if(button.dataset.research==='next')page++;
  if(button.dataset.research==='prev')page=Math.max(1,page-1);
  void search();
 });
 return {project,panel,open,selectSource(id){source=id;draftQuery=query='';page=1;fit=false;includeClosed=false;void search();},isFit:()=>fit,setFit(value){if(fit!==value){fit=value;page=1;void search();}},mount(){if(!started){started=true;queueMicrotask(search);}}};
}

const names={pharos:'Pharos',arachne:'Arachne'};
export function createFundingLibrary({esc,render,showDialog,dateLabel,fitControls,startDraft,openFederal}){
 let fit=true,source='',query='',page=1,results=[],total=0,busy=false,error='',request=0,started=false;
 let includeClosed=false,selectedId=null;
 const statusLabel=value=>String(value).replaceAll('_',' ').toLowerCase();
 const selectSource=(value,label)=>`<option value="${value}" ${source===value?'selected':''}>${label}</option>`;
 async function search(){
  const ticket=++request;
  started=true;busy=true;error='';selectedId=null;render();
  try{
   const response=await fetch('/api/funding?'+new URLSearchParams({source,q:query,fit:fit?'1':'0',page:String(page),closed:includeClosed?'1':'0'}));
   if(!response.ok)throw new Error();
   const data=await response.json();
   if(ticket===request){results=data.results;total=data.total;}
  }catch{if(ticket===request)error='Couldn’t load funding research.';}
  finally{if(ticket===request){busy=false;render();}}
 }
 function detailBody(row){
  const url=/^https?:\/\//i.test(row.url||'')?`<a class="textlink" href="${esc(row.url)}" target="_blank" rel="noopener noreferrer">Open funder notice ↗</a>`:'';
  const federalId=row.id.match(/^pharos-grants_gov\/(\d+)$/)?.[1];
  const draftButton=`<button class="btn primary" data-draft-research="${esc(row.id)}">Draft in Documents</button>`;
  const notice=federalId?`<button class="btn" data-live-notice="${federalId}">Review live notice</button>`:url;
  const matches=(row.matches||[]).map(term=>{
   const inTitle=row.title.toLowerCase().includes(term),field=inTitle?row.title:row.summary;
   const at=field?.toLowerCase().indexOf(term)??-1;
   if(at<0)return '';
   const from=Math.max(0,at-70),to=Math.min(field.length,at+term.length+90);
   return `<blockquote><small>${inTitle?'Notice title':'Listing summary'}</small>${from?'…':''}${esc(field.slice(from,at))}<mark>${esc(field.slice(at,at+term.length))}</mark>${esc(field.slice(at+term.length,to))}${to<field.length?'…':''}</blockquote>`;
  }).join('');
  const reference=row.reference?`<p class="note">${esc(row.reference)}</p>`:'';
  return `<p class="research-funder">${esc(row.funder)}</p><div class="notice-actions">${draftButton}${notice}</div><div class="notice-facts"><div><small>Source status</small><strong>${esc(statusLabel(row.status))}</strong></div><div><small>Listed date</small><strong>${row.date?dateLabel(row.date):'No date listed'}</strong></div></div>${matches?`<section class="fit-reason"><h3>Why this surfaced</h3><p>The listing mentions ${row.matches.map(t=>'“'+esc(t)+'”').join(', ')} from your programme profile.</p><details><summary>View matching passage${row.matches.length===1?'':'s'}</summary>${matches}</details><small>Confirm geography and applicant eligibility in the funder’s notice.</small></section>`:''}${row.summary?'<p>'+esc(row.summary)+'</p>':''}${reference}${fitControls({researchId:row.id,name:row.title})}`;

 }
 function open(id,besideResults=false){
  const row=results.find(r=>r.id===id);
  if(!row)return;
  if(besideResults&&window.matchMedia('(min-width: 960px)').matches){
   selectedId=id;render();
   document.querySelector('#funding-reader-title')?.focus({preventScroll:true});return;
  }
  showDialog(`<h2 id="dialog-title">${esc(row.title)}</h2>`,detailBody(row));
 }
 function panel(){
  const selection=results.find(r=>r.id===selectedId);
  const reader=selection?`<aside class="funding-reader" aria-labelledby="funding-reader-title"><div class="research-reader-bar"><span>${esc(names[selection.source])}</span><button type="button" class="iconbtn" aria-label="Close opportunity" data-research="close">×</button></div><h2 tabindex="-1" id="funding-reader-title">${esc(selection.title)}</h2>${detailBody(selection)}</aside>`:'';
  return `<section class="federal-search glass-panel"><form id="research-search"><label class="field federal-keyword">Programme, funder or topic<input type="search" name="q" maxlength="180" value="${esc(query)}" placeholder="Search foster care, education or a foundation"></label><div class="federal-controls"><label class="field">Funding source<select name="source">${selectSource('','All research sources')}${Object.entries(names).map(([k,v])=>selectSource(k,v)).join('')}</select></label><label class="research-archive"><input type="checkbox" name="closed" ${includeClosed?'checked':''}> Include closed listings</label><button class="btn primary">Search</button></div></form></section><div class="research-workspace ${selection?'with-selection':''}"><section class="federal-results glass-panel" aria-label="Funding research results"><div role="status" class="federal-result-meta">${busy?'Searching funding research…':error?esc(error):total.toLocaleString()+(fit?' programme matches':' opportunities')}</div>${error?'<button class="btn" data-research="retry">Try again</button>':busy?'':results.length?results.map(r=>`<article class="federal-row"><div><span class="federal-status">${esc(names[r.source])}</span><button class="federal-title" data-funding-id="${esc(r.id)}" aria-expanded="${selectedId===r.id}">${esc(r.title)}</button><p>${esc(r.funder)}</p>${r.matches?.length?'<small class="match-note">Matches your profile · '+esc(r.matches.slice(0,2).join(' · '))+'</small>':''}</div><div class="federal-deadline"><strong>${r.date?dateLabel(r.date):'No date listed'}</strong><small>${esc(statusLabel(r.status))}</small></div></article>`).join(''):`<p class="empty">${fit?'No programme matches for this search.':'No matching opportunities.'} ${fit?'<button class="textlink" data-research="all">Search all opportunities</button>':''}</p>`}${!busy&&!error&&total>12?`<div class="federal-pagination"><button class="btn" data-research="prev" ${page===1?'disabled':''}>← Previous</button><span>Page ${page} of ${Math.ceil(total/12)}</span><button class="btn" data-research="next" ${page*12>=total?'disabled':''}>Next →</button></div>`:''}</section>${reader}</div>`;
 }
 document.addEventListener('submit',e=>{
  if(e.target.id!=='research-search')return;
  e.preventDefault();const data=new FormData(e.target);
  query=String(data.get('q')).trim();source=String(data.get('source'));includeClosed=data.has('closed');page=1;void search();
 });
 document.addEventListener('click',e=>{
  const button=e.target.closest('[data-research],[data-funding-id],[data-draft-research],[data-live-notice]');if(!button)return;
  if(button.dataset.liveNotice){void openFederal(button.dataset.liveNotice);return;}
  if(button.dataset.draftResearch){
   const row=results.find(r=>r.id===button.dataset.draftResearch);
   if(row)startDraft({researchId:row.id,name:row.title,agency:row.funder,url:row.url,summary:row.summary});
   return;
  }
  if(button.dataset.fundingId){open(button.dataset.fundingId,true);return;}
  if(button.dataset.research==='close'){
   const previous=selectedId;selectedId=null;render();
   document.querySelector('[data-funding-id="'+CSS.escape(previous)+'"]')?.focus();return;
  }
  if(button.dataset.research==='all'){fit=false;page=1;}
  if(button.dataset.research==='next')page++;
  if(button.dataset.research==='prev')page=Math.max(1,page-1);
  void search();
 });
 return {panel,open,selectSource(id){source=id;query='';page=1;fit=false;includeClosed=false;void search();},isFit:()=>fit,setFit(value){if(fit!==value){fit=value;page=1;void search();}},mount(){if(!started){started=true;queueMicrotask(search);}}};
}

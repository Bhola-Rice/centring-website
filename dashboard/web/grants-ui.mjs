import {voiceButton} from './voice.mjs';
export function createGrantBrowser({reader,research,savedOpportunityRows,esc,heading,fitControls,showDialog,closeDialog,render,getSaved,save,toast,calendar,startDraft,importGrant,getDocumentId,openDocument}){
 let view='project',query='',status='posted',nonprofit='any',page=1,data=null,error='',busy=false,started=false,requestId=0,detailId=0,current=null;
 const day=d=>d?new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'Not specified';
 const dollars=v=>v===null?'Not specified':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v);
 const saved=id=>getSaved().some(g=>g.id===id);
 const link=(url,label)=>`<a class="textlink" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
 function row(g){return `<article class="federal-row"><div><span class="federal-status">${esc(g.status==='forecasted'||g.forecast?'Forecast · dates may change':g.status==='posted'?'Open listing':'Saved listing')}${saved(g.id)?' · Saved':''}</span><button class="federal-title" data-action="federal-open" data-id="${esc(g.id)}">${esc(g.name)}</button><p>${esc(g.agency)} · ${esc(g.number)}</p></div><div class="federal-deadline"><span>${g.forecast||g.status==='forecasted'?'Expected close':'Closing date'}</span><strong>${day(g.deadline)}</strong>${g.deadline&&g.deadline<new Date().toISOString().slice(0,10)?'<small>Date has passed · check notice</small>':''}<button class="textlink" data-action="federal-open" data-id="${esc(g.id)}">View opportunity →</button></div></article>`;}
 function results(){if(view==='saved')return (getSaved().map(row).join('')+(savedOpportunityRows?.('',true)||''))||'<p class="desk-empty">No saved opportunities yet.</p>';
 if(busy)return '<div class="empty" role="status"><h3>Searching grants…</h3><p>Checking the official Grants.gov catalog.</p></div>';
 if(error)return `<div class="empty" role="alert"><h3>We couldn’t load the listings.</h3><p>${esc(error)}</p><button class="btn" data-action="federal-retry">Try again</button> ${link('https://simpler.grants.gov/search?query='+encodeURIComponent(query),'Search on Simpler')}</div>`;
 if(!data)return '<div class="empty"><p>Search for the work you want to fund.</p></div>';
 return `<div class="federal-result-meta" role="status"><span>${data.total.toLocaleString()} results · ${esc(data.source)}</span><span>Checked ${new Date(data.fetchedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</span></div>${data.results.length?data.results.map(row).join(''):'<div class="empty"><h3>No matching grants</h3><p>Try a broader phrase or include forecast opportunities. A nonprofit filter may omit notices with special eligibility rules.</p></div>'}<div class="federal-pagination"><button class="btn" data-action="federal-prev" ${page<=1?'disabled':''}>← Previous</button><span>Page ${page} of ${Math.max(1,Math.ceil(data.total/12)).toLocaleString()}</span><button class="btn" data-action="federal-next" ${page*12>=data.total||page>=100?'disabled':''}>Next →</button></div>`;
 }
 function pageHTML(){
 const selected=view==='research'?(research.isFit()?'fit':'all'):view;
 const choices=[['project','Project search'],['fit','Programme matches'],['all','All opportunities'],['live','Grants.gov live'],['saved','Saved opportunities']];
 const picker=`<nav class="research-scope" aria-label="Opportunity views">${choices.map(([key,label])=>`<button type="button" data-action="federal-view" data-view="${key}" aria-pressed="${selected===key}">${label}</button>`).join('')}</nav>`;
 const content=view==='project'?research.project.panel():view==='research'?research.panel():(view==='live'?`<section class="federal-search glass-panel"><div class="federal-source"><span class="federal-source-dot"></span> Live source · Grants.gov ${link('https://simpler.grants.gov/search','Explore Simpler.Grants.gov')}</div><form id="federal-search-form"><label class="field federal-keyword">Programme or topic<input name="query" type="search" maxlength="200" value="${esc(query)}" placeholder="Try literacy, youth arts, or community health"></label><div class="federal-controls"><label class="field">Status<select name="status"><option value="posted" ${status==='posted'?'selected':''}>Open opportunities</option><option value="forecasted" ${status==='forecasted'?'selected':''}>Forecast opportunities</option><option value="both" ${status==='both'?'selected':''}>Open + forecast</option></select></label><label class="field">Applicant type<select name="nonprofit"><option value="any" ${nonprofit==='any'?'selected':''}>All applicant types</option><option value="501c3" ${nonprofit==='501c3'?'selected':''}>Nonprofit · 501(c)(3)</option><option value="non501c3" ${nonprofit==='non501c3'?'selected':''}>Nonprofit · without 501(c)(3)</option></select></label><button class="btn primary" ${busy?'disabled':''}>${busy?'Searching…':'Find opportunities →'}</button></div></form><p class="note">Search terms are sent to Grants.gov. Your documents stay here. Check the full notice for geography, eligibility and submission rules.</p></section>`:'')+`<section class="federal-results glass-panel" aria-label="Federal grant results">${results()}</section>`;
 return '<div class="funding-page"><header class="funding-heading">'+heading('Opportunities')+'</header>'+picker+(reader?reader.wrap(content,view==='project'?research.project.readerPanel():''):content)+'</div>';
 }
 async function search(){const id=++requestId;reader?.clear();started=true;busy=true;error='';view='live';render();try{const r=await fetch('/api/grants/search?'+new URLSearchParams({q:query,status,nonprofit,page:String(page)}));const result=await r.json();if(!r.ok)throw new Error(result.error||'Please try again.');if(id!==requestId)return;data=result;}catch(e){if(id!==requestId)return;error=e.message;data=null;}finally{if(id===requestId){busy=false;render();}}}
 function detail(g){
 const savedHere=saved(g.id);
 const clean=t=>String(t||'').replace(/([.!?])(?=[A-Z])/g,'$1 ').replace(/\s+/g,' ').trim();
 const desc=clean(g.description),elig=clean(g.eligibility);
 const sentences=t=>t.match(/[^.!?]+(?:[.!?](?=\s|$)|$)/g)||[t];
 const first=sentences(desc)[0]?.trim()||'Open the official notice for the programme description.';
 const brief=first.length>380?first.slice(0,377).replace(/\s+\S*$/,'')+'…':first;
 const categories=g.applicantTypes||[];
 const nonprofitTypes=categories.filter(t=>/nonprofit/i.test(t));
 const who=nonprofitTypes.length?'Nonprofits are listed among the applicant categories. Additional conditions apply.':'Check the applicant categories and full eligibility rules before proceeding.';
 const restrictions=sentences(elig).filter(t=>/not eligible|not allowed|must |only |required/i.test(t)).map(t=>t.trim());
 const award=g.awardMin==null&&g.awardMax==null?'Not listed':g.awardMin==null?'Up to '+dollars(g.awardMax):g.awardMax==null?'From '+dollars(g.awardMin):g.awardMin===g.awardMax?dollars(g.awardMin):dollars(g.awardMin)+' to '+dollars(g.awardMax);
 const cost=g.costSharing==null?'Not listed':g.costSharing?'Required':'Not required in listing';
 const paragraphHTML=t=>clean(t).split(/(?<=[.!?])\s+(?=[A-Z])/).reduce((groups,line)=>{if(!groups.length||groups[groups.length-1].length>380)groups.push(line);else groups[groups.length-1]+=' '+line;return groups;},[]).map(t=>'<p>'+esc(t)+'</p>').join('');
 const body=()=>`<section class="opportunity-brief">
 <div class="brief-toolbar"><p class="brief-source">${esc(g.agency)} · ${esc(g.number)}</p><div class="brief-listen"></div></div>
 <div class="brief-facts"><div><small>${g.forecast?'Expected close':'Deadline'}</small><strong>${day(g.deadline)}</strong></div><div><small>Funding</small><strong>${esc(award)}</strong></div><div><small>Cost sharing</small><strong>${cost}</strong></div></div>
 ${g.deadlineNote?`<p class="note">${esc(g.deadlineNote)}</p>`:''}
 ${fitControls(g)}<h3>At a glance</h3><p class="brief-purpose">${esc(brief)}</p>
 <h3>Eligibility</h3><p>${who}</p>
 ${restrictions.length?`<p class="brief-restriction"><strong>Check before applying:</strong> This notice includes specific eligibility restrictions. Review the full rules below.</p>`:''}
 
 <div class="dialog-actions"><button class="btn" data-action="federal-save" data-id="${g.id}">${savedHere?'Remove from shortlist':'Save opportunity'}</button><button class="btn" data-action="federal-document" data-id="${g.id}">${getDocumentId(g.id)?'Open notice file':'Keep a notice file'}</button><button class="btn primary" data-action="federal-draft" data-id="${g.id}">Start draft</button>${savedHere?`<button class="btn" data-action="federal-refresh" data-id="${g.id}">Update saved details</button>`:''}${savedHere&&g.deadline?`<button class="btn" data-action="federal-calendar" data-id="${g.id}">View deadline</button>`:''}</div>
 <details class="brief-full"><summary>Full eligibility and notice</summary><h3>Applicant categories</h3><ul>${categories.map(t=>'<li>'+esc(t)+'</li>').join('')||'<li>See official notice</li>'}</ul><h3>Eligibility rules</h3>${paragraphHTML(elig)||'<p>See official notice.</p>'}<h3>Programme description</h3>${paragraphHTML(desc)}</details>
 <div class="brief-footer">${link(g.url,'Official notice')}<span>Grants.gov · Checked ${new Date(g.fetchedAt).toLocaleDateString()}</span></div>
 </section>`;
 const attach=target=>target.querySelector('.brief-listen')?.append(voiceButton(()=>({kind:'opportunity',description:desc.slice(0,6000),eligibility:elig.slice(0,4000),categories:categories.slice(0,25)})));
 if(reader?.show(String(g.id),'Grants.gov',g.name,body,attach))return;
 showDialog(`<h2 id="dialog-title">${esc(g.name)}</h2>`,body());attach(document.getElementById('detail'));
 }
 async function open(id){
  const seq=++detailId,key=String(id);
  current=null;
  const pending=()=>'<p role="status">Checking the latest official notice.</p>';
  const side=reader?.show(key,'Grants.gov','Opening opportunity…',pending);
  if(!side)showDialog('<h2 id="dialog-title">Opening opportunity…</h2>',pending());
  const active=()=>seq===detailId&&(side?reader.current(key):document.querySelector('#detail')?.open);
  try{
   const response=await fetch('/api/grants/'+encodeURIComponent(id));
   const grant=await response.json();if(!response.ok)throw Error(grant.error||'Unable to open listing.');
   if(active()){current=grant;detail(grant);}
  }catch(error){
   if(!active())return;
   const message=()=>`<p role="alert">${esc(error.message)}</p>${link('https://www.grants.gov/search-results-detail/'+encodeURIComponent(id),'Open official notice')}`;
   if(side)reader.show(key,'Grants.gov','Notice unavailable',message);
   else showDialog('<h2 id="dialog-title">Notice unavailable</h2>',message());
  }
 }
 document.addEventListener('submit',e=>{if(e.target.id!=='federal-search-form')return;e.preventDefault();const f=new FormData(e.target);query=String(f.get('query')).trim();status=String(f.get('status'));nonprofit=String(f.get('nonprofit'));page=1;void search();});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const action=b.dataset.action;if(action==='federal-open')void open(b.dataset.id);if(action==='federal-view'){reader?.clear();const key=b.dataset.view;if(key==='fit'||key==='all'){view='research';research.setFit(key==='fit');}else view=key;render();}if(action==='federal-retry')void search();if(action==='federal-next'){page++;void search();}if(action==='federal-prev'){page--;void search();}if(action==='federal-save'&&current){const next=saved(current.id)?getSaved().filter(g=>g.id!==current.id):[current,...getSaved()];if(next.length>30){toast('Your shortlist holds 30 opportunities. Remove one before adding another.');return;}if(save(next)){render();detail(current);toast(saved(current.id)?'Saved. Its listed deadline is on your calendar.':'Removed from your shortlist.');}}if(action==='federal-refresh'&&current){if(save(getSaved().map(g=>g.id===current.id?current:g))){render();detail(current);toast('Saved details and calendar date updated.');}}if(action==='federal-calendar'&&current?.deadline){closeDialog();calendar(current.deadline);}if(action==='federal-document'&&current){const docId=getDocumentId(current.id);if(docId){closeDialog();openDocument(docId);}else{b.disabled=true;b.textContent='Saving document…';void importGrant(current).catch(error=>{toast(error.message);b.disabled=false;b.textContent='Import to Documents';});}}if(action==='federal-draft'&&current){startDraft(current);}});
 return {projectContext:()=>view==='project'?research.project.context():null,page:pageHTML,open,selectSource(id){reader?.clear();view=id==='federal'?'live':'research';if(view==='research')research.selectSource(id);},resumeNotice(id){if(String(current?.id)===id)detail(current);else void open(id);},mount:()=>{if(location.hash==='#opportunities')reader?.mounted();if(location.hash==='#opportunities'&&view==='research')research.mount();if(view==='live'&&!started&&location.hash==='#opportunities'){started=true;queueMicrotask(()=>void search());}},events:()=>getSaved().filter(g=>g.deadline).map(g=>({id:'federal-'+g.id,title:(g.forecast?'Expected close: ':'')+g.name+' · Grants.gov',forecast:g.forecast,date:g.deadline,type:'opportunity',done:false,source:g.url})),context:()=>getSaved().map(({id,name,number,deadline,url,fetchedAt})=>({id,name,number,deadline,url,fetchedAt,source:'Grants.gov saved snapshot; refresh before advising'}))};
}

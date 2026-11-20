import {csvHeader, reviewImport} from './award-import.mjs';
import {balances, usd, total, nextReview, awardTerms, expenseEntry, reportRecord, financialReport} from './award-ledger.mjs';

const h = s => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (date, year=false) => new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric',...(year?{year:'numeric'}:{})});
const button = (action,label,id='') => `<button type="button" class="aw-action" data-aw="${action}" data-record="${h(id)}">${h(label)}</button>`;
const empty = text => `<p class="aw-muted">${h(text)}</p>`;
const day = value => Date.parse(value+'T00:00:00Z')/86400000;

function balanceChart(book, asOf) {
  const {start,end,amount} = book.terms;
  const entries=balances(book,asOf).entries.slice().sort((a,b)=>a.date.localeCompare(b.date));
  const x = date => 12+496*Math.min(1,Math.max(0,(day(date)-day(start))/Math.max(1,day(end)-day(start))));
  let balance=amount;
  const points=entries.map(e=>({date:e.date,value:(balance-=e.amount)}));
  const upper=Math.max(amount,...points.map(p=>p.value)), lower=Math.min(0,...points.map(p=>p.value));
  const y = v => (15+120*(upper-v)/(upper-lower)).toFixed(2);
  const path='M12 '+y(amount)+points.map(p=>' H'+x(p.date)+' V'+y(p.value)).join('')+' H'+x(asOf);
  return `<svg class="aw-chart" viewBox="0 0 520 150" role="img" aria-label="Remaining award balance from ${h(usd(amount))} to ${h(usd(balance))}. Dashed line shows an even spend to zero by the award end.">
    ${[15,55,95,135].map(v=>`<path d="M12 ${v}H508" stroke="#e6e5de"/>`).join('')}
    <path d="M12 ${y(amount)} L508 ${y(0)}" stroke="#97998d" stroke-width="2" stroke-dasharray="5 6" fill="none"/>
    <path d="${path} V144 H12 Z" fill="#55705d" opacity=".08"/>
    <path d="${path}" stroke="#466952" fill="none" stroke-width="3"/><circle cx="${x(asOf)}" cy="${y(balance)}" r="4" fill="#466952"/>
    </svg><div class="aw-axis"><span>${fmt(start,true)}</span><span>${fmt(end,true)}</span></div>
    <div class="aw-legend"><span>Recorded balance</span><span>Even-spend reference</span></div>`;
}
function budgetRows(rows) {
  return rows.map(c=>`<div class="aw-budget"><div><strong>${h(c.name)}</strong><span>${usd(c.spent)} <small>of ${usd(c.amount)}</small></span></div><meter min="0" max="${Math.max(1,c.amount)}" value="${Math.max(0,Math.min(c.amount,c.spent))}" aria-label="${h(c.name)} spending"></meter>
    ${c.spent>c.amount?`<small class="aw-warn">${usd(c.spent-c.amount)} over budget</small>`:''}</div>`).join('');
}
function periodRows(book) {
  return book.reports.slice().sort((a,b)=>a.due.localeCompare(b.due)).map(r=>`<div class="aw-row"><div><strong>${h(r.title)}</strong><small>${fmt(r.start)} – ${fmt(r.end,true)} · ${r.filed?'Filed '+fmt(r.filed.date):'Due '+fmt(r.due,true)}</small></div>${button('report',r.filed?'View filed copy':'Review draft',r.id)}</div>`).join('') || empty('Add the reporting periods and deadlines specified in the agreement.');
}
export function awardView(book, {asOf,org,back='',source='',ask=false}) {
  const intro=`<div class="aw-kicker">${h(org)} <span>/</span> ${book.example?'Illustrative award':'Award management'}</div>`;
  const heading=`<header class="aw-head"><div>${intro}<h1>Award command center</h1></div>${back}</header>`;
  const title=`<div class="aw-title"><div><h2>${h(book.title)}</h2><p>${h(book.agency)}${book.terms?' · '+h(book.terms.owner):''}</p></div>${source}</div>`;
  if(!book.terms)return `<div class="aw-center">${heading}${title}<section class="aw-card"><h3>Set up this award</h3><p>Confirm the amount, approved budget and performance period from the signed agreement.</p>${button('terms','Enter award terms')}</section></div>`;
  const {terms}=book, b=balances(book,asOf), {report,missing}=nextReview(book,asOf);
  const over=b.categories.filter(c=>c.spent>c.amount);
  const attention=over.length?over[0].name+' is '+usd(over[0].spent-over[0].amount)+' over budget.':missing?missing+' expense'+(missing===1?' needs':'s need')+' a supporting reference.':b.entries.length?'All recorded expenses have a supporting reference.':'No expenses have been recorded for this award.';
  const daysLeft=day(terms.end)-Math.max(day(terms.start),day(asOf))+1;
  const pace=daysLeft>0 && b.remaining>0 ? usd(Math.round(b.remaining*7/daysLeft))+' per week would use the remaining balance by '+fmt(terms.end)+'.' : daysLeft<=0?'The award period has ended.':'The approved award is fully spent.';
  const pct=(100*b.spent/terms.amount).toLocaleString('en-US',{maximumFractionDigits:1});
  return `<div class="aw-center">${heading}${title}
  <div class="aw-brief"><b aria-hidden="true">✦</b><div><strong>${h(attention)}</strong> ${report?`<span>${h(report.title)} ${report.due<asOf?'was due':'is due'} ${fmt(report.due)}.</span>`:''}</div>${ask?button('ask','Ask Beedy ↗'):''}</div>
  <div class="aw-stats">${[['Awarded',usd(terms.amount)],['Recorded spend',usd(b.spent)],['Remaining',usd(b.remaining)]].map(([label,value])=>`<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>
  <div class="aw-grid"><section class="aw-card"><div class="aw-cardhead"><h3>Balance over time</h3><small>Through ${fmt(asOf)}</small></div><p class="aw-number">${pct}% <small>spent</small></p>${balanceChart(book,asOf)}<p class="aw-pace">${h(pace)}</p></section>
  <section class="aw-card"><div class="aw-cardhead"><h3>Budget and actuals</h3><small>USD</small></div>${budgetRows(b.categories)}</section>
  <section class="aw-card"><div class="aw-cardhead"><h3>Spending owners</h3></div>${b.owners.map(o=>`<div class="aw-row"><span>${h(o.name)}</span><strong>${usd(o.amount)}</strong></div>`).join('')||empty('Spending owners appear when an expense is recorded.')}</section>
  <section class="aw-card"><div class="aw-cardhead"><h3>Reporting calendar</h3>${button('schedule','Add period')}</div>${periodRows(book)}</section></div>
  <section class="aw-card aw-ledger"><div class="aw-cardhead"><h3>Expense ledger</h3>${button('expense','Record expense')}</div>${b.entries.length?`<div class="aw-scroll"><table><thead><tr><th>Date</th><th>Expense</th><th>Spending owner</th><th>Reference</th><th>Amount</th></tr></thead><tbody>${b.entries.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(e=>`<tr><td>${fmt(e.date,true)}</td><td><strong>${h(e.memo)}</strong><small>${h(e.category)}</small></td><td>${h(e.owner)}</td><td>${e.reference?h(e.reference):button('reference','Add reference',e.id)}</td><td>${usd(e.amount)}</td></tr>`).join('')}</tbody></table></div>`:empty('Record a charge or credit to start the ledger.')}</section>
  <p class="aw-foot">${h(terms.agreement)} · ${book.example?'All transactions, award terms and outcomes are illustrative. ':''}Figures through ${fmt(asOf,true)}.</p></div>`;
}
const field=(label,input)=>`<label class="field">${label}${input}</label>`;
const input=(label,name,type='text',value='',attr='required')=>field(label,`<input name="${name}" type="${type}" value="${h(value)}" ${attr}>`);
const area=(label,name,value='',attr='')=>field(label,`<textarea name="${name}" rows="3" ${attr}>${h(value)}</textarea>`);
export function bindAwardActions({current,save,dialog,close,render,download,ask}) {
  let edit=null;
  document.addEventListener('change',async ev=>{
    if(ev.target.id!=='award-csv-file' || !ev.target.files[0])return;
    const form=ev.target.form, file=ev.target.files[0];
    try{
      if(file.size>500000)throw Error('Import up to 500 KB at a time.');
      form.elements.csv.value=await file.text();
    }catch(err){form.querySelector('.aw-error').textContent=err.message;}
  });
  document.addEventListener('click',ev=>{
    const target=ev.target.closest('[data-aw]');
    if(!target)return;
    const context=current(); if(!context)return;
    const {book,asOf}=context, action=target.dataset.aw, id=target.dataset.record;
    const report=book.reports.find(r=>r.id===id);
    if(action==='ask'){ask?.();return;}
    if(action==='export' && report){download('Grant report - '+report.title+'.txt',financialReport(book,report,asOf));return;}
    let title, body, submit='Save';
    if(action==='terms'){
      title='Award terms';body=input('Confirmed award (USD)','amount','number',book.knownAmount || '','required step=".01" min=".01"')+input('Award starts','start','date')+input('Award ends','end','date')+input('Grant owner','owner')+input('Agreement or notice reference','agreement')+area('Approved budget · one Category | Amount per line','budget','','required placeholder="Personnel | 24000"');
    }else if(action==='expense'){
      title='Record expense'; submit='Post to ledger';
      body=input('Expense description','memo')+input('Posted date','date','date',asOf<book.terms.end?asOf:book.terms.end,`required min="${book.terms.start}" max="${asOf<book.terms.end?asOf:book.terms.end}"`)+input('Amount in USD · use a negative amount for a credit','amount','number','','required step=".01"')+field('Budget category','<select name="category">'+book.terms.budget.map(c=>'<option>'+h(c.name)+'</option>').join('')+'</select>')+input('Person or team responsible','owner')+input('Invoice, payroll or receipt reference','reference','text','','maxlength="160"')+button('import','Import a finance CSV instead');
    }else if(action==='import'){
      title='Import finance transactions';submit='Review import';
      body='<p>Use the approved budget category and a stable transaction ID for each row.</p><code class="aw-columns">'+csvHeader+'</code>'+field('Choose a CSV file','<input type="file" id="award-csv-file" accept=".csv,text/csv">')+area('CSV to review','csv','','required');
    }else if(action==='reference'){
      title='Supporting reference';body=input('Invoice, payroll or receipt reference','reference','text','','required maxlength="160"');
    }else if(action==='schedule'){
      title='Schedule a report';body=input('Report name','title')+input('Period starts','start','date',book.terms.start)+input('Period ends','end','date',book.terms.end)+input('Funder due date','due','date');
    }else if(action==='report' && report){
      title=report.title;
      const paper=financialReport(book,report,asOf);
      body=(report.filed?`<p>Filed ${fmt(report.filed.date,true)} · ${h(report.filed.reference)}</p>`:'')+`<pre class="aw-paper">${h(paper)}</pre>`+button('export','Download saved copy',id);
      if(report.filed){dialog(title,body);return;}
      body+=area('Performance against objectives','outcome',report.outcome,'maxlength="3000"')+area('Supporting outcome evidence','evidence',report.evidence,'maxlength="1500"')+`<details class="aw-file"><summary>Record a completed filing</summary>${input('Submission reference','filing','text','','maxlength="160"')}<button class="btn" type="submit" name="mode" value="file">Record as filed today</button></details>`;
      submit='Save report draft';
    }else return;
    edit={book:book.id,action,id,version:JSON.stringify(book)};
    dialog(title,`<form id="award-form" class="aw-form">${body}<p role="alert" class="aw-error"></p><button class="btn primary">${submit}</button></form>`);
  });
  document.addEventListener('submit',ev=>{
    if(ev.target.id!=='award-form')return;
    ev.preventDefault();
    const f=ev.target, values=Object.fromEntries(new FormData(f));
    try{
      const context=current();
      if(!edit || !context || context.book.id!==edit.book || JSON.stringify(context.book)!==edit.version)throw Error('This award changed. Reopen it to review the latest version.');
      const {asOf}=context, book=structuredClone(context.book);
      switch(edit.action){
        case 'terms': book.terms=awardTerms(values);break;
        case 'import':{
          const {fresh,skipped}=reviewImport(book,values.csv,asOf);
          if(!fresh.length)throw Error('All transactions in this file are already recorded.');
          edit.action='post-import';edit.fresh=fresh;
          dialog('Review finance import',`<form id="award-form" class="aw-form"><p>${fresh.length} new transactions · ${usd(total(fresh))} net · ${skipped} already recorded</p><div class="aw-paper">${fresh.map(e=>h(e.date+' · '+e.memo+' · '+e.owner+' · '+usd(e.amount))).join('<br>')}</div><p role="alert" class="aw-error"></p><button class="btn primary">Post reviewed transactions</button></form>`);
          return;
        }
        case 'post-import': book.entries.push(...edit.fresh);break;
        case 'expense': book.entries.push(expenseEntry(book,values,asOf));break;
        case 'reference': {
          const ref=values.reference.trim();if(!ref)throw Error('Enter a supporting reference.');
          book.entries.find(e=>e.id===edit.id).reference=ref;break;
        }
        case 'schedule':book.reports.push(reportRecord(book,values));break;
        case 'report':{
          const r=book.reports.find(x=>x.id===edit.id);
          r.outcome=values.outcome.trim();r.evidence=values.evidence.trim();
          if(ev.submitter?.value==='file'){
            if(asOf<r.end || !values.filing.trim() || !r.outcome || !r.evidence)throw Error('Complete the period, outcome, evidence and submission reference before recording a filing.');
            r.filed={date:asOf,reference:values.filing.trim(),text:financialReport(book,r,asOf)};
          }
          break;
        }
      }
      if(save(book)===false)throw Error('The award could not be saved. Keep this form open and retry.');
      edit=null;close();render();
    }catch(err){f.querySelector('.aw-error').textContent=err.message;}
  });
}


export function portfolioAnalytics(books, asOf, linkTo) {
  if(!books.length)return '';
  const summaries=books.map(book=>({book,summary:balances(book,asOf)}));
  const amount=books.reduce((sum,b)=>sum+b.terms.amount,0);
  const spent=summaries.reduce((sum,row)=>sum+row.summary.spent,0);
  const owners=new Map();
  for(const {summary} of summaries)for(const o of summary.owners)owners.set(o.name,(owners.get(o.name)||0)+o.amount);
  const reports=books.flatMap(b=>b.reports.filter(r=>!r.filed).map(r=>({...r,book:b}))).sort((a,b)=>a.due.localeCompare(b.due));
  const missing=summaries.reduce((n,{summary})=>n+summary.entries.filter(e=>!e.reference).length,0);
  const next=reports[0];
  return `<div class="aw-brief"><b aria-hidden="true">✦</b><div><strong>${next?h(next.book.title)+' · '+h(next.title)+' '+(next.due<asOf?'was due':'is due')+' '+fmt(next.due,true)+'.':'No open reporting deadlines recorded.'}</strong> ${missing?missing+' expense'+(missing===1?' needs':'s need')+' supporting evidence.':''}</div></div>
    <div class="aw-stats">${[['Awarded',amount],['Recorded spend',spent],['Remaining',amount-spent]].map(([label,value])=>`<div><span>${label}</span><strong>${usd(value)}</strong></div>`).join('')}</div>
    <div class="aw-grid"><section class="aw-card"><div class="aw-cardhead"><h3>Spend by award</h3><small>Actuals / award</small></div>${summaries.map(({book,summary})=>`<div class="aw-budget"><div><a href="${h(linkTo(book))}">${h(book.title)}</a><span>${usd(summary.spent)} <small>of ${usd(book.terms.amount)}</small></span></div><meter aria-label="${h(book.title)} spending" min="0" max="${book.terms.amount}" value="${Math.min(book.terms.amount,Math.max(0,summary.spent))}"></meter></div>`).join('')}</section>
    <section class="aw-card"><div class="aw-cardhead"><h3>Spending by team or person</h3></div>${[...owners].sort((a,b)=>b[1]-a[1]).map(([name,value])=>`<div class="aw-row"><span>${h(name)}</span><strong>${usd(value)}</strong></div>`).join('')||empty('No spending recorded.')}</section></div>`;
}

import {validDate} from './agent-protocol.mjs';

export const demoDay = '2026-11-20';
export const usd = cents => (cents / 100).toLocaleString('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: cents % 100 ? 2 : 0
});
export function cents(value) {
  const raw = String(value ?? '').trim();
  if (!/^-?\d{1,10}(\.\d{1,2})?$/.test(raw)) throw Error('Enter a dollar amount with up to two decimal places.');
  const [whole, fraction = ''] = raw.replace('-', '').split('.');
  return (Number(whole) * 100 + Number(fraction.padEnd(2, '0'))) * (raw.startsWith('-') ? -1 : 1);
}
const required = (value, label, limit = 160) => {
  const result = String(value ?? '').trim();
  if (!result || result.length > limit) throw Error('Check ' + label + '.');
  return result;
};
function interval(start, end) {
  if (!validDate(start) || !validDate(end) || end < start) throw Error('Check the start and end dates.');
}
export function awardTerms(input) {
  const amount = cents(input.amount);
  if (amount <= 0) throw Error('Enter the amount confirmed in the award agreement.');
  interval(input.start, input.end);
  const budget = input.budget.split('\n').filter(line => line.trim()).map(line => {
    const match = /^(.+?)\s*\|\s*([\d.]+)\s*$/.exec(line);
    if (!match) throw Error('Enter each budget line as Category | Amount.');
    return {name:required(match[1], 'budget category', 100), amount:cents(match[2])};
  });
  if (!budget.length || new Set(budget.map(b => b.name.toLowerCase())).size !== budget.length ||
      budget.reduce((sum,b) => sum+b.amount,0) !== amount) throw Error('Use distinct categories whose budgets add up to the confirmed award.');
  return {amount, start:input.start, end:input.end, budget, agreement:required(input.agreement,'the agreement reference'), owner:required(input.owner,'the grant owner')};
}
export function expenseEntry(book, input, asOf) {
  if (!book.terms.budget.some(b => b.name === input.category)) throw Error('Choose an approved category.');
  interval(book.terms.start,input.date);
  if (input.date > book.terms.end || input.date > asOf) throw Error('Use a posted date within the award period and through the reporting date.');
  const amount = cents(input.amount);
  if (!amount) throw Error('Enter a charge or a negative credit.');
  return {id:crypto.randomUUID(), amount, date:input.date, category:input.category,
    owner:required(input.owner,'the spending owner'), memo:required(input.memo,'the expense description'),
    reference:String(input.reference || '').trim().slice(0,160)};
}
export function reportRecord(book, input) {
  interval(input.start,input.end);
  if(input.start < book.terms.start || input.end > book.terms.end || !validDate(input.due) || input.due < input.end)
    throw Error('Use an award reporting period and a due date on or after its end.');
  return {id:crypto.randomUUID(),title:required(input.title,'the report name'),start:input.start,end:input.end,due:input.due,
    outcome:String(input.outcome || '').trim().slice(0,3000),evidence:String(input.evidence || '').trim().slice(0,1500)};
}
export const total = list => list.reduce((sum,row) => sum+row.amount,0);
export function balances(book, through) {
  const entries = book.entries.filter(row => row.date <= through);
  const spent = total(entries);
  const categories = book.terms.budget.map(b => ({...b, spent:total(entries.filter(e => e.category === b.name))}));
  const owners = new Map();
  for (const e of entries) owners.set(e.owner,(owners.get(e.owner) || 0)+e.amount);
  return {entries, spent, remaining:book.terms.amount-spent, categories,
    owners:[...owners].map(([name,amount])=>({name,amount})).sort((a,b)=>b.amount-a.amount)};
}
export function financialReport(book, r, through) {
  if (r.filed) return r.filed.text;
  const cutoff = r.end < through ? r.end : through;
  const ledger = balances(book,cutoff);
  const period = ledger.entries.filter(e => e.date >= r.start);
  return [
    book.example ? 'ILLUSTRATIVE CLIENT DEMO' : 'GRANT REPORT WORKING PAPER',
    book.title, r.title, 'Period: '+r.start+' to '+r.end, 'Prepared through: '+cutoff,
    'Due: '+r.due, 'Award terms: '+book.terms.agreement, 'Grant owner: '+book.terms.owner,
    '', 'Awarded: '+usd(book.terms.amount), 'Prior-period spending: '+usd(ledger.spent-total(period)),
    'This period: '+usd(total(period)), 'Cumulative spending: '+usd(ledger.spent), 'Award balance: '+usd(ledger.remaining),
    '', 'Category | Approved budget | This period | Cumulative | Remaining',
    ...ledger.categories.map(c => [c.name,usd(c.amount),usd(total(period.filter(e=>e.category===c.name))),usd(c.spent),usd(c.amount-c.spent)].join(' | ')),
    '', 'Performance against objectives', r.outcome || 'Awaiting program team input.',
    'Evidence: '+(r.evidence || 'Awaiting supporting reference.'),
    '', 'Period transactions | Spending owner | Category | Amount | Evidence',
    ...period.map(e=>[e.date+' '+e.memo,e.owner,e.category,usd(e.amount),e.reference || 'Reference missing'].join(' | ')),
    '', 'Review against the award agreement and transfer approved figures to the funder’s required form.'
  ].join('\n');
}
export function nextReview(book, today) {
  const report = book.reports.filter(r=>!r.filed).sort((a,b)=>a.due.localeCompare(b.due))[0];
  const missing = balances(book,today).entries.filter(e=>!e.reference).length;
  return {report,missing};
}
export function familyDemo() {
  const names=['Navigator time','Travel and interpretation','Evaluation'];
  const add=(id,date,category,amount,owner,memo,reference)=>({id,date,category:names[category],amount,owner,memo,reference});
  return {id:'family-demo',title:'Family Navigation Pilot',example:true,agency:'Child and Family Services Fund',
    terms:{amount:3000000,start:'2026-08-01',end:'2027-01-31',owner:'Grants team',agreement:'Modeled award using Family navigation budget note.docx',
      budget:names.map((name,i)=>({name,amount:[2400000,400000,200000][i]}))},
    entries:[
      add('e1','2026-08-28',0,360000,'Family services','August navigator time','Payroll allocation A-08'),
      add('e2','2026-08-31',1,42500,'Field operations','Caregiver travel','Travel register T-08'),
      add('e3','2026-09-25',0,400000,'Family services','September navigator time','Payroll allocation A-09'),
      add('e4','2026-09-28',2,62000,'Evaluation team','Referral follow-up review','Evaluation invoice E-01'),
      add('e5','2026-10-16',1,68500,'Field operations','Interpretation sessions','Language services L-10'),
      add('e6','2026-10-30',0,400000,'Family services','October navigator time','Payroll allocation A-10'),
      add('e7','2026-11-12',1,39000,'Field operations','Travel reimbursement','')],
    reports:[{id:'interim',title:'Interim financial and progress report',start:'2026-08-01',end:'2026-10-31',due:'2026-11-30',
      outcome:'Modeled result: 18 of 24 participating families completed a first referral. The team is following up with the other six families.',
      evidence:'Illustrative October referral register, aggregate counts.'},
      {id:'final',title:'Final financial and performance report',start:'2026-08-01',end:'2027-01-31',due:'2027-02-28',outcome:'',evidence:''}]};
}


export function transitionDemo() {
  const category='Transition services';
  return {id:'transition-demo',title:'Independent Living Transition Support',example:true,agency:'Youth transition funding scenario',
    terms:{amount:1200000,start:'2026-06-01',end:'2026-11-30',owner:'Program team',agreement:'Modeled from the Youth transition support closeout example',
      budget:[{name:category,amount:1200000}]},
    entries:['2026-06-24','2026-07-23','2026-08-24','2026-09-24','2026-10-23'].map((date,i)=>({
      id:'transition-'+i,date,category,amount:225000,owner:'Independent living team',memo:'Transition planning and mentoring',reference:'Illustrative service log '+(i+1)})),
    reports:[{id:'closeout',title:'Transition support closeout',start:'2026-06-01',end:'2026-11-30',due:'2026-12-15',outcome:'',evidence:''}]};
}

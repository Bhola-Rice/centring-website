import test from 'node:test';
import assert from 'node:assert/strict';
import {awardTerms, balances, cents, demoDay, expenseEntry, familyDemo, financialReport, reportRecord} from '../web/award-ledger.mjs';
import {csvHeader,reviewImport} from '../web/award-import.mjs';
import {awardView} from '../web/award-center.mjs';
import {executeTool} from '../worker/agent.mjs';
import {sharedPart} from '../web/shared-workspace.mjs';

test('award terms reconcile to cents and validate the agreement period',()=>{
  const terms={start:'2026-01-01',end:'2026-06-30',owner:'Programs',agreement:'A1',amount:'300.19',budget:'Staff | 200.10\nTravel | 100.09'};
  assert.equal(awardTerms(terms).amount,30019);
  for(const change of [{budget:'Staff | 300.18'},{end:'2025-01-01'},{start:'2026-02-30'},{budget:'Staff | 150.10\nstaff | 150.09'}])assert.throws(()=>awardTerms({...terms,...change}));
  assert.equal(cents('-0.09'),-9);
});
test('award balance reflects credits and overspend, report excludes later expenses',()=>{
  const b=familyDemo(),r=b.reports[0], before=balances(b,demoDay);
  assert.equal(before.spent,1372000);
  assert.equal(before.remaining,1628000);
  assert.equal(balances(b,r.end).spent,1333000);
  const saved=financialReport(b,r,demoDay);
  assert.match(saved,/This period: \$13,330/);assert.doesNotMatch(saved,/Travel reimbursement/);
  r.filed={reference:'R01',date:demoDay,text:saved};
  b.entries.push({...b.entries[0],amount:3000000});
  assert.ok(balances(b,demoDay).remaining<0);assert.equal(financialReport(b,r,demoDay),saved);
  const credit=expenseEntry(b,{...b.entries[0],amount:'-0.01'},demoDay);
  assert.equal(credit.amount,-1);
  assert.throws(()=>expenseEntry(b,{...b.entries[0],amount:'2',date:'2026-12-08'},demoDay));
  assert.throws(()=>reportRecord(b,{...r,due:'2026-07-01'}));
});
test('finance imports are atomic, tolerate quoted CSV, and deduplicate stable IDs',()=>{
  const b=familyDemo(),line='t01,2026-09-04,Navigator time,10.10,Programs,"visit, follow-up",abc';
  const review=reviewImport(b,csvHeader+'\r\n'+line+'\n'+line,demoDay);
  assert.equal(review.fresh.length,1);assert.equal(review.skipped,1);assert.equal(review.fresh[0].memo,'visit, follow-up');
  assert.throws(()=>reviewImport(b,csvHeader+'\n'+line+'\n'+line.replace('10.10','10.20'),demoDay));
  assert.equal(b.entries.length,7);b.entries.push(...review.fresh);
  assert.equal(reviewImport(b,csvHeader+'\n'+line,demoDay).fresh.length,0);
});
test('example is labeled, dynamic fields are escaped, and new award data follows shared sync',()=>{
  const b=familyDemo();b.title='<b>unsafe</b>';
  const html=awardView(b,{asOf:demoDay,org:'Upbring'});
  assert.match(html,/&lt;b&gt;unsafe/);assert.match(html,/Illustrative award/);
  const books={a:{terms:b.terms,entries:b.entries,reports:b.reports}};
  assert.deepEqual(sharedPart({awardBooks:books,other:3}),{awardBooks:books});
  const awards={remaining:1628000,amountUnit:'integer cents'};
  assert.deepEqual(executeTool('inspect_workspace',{section:'awards'},{awards},[]),awards);
});

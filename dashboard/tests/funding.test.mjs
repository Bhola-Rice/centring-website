import test from 'node:test';
import assert from 'node:assert/strict';
import {localDatabase} from '../scripts/local-db.mjs';
import {generateApplication} from '../worker/application-draft.mjs';
import {handleFunding,searchFunding} from '../worker/funding.mjs';

test('the imported inventory and its excerpts stay inaccessible even when present in the database',async()=>{
 const DB=localDatabase(':memory:');
 const request=(view,identity)=>new Request('https://demo.test/api/funding?'+view,{headers:identity?{'oai-authenticated-user-id':identity}:{}});
 try{
  const put=DB.prepare('INSERT INTO funding_records VALUES (?,?,?,?,?,?,?,?,?)');
  for(const [id,source,title,status] of [['x','calendar','Youth services','Recurring date'],['y','pharos','Youth education','archived'],['z','arachne','Youth support','needs_review']]){
   await put.bind(id,source,title,'Example funder',status,'2027-03-10','Verify the cycle.',null,'Source excerpt').run();
  }
  await assert.rejects(
   generateApplication({researchId:'x',templateText:'Describe the project.',mission:'Youth services'},{},null,{DB}),
   /selected funding record is no longer available/
  );
  const bytes=Uint8Array.of(82,73,70,70);
  await DB.prepare('INSERT INTO funding_excerpts VALUES (?,?)').bind('x',bytes).run();
  assert.equal((await handleFunding(request('view=excerpt&id=x'),{DB})).status,401);
  const original=await handleFunding(request('view=excerpt&id=x','first'),{DB});
  assert.equal(original.status,404);
  assert.equal((await handleFunding(request('view=calendar'),{DB})).status,401);
  for(const identity of ['first','second']){
   const response=await handleFunding(request('view=calendar',identity),{DB});
   assert.equal(response.status,200);
   const {results}=await response.json();
   assert.deepEqual(results,[]);
  }
  assert.equal((await searchFunding(DB,{query:'youth'})).total,1);
  assert.equal((await searchFunding(DB,{query:'youth',includeClosed:true})).total,2);
  for(const query of ['source=calendar','q=Youth+services','q=Youth+services&closed=1']){
   const response=await handleFunding(request(query,'first'),{DB});
   assert.deepEqual(await response.json(),{total:0,results:[]});
  }
  assert.equal((await searchFunding(DB,{query:'youth support',source:'arachne'})).results[0].id,'z');
 }finally{DB.close();}
});

test('programme matches rank source language before pagination and exclude calendar and past dates',async()=>{
 const db=localDatabase(':memory:');
 try{
  const insert=db.prepare('INSERT INTO funding_records VALUES (?,?,?,?,?,?,?,?,?)');
  for(let index=0;index<18;index++){
   await insert.bind('body-'+index,'pharos','Programme '+index,'Funder','posted','2099-01-01','Support for foster care.',null,'Notice').run();
  }
  for(const [id,source,date] of [['title','arachne',null],['internal','calendar',null],['expired','pharos','2000-01-01']]){
   await insert.bind(id,source,'Foster care funding','Funder','posted',date,'',null,'Notice').run();
  }
  const filter={fitTerms:['foster care']};
  const first=await searchFunding(db,filter),next=await searchFunding(db,{...filter,page:2});
  assert.equal(first.total,19);assert.equal(first.results[0].id,'title');
  assert.deepEqual(first.results[0].matches,['foster care']);
  assert.equal(next.results.length,7);
  assert.equal(new Set([...first.results,...next.results].map(row=>row.id)).size,19);
  assert.equal((await searchFunding(db,{...filter,source:'calendar',includeClosed:true})).total,0);
  assert.equal((await searchFunding(db,{fitTerms:[]})).total,0);
 }finally{db.close();}
});

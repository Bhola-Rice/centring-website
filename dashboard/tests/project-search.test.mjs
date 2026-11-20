import test from 'node:test';
import assert from 'node:assert/strict';
import {localDatabase} from '../scripts/local-db.mjs';
import {handleProjectSearch} from '../worker/project-search.mjs';
const origin='https://example.test';
const request=(body,headers={})=>new Request(origin+'/api/funding/project',{method:'POST',headers:{origin,'oai-authenticated-user-id':'member',...headers},body:JSON.stringify(body)});
test('project matches use active catalogue evidence and reject ungrounded model selections',async()=>{
 const DB=localDatabase(':memory:'),env={DB,OPENAI_API_KEY:'test'};
 try{
  for(const [id,source,date] of [['pharos-1','pharos',null],['calendar-1','calendar',null],['pharos-2','pharos','2000-01-01'],['arachne-1','arachne',null]]){
   await DB.prepare('INSERT INTO funding_records VALUES (?,?,?,?,?,?,?,?,?)').bind(id,source,'Mentoring programme','Example','posted',date,'Grants for foster care mentoring.',null,'').run();
  }
  const body={action:'match',brief:'Mentoring in Houston',terms:['foster care','mentoring']};
  const result=await handleProjectSearch(request(body),env,async(url,options)=>{
   const prompt=JSON.parse(JSON.parse(options.body).input);
   assert.deepEqual(prompt.notices.map(n=>n.id).sort(),['arachne-1','pharos-1']);assert.equal(prompt.profile.name,'Upbring');
   const item={id:'pharos-1',evidenceIndex:1,decision:'Check a condition',reason:'Mentoring is listed.',nextStep:'Confirm service area.',award:'$100,000'};
   const matches=[item,item,{...item,id:'unknown'},{...item,id:'arachne-1',evidenceIndex:999}];
   return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({matches})}]}]});
  });
  assert.equal(result.status,200);const data=await result.json();assert.equal(data.reviewed,2);assert.equal(data.results.length,1);assert.equal(data.results[0].insight.award,'');
  assert.equal((await handleProjectSearch(request(body,{origin:'https://other.test'}),env)).status,403);
  assert.equal((await handleProjectSearch(request(body,{'oai-authenticated-user-id':''}),env)).status,401);
 }finally{DB.close();}
});

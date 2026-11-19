import test from 'node:test';
import assert from 'node:assert/strict';
import {assessOpportunity} from '../worker/opportunity-fit.mjs';

const identity={id:'fit-test'};
function notice(){return Response.json({errorcode:0,data:{id:363694,opportunityTitle:'Children and Youth Research Network',forecast:{forecastDesc:'A network of clinical research sites.',applicantEligibilityDesc:'Research partners required.'}}});}

test('federal fit assesses the actual notice with the organisation profile',async()=>{
 const result=await assessOpportunity('federal-363694',{OPENAI_API_KEY:'test'},identity,async(url,request)=>{
  if(!url.includes('api.openai.com'))return notice();
  const {input}=JSON.parse(request.body),{organisation,notice:source}=JSON.parse(input);
  assert.equal(organisation.name,'Upbring');assert.equal(organisation.reach,'Texas');
  assert.equal(source.forecast,true);assert.equal(source.eligibility,'Research partners required.');
  return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({decision:'Conditional fit',note:'Child services align with the population, but a research network is central.',eligibility:'Research partners are required and are undocumented.'})}]}]});
 });
 assert.equal(result.kind,'assessment');assert.equal(result.decision,'Conditional fit');assert.equal(result.source,'Grants.gov');
});

test('without AI a programme screen is distinguished from the full review',async()=>{
 const result=await assessOpportunity('federal-363694',{},identity,async()=>notice());
 assert.equal(result.kind,'screen');assert.equal(result.decision,'Fit unconfirmed');
});

test('an incomplete response is never stored as a recommendation',async()=>{
 await assert.rejects(assessOpportunity('federal-363694',{OPENAI_API_KEY:'test'},identity,async url=>url.includes('api.openai.com')?Response.json({output:[],status:'incomplete'}):notice()));
});

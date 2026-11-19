import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isRetiredStarter} from '../web/lantern-brief.mjs';
import {activeChatTurns} from '../web/workspace-origin.mjs';
import {bindOrganisation,organisationForIdentity} from '../worker/organisation.mjs';
import {readKnowledge,writeKnowledge,knowledgeOwner} from '../worker/knowledge.mjs';
import {localDatabase} from '../scripts/local-db.mjs';

const legacy={id:'generated-123',name:'Residential services.docx',applicationDraft:{organisation:'Lantern Row Heritage Commons',sections:[{answer:'Approved by our earlier team.'}]}};
const active={id:'upbring-1',name:'Residential services.docx',text:'Upbring provides residential services.'};

test('a grant keeps its real funder title while a draft or source for the previous applicant stays out of Upbring',()=>{
 assert.ok(isRetiredStarter(legacy));
 assert.ok(isRetiredStarter({...active,sourcePages:[{text:'Prepared for Lantern Row Heritage Commons'}]}));
 assert.equal(isRetiredStarter(active),false);
 const workspace=bindOrganisation({documents:[legacy,active],documentLibrary:[{name:'outline for Lantern Row Heritage Com — application.docx'}],applications:{a:legacy,b:active}},organisationForIdentity({id:'demo:test'}));
 assert.deepEqual(workspace.documents,[active]);
 assert.deepEqual(workspace.documentLibrary,[]);
 assert.deepEqual(workspace.applications,{b:active});
});

test('an old mismatch and its question are excluded together',()=>{
 const messages=[{role:'user',text:'Check the attached draft.'},{role:'assistant',text:'It refers to Lantern Row.'},{role:'user',text:'Review our Upbring timeline.'}];
 assert.deepEqual(activeChatTurns(messages),messages.slice(2));
});

test('a saved budget for a retired project cannot become an Upbring fact',async()=>{
 const env={DB:localDatabase(':memory:')},user={id:'demo:session',name:'BeedyRootKiwi'};
 try{
  const old={projects:[{id:'old',name:'Family Studio Saturdays'},{id:'new',name:'Family Navigation Pilot'}],facts:[{id:'budget',question:'Budget?',answer:'12000',scope:'project',projectId:'old'}]};
  await env.DB.prepare('INSERT INTO nonprofit_knowledge (owner, revision, data, updated_at) VALUES (?, ?, ?, ?)').bind(knowledgeOwner(user),1,JSON.stringify(old),new Date().toISOString()).run();
  const clean=await readKnowledge(env,user);
  assert.deepEqual(clean.projects,[old.projects[1]]);
  assert.deepEqual(clean.facts,[]);
  await writeKnowledge(env,user,clean);
  assert.deepEqual((await readKnowledge(env,user)).facts,[]);
  const row=await env.DB.prepare('SELECT data FROM nonprofit_knowledge WHERE owner = ?').bind(knowledgeOwner(user)).first();
  assert.deepEqual(JSON.parse(row.data).retiredRecords.facts,old.facts);
 }finally{env.DB.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {applicationStage,narrativeCopy,recordProgress,opportunityKey} from '../web/application-record.mjs';

test('submitted answers are detached from subsequent draft edits',()=>{
 const draft={title:'Pilot',sections:[{question:'Budget',answer:'$30,000',status:'approved'}]};
 const snapshot=narrativeCopy(draft);
 draft.sections[0].answer='$40,000';
 assert.deepEqual(snapshot.sections,[{question:'Budget',answer:'$30,000'}]);
});
test('preparation counts actual approved sections and completed tasks',()=>{
 assert.deepEqual(recordProgress([true,true,false],[{done:true}]),{value:75,label:'Preparation',detail:'3 of 4 items complete'});
 assert.equal(recordProgress([],[]).value,0);
});
test('a task assigned during federal fit review follows the notice through either finder',()=>{
 assert.equal(opportunityKey({researchId:'pharos-grants_gov/42'}),opportunityKey({id:42}));
 assert.notEqual(opportunityKey({researchId:'arachne-42'}),opportunityKey({id:42}));
});

test('application status follows the written narrative and its reviews',()=>{
 const sections=[{answer:'A',status:'draft'},{answer:'',status:'draft'}];
 const doc={applicationDraft:{sections}};
 assert.equal(applicationStage(doc),'draft');
 sections[1].answer='B';
 assert.equal(applicationStage(doc),'ready');
 sections[0].status='approved';
 assert.equal(applicationStage(doc),'review');
 sections[1].status='approved';
 assert.equal(applicationStage(doc),'reviewed');
 doc.submissionCopy=narrativeCopy(doc.applicationDraft);
 assert.equal(applicationStage(doc),'submitted');
 doc.funderDecision={outcome:'declined',date:'2026-11-19'};
 assert.equal(applicationStage(doc),'declined');
 doc.funderDecision.outcome='awarded';
 assert.equal(applicationStage(doc),'awarded');
});
test('previously recorded submissions and decisions survive a reopened draft',()=>{
 assert.equal(applicationStage({trackingStage:'draft',submissionCopy:{date:'2026-11-19'}}),'submitted');
 assert.equal(applicationStage({trackingStage:'review'}),'review');
 for(const stage of ['awarded','declined','submitted','received']){
  assert.equal(applicationStage({trackingStage:stage}),stage);
  assert.equal(applicationStage(null,{status:stage}),stage);
 }
});

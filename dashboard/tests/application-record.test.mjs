import test from 'node:test';
import assert from 'node:assert/strict';
import {narrativeCopy,recordProgress,opportunityKey} from '../web/application-record.mjs';

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

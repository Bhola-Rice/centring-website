import test from 'node:test';
import assert from 'node:assert/strict';
import {localDatabase} from '../scripts/local-db.mjs';
import {importFundingBatch} from '../worker/funding-import.mjs';
test('catalogue import requires operator access and upserts only source records',async()=>{
 const DB=localDatabase(':memory:'),env={DB,FUNDING_IMPORT_KEY:'test-key'};
 const send=(record,key='test-key')=>importFundingBatch(new Request('https://example.test/api/funding/import',{method:'POST',headers:{Authorization:'Bearer '+key},body:JSON.stringify([record])}),env);
 const row={id:'arachne-1',source:'arachne',title:'Programme',funder:'Foundation',status:'Open',date:null,summary:'',url:null,reference:'Grant 1'};
 try{
  assert.equal((await send(row,'wrong')).status,401);
  assert.equal((await send({...row,source:'calendar'})).status,400);
  assert.equal((await send(row)).status,200);
  assert.equal((await send({...row,title:'Revised programme'})).status,200);
  assert.deepEqual({...await DB.prepare('select count(*) as n,max(title) as title from funding_records').first()},{n:1,title:'Revised programme'});
 }finally{DB.close();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {localDatabase} from '../scripts/local-db.mjs';
import {importFundingBatch} from '../worker/funding-import.mjs';
test('catalogue import requires operator access and upserts only source records',async()=>{
 const secret='a'.repeat(64),timestamp=Math.floor(Date.now()/1000);
 const key=(timestamp+1800)+'.'+secret;
 const DB=localDatabase(':memory:'),env={DB,FUNDING_IMPORT_KEY:key};
 const send=(record,token=key)=>importFundingBatch(new Request('https://example.test/api/funding/import',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify([record])}),env);
 const row={id:'arachne-1',source:'arachne',title:'Programme',funder:'Foundation',status:'Open',date:null,summary:'',url:null,reference:'Grant 1'};
 try{
  for(const invalid of [secret,(timestamp-1)+'.'+secret,(timestamp+172800)+'.'+secret]){
   env.FUNDING_IMPORT_KEY=invalid;
   assert.equal((await send(row,invalid)).status,404);
  }
  env.FUNDING_IMPORT_KEY=key;
  assert.equal((await send(row,'wrong')).status,401);
  assert.equal((await send({...row,source:'calendar'})).status,400);
  assert.equal((await send(row)).status,200);
  assert.equal((await send({...row,title:'Revised programme'})).status,200);
  assert.deepEqual({...await DB.prepare('select count(*) as n,max(title) as title from funding_records').first()},{n:1,title:'Revised programme'});
 }finally{DB.close();}
});

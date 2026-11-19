// Operator-only ingestion. This route can write catalogue metadata only.
export async function importFundingBatch(request,env){
 const reply=(message,status)=>Response.json(message,{status,headers:{'Cache-Control':'no-store'}});
 if(!env.FUNDING_IMPORT_KEY||!['GET','POST'].includes(request.method))return reply({error:'Not found'},404);
 if(request.headers.get('Authorization')!=='Bearer '+env.FUNDING_IMPORT_KEY)return reply({error:'Unauthorised'},401);
 if(request.method==='GET'){
  const {results}=await env.DB.prepare("SELECT source, count(*) AS total FROM funding_records WHERE source IN ('pharos','arachne') GROUP BY source").all();
  return reply({counts:Object.fromEntries(results.map(row=>[row.source,row.total]))},200);
 }
 const reader=request.body?.getReader();
 if(!reader)return reply({error:'Missing batch'},400);
 const chunks=[];let size=0;
 for(;;){
  const {value,done}=await reader.read();if(done)break;
  size+=value.byteLength;
  if(size>90000){await reader.cancel();return reply({error:'Batch too large'},413);}
  chunks.push(value);
 }
 let rows;
 try{rows=JSON.parse(await new Blob(chunks).text());}catch{return reply({error:'Invalid JSON'},400);}
 const valid=r=>r&&['pharos','arachne'].includes(r.source)&&typeof r.id==='string'&&r.id.startsWith(r.source+'-')&&r.id.length<=300&&typeof r.title==='string'&&r.title.trim()&&['funder','status','summary','reference'].every(k=>typeof r[k]==='string')&&(r.date===null||/^\d{4}-\d{2}-\d{2}$/.test(r.date))&&(r.url===null||/^https?:\/\//i.test(r.url));
 if(!Array.isArray(rows)||!rows.length||rows.length>400||!rows.every(valid))return reply({error:'Invalid funding batch'},400);
 await env.DB.prepare(`INSERT INTO funding_records(id,source,title,funder,status,date,summary,url,reference)
 SELECT value->>'id',value->>'source',value->>'title',value->>'funder',value->>'status',value->>'date',value->>'summary',value->>'url',value->>'reference' FROM json_each(?) WHERE true
 ON CONFLICT(id) DO UPDATE SET title=excluded.title,funder=excluded.funder,status=excluded.status,date=excluded.date,summary=excluded.summary,url=excluded.url,reference=excluded.reference`).bind(JSON.stringify(rows)).run();
 return reply({accepted:rows.length},200);
}

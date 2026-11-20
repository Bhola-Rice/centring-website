import {organisationForIdentity} from './organisation.mjs';
import {beedyIdentity} from './auth.mjs';

export async function searchFunding(db,{source='',query='',page=1,includeClosed=false,fitTerms=null,limit=12}={}){
 if(!db)throw new Error('Funding library unavailable.');
 const where=["source IN ('pharos','arachne')"],args=[];
 if(!includeClosed)where.push("lower(status) NOT IN ('closed','archived','expired')");
 if(source){where.push('source = ?');args.push(String(source));}
 for(const term of String(query).trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0,8)){
  where.push("instr(lower(title || ' ' || funder || ' ' || summary), ?) > 0");
  args.push(term.slice(0,100));
 }
 const terms=fitTerms?.filter(Boolean).slice(0,16);
 const fields="lower(title || ' ' || coalesce(summary,''))";
 if(terms){
  where.push(terms.length?'('+terms.map(()=>'instr('+fields+', ?) > 0').join(' OR ')+')':'0');args.push(...terms);
  if(!includeClosed)where.push("(date IS NULL OR date >= date('now'))");
 }
 const relevance=terms?.length?terms.map(()=>"CASE WHEN instr(lower(title), ?) > 0 THEN 2 WHEN instr(lower(coalesce(summary,'')), ?) > 0 THEN 1 ELSE 0 END").join(" + ")+" DESC,":"";
 const filter=' WHERE '+where.join(' AND ');
 const {total}=await db.prepare('SELECT count(*) AS total FROM funding_records'+filter).bind(...args).first();
 const offset=(Math.max(1,Math.min(100000,Math.floor(Number(page))||1))-1)*limit;
 const {results}=await db.prepare('SELECT * FROM funding_records'+filter+` ORDER BY ${relevance}
  CASE WHEN lower(status) IN ('posted','open') AND (date>=date('now') OR date IS NULL) THEN 1
       WHEN source='arachne' THEN 2 ELSE 3 END,
  date IS NULL, date, title, id LIMIT ? OFFSET ?`).bind(...args,...(terms||[]).flatMap(t=>[t,t]),limit,offset).all();
 return {total,results:terms?results.map(row=>({...row,matches:terms.filter(term=>[row.title,row.summary].some(text=>text?.toLowerCase().includes(term)))})):results};
}

export async function handleFunding(request,env){
 const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
 if(request.method!=='GET')return reply({error:'Method not allowed.'},405);
 const identity=await beedyIdentity(request,env);
 if(!identity)return reply({error:'Sign in to view funding research.'},401);
 const params=new URL(request.url).searchParams;
 try{
  // Older clients request this feed on startup. An empty feed also clears their in-memory dates.
  if(params.get('view')==='calendar')return reply({results:[]});
  if(params.has('view'))return reply({error:'Funding resource unavailable.'},404);
  return reply(await searchFunding(env.DB,{source:params.get('source'),query:params.get('q')||'',page:params.get('page'),includeClosed:params.get('closed')==='1',fitTerms:params.get('fit')==='1'?organisationForIdentity(identity)?.fundingTerms||[]:null}));
 }catch{return reply({error:'The funding library could not be read. Try again shortly.'},503);}
}

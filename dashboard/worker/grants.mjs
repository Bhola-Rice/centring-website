// Public, read-only Grants.gov endpoints. Never forward upstream tokens or HTML.
const GRANTS_API='https://api.grants.gov/v1/api/';
const grantError=(message,status=502)=>Object.assign(new Error(message),{status});
export function grantText(value,max=16000){return String(value??'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/g,"'").replace(/&(ndash|mdash|rsquo|lsquo|ldquo|rdquo|lt|gt);/gi,(_,key)=>({ndash:'–',mdash:'—',rsquo:'’',lsquo:'‘',ldquo:'“',rdquo:'”',lt:'<',gt:'>'}[key.toLowerCase()])).replace(/&#(x[0-9a-f]+|[0-9]+);/gi,(_,n)=>{const code=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return code>0&&code<=0x10ffff?String.fromCodePoint(code):'';}).replace(/[ \t]+/g,' ').trim().slice(0,max);}
export function grantDate(value){
 const s=String(value||'');let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);if(!m){const a=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(a)m=[a[0],a[3],a[1],a[2]];}
 if(!m)return '';const iso=m.slice(1).join('-'),d=new Date(iso+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===iso?iso:'';
}
export function grantLinks(id,number){return {url:'https://www.grants.gov/search-results-detail/'+id,simplerUrl:'https://simpler.grants.gov/search?query='+encodeURIComponent(number)};}
export function grantSearchParams(input={}){
 const query=typeof input.query==='string'?input.query.trim():'';if(query.length>200)throw grantError('Keep your search under 200 characters.',400);
 const status=input.status||'posted';if(!['posted','forecasted','both'].includes(status))throw grantError('Choose open or forecast opportunities.',400);
 const nonprofit=input.nonprofit||'any';if(!['any','501c3','non501c3'].includes(nonprofit))throw grantError('Choose a valid applicant type.',400);
 const page=Number(input.page||1);if(!Number.isInteger(page)||page<1||page>100)throw grantError('Choose a page between 1 and 100.',400);
 return {query,status,nonprofit,page};
}
async function grantRequest(endpoint,body,fetcher){
 const response=await fetcher(GRANTS_API+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(18000)});
 if(!response.ok){await response.body?.cancel();throw grantError(response.status===429?'Grants.gov is busy. Try again shortly.':'Grants.gov could not be reached. Please try again.',response.status===429?429:502);}
 const reader=response.body.getReader(),chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>3000000){await reader.cancel();throw grantError('This listing is too large to load. Open it on Grants.gov.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 let payload;try{payload=JSON.parse(new TextDecoder().decode(bytes));}catch{throw grantError('Grants.gov returned an unreadable response. Try again.');}
 if(payload.errorcode!==0||!payload.data)throw grantError('Grants.gov could not return this listing. Try the official search.');return payload.data;
}
export async function searchFederalGrants(input={},fetcher=fetch){
 const p=grantSearchParams(input);
 const data=await grantRequest('search2',{keyword:p.query,oppStatuses:p.status==='both'?'posted|forecasted':p.status,eligibilities:p.nonprofit==='501c3'?'12|99':p.nonprofit==='non501c3'?'13|99':'',rows:12,startRecordNum:(p.page-1)*12},fetcher);
 if(!Array.isArray(data.oppHits))throw grantError('Grants.gov returned an unexpected search response.');
 return {source:'Grants.gov',fetchedAt:new Date().toISOString(),...p,total:Number(data.hitCount)||0,pageSize:12,results:data.oppHits.slice(0,12).filter(o=>/^\d{1,10}$/.test(String(o.id))).map(o=>({id:String(o.id),name:grantText(o.title,700),number:grantText(o.number,180),agency:grantText(o.agency,500),status:grantText(o.oppStatus,40),deadline:grantDate(o.closeDate),posted:grantDate(o.openDate),...grantLinks(o.id,o.number)}))};
}
export async function getFederalGrant(id,fetcher=fetch){
 if(!/^\d{1,10}$/.test(String(id)))throw grantError('Invalid opportunity ID.',400);
 const d=await grantRequest('fetchOpportunity',{opportunityId:Number(id)},fetcher);
 if(String(d.id)!==String(id))throw grantError('This opportunity could not be found.',404);
 const s=d.synopsis||d.forecast||{},forecast=!d.synopsis&&!!d.forecast;
 const amount=v=>v!==undefined&&v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
 const attachments=(d.synopsisAttachmentFolders||[]).flatMap(f=>(f.synopsisAttachments||[]).filter(a=>/^\d{1,12}$/.test(String(a.id))).map(a=>({id:'attachment-'+a.id,name:grantText(a.fileName,240),description:grantText(a.fileDescription||f.folderType,500),size:Number(a.fileLobSize)||0,type:grantText(a.mimeType,120),url:'https://apply07.grants.gov/grantsws/rest/opportunity/att/download/'+a.id})));
 const related=[{docUrl:s.fundingDescLinkUrl,description:s.fundingDescLinkDesc||'Full funding announcement'},...(d.synopsisDocumentURLs||[])].filter(x=>typeof x.docUrl==='string'&&/^https?:\/\//i.test(x.docUrl)).map((x,i)=>({id:'link-'+i,name:grantText(x.description||'Application information',240),url:x.docUrl}));
 return {id:String(d.id),name:grantText(d.opportunityTitle,700),number:grantText(d.opportunityNumber,180),agency:grantText(s.agencyName||s.agencyDetails?.agencyName||d.agencyDetails?.agencyName,500),forecast,deadline:grantDate(forecast?s.estApplicationResponseDateStr:s.responseDateStr),deadlineNote:grantText(forecast?s.estApplicationResponseDateDesc:s.responseDateDesc,2000),description:grantText(s.synopsisDesc||s.forecastDesc),eligibility:grantText(s.applicantEligibilityDesc,6000),applicantTypes:(s.applicantTypes||[]).slice(0,30).map(a=>grantText(a.description,500)),awardMin:amount(s.awardFloor),awardMax:amount(s.awardCeiling),costSharing:typeof s.costSharing==='boolean'?s.costSharing:null,updated:grantText(s.lastUpdatedDate,100),materials:[...attachments,...related].slice(0,40),materialsCount:attachments.length+related.length,source:'Grants.gov',fetchedAt:new Date().toISOString(),...grantLinks(id,d.opportunityNumber)};
}
export async function handleGrants(request){
 const url=new URL(request.url),headers={'Content-Type':'application/json','X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'};
 const json=(v,status=200)=>Response.json(v,{status,headers});
 if(request.method!=='GET')return json({error:'Method not allowed'},405);
 if(request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Use search from your dashboard.'},403);
 try{if(url.pathname==='/api/grants/search'){return json(await searchFederalGrants({query:url.searchParams.get('q')||'',status:url.searchParams.get('status')||'posted',nonprofit:url.searchParams.get('nonprofit')||'any',page:url.searchParams.get('page')||1}));}
 const match=url.pathname.match(/^\/api\/grants\/(\d{1,10})$/);if(match)return json(await getFederalGrant(match[1]));return json({error:'Listing not found'},404);
 }catch(e){return json({error:e.name==='TimeoutError'?'Grants.gov took too long to respond. Please try again.':e.status?e.message:'Grant search is temporarily unavailable. Please try again.'},e.status||502);}
}

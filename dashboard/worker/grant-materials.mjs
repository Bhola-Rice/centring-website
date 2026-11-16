import {getFederalGrant,grantText} from './grants.mjs';

// URLs must originate in the official notice or its linked announcement.
// Never accept an arbitrary fetch URL from a browser or from an AI response.
export function publicGrantURL(value,base){
 try{if(typeof value!=='string'||!value.trim())return null;const u=new URL(value,base);if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port||!u.hostname.endsWith('.gov')||u.hostname.includes('..'))return null;u.protocol='https:';u.hash='';return u.href;}catch{return null;}
}
export function announcementText(html){
 const content=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||html;
 return grantText(content.replace(/<(script|style|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<\/(?:p|h[1-6]|li|tr|div|section)>|<br\s*\/?\s*>/gi,'\n'),180001).replace(/\n\s*\n+/g,'\n\n');
}
export function announcementLinks(html,base){
 const found=[];
 for(const match of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  const name=grantText(match[2],180),url=publicGrantURL(match[1].replace(/&amp;/g,'&'),base);
  if(url&&url!==base&&!/sign.in|log.in|register|subscribe|privacy|accessibility/i.test(name+' '+url)&&/full (?:announcement|solicitation)|solicitation|application (?:form|questions|instructions|package)|notice of funding|nofo|funding announcement|download.*(?:pdf|word)|instructions.*(?:proposal|application)/i.test(name)&&!found.some(x=>x.url===url))found.push({name:name||'Application instructions',url});
 }
 return found;
}
async function readGrantResource(url,fetcher,signal,maxBytes){
 let current=publicGrantURL(url);if(!current)throw new Error('Open this source on the funder’s website. Automatic reading supports public government sources.');
 for(let redirect=0;redirect<4;redirect++){
  const r=await fetcher(current,{redirect:'manual',signal,headers:{Accept:'text/html,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain;q=0.8'}});
  if([301,302,303,307,308].includes(r.status)){const next=publicGrantURL(r.headers.get('location'),current);await r.body?.cancel();if(!next)throw new Error('The source redirects outside public government websites. Open it with the funder.');current=next;continue;}
  if(!r.ok){await r.body?.cancel();throw new Error(r.status===401||r.status===403?'This source requires access through the funder’s website.':'The funder’s source is temporarily unavailable.');}
  if(Number(r.headers.get('content-length')||0)>maxBytes){await r.body?.cancel();throw new Error('This source exceeds the automatic reading size limit.');}
  const chunks=[],reader=r.body.getReader();let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes){await reader.cancel();throw new Error('This source exceeds the automatic reading size limit.');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return {bytes,url:current,type:(r.headers.get('content-type')||'').split(';')[0].toLowerCase()};
 }
 throw new Error('The source redirected too many times. Open it with the funder.');
}
function materialBase64(bytes){let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(text);}
const materialPriority=m=>/application.*(?:form|question|instruction)|(?:nofo|full announcement|solicitation)/i.test(m.name+' '+(m.description||''))?0:1;
export async function collectGrantMaterials(id,fetcher=fetch,{signal=AbortSignal.timeout(55000)}={}){
 const grant=await getFederalGrant(id,fetcher),sources=[],warnings=[],references=[],visited=new Set();let binaryBytes=0;
 const queue=[...(grant.materials||[])].sort((a,b)=>materialPriority(a)-materialPriority(b)).map(m=>({...m,depth:0}));
 if(!queue.length)warnings.push('The official listing does not publish an application document link. The draft will use the notice and identify questions still needed.');
 for(let fetched=0;queue.length&&fetched<5;){
  const item=queue.shift(),url=publicGrantURL(item.url);
  if(visited.has(url||item.url))continue;visited.add(url||item.url);
  const ref={name:item.name,url:url||(/^https?:\/\//i.test(item.url)?item.url:grant.url),status:'unavailable'};references.push(ref);
  if(!url){warnings.push(item.name+': open this source with the funder; it cannot be read automatically.');continue;}
  fetched++;
  try{
   const r=await readGrantResource(url,fetcher,signal,Math.min(6000000,9000000-binaryBytes));
   const prefix=new TextDecoder().decode(r.bytes.subarray(0,32));let extension='';
   if(prefix.startsWith('%PDF-'))extension='pdf';
   else if(prefix.startsWith('PK')&&(/wordprocessingml/.test(r.type)||/\.docx(?:\?|$)/i.test(item.name+' '+r.url)))extension='docx';
   if(extension){
    binaryBytes+=r.bytes.length;ref.status='downloaded';sources.push({id:'retrieved-'+sources.length,name:item.name.replace(/\.(pdf|docx)$/i,'')+'.'+extension,url:r.url,extension,type:extension==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',base64:materialBase64(r.bytes)});
   }else if(/html|text\/plain/.test(r.type)||/^\s*<!doctype html|^\s*<html/i.test(prefix)){
    const html=new TextDecoder().decode(r.bytes),text=announcementText(html);
    if(text.length<100||(/sign in|log in|access denied|verify.*human/i.test(text)&&text.length<2000))throw new Error('The source does not expose readable application instructions.');
    ref.status='read';sources.push({id:'retrieved-'+sources.length,name:item.name,url:r.url,text:text.slice(0,180000),truncated:text.length>180000});
    if(text.length>180000)warnings.push(item.name+': the source exceeded the reading limit; some requirements may be missing.');
    if(item.depth===0){const links=announcementLinks(html,r.url);queue.unshift(...links.slice(0,2).map(x=>({...x,depth:1})));if(links.length>2)warnings.push(item.name+': additional linked instructions are available on the source website.');}
   }else throw new Error('This file format cannot be read automatically. Open the source with the funder.');
  }catch(error){if(signal.aborted)throw new Error('Reading the application materials took too long. Please try again.');warnings.push(item.name+': '+error.message);}
 }
 if(queue.length||grant.materialsCount>40){warnings.push('Additional materials were not read automatically. Check the official notice for the complete application package.');for(const m of queue.slice(0,20))references.push({name:m.name,url:publicGrantURL(m.url)||grant.url,status:'not_read'});}
 return {grant,sources,warnings:[...new Set(warnings)],references,checkedAt:new Date().toISOString()};
}

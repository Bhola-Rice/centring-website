// Keep public funder requirements separate from nonprofit evidence.
export async function readOpportunityMaterials(packet,readFile,{signal,onProgress=()=>{}}={}){
 const retrievedSources=[],warnings=[...(packet.warnings||[])];let remaining=180000;
 for(const source of packet.sources||[]){
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
  onProgress('Reading '+source.name+'…');
  try{
   let text=source.text||'',truncated=!!source.truncated;
   if(source.base64){
    const bytes=Uint8Array.from(atob(source.base64),c=>c.charCodeAt(0)),file=new File([bytes],source.name,{type:source.type});
    const result=await readFile(file,source.extension,{signal,onProgress});text=result.text||'';
    for(const page of result.sourcePages||[])if(page.warning)warnings.push(source.name+', page '+page.number+': '+page.warning);
   }
   if(!text.trim()){warnings.push(source.name+': no readable text was found.');continue;}
   if(text.length>remaining){truncated=true;warnings.push(source.name+': some text exceeds the reading limit. Check the original requirements.');}
   const kept=text.slice(0,remaining);remaining-=kept.length;
   if(kept)retrievedSources.push({name:source.name,url:source.url,text:kept,truncated});
  }catch(error){if(signal?.aborted)throw error;warnings.push(source.name+': '+error.message);}
 }
 if(!retrievedSources.length)warnings.push('No full application instructions could be read. This draft uses the public notice and must be checked against the funder’s form.');
 return {retrievedSources,retrievalWarnings:[...new Set(warnings)].slice(0,30),sourceReferences:(packet.references||[]).map(r=>({...r,status:retrievedSources.some(s=>s.url===r.url||s.name===r.name)?'read':r.status==='downloaded'?'unreadable':r.status}))};
}

// Consume operational events as they arrive. Older servers return the same result as JSON.
export async function readBeedyResponse(response,onStep){
 if(!response.headers.get('content-type')?.includes('application/x-ndjson'))return response.json();
 const reader=response.body.pipeThrough(new TextDecoderStream()).getReader();
 let buffer='';
 try{
  for(;;){
   const {value,done}=await reader.read();
   buffer+=value||'';
   const lines=buffer.split('\n');buffer=lines.pop();
   for(const line of lines){
    if(!line.trim())continue;
    const event=JSON.parse(line);
    if(event.type==='step')onStep(event.label,event.detail,event.state);
    if(event.type==='result')return event.result;
    if(event.type==='error')throw new Error(event.message);
   }
   if(done)throw new Error('The connection ended before Beedy finished. Please try again.');
  }
 }finally{reader.releaseLock();}
}

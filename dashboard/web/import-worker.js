// Parsing stays on the visitor's device, away from the main UI thread.
self.onmessage=async ({data:{buffer,ext,extractImages}})=>{
 try{
 let text='',pages=null,images=[];
 if(ext==='docx'){
  // Bound the declared expanded ZIP size before parsing a compressed document.
  const view=new DataView(buffer);let expanded=0,entries=0;
  for(let i=0;i<view.byteLength-46;i++){if(view.getUint32(i,true)===0x02014b50){expanded+=view.getUint32(i+24,true);entries++;i+=45+view.getUint16(i+28,true)+view.getUint16(i+30,true)+view.getUint16(i+32,true);}}
  if(!entries||expanded>25*1024*1024)throw new Error('This Word document is too large to unpack. Export a shorter section as TXT or PDF.');
  importScripts('./vendor/mammoth.browser.min.js');const result=await mammoth.extractRawText({arrayBuffer:buffer});text=result.value;
  if(extractImages||text.replace(/\s/g,'').length<35){importScripts('./vendor/jszip.min.js');const zip=await JSZip.loadAsync(buffer);const files=Object.values(zip.files).filter(f=>/^word\/media\/.+\.(png|jpe?g)$/i.test(f.name)&&!f.dir);if(files.length>20)throw new Error('This Word file has more than 20 images. Export it as a PDF for OCR.');for(const entry of files){images.push({name:entry.name,buffer:await entry.async('arraybuffer'),type:/png$/i.test(entry.name)?'image/png':'image/jpeg'});}}

 }else{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}
 self.postMessage({ok:true,text,pages,images});
 }catch(error){self.postMessage({ok:false,error:error.name==='PasswordException'?'This PDF is password protected. Upload an unlocked copy.':error.message||'Could not read this document.'});}
};

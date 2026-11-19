import {openPdf, pageCanvas} from './document-reader.mjs';

const normalized = text => text.normalize('NFKC').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

// Each item is a positioned run from the original PDF. Only mark runs that
// overlap a verified match on this page.
function citedRuns(items, quote) {
  let text = '';
  const runs = [];
  for (const item of items) {
    if (!item.str?.trim()) continue;
    if (text) text += ' ';
    const start = text.length;
    text += normalized(item.str);
    runs.push({item, start, end: text.length});
  }
  const needle = normalized(quote);
  const offset = needle ? text.indexOf(needle) : -1;
  if (offset < 0) return [];
  return runs.filter(run => run.end > offset && run.start < offset + needle.length);
}

export async function showOriginal(reader, file, name, quote) {
  if (!(file instanceof Blob)) return;
  const body = reader.querySelector('.citation-body');
  const download=document.createElement('button');
  download.type='button';
  download.className='download-cited-original';
  download.textContent='Download original file';
  download.onclick=()=>{
    const url=URL.createObjectURL(file),link=document.createElement('a');
    link.href=url;
    link.download=name;
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  reader.append(download);
  const note = document.createElement('p');
  note.className = 'source-location';
  body.before(note);
  if (/\.docx$/i.test(name)) {
    const frame = document.createElement('iframe');
    frame.title = name;
    frame.className = 'citation-word';
    frame.setAttribute('sandbox','allow-scripts');
    const buffer = await file.arrayBuffer();
    if (!reader.isConnected) return;
    const receive = event => {
      if (event.source !== frame.contentWindow) return;
      if (event.data?.type === 'docx-ready') frame.contentWindow.postMessage({type:'docx-open',buffer,citation:quote},'*');
      if (event.data?.type === 'citation-result') {
        note.textContent = event.data.found ? 'Original Word document · cited passage' : 'Original Word document · see extracted passage below';
        body.hidden = !!event.data.found;
      }
    };
    const observer = new MutationObserver(() => {
      if (!reader.isConnected) {window.removeEventListener('message',receive);observer.disconnect();}
    });
    observer.observe(document.body,{subtree:true,childList:true});
    window.addEventListener('message',receive);
    note.textContent='Original Word document';
    frame.src='./docx-viewer.html';
    body.before(frame);
    return;
  }
  if (!/\.pdf$/i.test(name) && file.type !== 'application/pdf') {note.remove();return;}
  note.textContent='Locating passage in original PDF…';
  const pdf = await openPdf(file);
  try {
    for (let n=1; n<=pdf.pdf.numPages && reader.isConnected; n++) {
      const page = await pdf.pdf.getPage(n);
      const matches = citedRuns((await page.getTextContent()).items, quote);
      if (!matches.length) {page.cleanup();continue;}
      const canvas = await pageCanvas(page);
      if (!reader.isConnected) return;
      const viewport = page.getViewport({scale:1});
      const pageView=document.createElement('div');
      pageView.className='cited-page';
      canvas.setAttribute('role','img');
      canvas.setAttribute('aria-label',name+', page '+n+'. Cited passage: '+quote);
      pageView.append(canvas);
      for(const {item} of matches){
        const [a,b,,,x,y]=item.transform;
        const length=Math.hypot(a,b)||1, dx=a/length, dy=b/length;
        const corners=[[0,-0.2],[item.width,-0.2],[0,0.85],[item.width,0.85]].map(([w,h])=>viewport.convertToViewportPoint(x+dx*w-dy*h*item.height,y+dy*w+dx*h*item.height));
        const xs=corners.map(p=>p[0]), ys=corners.map(p=>p[1]);
        const mark=document.createElement('span');
        mark.className='page-highlight';
        Object.assign(mark.style,{left:100*Math.min(...xs)/viewport.width+'%',top:100*Math.min(...ys)/viewport.height+'%',width:100*(Math.max(...xs)-Math.min(...xs))/viewport.width+'%',height:100*(Math.max(...ys)-Math.min(...ys))/viewport.height+'%'});
        pageView.append(mark);
      }
      const surface=document.createElement('div');
      surface.className='citation-page-surface';
      surface.append(pageView);
      body.before(surface);
      body.hidden=true;
      note.textContent='Original PDF · Page '+n+' of '+pdf.pdf.numPages;
      surface.scrollTop=Math.max(0,pageView.querySelector('.page-highlight').offsetTop-surface.clientHeight/3);
      page.cleanup();
      return;
    }
    note.textContent='Original PDF · passage could not be positioned on a page';
  } finally {await pdf.close();}
}

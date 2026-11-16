import {replaceRunText} from './document-edits.mjs';
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
async function zipLibrary(){if(!globalThis.JSZip)await import('./vendor/jszip.min.js');return globalThis.JSZip;}
function xmlDocument(xml){const d=new DOMParser().parseFromString(xml,'application/xml');if(d.getElementsByTagName('parsererror').length)throw new Error('The Word document contains invalid XML.');return d;}
function paragraphs(d){return Array.from(d.getElementsByTagNameNS(W,'p'));}
function textNodes(p){return Array.from(p.getElementsByTagNameNS(W,'t')).filter(t=>{let n=t.parentNode;while(n&&n!==p){if(n.namespaceURI===W&&n.localName==='p')return false;n=n.parentNode;}return true;});}
function editableParagraph(p){return !['drawing','pict','tab','br','fldChar','instrText','del','ins','sdt','hyperlink','footnoteReference','endnoteReference'].some(n=>p.getElementsByTagNameNS(W,n).length);}
export async function prepareDocumentReview(doc){
 if(doc.review?.blocks)return doc;
 let blocks=[],format=doc.name.split('.').pop().toLowerCase();
 if(format==='docx'&&doc.original){const JSZip=await zipLibrary(),zip=await JSZip.loadAsync(await doc.original.arrayBuffer());const part=zip.file('word/document.xml');if(!part)throw new Error('This file has no Word document body.');const xml=await part.async('string');if(xml.length>15000000)throw new Error('This Word file is too large to edit in the browser.');blocks=paragraphs(xmlDocument(xml)).map((p,i)=>({id:'p-'+i,text:textNodes(p).map(n=>n.textContent).join(''),editable:editableParagraph(p)})).filter(p=>p.text.trim()).map(p=>({...p,originalText:p.text}));
 }else{const pages=doc.sourcePages?.length?doc.sourcePages:[{number:1,text:doc.text||doc.draft?.text||''}];blocks=pages.flatMap(p=>String(p.text||'').split(/\n\s*\n/).filter(t=>t.trim()).map((text,i)=>({id:'page-'+p.number+'-p-'+i,page:p.number,text,originalText:text,editable:true})));}
 if(!blocks.length)throw new Error('No readable paragraphs found. Read the document with OCR first.');
 return {...doc,review:{format,blocks,edits:[],revision:0}};
}
export async function workingDocumentBlob(doc){
 if(doc.review?.format!=='docx')return new Blob([doc.review.blocks.map(b=>b.text).join('\n\n')],{type:'text/plain;charset=utf-8'});
 const JSZip=await zipLibrary(),zip=await JSZip.loadAsync(await doc.original.arrayBuffer());const xml=xmlDocument(await zip.file('word/document.xml').async('string')),ps=paragraphs(xml);
 for(const b of doc.review.blocks){if(b.text===b.originalText)continue;const p=ps[Number(b.id.slice(2))];if(!p||!editableParagraph(p))throw new Error('This paragraph contains Word fields or tracked changes. Edit it in Word.');const nodes=textNodes(p),values=replaceRunText(nodes.map(n=>n.textContent),b.originalText,b.text);nodes.forEach((n,i)=>{n.textContent=values[i];n.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');});}
 zip.file('word/document.xml',new XMLSerializer().serializeToString(xml));return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',compression:'DEFLATE'});
}
export async function newDraftDocx(text){
 const JSZip=await zipLibrary(),zip=new JSZip(),escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 zip.file('[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
 zip.file('_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
 const sections=text.split(/\n\n/);zip.file('word/document.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}"><w:body>${sections.map((section,i)=>section.split('\n').map((line,j)=>`<w:p><w:pPr><w:spacing w:after="${j===0?'160':'100'}"/>${j===0?'<w:keepNext/>':''}</w:pPr><w:r><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/><w:sz w:val="${i===0?'34':j===0?'26':'22'}"/>${j===0?'<w:b/>':''}</w:rPr><w:t xml:space="preserve">${escape(line)}</w:t></w:r></w:p>`).join('')).join('')}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr></w:body></w:document>`);
 return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
}

// Bookmark anchors exist only in the preview package; exports remain clean.
export async function anchoredReviewBlob(doc){
 const blob=await workingDocumentBlob(doc),JSZip=await zipLibrary(),zip=await JSZip.loadAsync(await blob.arrayBuffer());
 const xml=xmlDocument(await zip.file('word/document.xml').async('string')),ps=paragraphs(xml);
 for(const b of doc.review.blocks){const p=ps[Number(b.id.slice(2))];if(!p)continue;const anchor=xml.createElementNS(W,'w:bookmarkStart');anchor.setAttributeNS(W,'w:id','900000'+b.id.slice(2));anchor.setAttributeNS(W,'w:name','centring-review-'+b.id);const end=xml.createElementNS(W,'w:bookmarkEnd');end.setAttributeNS(W,'w:id','900000'+b.id.slice(2));const pr=p.firstChild?.localName==='pPr'?p.firstChild:null;p.insertBefore(anchor,pr?pr.nextSibling:p.firstChild);p.appendChild(end);}
 zip.file('word/document.xml',new XMLSerializer().serializeToString(xml));return zip.generateAsync({type:'blob',mimeType:blob.type});
}

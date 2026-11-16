import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateDocumentFile,cleanDocumentText,wordCount,buildGrantOutline,draftReview,planTasksForDocument,createPdfReaderLoader,pdfTextFromItems,sourceTextForContext} from '../web/document-core.mjs';
import {validatePayload,executeTool} from '../worker/agent.mjs';
test('uploads reject unsupported, empty and oversized files',()=>{for(const file of [{name:'macro.docm',size:100},{name:'empty.txt',size:0},{name:'big.pdf',size:11*1024*1024}])assert.throws(()=>validateDocumentFile(file));assert.equal(validateDocumentFile({name:'brief.DOCX',size:1024}),'docx');});
test('text extraction fails honestly for scanned or excessive documents',()=>{assert.throws(()=>cleanDocumentText('  '),/No readable text/);assert.throws(()=>cleanDocumentText('x'.repeat(120001)),/too long/);assert.equal(cleanDocumentText('Hello\r\nworld\u0000'),'Hello\nworld');});
test('outline uses provided wording and marks unanswered sections',()=>{const text=buildGrantOutline({title:'Our project',budget:'$15,000'});assert.ok(text.includes('Our project'));assert.ok(text.includes('$15,000'));assert.ok(text.includes('[Add activities.]'));assert.equal(draftReview(text).gaps,5);assert.equal(wordCount('  one\n two  '),2);});
test('approved preparation steps create linked tasks only once',()=>{const doc={id:'doc-1',name:'brief.txt',application:'creative'},rows=[{key:'budget',selected:true,owner:'alex',date:'2026-11-12'}];const tasks=planTasksForDocument(doc,rows,[],'2026-11-10',()=> 'task-1');assert.equal(tasks[0].related,'creative');assert.equal(tasks[0].documentId,'doc-1');assert.equal(tasks[0].studioPlanId,'doc-1:budget');assert.deepEqual(planTasksForDocument(doc,rows,tasks,'2026-11-10',()=> 'task-2'),[]);assert.throws(()=>planTasksForDocument(doc,[{...rows[0],date:'2026-02-31'}],[],'2026-11-10',()=>''));assert.throws(()=>planTasksForDocument(doc,[{...rows[0],owner:'unknown'}],[],'2026-11-10',()=>''));});
function payload(documents){return {message:'Review this',workspace:{tasks:[],applications:{},readiness:{},opportunities:[],calendar:[],team:[],documents}};}
test('AI document context is bounded and removes extra fields',()=>{const p=payload([{id:'one',name:'brief.txt',text:'First paragraph.\n\nSecond paragraph.',original:'never forward',truncated:false}]);const parsed=validatePayload(p);assert.equal(parsed.workspace.documents[0].original,undefined);const result=executeTool('inspect_workspace',{section:'documents'},parsed.workspace,[]);assert.equal(result[0].paragraphs[1].paragraph,2);assert.equal(result[0].paragraphs[1].text,'Second paragraph.');assert.throws(()=>validatePayload(payload([{id:'one',name:'brief.txt',text:'x'.repeat(120001)}])),/Invalid document/);assert.throws(()=>validatePayload(payload([{},{}])),/Invalid document/);});

test('PDF reader stays on the page origin and recovers from a cached import failure',async()=>{
 const urls=[],reader={getDocument(){}};
 const load=createPdfReaderLoader('https://example.org/#library',async url=>{urls.push(url);if(urls.length===1)throw new TypeError('Failed to fetch dynamically imported module');return reader;});
 await assert.rejects(load(),/Check your connection/);
 assert.equal(await load(),reader);
 assert.equal(await load(),reader);
 assert.equal(urls.length,2);
 assert.equal(new URL(urls[0]).origin,'https://example.org');
 assert.equal(new URL(urls[0]).pathname,'/vendor/pdf.min.mjs');
 assert.notEqual(urls[0],urls[1]);
});
test('unavailable local reader explains the preview dependency',async()=>{
 const load=createPdfReaderLoader('http://127.0.0.1:7788/#library',async()=>{throw new Error('offline');});
 await assert.rejects(load(),/Restart the preview, or open the published dashboard/);
});

test('PDF extraction recombines split printed lines and preserves table columns',()=>{
 const item=(str,x,y,width=50)=>({str,transform:[12,0,0,12,x,y],width,height:12});
 const result=pdfTextFromItems([item('Funding',20,700),item('request',75,700),item('Materials',20,660,60),item('$1,500',250,660),item('Programme',20,646,65),item('costs',90,646)]);
 assert.equal(result,'Funding request\n\nMaterials\t$1,500\nProgramme costs');
});
test('document context retains page and OCR uncertainty references with explicit truncation',()=>{
 const pages=[{number:1,text:'Grant guidelines',method:'text'},{number:2,text:'Budget $1,500',method:'ocr',warning:'Low-confidence OCR.'},{number:3,text:'',method:'unreadable',warning:'No readable text.'}];
 const full=sourceTextForContext(pages);assert.ok(full.text.includes('[Page 2 · OCR · Check original]'));assert.ok(full.text.includes('Low-confidence OCR.'));assert.ok(full.text.includes('[No readable text]'));assert.equal(full.truncated,false);const short=sourceTextForContext(pages,30);assert.equal(short.text.length,30);assert.equal(short.truncated,true);
});
test('image scans are accepted without pretending unsupported Word formats work',()=>{
 assert.equal(validateDocumentFile({name:'scan.PNG',size:100}),'png');assert.equal(validateDocumentFile({name:'scan.jpeg',size:100}),'jpeg');assert.throws(()=>validateDocumentFile({name:'old.doc',size:100}),/DOCX/);
});

import {sourceTextForContext} from './document-core.mjs';
export const DOCUMENT_CONTEXT_LIMIT=120000;
export function documentContext(doc){
 if(!doc)return null;
 const source=doc.sourcePages?sourceTextForContext(doc.sourcePages,DOCUMENT_CONTEXT_LIMIT):{text:String(doc.text||'').slice(0,DOCUMENT_CONTEXT_LIMIT),truncated:String(doc.text||'').length>DOCUMENT_CONTEXT_LIMIT};
 let size=0;const editableBlocks=(doc.review?.blocks||[]).filter(b=>{size+=JSON.stringify(b).length;return size<80000&&b.text.length<=12000;}).slice(0,500).map(({id,text,editable,page})=>({id,text,editable,page}));
 return {id:doc.id,name:doc.name,applicationDraft:!!doc.applicationDraft,importedGrantId:doc.importedGrantId||null,...source,editableBlocks,opportunity:doc.opportunity||null,referenceSource:doc.referenceSource||null,grantAnalysis:doc.opportunityInsights?.text?.slice(0,20000)||null,draft:String(doc.draft?.text||'').slice(0,40000),draftTruncated:String(doc.draft?.text||'').length>40000};
}
export function selectContextDocument(route,documents,pinnedId,excludedId){
 const active=route.startsWith('studio/')?route.slice(7):null;
 if(active&&active!==excludedId)return documents.find(d=>d.id===active)||null;
 return documents.find(d=>d.id===pinnedId)||null;
}
export function connectionState(status){return !status.configured?'missing':status.authenticated===true?'ready':'signin';}
export function signInPath(route,method='demo'){return (method==='chatgpt'?'/signin-with-chatgpt':'/signin')+'?return_to='+encodeURIComponent('/#'+String(route||'today'));}
export function discussionContextSnapshot(threads,currentId){
 const ordered=[...threads].sort((a,b)=>Number(b.id===currentId)-Number(a.id===currentId));let remaining=30000;
 const items=ordered.slice(0,40).map(t=>{const selected=t.id===currentId;const source=selected?t.messages:t.messages.slice(-3);const messages=[];for(const m of source){if(remaining<=0)break;const body=String(m.body||'').slice(0,Math.min(2000,remaining));remaining-=body.length;messages.push({author:m.author,body,at:m.at});}return {id:t.id,title:t.title,related:t.related,resolved:t.resolved,people:t.people,messages,totalMessages:t.messages.length,partial:messages.length<t.messages.length};});
 return {items,partial:items.length<threads.length||items.some(t=>t.partial),delivery:'Browser-local conversations; messages are not delivered to teammates.'};
}

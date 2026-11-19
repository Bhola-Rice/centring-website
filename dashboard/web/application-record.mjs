const escape=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

export const preparingStage=stage=>['draft','ready','review','reviewed'].includes(stage);

export function applicationStage(doc, legacy){
 const previous=legacy?.status||doc?.trackingStage;
 const decision=(legacy?.funderDecision||doc?.funderDecision)?.outcome;
 if(previous==='received')return previous;
 if(['awarded','declined'].includes(decision))return decision;
 if(['awarded','declined'].includes(previous))return previous;
 if(legacy?.submissionCopy||doc?.submissionCopy||legacy?.submitted||previous==='submitted')return 'submitted';
 const sections=doc?.applicationDraft?.sections||[];
 if(sections.length&&sections.every(s=>s.answer?.trim()&&s.status==='approved'))return 'reviewed';
 if(previous==='review'||sections.some(s=>s.answer?.trim()&&s.status==='approved'))return 'review';
 if(sections.length&&sections.every(s=>s.answer?.trim()))return 'ready';
 return 'draft';
}

export function narrativeCopy(draft){
 return {title:draft.title,sections:draft.sections.map(({question,answer})=>({question,answer}))};
}
export function recordProgress(checks,tasks){
 const done=checks.filter(Boolean).length+tasks.filter(task=>task.done).length;
 const total=checks.length+tasks.length;
 return {value:total?Math.round(100*done/total):0,label:'Preparation',detail:done+' of '+total+' items complete'};
}
export function opportunityKey(grant){
 const id=String(grant?.researchId||grant?.id||'');
 const federal=id.match(/^(?:pharos-grants_gov\/)?(\d+)$/);
 return federal?'federal-'+federal[1]:id;
}
export function documentSheet(copy,{label,action='',full=false}){
 const sections=full?copy.sections:copy.sections.slice(0,2);
 return `<div class="case-paper"><header><span>${escape(label)}</span>${action}</header><div class="case-paper-body"><h3>${escape(copy.title)}</h3>${sections.map(s=>`<section><h4>${escape(s.question)}</h4><p>${escape(s.answer||(full?'No answer recorded.':'Awaiting a draft answer.'))}</p></section>`).join('')}</div></div>`;
}
// A fictional submitted document for the existing walkthrough record.
export const heritageExample={title:'Neighbourhood Stories',sections:[
 {question:'Project summary',answer:'We will record oral histories with residents and bring their stories into a public exhibition at the community hall. Young volunteers will interview participants and prepare transcripts with their consent.'},
 {question:'Activities and access',answer:'Our team will host four recording sessions and an open exhibition. Participants can review their transcripts and choose which extracts the exhibition may include.'},
 {question:'Funding request',answer:'We request $30,000 for facilitation, transcription, accessible exhibition materials and venue hire.'}
]};

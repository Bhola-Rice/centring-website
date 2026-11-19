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
export const heritageExample={title:'Head Start Family Engagement',sections:[
 {question:'Project summary',answer:'The proposed project would help families in participating early childhood programs connect with local services.'},
 {question:'Activities and access',answer:'Family engagement staff would coordinate referrals and review follow-up needs with caregivers.'},
 {question:'Funding request',answer:'This planning scenario requests $30,000 for family engagement staff time, interpretation and transportation.'}
]};

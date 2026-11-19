import {buildGrantOutline} from './document-core.mjs';

export const briefId = 'upbring-caregiver-navigation-brief';
export const briefName = 'Caregiver navigation - planning brief.docx';
export const briefHeading = 'Upbring | Caregiver navigation planning brief';
export const briefFields = {
 title: 'Caregiver Resource Navigation',
 purpose: 'Explore how navigation support could connect caregivers with family services in Texas. Upbring’s public program areas include foster care, adoption, early childhood education and residential care.',
 people: 'Children and caregivers in Texas. Select the participating program and service area before applying.',
 activities: 'Proposed activities include mapping local referral partners, helping caregivers contact services and following up after referrals.',
 impact: 'Proposed measures include completed referrals and caregiver feedback. Confirm the baseline and targets with the program team.',
 budget: 'The project budget requires finance review. No amount has been approved in this brief.',
 timeline: 'Confirm the funder window and partner availability before setting delivery dates.'
};

// Written for the walkthrough. All programme details and costs are invented.
const retiredBriefId = 'lantern-row-family-studio';
const retiredFields = {
  title: 'Family Studio Saturdays',
  purpose: 'Give young people and their caregivers a free Saturday activity they can attend together. A family can join for one session without committing to the whole series.',
  people: 'Plan for 24 households across eight workshops at a neighbourhood community hall. Count returning households separately from first visits.',
  activities: 'Two facilitators will lead printmaking and storytelling tables. A family liaison will arrange transport vouchers and welcome first-time participants.',
  impact: 'Record attendance by household. At the last session, invite caregivers to say whether they met someone they would ask for support. Report totals and anonymous feedback.',
  budget: 'Request $12,000: $6,400 for facilitators, $2,400 for the hall, $1,600 for supplies, and $1,600 for transport vouchers.',
  timeline: 'Allow four weeks for outreach, eight Saturdays for delivery and two weeks to reconcile receipts. The hall booking and start date still need confirmation.'
};

// Supplied originals stay in storage and backups. Keep edited briefs visible.
export function isRetiredStarter(doc) {
 if(['citation-check-fictional','willow-fund-workshops'].includes(doc.id)){
  const draft=doc.applicationDraft;
  const originalAnswers=['We offer free arts workshops for young people. We are requesting $15,000 for artists, materials and accessible venue hire.'];
  if(doc.id==='willow-fund-workshops')originalAnswers.push('We request $15,000 to cover artists, materials and accessible venue hire.');
  return draft?.organisation?.startsWith('Lantern Row Heritage Commons') && !doc.draft?.text && !doc.submissionCopy &&
   !doc.review?.edits?.length && draft.sections?.length===originalAnswers.length &&
   draft.sections.every((section,index)=>section.answer===originalAnswers[index] && section.status!=='approved');
 }
 if(doc.id!==retiredBriefId || !doc.sample || doc.review?.edits?.length || doc.applicationDraft || doc.draftActivity)return false;
 const heading='Lantern Row Heritage Commons | ';
 const supplied=buildGrantOutline(retiredFields);
 const originals=['Project brief','Fictional project brief'].map(label=>heading+label+'\n\n'+supplied);
 const names=['Family Studio Saturdays - project brief.docx','Family Studio Saturdays - fictional project brief.docx'];
 return names.includes(doc.name) && originals.includes(doc.text) && (!doc.draft?.text || originals.includes(doc.draft.text)) &&
   Object.entries(doc.draft?.fields||{}).every(([key,value])=>retiredFields[key]===value);
}

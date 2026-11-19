// Server-owned applicant identity for the shared walkthrough account.
export const LANTERN_PROFILE = {
 id:'lantern-row',version:1,reviewedAt:'2026-11-18',name:'Lantern Row Heritage Commons',website:'',
 mission:'Bring young people and caregivers together through free neighbourhood arts and storytelling workshops.',
 status:'Fictional community nonprofit used for this preview.',
 programmes:[{name:'Family Studio Saturdays',description:'Eight facilitated sessions for young people and caregivers, with transport support for participating households.'}],
 communities:['Young people','Caregivers','Neighbourhood families'],
 fitThemes:['Family connection','Arts access','Youth participation'],
 reach:'Neighbourhood workshops. Proposed reach is a planning target, not a recorded outcome.',
 unknowns:['Venue booking and delivery dates','Applicant registrations and legal eligibility','Confirmed delivery partners'],
 sources:[],
 contextNote:'This applicant and its project evidence are fictional. Never attribute the sample programme, costs or outcomes to Upbring.'
};
export function organisationForIdentity(identity){return identity?.name==='BeedyRootKiwi'?structuredClone(LANTERN_PROFILE):null;}
export function bindOrganisation(workspace,profile){
 const next={...workspace};delete next.organisationProfile;
 if(profile){next.organisationProfile=structuredClone(profile);next.organisation=profile.name;next.profile={...next.profile,organisation:profile.name,mission:profile.mission};}
 return next;
}

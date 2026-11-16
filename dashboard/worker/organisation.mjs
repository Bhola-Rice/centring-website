// Versioned, server-owned demo persona. Bound to the authenticated account,
// never to a session ID or client-supplied organisation field.
export const CFC_PROFILE={
 id:'committee-for-children',version:1,reviewedAt:'2026-11-10',name:'Committee for Children',website:'https://www.cfchildren.org/',
 mission:'Support children’s safety and well-being through research-based education, advocacy, and partnerships.',
 status:'501(c)(3) nonprofit (organisation’s published description)',
 programmes:[{name:'Second Step',description:'Research-based PreK–12 programmes that build skills such as empathy, resilience, and responsible decision-making, and support positive school climates.'},{name:'Child protection',description:'Resources, training, research, and advocacy to help educators, caregivers, and communities prevent violence and abuse.'}],
 communities:['Children and young people','Educators and school communities','Parents and caregivers'],
 fitThemes:['Social-emotional learning','Child safety and violence prevention','School climate and belonging','Educator support','Evidence-based education'],
 reach:'The organisation reports programmes reaching children across all 50 US states and schools in more than 70 countries. This is programme reach, not a proposed grant delivery footprint.',
 unknowns:['Proposed project, locations, dates, and delivery partners','Project budget, requested amount, and match funding','Current registrations, funder-specific eligibility, and authorised applicant','Project-specific evidence, outcomes, and evaluation plan'],
 sources:[{title:'About Committee for Children',url:'https://www.cfchildren.org/about-us/',supports:'Published nonprofit status, Second Step, and programme reach'},{title:'Our programmes',url:'https://www.cfchildren.org/programs/',supports:'Mission, programme audience, and PreK–12 focus'},{title:'Priorities',url:'https://www.cfchildren.org/',supports:'Child safety, violence prevention, research, and advocacy'}],
 contextNote:'Public-research demo persona, not an official Committee for Children workspace. Existing team names, tasks, arts examples, and awards are demonstration records, not facts about this organisation.'
};
export function organisationForIdentity(identity){return identity?.name==='BeedyRootKiwi'?structuredClone(CFC_PROFILE):null;}
export function bindOrganisation(workspace,profile){
 const next={...workspace};delete next.organisationProfile;
 if(profile){next.organisationProfile=structuredClone(profile);next.organisation=profile.name;next.profile={...next.profile,organisation:profile.name,mission:profile.mission};}
 return next;
}

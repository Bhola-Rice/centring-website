const upbring = {
 id:'upbring', version:2, name:'Upbring', reviewedAt:'2026-11-19', website:'https://upbring.org/',
 mission:'Upbring works across Texas to break the cycle of child abuse by empowering children, families and communities.',
 status:'Texas nonprofit serving children and families.',
 programmes:[
  {name:'Foster care and adoption',description:'Family placements and support for children and caregivers.'},
  {name:'Residential care',description:'Treatment and support for children in residential settings.'},
  {name:'Early childhood education',description:'Head Start and Early Head Start support children and their families.'},
  {name:'Independent living',description:'BeREAL provides education planning and mentorship for young adults transitioning from foster care.'}
 ],
 fundingTerms:['child welfare','child abuse','child maltreatment','foster care','adoption assistance','adoptive families','family support','family preservation','early childhood','head start','residential care'],
 communities:['Children','Families','Caregivers'],fitThemes:['Child welfare','Family support','Early childhood education'],reach:'Texas',
 unknowns:['The specific project, service area and budget for this application','Current funder eligibility and any required partners'],
 sources:[{title:'What Upbring does',url:'https://upbring.org/what-we-do'},{title:'About Upbring',url:'https://upbring.org/about-upbring'},{title:'Upbring audited financial statements',url:'https://upbring.org/wp-content/uploads/2025-upbring-audited-financials.pdf'}],
 contextNote:'Public organisational background. Confirm project-specific details with the grant team.'
};
export function organisationForIdentity(identity){return identity?structuredClone(upbring):null;}
export function bindOrganisation(workspace,profile){
 const next={...workspace};delete next.organisationProfile;
 if(profile){next.organisationProfile=structuredClone(profile);next.organisation=profile.name;next.profile={...next.profile,organisation:profile.name,mission:profile.mission};}
 return next;
}

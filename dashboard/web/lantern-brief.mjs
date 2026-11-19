import {fromRetiredWorkspace} from './workspace-origin.mjs';

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

// Exclusion applies to local and cloud reads. Original files remain available in backups.
export function isRetiredStarter(doc) {
 return fromRetiredWorkspace(doc);
}

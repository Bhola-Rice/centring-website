// Shared validation: the model can propose only these bounded workspace changes.
export const OWNER_IDS=['','sarah','alex','jordan'];
export const READINESS_IDS=['profile','status','brief','budget','documents','reviewer'];
export function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
const text=(v,n=2000)=>typeof v==='string'&&v.length<=n;
const allowedKeys=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>keys.includes(k));
export function fingerprint(value){return JSON.stringify(value);}
export function validateChange(change,workspace){
 if(!allowedKeys(change,['kind','id','patch']))throw new Error('Invalid change format.');
 const {kind,id,patch}=change;if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new Error('Missing change details.');
 if(['task_create','task_update'].includes(kind)){
  if(!allowedKeys(patch,['title','owner','start','date','notes','related','status']))throw new Error('Unsupported task field.');
  const current=kind==='task_update'?workspace.tasks.find(t=>t.id===id):null;
  if(kind==='task_update'&&!current)throw new Error('That task no longer exists.');
  if(kind==='task_create'&&(!text(patch.title,120)||!patch.title.trim()||!validDate(patch.start)||!validDate(patch.date)))throw new Error('A new task needs a title, start date, and due date.');
  if('title'in patch&&(!text(patch.title,120)||!patch.title.trim()))throw new Error('Invalid task title.');
  if('owner'in patch&&!OWNER_IDS.includes(patch.owner))throw new Error('Choose a teammate in this workspace.');
  if('status'in patch&&!['todo','doing','done'].includes(patch.status))throw new Error('Invalid task status.');
  if('related'in patch&&patch.related!==''&&!Object.hasOwn(workspace.applications,patch.related))throw new Error('Unknown related application.');
  if('notes'in patch&&!text(patch.notes,4000))throw new Error('Task notes are too long.');
  const combined={...current,...patch};if(!validDate(combined.start)||!validDate(combined.date)||combined.date<combined.start)throw new Error('The due date must be on or after the start date.');
 }else if(kind==='application_update'){
  if(!Object.hasOwn(workspace.applications,id))throw new Error('That application no longer exists.');
  if(!allowedKeys(patch,['owner','deadline','decisionDate','followup','fundingDate','trackingNotes']))throw new Error('Unsupported application field.');
  const a=workspace.applications[id];if('owner'in patch&&!OWNER_IDS.includes(patch.owner))throw new Error('Unknown owner.');
  if('trackingNotes'in patch&&!text(patch.trackingNotes,4000))throw new Error('Notes are too long.');
  for(const key of ['deadline','decisionDate','followup','fundingDate'])if(key in patch){if(!validDate(patch[key]))throw new Error('Invalid date.');if(key==='deadline'&&!['draft','review'].includes(a.status))throw new Error('Keep the deadline on a submitted record unchanged.');if(key==='decisionDate'&&a.status!=='submitted')throw new Error('Only an expected decision date can be changed.');if(key==='fundingDate'&&a.status!=='awarded')throw new Error('Only an expected funding date can be changed.');if(key==='followup'&&!['submitted','awarded'].includes(a.status))throw new Error('Follow-up dates apply to submitted or awarded applications.');if(key!=='deadline'&&a.submitted&&patch[key]<a.submitted)throw new Error('This date cannot be before submission.');}
 }else if(kind==='readiness_update'){
  if(!READINESS_IDS.includes(id)||!allowedKeys(patch,['ready'])||typeof patch.ready!=='boolean')throw new Error('Invalid readiness change.');
 }else throw new Error('This action is not supported.');
 if(!Object.keys(patch).length)throw new Error('No changes were specified.');return change;
}
export function changeTarget(change,workspace){if(change.kind==='task_create')return null;if(change.kind==='task_update')return workspace.tasks.find(t=>t.id===change.id);if(change.kind==='application_update')return workspace.applications[change.id];return workspace.readiness[change.id];}
export function applyChange(change,workspace,newId){
 validateChange(change,workspace);
 if(change.kind==='task_create'){const t={id:newId,type:'task',done:false,status:'todo',owner:'',related:'',notes:'',...change.patch,checks:[{name:'Complete the task',done:false}]};if(t.status==='done'){t.done=true;t.checks[0].done=true;}workspace.tasks.push(t);return t.id;}
 if(change.kind==='task_update'){const t=workspace.tasks.find(t=>t.id===change.id);Object.assign(t,change.patch);if('status'in change.patch){t.done=t.status==='done';if(t.done)t.checks=t.checks.map(c=>({...c,done:true}));else if(t.checks.every(c=>c.done))t.checks=t.checks.map(c=>({...c,done:false}));}return t.id;}
 if(change.kind==='application_update'){Object.assign(workspace.applications[change.id],change.patch);return change.id;}
 workspace.readiness[change.id]=change.patch.ready;return change.id;
}

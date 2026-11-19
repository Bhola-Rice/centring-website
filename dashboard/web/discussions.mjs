// Browser-local demo conversations. No delivery or shared membership is implied.
export function seedDiscussions(today=new Date().toISOString().slice(0,10)) {
  const prior=new Date(today+'T12:00:00Z');
  prior.setUTCDate(prior.getUTCDate()-1);
  const yesterday=prior.toISOString().slice(0,10);
  return [
    {id:'funding-arrival',title:'Getting ready for the funding',people:['sarah','alex','jordan'],related:'applications/spaces',resolved:false,messages:[
      {id:'funding-1',author:'alex',body:'I’m reviewing the agreement for the transition support scenario. Which costs need program review?',at:`${today}T09:15:00`},
      {id:'funding-2',author:'jordan',body:'I’ll confirm the appointment schedule and transportation needs with the program team.',at:`${today}T09:32:00`}]},
    {id:'budget-check',title:'Caregiver navigation budget review',people:['sarah','alex'],related:'tasks/budget',resolved:false,messages:[
      {id:'budget-1',author:'sarah',body:'Can finance review interpretation and transportation before we finalize the request?',at:`${today}T08:40:00`},
      {id:'budget-2',author:'alex',body:'The navigation and travel estimates are ready. Interpretation is the remaining item.',at:`${today}T08:55:00`}]},
    {id:'report-review',title:'Ready for our report review',people:['sarah','alex','jordan'],related:'reports/community-arts',resolved:true,messages:[
      {id:'report-1',author:'jordan',body:'The transition planning feedback is ready for the grants team to review.',at:`${yesterday}T14:10:00`},
      {id:'report-2',author:'sarah',body:'I’ll review the feedback alongside the program summary.',at:`${yesterday}T14:30:00`}]}
  ];
}
export function addDiscussionMessage(thread,body,{id,at}) {
  const text=String(body||'').trim();
  if(!thread||thread.resolved)throw new Error('Reopen this discussion before replying.');
  if(!text||text.length>2000)throw new Error('Write a message between 1 and 2,000 characters.');
  if(thread.messages.some(m=>m.id===id))return thread;
  return {...thread,messages:[...thread.messages,{id,author:'sarah',body:text,at}]};
}
export function discussionFollowup(thread,{title,owner,date,start,id},validOwners) {
  const text=String(title||'').trim();
  if(!thread||thread.resolved)throw new Error('Reopen this discussion to add a follow-up.');
  if(!text||text.length>120)throw new Error('Give the follow-up a name (up to 120 characters).');
  if(!validOwners.includes(owner))throw new Error('Choose a person on your team.');
  const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
  if(!validDate(date)||!validDate(start)||date<start)throw new Error('Choose a valid due date on or after the start date.');
  return {id,title:text,owner,date,start,type:'task',status:'todo',done:false,related:thread.related.startsWith('applications/')?thread.related.split('/')[1]:'',discussionId:thread.id,notes:'Follow-up from team discussion: '+thread.title,checks:[{name:text,done:false}]};
}

export function refreshStarterDiscussions(threads=[]) {
 const previous = {
  "The award is confirmed. I’m checking the agreement before the payment lands. Is there anything the studio needs first?": "I’m reviewing the agreement for the transition support scenario. Which costs need program review?",
  "The venue dates are the priority. I’ll confirm the access arrangements with the community centre so we can plan the first workshop.": "I’ll confirm the appointment schedule and transportation needs with the program team.",
  "One last look at the workshop budget": "Caregiver navigation budget review",
  "Alex, could we give the accessibility costs another look before the team review? I want to make sure we’ve left enough room for support.": "Can finance review interpretation and transportation before we finalize the request?",
  "Yes — the artist fees and venue costs are checked. Accessibility is the last item on my list.": "The navigation and travel estimates are ready. Interpretation is the remaining item.",
  "The workshop feedback is ready for Sarah to review alongside the programme summary.": "The transition planning feedback is ready for the grants team to review.",
  "Thanks, Jordan. That gives us what we need for the review. I’ll pick this up in the report.": "I’ll review the feedback alongside the program summary."
};
 for(const thread of threads||[]){
  if(!['funding-arrival','budget-check','report-review'].includes(thread.id))continue;
  if(Object.hasOwn(previous,thread.title))thread.title=previous[thread.title];
  for(const message of thread.messages||[])if(Object.hasOwn(previous,message.body))message.body=previous[message.body];
 }
}

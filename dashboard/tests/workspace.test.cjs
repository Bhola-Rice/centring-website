const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
function workspace(existing,clock='2026-11-09T12:00:00-08:00'){
 class WorkspaceDate extends Date {constructor(...args){super(...(args.length?args:[clock]));} static now(){return Date.parse(clock);}}
 const source=fs.readFileSync('web/workspace-origin.mjs','utf8').replace(/export /g,'')+'\n'+fs.readFileSync('web/notice-reader.mjs','utf8').replace(/export /g,'')+'\n'+fs.readFileSync('web/project-search.mjs','utf8').replace(/export /g,'')+'\n'+fs.readFileSync('web/funding-library.mjs','utf8').replace(/^import .*?;\n/gm,'').replace(/export /g,'')+'\n'+fs.readFileSync('web/guidance.mjs','utf8').replace(/export /g,'')+'\n'+fs.readFileSync('web/grants-ui.mjs','utf8').replace(/^import .*?;\n/gm,'').replace(/export /g,'')+'\n'+fs.readFileSync('web/agent-protocol.mjs','utf8').replace(/export /g,'')+'\n'+fs.readFileSync('web/document-core.mjs','utf8').replace(/export /g,'')+'\n'+fs.readFileSync('web/discussions.mjs','utf8').replace(/export /g,'')+'\n'+fs.readFileSync('web/app.js','utf8').replace(/^import .*?;\n/gm,'').replace(/startCalendarClock\(\);render\(\);checkAgentConnection\(\);initStudio\(\);loadOrganisationProfile\(\);\s*$/,'');
 const node={addEventListener(){},focus(){}};
 const context={Date:WorkspaceDate,console,crypto,structuredClone,localStorage:{getItem(){return existing?JSON.stringify(existing):null},setItem(){}},document:{querySelector(){return node},addEventListener(){}},window:{addEventListener(){}},location:{hash:'#today'},setTimeout,clearTimeout};
 context.bindAwardActions=()=>{};context.removeRetiredClientBrief=async()=>{};vm.createContext(context);vm.runInContext(source+'\nrender=()=>{}; refreshChat=()=>{}; toast=()=>{}; this.api={pacificDate,weekStart,calendar,dayPreviewHTML,selectToday,getCalendar:()=>({year,month,selectedDate}),setCalendarFilter:v=>filter=v,notificationItems,setNotificationAddressed,notificationKey,photoSource,state,defaults,migrateDemo,applicationProgress,taskProgress,events,createAwardTasks,timelinePage,applyAgentProposal,undoAgentProposal,fingerprint,discussionsPage,replyToDiscussion,createDiscussionTask,conversationMessages,setChatDocument:d=>{beedyDocument=d;studioDocuments=[d]},clearBeedyChat,undoClearBeedyChat,isClearChatRequest,setBusy:v=>{agentBusy=v},getState:()=>state};',context);return context.api;
}
test('clean demo includes preparation, submitted and awarded applications',()=>{const {state}=workspace();assert.equal(state.applications.creative.status,'draft');assert.equal(state.applications.heritage.status,'submitted');assert.equal(state.applications.spaces.status,'awarded');assert.equal(state.tasks.find(t=>t.id==='budget').owner,'alex')});
test('preparation counts checklist steps rather than a made-up score',()=>{const api=workspace();assert.equal(api.applicationProgress(api.state.applications.creative).value,60);api.state.applications.creative.checks[3].done=true;assert.equal(api.applicationProgress(api.state.applications.creative).value,80)});
test('follow-up milestone progress changes from acknowledgement to award to receipt',()=>{const api=workspace(),a=api.state.applications.heritage;assert.equal(api.applicationProgress(a).value,33);a.status='awarded';assert.equal(api.applicationProgress(a).value,67);a.status='received';assert.equal(api.applicationProgress(a).value,100)});
test('task progress is based on completed checklist items',()=>{const api=workspace(),t=api.state.tasks.find(t=>t.id==='budget');assert.equal(api.taskProgress(t),67);t.checks[2].done=true;assert.equal(api.taskProgress(t),100)});
test('calendar distinguishes expected funding from received funds',()=>{const api=workspace();let e=api.events().find(e=>e.id==='spaces'&&e.type==='funding');assert.equal(e.date,'2026-11-20');assert.equal(e.done,false);Object.assign(api.state.applications.spaces,{status:'received',receivedDate:'2026-11-09'});e=api.events().find(e=>e.id==='spaces'&&e.type==='funding');assert.equal(e.date,'2026-11-09');assert.equal(e.done,true);assert.ok(e.title.startsWith('Received:'))});
test('award setup creates named owners and does not duplicate tasks',()=>{const api=workspace(),a=api.state.applications.heritage;a.fundingDate='2026-12-01';api.createAwardTasks('heritage',a);api.createAwardTasks('heritage',a);const tasks=api.state.tasks.filter(t=>t.related==='heritage'&&t.awardSetup);assert.equal(tasks.length,2);assert.equal(tasks[0].owner,'alex');assert.equal(tasks[1].owner,'jordan');assert.equal(tasks[1].date,'2026-12-08')});
test('upgrade preserves existing user edits and is idempotent',()=>{const api=workspace();const old=api.defaults();old.tasks[0].done=true;old.name='Demo Reviewer';old.applications.creative={title:'My edited project',description:'Keep this',amount:11000,status:'draft'};const upgraded=workspace(old);assert.equal(upgraded.state.applications.creative.title,'My edited project');assert.equal(upgraded.state.tasks[0].done,true);assert.equal(upgraded.state.name,'Demo Reviewer');const count=upgraded.state.tasks.length;upgraded.migrateDemo();assert.equal(upgraded.state.tasks.length,count)});
test('timeline uses actual receipt date after funds land',()=>{const api=workspace();Object.assign(api.state.applications.spaces,{status:'received',receivedDate:api.pacificDate()});const html=api.timelinePage();assert.ok(!html.includes('Expected funding for Welcoming Spaces'));assert.ok(html.includes('A More Welcoming Studio')===false);assert.ok(html.includes('Youth transition support'))});

test('reviewed agent change applies once and can be undone',()=>{const api=workspace(),t=api.state.tasks.find(t=>t.id==='budget');const p={id:'proposal-1',before:api.fingerprint(t),change:{kind:'task_update',id:t.id,patch:{owner:'sarah'}}};api.applyAgentProposal(p);assert.equal(t.owner,'sarah');assert.equal(p.applied,true);api.applyAgentProposal(p);assert.equal(api.state.appliedChanges.filter(id=>id===p.id).length,1);api.undoAgentProposal(p);assert.equal(api.state.tasks.find(t=>t.id==='budget').owner,'alex');assert.equal(p.undone,true);});
test('stale proposals and undo never overwrite newer changes',()=>{const api=workspace(),t=api.state.tasks.find(t=>t.id==='budget');const p={id:'proposal-2',before:api.fingerprint(t),change:{kind:'task_update',id:t.id,patch:{owner:'sarah'}}};t.notes='Newer work';api.applyAgentProposal(p);assert.equal(t.owner,'alex');assert.equal(p.applied,undefined);p.before=api.fingerprint(t);api.applyAgentProposal(p);t.notes='Changed again';api.undoAgentProposal(p);assert.equal(t.notes,'Changed again');assert.equal(t.owner,'sarah');assert.equal(p.applied,true);});

 test('discussion upgrade preserves replies and does not reseed',()=>{const api=workspace();api.state.discussions[0].messages.push({id:'mine',author:'sarah',body:'Keep my reply',at:'2026-11-09T10:00:00'});const reloaded=workspace(api.state);assert.equal(reloaded.state.discussions.length,3);assert.equal(reloaded.state.discussions[0].messages.at(-1).body,'Keep my reply');});
 test('reply is escaped in UI, clears only its draft, and survives reload',()=>{const api=workspace(),id='funding-arrival';api.state.discussionDrafts={ [id]:'draft',other:'Keep this'};assert.equal(api.replyToDiscussion(id,'<img src=x onerror=alert(1)>'),true);const state=api.getState();assert.equal(state.discussionDrafts[id],undefined);assert.equal(state.discussionDrafts.other,'Keep this');const reload=workspace(state);const html=reload.discussionsPage(id);assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));assert.ok(!html.includes('<img src=x'));assert.equal(reload.state.discussions[0].messages.at(-1).author,'sarah');});
 test('resolved discussions reject replies and follow-up tasks',()=>{const api=workspace();const count=api.state.tasks.length;assert.equal(api.replyToDiscussion('report-review','A message'),false);assert.equal(api.createDiscussionTask('report-review',{title:'Task',owner:'sarah',date:'2026-11-12',start:'2026-11-09'}),false);assert.equal(api.state.tasks.length,count);});
 test('discussion follow-up links the application and appears in calendar',()=>{const api=workspace();assert.equal(api.createDiscussionTask('funding-arrival',{title:'Confirm payment',owner:'alex',date:'2026-11-20',start:'2026-11-09'}),true);const t=api.getState().tasks.at(-1);assert.equal(t.related,'spaces');assert.equal(t.discussionId,'funding-arrival');assert.equal(api.events().find(e=>e.id===t.id).date,'2026-11-20');});
 test('invalid follow-up date and unknown owner do not create tasks',()=>{const api=workspace(),before=api.state.tasks.length;for(const fields of [{owner:'unknown',date:'2026-11-20'},{owner:'alex',date:'2026-02-31'},{owner:'alex',date:'2026-10-01'}])assert.equal(api.createDiscussionTask('funding-arrival',{title:'Check it',start:'2026-11-09',...fields}),false);assert.equal(api.state.tasks.length,before);});

test('saved federal grants add dated calendar entries without changing demo applications',()=>{const {state}=workspace();state.federalGrants=[{id:'123456',name:'Real arts grant',deadline:'2027-02-10',forecast:true,url:'https://www.grants.gov/search-results-detail/123456'},{id:'456789',name:'No deadline',deadline:''}];const api=workspace(state);const entries=api.events().filter(e=>e.id.startsWith('federal-'));assert.equal(entries.length,1);assert.equal(entries[0].date,'2027-02-10');assert.equal(entries[0].forecast,true);assert.match(entries[0].title,/Expected close/);assert.equal(api.state.applications['123456'],undefined);});

 test('clear conversation persists an empty history without touching workspace work, and supports undo',()=>{const api=workspace();api.state.chat=[{id:'u',role:'user',text:'Question'},{id:'a',role:'assistant',text:'Answer'}];const tasks=JSON.stringify(api.state.tasks),apps=JSON.stringify(api.state.applications);assert.equal(api.clearBeedyChat(),true);const cleared=api.getState();assert.equal(cleared.chat.length,0);assert.equal(JSON.stringify(cleared.tasks),tasks);assert.equal(JSON.stringify(cleared.applications),apps);const reloaded=workspace(cleared);assert.equal(reloaded.getState().chat.length,0);assert.equal(reloaded.undoClearBeedyChat(),true);assert.equal(reloaded.getState().chat[1].text,'Answer');assert.equal(reloaded.getState().chatUndo,undefined);});
 test('clear cannot race an active response and undo cannot overwrite a new conversation',()=>{const api=workspace();api.state.chat=[{role:'user',text:'Earlier'}];api.setBusy(true);assert.equal(api.clearBeedyChat(),false);assert.equal(api.state.chat.length,1);api.setBusy(false);api.clearBeedyChat();api.getState().chat.push({role:'user',text:'New question'});assert.equal(api.undoClearBeedyChat(),false);assert.equal(api.getState().chat[0].text,'New question');});
 test('only explicit chat-clearing commands clear history',()=>{const {isClearChatRequest}=workspace();for(const text of ['Clear chat','can you clear all this chat session','Please reset this conversation.','Delete my chat history please'])assert.equal(isClearChatRequest(text),true,text);for(const text of ['Clear the document','Can you explain how to clear chat?','Delete chat and all documents','Please clear the deadline task','Summarise this chat'])assert.equal(isClearChatRequest(text),false,text);});

 test('legacy banner restores original framing without altering avatar or project crops',()=>{const api=workspace();api.state.workspacePhoto='data:image/jpeg;base64,Y3JvcA==';api.state.profilePhoto='data:image/jpeg;base64,YXZhdGFy';api.state.photoEdits={workspace:{source:'data:image/jpeg;base64,b3JpZ2luYWw='},profile:{source:'data:image/jpeg;base64,b3JpZ2luYWw='}};assert.equal(api.photoSource('workspace'),api.state.photoEdits.workspace.source);assert.equal(api.photoSource('profile'),api.state.profilePhoto);const reload=workspace(api.state);assert.equal(reload.photoSource('workspace'),api.state.photoEdits.workspace.source);});
 test('new uncropped banners use saved brightness-adjusted artwork and reject invalid originals',()=>{const api=workspace();api.state.workspacePhoto='data:image/jpeg;base64,c2F2ZWQ=';api.state.photoEdits={workspace:{source:'data:image/jpeg;base64,b3JpZ2luYWw=',fit:'contain'}};assert.equal(api.photoSource('workspace'),api.state.workspacePhoto);api.state.photoEdits.workspace={source:'https://untrusted.example/image.jpg'};assert.equal(api.photoSource('workspace'),api.state.workspacePhoto);});


test('notifications include overdue and next-seven-day work, excluding completed and later items',()=>{
 const api=workspace();api.state.tasks=[{id:'past',title:'Overdue',date:'2026-11-08',type:'task',done:false},{id:'next',title:'Next week',date:'2026-11-17',type:'task',done:false},{id:'later',title:'Later',date:'2026-11-18',type:'task',done:false},{id:'done',title:'Done',date:'2026-11-10',type:'task',done:true}];
 const items=api.notificationItems(new Date('2026-11-10T12:00:00-08:00'));assert.ok(items.some(e=>e.id==='past'));assert.ok(items.some(e=>e.id==='next'));assert.ok(!items.some(e=>e.id==='later'||e.id==='done'));
});
test('addressed notifications persist, restore, and never complete the underlying task',()=>{
 const api=workspace(),today=new Date('2026-11-10T12:00:00-08:00'),entry=api.notificationItems(today).find(e=>e.type==='task');
 const before=api.notificationItems(today).filter(e=>!e.addressed).length;
 assert.equal(api.setNotificationAddressed(entry.key,true,today),true);
 assert.equal(api.notificationItems(today).filter(e=>!e.addressed).length,before-1);
 const reload=workspace(api.getState());assert.equal(reload.notificationItems(today).find(e=>e.key===entry.key).addressed,true);
 assert.equal(reload.getState().tasks.find(e=>e.id===entry.id).done,false);
 assert.equal(reload.setNotificationAddressed(entry.key,false,today),true);assert.equal(reload.notificationItems(today).filter(e=>!e.addressed).length,before);
});
test('reading reminders does not address them; changed deadlines produce fresh reminders',()=>{
 const api=workspace(),today=new Date('2026-11-10T12:00:00-08:00'),entry=api.notificationItems(today).find(e=>e.type==='task');
 assert.equal(api.getState().addressedNotifications,undefined);
 api.setNotificationAddressed(entry.key,true,today);api.getState().tasks.find(e=>e.id===entry.id).date='2026-11-16';
 assert.equal(api.notificationItems(today).find(e=>e.id===entry.id).addressed,false);
 api.getState().tasks.find(e=>e.id===entry.id).done=true;assert.ok(!api.notificationItems(today).some(e=>e.id===entry.id));
 assert.equal(api.setNotificationAddressed('unknown',true,today),false);
});
test('same-day follow-up and decision remain distinct notifications',()=>{
 const api=workspace(),a=api.state.applications.heritage,today=new Date('2026-11-10T12:00:00-08:00');a.followup='2026-11-12';a.decisionDate='2026-11-12';
 const rows=api.notificationItems(today).filter(e=>e.id==='heritage'&&e.type==='decision');assert.equal(rows.length,2);assert.notEqual(rows[0].key,rows[1].key);
 api.setNotificationAddressed(rows[0].key,true,today);assert.equal(api.notificationItems(today).find(e=>e.key===rows[1].key).addressed,false);
});

test('Pacific today rolls over at local midnight, not UTC midnight',()=>{
 const {pacificDate}=workspace();
 assert.equal(pacificDate(new Date('2026-11-11T07:59:59Z')),'2026-11-10');
 assert.equal(pacificDate(new Date('2026-11-11T08:00:00Z')),'2026-11-11');
 assert.equal(pacificDate(new Date('2027-01-01T07:30:00Z')),'2026-12-31');
 assert.equal(pacificDate(new Date('2027-01-01T08:00:00Z')),'2027-01-01');
});
test('Pacific calendar accounts for daylight saving and week boundaries',()=>{
 const {pacificDate,weekStart}=workspace();
 assert.equal(pacificDate(new Date('2026-07-01T06:59:59Z')),'2026-06-30');
 assert.equal(pacificDate(new Date('2026-07-01T07:00:00Z')),'2026-07-01');
 assert.equal(weekStart('2026-11-11'),'2026-11-09');assert.equal(weekStart('2027-01-01'),'2026-12-28');
});
test('Today selection and calendar marker use current Pacific date',()=>{
 const api=workspace();api.selectToday();const {selectedDate,year,month}=api.getCalendar();
 assert.equal(selectedDate,api.pacificDate());assert.equal(year,Number(selectedDate.slice(0,4)));assert.equal(month,Number(selectedDate.slice(5,7))-1);
 const html=api.calendar();assert.ok(html.includes(`data-date="${selectedDate}" aria-current="date"`));assert.ok(html.includes('Pacific time'));
});
test('day preview shows complete titles, owners, completion and safe empty state',()=>{
 const api=workspace();api.state.tasks=[{id:'x',title:'<script>Keep the full grant title</script>',owner:'alex',date:'2026-11-11',type:'task',done:true,status:'done'}];
 const html=api.dayPreviewHTML('2026-11-11');assert.ok(html.includes('&lt;script&gt;Keep the full grant title&lt;/script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('Finance team'));assert.ok(html.includes('Completed'));assert.ok(api.dayPreviewHTML('2099-01-01').includes('No events scheduled'));
});

test('new workspaces have upcoming sample milestones across a year boundary',()=>{
 const api=workspace(null,'2026-12-30T12:00:00-08:00');
 assert.equal(api.state.report.due,'2027-01-03');
 assert.equal(api.state.tasks.find(t=>t.id==='team').date,'2027-01-01');
 assert.equal(api.state.applications.spaces.fundingDate,'2027-01-10');
 assert.equal(api.state.applications.spaces.amount,api.state.report.awarded);
 assert.ok(api.events().every(event=>event.done||event.date>='2026-12-30'));
 const saved=workspace(api.state,'2027-01-02T12:00:00-08:00');
 assert.equal(saved.state.report.due,api.state.report.due);
 saved.state.report.approved=true;
 assert.equal(saved.events().find(e=>e.id==='report').done,false);
 saved.state.report.sentOn='2027-01-02';
 assert.equal(saved.events().find(e=>e.id==='report').done,true);
});

test('existing workspace adopts Upbring starter content without losing edits or completion',()=>{
 const old=workspace().state;
 old.name='My reviewer';
 old.applications.creative.title='Edited project name';
 old.applications.heritage.title='Neighbourhood Stories';
 old.tasks.find(task=>task.id==='budget').title='Check the workshop budget';
 old.tasks.find(task=>task.id==='budget').done=true;
 const saved=workspace(old).state;
 assert.equal(saved.name,'My reviewer');
 assert.equal(saved.applications.creative.title,'Edited project name');
 assert.equal(saved.applications.heritage.title,'Head Start Family Engagement');
 assert.equal(saved.tasks.find(task=>task.id==='budget').title,'Review caregiver navigation costs');
 assert.equal(saved.tasks.find(task=>task.id==='budget').done,true);
 assert.deepEqual(JSON.parse(JSON.stringify(workspace(saved).state)),JSON.parse(JSON.stringify(saved)));
});

test('switching grant notices isolates both the conversation and its clear/undo actions',()=>{
 const api=workspace();
 const notice={id:'title-x',name:'Title X notice.docx'};
 const residential={id:'residential',name:'Residential services notice.docx'};
 api.state.chat=[
  {role:'user',text:'Review eligibility'},
  {role:'assistant',documentName:residential.name,text:'Residential eligibility'},
  {role:'user',chatDocumentId:notice.id,text:'Which costs qualify?'},
  {role:'assistant',chatDocumentId:notice.id,text:'Title X costs'}
 ];
 api.setChatDocument(notice);
 const texts=()=>Array.from(api.conversationMessages(),m=>m.text);
 assert.deepEqual(texts(),['Which costs qualify?','Title X costs']);
 assert.equal(api.clearBeedyChat(),true);
 api.setChatDocument(residential);
 assert.deepEqual(texts(),['Review eligibility','Residential eligibility']);
 assert.equal(api.undoClearBeedyChat(),false);
 api.setChatDocument(notice);
 assert.equal(api.undoClearBeedyChat(),true);
 assert.deepEqual(texts(),['Which costs qualify?','Title X costs']);
});

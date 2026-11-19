import {connectCloud,cloudAccount,cloudRead,cloudWrite,mergeCloud,cloudNotice} from './cloud-client.mjs';
const sharedKeys=['saved','savedResearch','fitReviews','familyNavigationTaskSeeded','applications','readiness','report','tasks','org','mission','discussions','federalGrants','workspacePhoto','workspaceLogo','applicationPhotos'];
export const sharedPart=state=>Object.fromEntries(sharedKeys.filter(k=>state[k]!==undefined).map(k=>[k,structuredClone(state[k])]));
export function importMissing(remote,local){if(Array.isArray(remote)&&Array.isArray(local)){if(local.every(x=>x&&typeof x.id==='string'))return [...remote,...local.filter(x=>!remote.some(y=>y.id===x.id))];return [...new Set([...remote,...local])];}if(remote&&local&&typeof remote==='object'&&typeof local==='object'&&!Array.isArray(remote)&&!Array.isArray(local)){const out={...remote};for(const [k,v] of Object.entries(local))out[k]=k in out?importMissing(out[k],v):v;return out;}return remote===undefined?local:remote;}
export function createSharedWorkspace({getState,apply,status}){
 const applySnapshot=value=>apply(structuredClone(value));
 let base={},revision=0,ready=false,timer,busy=false,again=false,conflicts=[],remoteUpdate=false;
 const storageKey=()=> 'centring-cloud-pending:'+cloudAccount();
 const announce=message=>{status(message);cloudNotice(message);};
 function remember(){if(!ready)return;localStorage.setItem(storageKey(),JSON.stringify({base,revision,local:sharedPart(getState())}));}
 async function start(){await connectCloud();const record=await cloudRead('workspace','main');base=record.data||{};revision=record.revision;const pending=JSON.parse(localStorage.getItem(storageKey())||'null');
  if(pending){const merged=mergeCloud(pending.base,pending.local,base);conflicts=merged.conflicts;applySnapshot(merged.value);if(conflicts.length){base=structuredClone(pending.base);revision=pending.revision;}}
  else if(record.data)applySnapshot(record.data);
  ready=true;announce(conflicts.length?'Review conflicting changes':revision?'Saved to cloud':'Ready to save to cloud');
  if(pending&&!conflicts.length)await flush();
  return {owner:cloudAccount(),revision};
 }
 function changed(){if(!ready)return;try{remember();announce('Saving workspace…');clearTimeout(timer);timer=setTimeout(()=>flush(),700);}catch{announce('Local backup is full; keep this page open');}}
 async function flush(){if(!ready)return;if(busy){again=true;return;}busy=true;clearTimeout(timer);
  try{const local=sharedPart(getState());if(JSON.stringify(local)===JSON.stringify(base)){localStorage.removeItem(storageKey());announce('Saved to cloud');return;}
   const latest=await cloudRead('workspace','main');const merged=mergeCloud(base,local,latest.data||{});conflicts=merged.conflicts;if(conflicts.length){remember();announce('Review conflicting changes');return;}
   const saved=await cloudWrite('workspace','main',latest.revision,merged.value);
   // Keep edits made while the request was in flight, rather than replacing them.
   const during=mergeCloud(local,sharedPart(getState()),merged.value);
   if(during.conflicts.length){conflicts=during.conflicts;applySnapshot(during.value);remember();announce('Review conflicting changes');return;}
   base=structuredClone(merged.value);revision=saved.revision;applySnapshot(during.value);remoteUpdate=false;
   if(JSON.stringify(sharedPart(getState()))===JSON.stringify(base)){localStorage.removeItem(storageKey());announce('Saved to cloud');}else{remember();again=true;}
  }catch(e){announce(e.status===409?'A teammate updated this workspace; retry sync':'Saved locally; retry cloud sync');}
  finally{busy=false;if(again){again=false;changed();}}
 }
 async function refresh(){if(!ready)return start();if(localStorage.getItem(storageKey())){await flush();if(localStorage.getItem(storageKey()))return false;}const latest=await cloudRead('workspace','main');base=latest.data||{};revision=latest.revision;if(latest.data)applySnapshot(latest.data);remoteUpdate=false;announce('Saved to cloud');return true;}
 async function check(){if(!ready||busy||localStorage.getItem(storageKey()))return;try{const latest=await cloudRead('workspace','main');if(latest.revision!==revision){remoteUpdate=true;announce('Team updates available');}}catch{announce('Offline; local copy available');}}
 async function useCloud(){const latest=await cloudRead('workspace','main');base=latest.data||{};revision=latest.revision;applySnapshot(base);localStorage.removeItem(storageKey());conflicts=[];announce('Saved to cloud');}
 return {start,changed,flush,refresh,check,useCloud,get ready(){return ready},get conflicts(){return conflicts},get revision(){return revision},get pending(){return ready&&!!localStorage.getItem(storageKey())},get remoteUpdate(){return remoteUpdate}};
}

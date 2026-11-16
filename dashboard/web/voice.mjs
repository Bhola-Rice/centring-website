const DEFAULT_VOICE='LkQfz80IOooFjS50fnfm';
const cache=new Map();let active;
function stopActive(){active?.stop();active=null;}
window.addEventListener('hashchange',stopActive);
window.addEventListener('popstate',stopActive);
window.addEventListener('pagehide',stopActive);
window.addEventListener('blur',stopActive);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopActive();});
document.addEventListener('close',stopActive,true);

async function checkVoice(signal){const r=await fetch('/api/voice',{signal});const data=await r.json();if(!r.ok||!data.available)throw Error(data.error||'Audio is temporarily unavailable. Please try again later.');}
export function voiceButton(context){
 const root=document.createElement('div');root.className='beedy-listen';
 root.innerHTML='<div class="beedy-listen-row"><button type="button" class="btn beedy-play" aria-label="Listen with Beedy" title="Hear a short summary"><span aria-hidden="true">▷</span> <span data-label>Listen</span></button><span class="beedy-voice-status" role="status" aria-live="polite"></span></div>';
 const play=root.querySelector('button'),label=root.querySelector('[data-label]'),status=root.querySelector('[role=status]');
 const voice=DEFAULT_VOICE;let busy=false,controller,recordingKey='',generation=0;const audio=new Audio();audio.hidden=true;audio.preload='none';root.append(audio);
 function sync(){label.textContent=audio.paused?'Listen':'Pause';play.setAttribute('aria-label',audio.paused?'Listen with Beedy':'Pause Beedy');play.querySelector('span').textContent=audio.paused?'▷':'Ⅱ';}
 function stop(){generation++;controller?.abort();audio.pause();audio.currentTime=0;busy=false;play.disabled=false;status.textContent='';sync();}
 const session={stop};
 function visible(){const dialog=root.closest('dialog');return root.isConnected&&!document.hidden&&(!dialog||dialog.open);}
 audio.onpause=sync;audio.onended=()=>{sync();status.textContent='Ready to replay';};audio.onplay=sync;
 play.onclick=async()=>{
 if(busy)return;if(!audio.paused){audio.pause();return;}const briefing=context();if(!briefing){status.textContent='No suggested edits to review yet.';return;}
 stopActive();active=session;busy=true;play.disabled=true;label.textContent='Preparing…';controller=new AbortController();const attempt=++generation,signal=controller.signal;
 try{const key=voice+':'+JSON.stringify(briefing);let url=cache.get(key);if(!url){await checkVoice(signal);if(signal.aborted||attempt!==generation||!visible())return;const r=await fetch('/api/voice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({briefing}),signal});if(!r.ok)throw Error((await r.json()).error);url=URL.createObjectURL(await r.blob());cache.set(key,url);}if(signal.aborted||attempt!==generation||!visible())return;if(recordingKey!==key){audio.src=url;recordingKey=key;}await audio.play();if(attempt!==generation||!visible()){audio.pause();return;}status.textContent='';}catch(e){if(attempt===generation&&e.name!=='AbortError')status.textContent=e.message;}finally{if(attempt===generation){busy=false;play.disabled=false;sync();}}
 };
 const observer=new MutationObserver(()=>{if(!visible()){if(!root.isConnected)observer.disconnect();if(active===session)stopActive();else if(busy||!audio.paused)stop();}});queueMicrotask(()=>{if(root.isConnected)observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','hidden']});});
 return root;
}

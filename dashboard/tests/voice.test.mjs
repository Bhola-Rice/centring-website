import test from 'node:test';import assert from 'node:assert/strict';import {handleVoice} from '../worker/voice.mjs';
const req=(body,origin='https://site.test')=>new Request('https://site.test/api/voice',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('voice rejects unauthenticated, cross-origin, oversized and exhausted requests before billing',async()=>{
 globalThis.beedyIdentity=async()=>null;assert.equal((await handleVoice(req({}),{})).status,401);
 globalThis.beedyIdentity=async()=>({id:'user'});const env={ELEVENLABS_API_KEY:'test'};
 assert.equal((await handleVoice(req({},'https://other.test'),env)).status,403);
 assert.equal((await handleVoice(req({text:'x'.repeat(1201),voice:'EXAVITQu4vr4xnSDxMaL'}),env)).status,400);
 env.DB={prepare:()=>({bind:()=>({run:async()=>({meta:{changes:0}})})})};
 assert.equal((await handleVoice(req({text:'Short summary',voice:'EXAVITQu4vr4xnSDxMaL'}),env)).status,429);
 delete globalThis.beedyIdentity;
});
test('speech always uses Beedy even when a client supplies another voice',async()=>{
 const previous=globalThis.fetch;globalThis.beedyIdentity=async()=>({id:'user'});let called;
 globalThis.fetch=async(url)=>{called=url;return new Response('audio',{headers:{'Content-Type':'audio/mpeg'}});};
 try{const env={ELEVENLABS_API_KEY:'test',DB:{prepare:()=>({bind:()=>({run:async()=>({meta:{changes:1}})})})}};
 const response=await handleVoice(req({text:'A short test.',voice:'EXAVITQu4vr4xnSDxMaL'}),env);
 assert.equal(response.status,200);assert.ok(called.includes('/text-to-speech/LkQfz80IOooFjS50fnfm?'));assert.ok(!called.includes('EXAVIT'));
 }finally{globalThis.fetch=previous;delete globalThis.beedyIdentity;}
});
test('briefings condense source context before speech and reserve at most 600 characters',async()=>{
 const previous=globalThis.fetch;globalThis.beedyIdentity=async()=>({id:'user'});const calls=[];const bound=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return url.includes('openai.com')?Response.json({output:[{content:[{type:'output_text',text:'This grant supports early research trials. Nonprofits can apply, but the project must be a clinical trial.'}]}]}):new Response('audio');};
 try{const env={OPENAI_API_KEY:'test',ELEVENLABS_API_KEY:'test',DB:{prepare:()=>({bind:(...args)=>{bound.push(args);return {run:async()=>({meta:{changes:1}})};}})}};
 for(const kind of ['opportunity','edits']){calls.length=0;const r=await handleVoice(req({briefing:{kind,description:'Long source '.repeat(500)}}),env);assert.equal(r.status,200);assert.equal(calls.length,2);assert.ok(calls[0].body.instructions.includes('No title, dates'));assert.ok(calls[1].body.text.length<600);assert.ok(!calls[1].body.text.includes('Long source'));}
 assert.ok(bound.some(x=>x[0]===600));
 }finally{globalThis.fetch=previous;delete globalThis.beedyIdentity;}
});

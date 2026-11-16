const DEMO_COOKIE='beedy_demo_session';
const SESSION_SECONDS=8*60*60;
const loginAttempts=new Map();
const encode64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode64=text=>Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
function demoConfig(env){try{const c=JSON.parse(env.BEEDY_DEMO_AUTH||'null');return c&&typeof c.username==='string'&&/^[a-f0-9]{32}$/.test(c.salt)&&/^[a-f0-9]{64}$/.test(c.hash)&&env.BEEDY_DEMO_SESSION_SECRET?c:null;}catch{return null;}}
const hexBytes=s=>Uint8Array.from(s.match(/../g),h=>parseInt(h,16));
async function sessionKey(env){return crypto.subtle.importKey('raw',new TextEncoder().encode(env.BEEDY_DEMO_SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function demoIdentity(request,env){
 const config=demoConfig(env);if(!config)return null;
 try{const token=(request.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(DEMO_COOKIE+'='))?.slice(DEMO_COOKIE.length+1);if(!token||token.length>1200)return null;
 const [payload,signature,extra]=token.split('.');if(extra||!payload||!signature)return null;
 const valid=await crypto.subtle.verify('HMAC',await sessionKey(env),decode64(signature),new TextEncoder().encode(payload));if(!valid)return null;
 const claims=JSON.parse(new TextDecoder().decode(decode64(payload)));const now=Math.floor(Date.now()/1000);
 if(claims.user!==config.username||!Number.isInteger(claims.exp)||claims.exp<=now||claims.exp>now+SESSION_SECONDS||!Number.isInteger(claims.iat)||claims.iat>now||typeof claims.sid!=='string')return null;
 return {id:'demo:'+claims.sid,name:config.username};
 }catch{return null;}
}
export async function beedyIdentity(request,env){
 if(env.BEEDY_DEMO_AUTH)return demoIdentity(request,env);
 const id=request.headers.get('oai-authenticated-user-id');return id?{id,name:'ChatGPT account'}:null;
}
function authResponse(data,status=200,extra={}){return Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...extra}});}
function demoCookie(token,maxAge,request){const secure=new URL(request.url).protocol==='https:'?'; Secure':'';return `${DEMO_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;}
export async function handleDemoAuth(request,env){
 const path=new URL(request.url).pathname;
 if(path==='/api/session'&&request.method==='GET'){const identity=await beedyIdentity(request,env);return authResponse({authenticated:!!identity,name:identity?.name||null,method:env.BEEDY_DEMO_AUTH?'demo':'chatgpt'});}
 if(!['/api/session/login','/api/session/logout'].includes(path))return authResponse({error:'Not found'},404);
 if(request.method!=='POST')return authResponse({error:'Method not allowed'},405);
 if(request.headers.get('origin')!==new URL(request.url).origin)return authResponse({error:'Open this request from Centring.'},403);
 if(path.endsWith('/logout'))return authResponse({ok:true},200,{'Set-Cookie':demoCookie('',0,request)});
 const config=demoConfig(env);if(!config)return authResponse({error:'Sign-in is not ready yet. Please try again shortly.'},503);
 const now=Date.now();for(const [ip,v] of loginAttempts)if(v.until<=now)loginAttempts.delete(ip);
 const ip=request.headers.get('cf-connecting-ip')||'unknown';const attempt=loginAttempts.get(ip)||{count:0,until:now+60000};
 if(attempt.count>=6||loginAttempts.size>10000)return authResponse({error:'Too many attempts. Please wait a minute and try again.'},429,{'Retry-After':'60'});
 attempt.count++;loginAttempts.set(ip,attempt);
 try{
 if(!request.headers.get('content-type')?.includes('application/json'))return authResponse({error:'Invalid sign-in request.'},415);
 const reader=request.body?.getReader();if(!reader)return authResponse({error:'Enter your username and password.'},400);let size=0;const chunks=[];while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return authResponse({error:'Invalid sign-in request.'},413);}chunks.push(value);}
 const bytes=new Uint8Array(size);let at=0;for(const part of chunks){bytes.set(part,at);at+=part.length;}
 const body=JSON.parse(new TextDecoder().decode(bytes));if(typeof body.username!=='string'||typeof body.password!=='string'||body.username.length>100||body.password.length>256)return authResponse({error:'Check your username and password.'},400);
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(body.password),'PBKDF2',false,['deriveBits']);
 const result=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:hexBytes(config.salt),iterations:100000,hash:'SHA-256'},material,256));
 const expected=hexBytes(config.hash);let diff=0;for(let i=0;i<32;i++)diff|=result[i]^expected[i];
 if(diff!==0||body.username!==config.username)return authResponse({error:'That username or password doesn’t match. Please try again.'},401);
 const issued=Math.floor(now/1000);const payload=encode64(new TextEncoder().encode(JSON.stringify({user:config.username,sid:crypto.randomUUID(),iat:issued,exp:issued+SESSION_SECONDS})));
 const signature=encode64(new Uint8Array(await crypto.subtle.sign('HMAC',await sessionKey(env),new TextEncoder().encode(payload))));
 return authResponse({ok:true},200,{'Set-Cookie':demoCookie(payload+'.'+signature,SESSION_SECONDS,request)});
 }catch{return authResponse({error:'We couldn’t sign you in. Check your details and try again.'},400);}
}

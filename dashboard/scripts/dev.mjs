import {localBucket} from './local-bucket.mjs';
const BUCKET=localBucket();
import {localDatabase} from './local-db.mjs';
const DB=localDatabase();
import http from 'node:http';import {readFile} from 'node:fs/promises';
const mod=await import('data:text/javascript;base64,'+Buffer.from(await readFile('dist/server/index.js')).toString('base64'));
const server=http.createServer(async(req,res)=>{try{const body=[];for await(const part of req)body.push(part);const headers=new Headers(req.headers);headers.set('oai-authenticated-user-id','local-preview');const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(body)}:{})});const response=await mod.default.fetch(request,{DB,BUCKET,ELEVENLABS_API_KEY:process.env.ELEVENLABS_API_KEY,OPENAI_API_KEY:process.env.OPENAI_API_KEY,OPENAI_MODEL:process.env.OPENAI_MODEL,BEEDY_DEMO_AUTH:process.env.BEEDY_DEMO_AUTH,BEEDY_DEMO_SESSION_SECRET:process.env.BEEDY_DEMO_SESSION_SECRET});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500);res.end('Preview server error');}});server.listen(Number(process.env.PORT||7788),'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+server.address().port));process.on('SIGINT',()=>server.close(()=>process.exit(0)));

import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
export function localBucket(root='.sites-runtime/files'){
 const file=key=>{if(!/^[a-zA-Z0-9/_.-]+$/.test(key)||key.includes('..'))throw new Error('Invalid storage key');return path.join(root,key);};
 return {async head(key){try{const s=await stat(file(key));return {size:s.size};}catch(e){if(e.code==='ENOENT')return null;throw e;}},async put(key,value){const p=file(key);await mkdir(path.dirname(p),{recursive:true});await writeFile(p,typeof value==='string'?value:Buffer.from(value));},async get(key){try{const bytes=await readFile(file(key));return {body:bytes,text:async()=>bytes.toString()};}catch(e){if(e.code==='ENOENT')return null;throw e;}}};
}

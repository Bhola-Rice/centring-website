// A deliberately small Markdown renderer. Model output is always untrusted:
// raw HTML is escaped, images are not loaded, and only HTTPS/HTTP links are allowed.
const escapeText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function safeLink(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function inline(text,depth=0){
 if(depth>5)return escapeText(text);
 const pattern=/(`[^`\n]+`|\*\*[^\n]+?\*\*|__[^\n]+?__|\*[^*\n]+\*|\[[^\]\n]+\]\([^\s)]+\)|https?:\/\/[^\s<>]+|\[(?:Pages?|Paragraphs?)\s+[\d,–—\- ]+\])/g;
 let out='',start=0;
 for(const m of text.matchAll(pattern)){
  out+=escapeText(text.slice(start,m.index));const token=m[0];start=m.index+token.length;
  if(token.startsWith('`'))out+='<code>'+escapeText(token.slice(1,-1))+'</code>';
  else if(token.startsWith('**')||token.startsWith('__'))out+='<strong>'+inline(token.slice(2,-2),depth+1)+'</strong>';
  else if(token.startsWith('*'))out+='<em>'+inline(token.slice(1,-1),depth+1)+'</em>';
  else if(/^\[(?:Pages?|Paragraphs?)\s/.test(token))out+='<span class="answer-citation">'+escapeText(token.slice(1,-1))+'</span>';
  else{
   const md=token.match(/^\[([^\]]+)\]\((.+)\)$/);let address=md?md[2]:token.replace(/[.,;:!?\])]+$/,'');const tail=md?'':token.slice(address.length);const href=safeLink(address);
   out+=href?'<a href="'+escapeText(href)+'" target="_blank" rel="noopener noreferrer">'+escapeText(md?md[1]:address)+'</a>'+escapeText(tail):escapeText(token);
  }
 }
 return out+escapeText(text.slice(start));
}
export function renderChatMarkdown(value){
 const lines=String(value??'').replace(/\r\n?/g,'\n').split('\n');let html='',i=0;
 const block=line=>/^\s*(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s?|```|(?:---+|\*\*\*+)\s*$)/.test(line);
 const cells=line=>line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(v=>v.trim());
 while(i<lines.length){
  const line=lines[i];if(!line.trim()){i++;continue;}
  if(/^\s*```/.test(line)){const body=[];i++;while(i<lines.length&&!/^\s*```/.test(lines[i]))body.push(lines[i++]);i++;html+='<pre><code>'+escapeText(body.join('\n'))+'</code></pre>';continue;}
  if(line.includes('|')&&i+1<lines.length&&/^\s*\|?\s*:?-{3,}/.test(lines[i+1])&&cells(lines[i+1]).every(c=>/^:?-{3,}:?$/.test(c))){const head=cells(line);i+=2;const rows=[];while(i<lines.length&&lines[i].includes('|'))rows.push(cells(lines[i++]));html+='<div class="answer-table" tabindex="0" role="region" aria-label="Answer table"><table><thead><tr>'+head.map(c=>'<th scope="col">'+inline(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+head.map((_,j)=>'<td>'+inline(row[j]||'')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';continue;}
  const heading=line.match(/^\s*#{1,6}\s+(.+)/);if(heading){html+='<h3>'+inline(heading[1])+'</h3>';i++;continue;}
  const list=line.match(/^\s*([-*+]|\d+[.)])\s+(.+)/);if(list){const ordered=/\d/.test(list[1]),tag=ordered?'ol':'ul';html+='<'+tag+(ordered?' start="'+parseInt(list[1],10)+'"':'')+'>';while(i<lines.length){const item=lines[i].match(/^\s*([-*+]|\d+[.)])\s+(.+)/);if(!item||/\d/.test(item[1])!==ordered)break;html+='<li>'+inline(item[2])+'</li>';i++;}html+='</'+tag+'>';continue;}
  if(/^\s*>/.test(line)){const quotes=[];while(i<lines.length&&/^\s*>/.test(lines[i]))quotes.push(lines[i++].replace(/^\s*>\s?/,''));html+='<blockquote>'+inline(quotes.join(' '))+'</blockquote>';continue;}
  if(/^\s*(?:---+|\*\*\*+)\s*$/.test(line)){html+='<hr>';i++;continue;}
  const paragraph=[line];i++;while(i<lines.length&&lines[i].trim()&&!block(lines[i])&&!(lines[i].includes('|')&&/^\s*\|?\s*:?-{3,}/.test(lines[i+1]||'')))paragraph.push(lines[i++]);html+='<p>'+inline(paragraph.join(' '))+'</p>';
 }
 return html;
}

export function renderGrantResults(results = []) {
 const rows = results.filter(g => /^\d{1,10}$/.test(g?.id) && g.name);
 if (!rows.length) return '';
 const row = g => {
  const status = {posted: 'Posted', forecasted: 'Forecast', closed: 'Closed', archived: 'Archived'}[g.status];
  const meta = [g.agency, status].filter(Boolean).map(escapeText).join(' · ');
  return '<button type="button" class="chat-grant-row" data-action="federal-open" data-id="'+escapeText(g.id)+'"><span><strong>'+escapeText(g.name)+'</strong><small>'+meta+'</small></span><span aria-hidden="true">›</span></button>';
 };
 return '<section class="chat-grants" aria-label="Grant search results"><div class="chat-grants-label">Grants.gov opportunities</div>'+rows.slice(0,3).map(row).join('')+
  (rows.length>3?'<details><summary>Show '+(rows.length-3)+' more</summary>'+rows.slice(3).map(row).join('')+'</details>':'')+'</section>';
}

// Recognize complete listing blocks saved by earlier dashboard versions.
// Leave unfamiliar prose intact, including any analysis surrounding the listings.
export function renderSavedGrantText(text) {
 const pattern = /^[ \t]*(?:[-*]|\d+[.)])\s+([^\n]+)\n+\s*[-*]\s+ID:\s*(\d{1,10})\s*\n\s*[-*]\s+Agency:\s*([^\n]+)\n\s*[-*]\s+Status:\s*(\w+)\s*\n\s*[-*]\s+Official URL:\s*https:\/\/www\.grants\.gov\/search-results-detail\/\2(?=\s|$)/gm;
 const matches = [...text.matchAll(pattern)];
 if (!matches.length) return renderChatMarkdown(text);
 let html = '', end = 0, group = [];
 for (const match of matches) {
  const between = text.slice(end, match.index);
  if (between.trim()) {
   html += renderGrantResults(group) + renderChatMarkdown(between);
   group = [];
  }
  group.push({name:match[1].replace(/^\*\*(.*)\*\*$/, '$1'),id:match[2],agency:match[3],status:match[4].toLowerCase()});
  end = match.index + match[0].length;
 }
 const rest = text.slice(end).replace(/Search metadata:\s*\n\s*[-*] Source: Grants\.gov\s*\n\s*[-*] Fetched at: \S+/i,'');
 return html + renderGrantResults(group) + renderChatMarkdown(rest);
}

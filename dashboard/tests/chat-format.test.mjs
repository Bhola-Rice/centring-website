import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderChatMarkdown} from '../web/chat-format.mjs';
test('answers render emphasis, paragraphs, lists and source references',()=>{
 const html=renderChatMarkdown('There are **6 teaching artists** in **Family Studio.docx**.\n\n## Next steps\n1. Review the budget\n2. Confirm the date [Page 7]\n\n> Keep your original.');
 assert.match(html,/<strong>6 teaching artists<\/strong>/);assert.match(html,/<h3>Next steps<\/h3>/);assert.match(html,/<ol start="1"><li>Review/);assert.match(html,/class="answer-citation">Page 7/);assert.match(html,/<blockquote>Keep your original/);assert.ok(!html.includes('**'));
});
test('source HTML and unsafe Markdown links cannot execute',()=>{
 const html=renderChatMarkdown('<img src=x onerror=alert(1)>\n\n[click](javascript:alert) [data](data:text/html,foo) [user](https://user:pass@example.com/)');
 assert.ok(!html.includes('<img'));assert.ok(!html.includes('href='));assert.match(html,/&lt;img/);
});
test('links escape attributes and preserve safe official URLs',()=>{
 const html=renderChatMarkdown('[Official notice](https://grants.gov/a?q=one&x=two) https://grants.gov/123.');
 assert.match(html,/href="https:\/\/grants.gov\/a\?q=one&amp;x=two"/);assert.match(html,/noopener noreferrer/);assert.match(html,/href="https:\/\/grants.gov\/123"/);
 assert.ok(!renderChatMarkdown('[x](https://example.com/"onclick="x)').includes('"onclick="'));
});
test('tables, code and unsupported image syntax remain safe and readable',()=>{
 const html=renderChatMarkdown('| Item | Due |\n| --- | --- |\n| **Report** | 30 Nov |\n\n```\n<script>alert(1)</script>\n```\n\n![image](https://example.com/p.png)');
 assert.match(html,/<table>/);assert.match(html,/<strong>Report/);assert.match(html,/&lt;script&gt;/);assert.ok(!html.includes('<img'));assert.match(html,/<pre><code>/);
});

import {renderGrantResults, renderSavedGrantText} from '../web/chat-format.mjs';
test('chat shows three actionable grants first and keeps remaining results accessible',()=>{
 const rows=Array.from({length:5},(_,i)=>({id:String(300000+i),name:'Housing <fund>',agency:'HUD',status:'forecasted'}));
 const html=renderGrantResults([...rows,{id:'unsafe',name:'invalid'}]);
 assert.equal(html.split('<details>')[0].match(/data-action="federal-open"/g).length,3);
 assert.match(html,/Show 2 more/);
 assert.match(html,/Housing &lt;fund&gt;/);
 assert.doesNotMatch(html,/unsafe/);
});
test('saved listing groups keep the interpretation and open the correct notice',()=>{
 const html=renderSavedGrantText('Possible match\n- Housing fund\n- ID: 362077\n- Agency: HUD\n- Status: forecasted\n- Official URL: https://www.grants.gov/search-results-detail/362077\n\nSearch metadata:\n- Source: Grants.gov\n- Fetched at: 2026-11-19T00:00Z\n\nCheck the service area.');
 assert.match(html,/data-id="362077"/);
 assert.match(html,/Check the service area/);
 assert.doesNotMatch(html,/Official URL|Fetched at/);
});

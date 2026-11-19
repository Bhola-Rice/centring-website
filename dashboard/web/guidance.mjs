// With a shared preview login, guidance belongs to the person using this browser.
const preferenceKey = 'centring.upbring.guidance.v1';
const levels = {
  expert: ['Expert', 'A short orientation when you start.'],
  intermediate: ['Intermediate', 'A guide you can open on each page.'],
  novice: ['Novice', 'A next step on each page, with a place to practise.']
};
const guides = {
  today: ['Start with your team’s work', 'Check the next deadline, then open the task to see who owns it.', 'View team tasks', 'tasks'],
  opportunities: ['Find a grant to review', 'Search by the work you want to fund. Open a notice and check who can apply before starting a draft.', 'Open documents', 'library'],
  applications: ['Review an application', 'Review the answers in a draft and record its progress with the funder.', 'Check the calendar', 'calendar'],
  library: ['Choose a source document', 'Keep programme briefs, budgets and evaluations here. Choose a supporting file when preparing a grant.', 'View opportunities', 'opportunities'],
  studio: ['Review the draft', 'Compare each answer with its source. Add missing details and approve the wording you want to keep.', 'Back to documents', 'library'],
  reports: ['Record an award outcome', 'Check what the team delivered and spent. Record when the report was sent to the funder.', 'View applications', 'applications'],
  tasks: ['Coordinate a deadline', 'Open a task to check its owner, due date and remaining steps.', 'View calendar', 'calendar'],
  calendar: ['Check a date', 'Select a day to see its tasks and deadlines. Open an item to see the details.', 'View team tasks', 'tasks'],
  discussions: ['Follow up with a teammate', 'Open a discussion or start one about a specific grant or task.', 'View team tasks', 'tasks'],
  readiness: ['Check your supporting materials', 'Review the checklist and mark items when the team has them ready.', 'View documents', 'library'],
  timeline: ['Review the work ahead', 'Use the timeline to check which tasks overlap before a deadline.', 'View calendar', 'calendar'],
  plugins: ['Check available tools', 'Open a workspace tool to see what it does and which information it uses.', 'View documents', 'library']
};
let memoryPreference;
function preferences() {
  try { return memoryPreference || JSON.parse(localStorage.getItem(preferenceKey)) || {}; }
  catch { return memoryPreference || {}; }
}
function save(preference) {
  memoryPreference = preference;
  try { localStorage.setItem(preferenceKey, JSON.stringify(preference)); } catch {}
}
export function guidanceSettings() {
  const {level = 'off'} = preferences();
  return `<section class="settings-guidance"><h2>Page guidance</h2><label class="settings-setting"><span>Guidance level<small>Applies to this browser</small></span><select data-guidance-setting><option value="off">Off</option>${Object.entries(levels).map(([key,[label]]) => `<option value="${key}" ${key === level ? 'selected' : ''}>${label}</option>`).join('')}</select></label><span role="status" data-guidance-saved></span><button type="button" class="settings-setting" data-guidance-practice><span>Open practice space</span><span aria-hidden="true">›</span></button></section>`;
}
let orient = false;
export function guidancePanel(route) {
  const pref = preferences();
  if (!pref.answered && route!=='help') return '';
  if (!pref.answered) return `<section class="guidance-welcome" aria-labelledby="guidance-title"><div><h2 id="guidance-title">How much guidance would you like?</h2><button type="button" class="textlink" data-guidance-level="off">Not now</button></div><div class="guidance-options">${Object.entries(levels).map(([key,[name,desc]]) => `<button type="button" data-guidance-level="${key}"><strong>${name}</strong><span>${desc}</span></button>`).join('')}</div></section>`;
  const guide = guides[route.split('/')[0]];
  if (!guide || !levels[pref.level] || (pref.level === 'expert' && !orient)) return '';
  const [title, body, label, href] = guide;
  if (pref.level === 'intermediate') return `<details class="guidance-guide"><summary>Page guide</summary><p>${body}</p></details>`;
  return `<section class="guidance-guide"><strong>${title}</strong><p>${body}</p><a class="textlink" href="#${href}">${label}</a> ${pref.level === 'novice' ? '<button class="textlink" data-guidance-practice>Practise first</button>' : '<button class="textlink" data-guidance-dismiss>Got it</button>'}</section>`;
}
let activeHelp = null;
function helpSeen() { try { return sessionStorage.getItem('centring.upbring.help') === 'seen'; } catch { return false; } }
export function proactiveHelp(key) {
  if (preferences().level === 'off' || (!activeHelp && helpSeen()) || (activeHelp && activeHelp !== key)) return '';
  activeHelp = key;
  try { sessionStorage.setItem('centring.upbring.help', 'seen'); } catch {}
  return `<aside class="guidance-help"><strong>Need help with this?</strong><details><summary>Page guide</summary><p>${key === 'search' ? 'Try a broader topic or clear the applicant filter. Check the official notice before ruling a grant out.' : 'Return to the opportunity and check the funder’s form. Retry when the source is available.'}</p></details><button type="button" class="textlink" data-guidance-ask>Ask Beedy</button><button type="button" class="textlink" data-guidance-report>Prepare a problem report</button><button type="button" class="textlink" data-guidance-hide>Dismiss</button></aside>`;
}
export function installGuidance({route, showDialog, closeDialog, openChat}) {
  const redraw = () => {
    const slot = document.querySelector('[data-guidance-slot]');
    if (slot) slot.innerHTML = guidancePanel(route());
  };
  window.addEventListener('hashchange', () => { orient = false; activeHelp = null; });
  document.addEventListener('change', event => {
    if (!event.target.matches('[data-guidance-setting]')) return;
    save({answered:true, level:event.target.value});
    document.querySelector('[data-guidance-saved]').textContent = 'Saved';
    redraw();
  });
  document.addEventListener('click', event => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.hasAttribute('data-guidance-level')) {
      const level = target.dataset.guidanceLevel;
      save({answered:true, level}); orient = level === 'expert'; redraw();
      const select = document.querySelector('[data-guidance-setting]'); if (select) select.value = level;
    } else if (target.hasAttribute('data-guidance-dismiss')) { orient = false; redraw(); }
    else if (target.hasAttribute('data-guidance-practice')) {
      showDialog('<h2 id="dialog-title">Practice space</h2>', '<div class="guidance-practice"><p>Lantern Row Heritage Commons · Grant application</p><h3>Open Studio Saturdays</h3><label class="field">How will your programme serve local families?<textarea rows="5">Lantern Row will offer six Saturday art workshops where young people and caregivers can work with local artists at no charge.</textarea></label><p>Edit this example, then review it. Practice uses no AI credits and closes without saving to your workspace.</p><button class="btn primary" data-guidance-check>Review practice answer</button><p role="status" data-practice-result></p></div>');
    } else if (target.hasAttribute('data-guidance-check')) {
      const panel = target.closest('.guidance-practice');
      panel.querySelector('[data-practice-result]').textContent = panel.querySelector('textarea').value.trim() ? 'Review who will take part, what they will do and how you will measure the result.' : 'Write a practice answer first.';
    } else if (target.hasAttribute('data-guidance-ask')) {
      if (document.querySelector('#detail')?.open) closeDialog();
      openChat();
    } else if (target.hasAttribute('data-guidance-report')) {
      showDialog('<h2 id="dialog-title">Prepare a problem report</h2>', '<label class="field">Copy these details for your Centring contact<textarea rows="4">Page: '+ (activeHelp === 'search' ? 'Grant search' : 'Application drafting') +'\nWhat happened: \nWhat I expected: </textarea></label>');
    } else if (target.hasAttribute('data-guidance-hide')) { activeHelp = null; target.closest('.guidance-help')?.remove(); }
  });
}

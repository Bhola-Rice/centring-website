"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const formats = ["Application", "Letter of interest", "Program officer email"];
const reasons = [
  "When a funder accepts a full application, begin with clear answers about your program and budget.",
  "When an introduction comes first, keep it focused. A full proposal can follow an invitation.",
  "An eligibility question can save time before you prepare a proposal.",
];
const initialIdea = "Free weekend art workshops for young people in our neighborhood.";

function useWalkthroughState() {
  const [saved, setSaved] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [existing, setExisting] = useState(false);
  const [idea, setIdea] = useState(initialIdea);
  const [format, setFormat] = useState(0);
  const [reviewed, setReviewed] = useState(false);
  return { saved, setSaved, expanded, setExpanded, existing, setExisting, idea, setIdea, format, setFormat, reviewed, setReviewed };
}
const WalkthroughContext = createContext<ReturnType<typeof useWalkthroughState> | null>(null);
export function WalkthroughProvider({children}: {children: ReactNode}) {
  const state = useWalkthroughState();
  return <WalkthroughContext.Provider value={state}>{children}</WalkthroughContext.Provider>;
}

export default function Walkthrough({ active }: { active: number }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { if (root.current?.parentElement) root.current.parentElement.scrollTop = 0; }, [active]);
  const state = useContext(WalkthroughContext);
  if (!state) throw new Error("Walkthrough requires its shared provider");
  const { saved, setSaved, expanded, setExpanded, existing, setExisting, idea, setIdea, format, setFormat, reviewed, setReviewed } = state;
  const summary = idea.trim() || initialIdea;
  return <div ref={root} className={`walkthrough walkthrough-${active}`}>
    {active === 0 && <>
      <div className="grant-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/></svg><span>Arts & culture</span><span>↵</span></div>
      <div className="sample-card grant-card">
        <div className="card-top"><span className="fit-tag">Strong fit</span><button className="bookmark" aria-label={saved?"Remove example from shortlist":"Save example to shortlist"} aria-pressed={saved} onClick={()=>setSaved(!saved)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" fill={saved?"currentColor":"none"}/></svg></button></div>
        <p className="foundation">Arts Foundation</p><h3>The Creative Common</h3><p>Help more people find their voice through accessible workshops, community arts, and shared creative experiences.</p>
        <div className="grant-facts"><div><span>Funding range</span><strong>$3,000–$12,000</strong></div><div><span>Application deadline</span><strong>Nov 6, 2026</strong></div></div>
        <div className="grant-foot"><span>Arts & culture</span><button onClick={()=>setExpanded(!expanded)} aria-expanded={expanded} aria-controls="sample-grant-details">{expanded?"Close details":"Take a look"} ↗</button></div>
        {expanded && <div id="sample-grant-details" className="example-details">Illustrative opportunity only. This sample demonstrates a funding match; it is not an open grant or a verified funder listing.</div>}
      </div>
      <div className="shortlist-notice" role="status"><span className="notice-check">{saved?"✓":"+"}</span><div><strong>{saved?"Saved to your shortlist":"Save a good possibility"}</strong><p>{saved?"A good possibility to come back to.":"Use the bookmark to keep this example."}</p></div></div>
    </>}
    {active === 1 && <>
      <div className="sample-card builder-card"><div className="builder-title"><h3>Build it with Centring</h3><span>1 of 7</span></div>
        <div className="builder-body"><div className="choice-tabs" role="group" aria-label="Program type"><button aria-pressed={!existing} onClick={()=>setExisting(false)}>A new program</button><button aria-pressed={existing} onClick={()=>setExisting(true)}>Work we already do</button></div>
        <label htmlFor="program-idea">{existing?"What existing work would you like to fund?":"What would you like to get funding for?"}</label><textarea id="program-idea" value={idea} onChange={event=>setIdea(event.target.value)} rows={3}/></div></div>
      <div className="sample-card layered-brief"><span className="document-label">Your program brief</span><h3>Open Studio Saturdays</h3><div className="brief-detail"><strong>People & place</strong><p>Young people in our neighborhood.</p></div><div className="brief-detail"><strong>What you’ll do</strong><p>{summary}</p></div></div>
    </>}
    {active === 2 && <>
      <div className="prepare-title"><h3>A thoughtful first step.</h3><p>One idea. Different ways to begin.</p></div>
      <div className="choice-tabs format-choice" role="group" aria-label="Draft format">{formats.map((name,i)=><button key={name} aria-pressed={format===i} onClick={()=>{setFormat(i);setReviewed(false);}}>{name}</button>)}</div>
      <div className="first-step"><strong>Why this first step?</strong><p>{reasons[format]}</p></div>
      <div className="sample-card prepared-document"><span className="document-label">{formats[format]}</span>
        {format===0 ? <><h3>Open Studio Saturdays</h3><strong>1. What will your program do?</strong><p>{summary}</p><strong>2. What would the funding support?</strong><p>Support would cover teaching artists, materials, and an accessible community venue.</p></> : format===1 ? <><p>Dear grants team,</p><p>Open Studio Saturdays offers {summary.charAt(0).toLowerCase()+summary.slice(1)}</p><p>Support would cover teaching artists, materials, and an accessible community venue. We’d welcome an invitation to share a fuller proposal.</p><p>With thanks,<br/>Sarah Holmes</p></> : <><dl className="email-header"><dt>To</dt><dd>Program team · Arts Foundation</dd><dt>Subject</dt><dd>Eligibility question: Open Studio Saturdays</dd></dl><p>Hello,</p><p>Open Studio Saturdays offers {summary.charAt(0).toLowerCase()+summary.slice(1)}</p><p>Is this program eligible, including through a fiscal sponsor?</p><p>With thanks,<br/>Sarah Holmes</p></>}
        <div className="document-foot">Prepared from your program brief</div>
      </div>
    </>}
    {active === 3 && <>
      <div className="sample-card review-card"><div className="card-top"><span className="fit-tag">Your review</span><span className="review-format">{formats[format]}</span></div><h3>Open Studio Saturdays</h3>
        <div className="review-row"><span className="review-check complete">✓</span><div><strong>Program summary</strong><p>Reviewed by Sarah</p></div></div>
        <label className="review-row review-action"><input type="checkbox" checked={reviewed} onChange={event=>setReviewed(event.target.checked)}/><span className={`review-check ${reviewed?"complete":""}`} aria-hidden="true">{reviewed?"✓":""}</span><span><strong>{format===2?"Eligibility question":"Budget & request"}</strong><span className="review-hint">{reviewed?"Reviewed by you":"Ready for your review"}</span></span></label>
        <div className="reviewer"><span className="avatar">SH</span><span>Sarah Holmes</span><span>Reviewer</span></div>
      </div>
      <div className="collaboration-card"><span className="document-label">Working together</span><div className="collaboration-row"><span className="avatar centring-avatar">C</span><div><strong>Centring</strong><p>{format===2?"Drafted a question about program fit.":"Prepared the program overview from your brief."}</p></div></div><div className="collaboration-row"><span className="avatar">SH</span><div><strong>Sarah Holmes</strong><p>Checked the summary. {format===2?"The question":"The budget"} is next.</p></div></div></div>
      <p className="review-final" role="status">✓ {reviewed?"Example review complete. Your team gives the final OK.":"Your team gives the final OK."}</p>
    </>}
  </div>;
}

"use client";
import { useEffect, useRef, useState } from "react";
import Walkthrough, { WalkthroughProvider } from "./walkthrough";
import BeedyWalk, { poseBeedy } from "./beedy-walk";
import { chapters } from "./story-chapters";

const labels = ["Find", "Build", "Prepare", "Review"];
const clamp = (n: number) => Math.max(0, Math.min(1, n));

export default function ScrollStory() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const panels = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [linear, setLinear] = useState(false);

  useEffect(() => {
    const media = matchMedia("(max-width: 760px), (prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!root.current || !track.current) return;
      setLinear(media.matches);
      if (media.matches) {
        track.current.style.removeProperty("transform");
        panels.current.forEach(panel => { if (panel) { panel.style.removeProperty("--layer-shift"); poseBeedy(panel, 0, 1, false); } });
        return;
      }
      const rect = root.current.getBoundingClientRect();
      const distance = Math.max(1, root.current.offsetHeight - innerHeight);
      const time = clamp(-rect.top / distance) * 4;
      const chapter = Math.min(3, Math.floor(time));
      const phase = time - chapter;
      // Each full-width scene holds for reading, then Beedy pulls the next across.
      const travel = chapter === 3 ? 0 : clamp((phase - .45) / .55);
      const eased = travel * travel * (3 - 2 * travel);
      const position = chapter + eased;
      const width = root.current.clientWidth;
      track.current.style.transform = `translate3d(${-position * width}px,0,0)`;
      setActive(Math.min(3, Math.round(position)));
      panels.current.forEach((panel,i) => {
        if (!panel) return;
        const offset = Math.max(-1, Math.min(1, i - position));
        // Text, paper and foreground move at different depths.
        panel.style.setProperty("--layer-shift", `${offset * width * .08}px`);
        panel.style.setProperty("--paper-turn", `${offset * -2.5}deg`);
        const tug = i === chapter && chapter < 3 ? Math.sin(travel * Math.PI) : 0;
        panel.style.setProperty("--beedy-step", "0px");
        panel.style.setProperty("--beedy-lean", "0deg");
        const renderedWidth = innerHeight <= 760 ? 140 : Math.max(150, Math.min(220, width * .15));
        poseBeedy(panel, position * width + width * .025 * tug, renderedWidth / 1199, travel > 0 && travel < 1);
        panel.style.setProperty("--beedy-lead", `${-width * .025 * tug}px`);
        const rope = panel.querySelector<SVGPathElement>(".scene-tether path");
        if (rope) {
          const compact = innerHeight <= 760;
          const birdWidth = compact ? 140 : Math.max(150, Math.min(220, width * .15));
          const birdHeight = birdWidth / 1.24;
          const angle = 0;
          const px = birdWidth * .15, py = -birdHeight * .35;
          const lead = -width * .025 * tug + px * Math.cos(angle) - py * Math.sin(angle) - px;
          const bob = 0;
          const ropeWidth = Math.max(1, width * .35 - birdWidth * .65 + 8);
          const startX = lead / ropeWidth * 100;
          const startY = (compact ? 52 + 65 - 20 : 75 + 65 - 30) - birdHeight * .45 + bob;
          const sy = startY / 65 * 80;
          rope.setAttribute("d", `M ${startX} ${sy} Q 50 ${sy + 22 * (1 - tug)} 100 ${sy}`);
        }
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    addEventListener("scroll", schedule, {passive:true});
    addEventListener("resize", schedule);
    media.addEventListener("change", schedule);
    const observer = new ResizeObserver(schedule); observer.observe(root.current!);
    update();
    return () => {removeEventListener("scroll", schedule); removeEventListener("resize", schedule); media.removeEventListener("change", schedule); observer.disconnect(); cancelAnimationFrame(frame);};
  }, []);

  function goTo(index: number) {
    if (!root.current) return;
    if (linear) {panels.current[index]?.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"}); return;}
    const distance = root.current.offsetHeight - innerHeight;
    const start = root.current.getBoundingClientRect().top + scrollY;
    window.scrollTo({top:start + distance * (index + .2) / 4,behavior:"smooth"});
  }

  return <WalkthroughProvider><section id="how-it-works" className="scroll-story" ref={root} aria-label="How Centring works">
    <div className="story-pin">
      <nav className="story-controls" aria-label="Walkthrough chapters">{labels.map((label,i)=><button key={label} aria-current={!linear&&active===i?"step":undefined} onClick={()=>goTo(i)}>{label}</button>)}</nav>
      <div className="story-track" ref={track}>
        {chapters.map((chapter,i)=><article className={`story-scene scene-${i}`} key={chapter.label} ref={el=>{panels.current[i]=el;}} id={`chapter-${i}`} aria-label={labels[i]} inert={!linear && active!==i}>
          <div className="scene-copy"><h2>{chapter.title}</h2><p>{chapter.text}</p>{i<3?<button className="text-link" onClick={()=>goTo(i+1)}>Keep going <span>→</span></button>:<a href="https://centring.ai/" className="button green">Explore Centring <span>↗</span></a>}</div>
          <div className="scene-paper"><div className="scene-paper-scroll" tabIndex={0} role="region" aria-label={`${labels[i]} interactive example`}><Walkthrough active={i}/></div><p className="scene-disclosure">Illustrative product walkthrough</p></div>
          <div className="scene-ground" aria-hidden="true"/>
          <div className="scene-beedy" aria-hidden="true"><BeedyWalk/></div>
          {i<3&&<svg className="scene-tether" aria-hidden="true" viewBox="0 0 100 80" preserveAspectRatio="none"><path d="M 0 19 Q 50 60 100 18"/></svg>}
        </article>)}
      </div>
    </div>
  </section></WalkthroughProvider>;
}

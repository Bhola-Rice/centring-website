"use client";

import { useEffect, useRef, useState } from "react";
import ScrollStory from "./scroll-story";

function Bird({ className = "" }: { className?: string }) {
  return <div className={`bird ${className}`}><img src="/beedy.png" alt="Beedy, Centring’s kiwi companion, wearing a bright green bow tie" /></div>;
}

export default function Home() {
  const [menu, setMenu] = useState(false);
  const [reduced, setReduced] = useState(false);
  const hero = useRef<HTMLElement>(null);
  const manifesto = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches); sync(); media.addEventListener("change", sync);
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      document.documentElement.style.setProperty("--scroll", String(y));
      if (hero.current && !media.matches) hero.current.style.setProperty("--drift", `${Math.min(y * .15, 140)}px`);
      if (manifesto.current) {
        const r = manifesto.current.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, (window.innerHeight * .8 - r.top) / (window.innerHeight * .85)));
        manifesto.current.style.setProperty("--read", `${progress * 100}%`);
      }

    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll); media.addEventListener("change", scroll); update();
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) {entry.target.classList.add("visible"); observer.unobserve(entry.target);} }), {threshold:.1});
    document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
    return () => { window.removeEventListener("scroll", scroll); window.removeEventListener("resize", scroll); media.removeEventListener("change", scroll); media.removeEventListener("change", sync); cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);
  return <>
    <a className="skip" href="#main">Skip to content</a>
    <header className="nav">
      <a href="#" className="wordmark" aria-label="Centring home">Centring<span className="brand-dot" /></a>
      <nav className={menu ? "nav-links open" : "nav-links"} aria-label="Main navigation">
        <a href="#how-it-works" onClick={() => setMenu(false)}>How it works</a><a href="#beedy" onClick={() => setMenu(false)}>Meet Beedy</a><a href="#questions" onClick={() => setMenu(false)}>Questions</a>
      </nav>
      <a className="nav-cta" href="https://centring.ai/">Explore Centring <span>↗</span></a>
      <button className="menu-toggle" aria-label={menu ? "Close menu" : "Open menu"} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? "Close −" : "Menu +"}</button>
    </header>
    <main id="main">
      <section className="hero" ref={hero}>
        <h1>Good work.<br/><span className="second-line">More room</span><br/><span className="last-line">to <em>grow.</em><svg viewBox="0 0 320 18" aria-hidden="true"><path d="M3 12 Q151 -6 315 8" /></svg></span></h1>
        <div className="hero-bird"><Bird/></div>
        <div className="hero-bottom"><div><a href="#how-it-works" className="button green">Find your next step <span>↗</span></a></div></div>
      </section>
      <div className="ticker" aria-label="Find your funding. Build your idea. Grow your impact."><div><span>Find your funding</span><b>✳</b><span>Build your idea</span><b>✳</b><span>Grow your impact</span><b>✳</b><span aria-hidden="true">Find your funding</span><b aria-hidden="true">✳</b><span aria-hidden="true">Build your idea</span><b aria-hidden="true">✳</b></div></div>
      <section id="purpose" className="purpose section" ref={manifesto}>
        
        <h2 className={`manifesto ${reduced ? "fully-read" : ""}`}>The world needs<br/>more of your <em>good work.</em><br/>Less of your paperwork.</h2>
      </section>
      <ScrollStory/>
      <section id="beedy" className="beedy-video-section" aria-label="Meet Beedy">
        <video className="beedy-video" controls playsInline preload="metadata" poster="/centring-introduction.jpg" aria-label="Centring introduction video">
          <source src="/centring-introduction.mp4" type="video/mp4"/>
          <a href="/centring-introduction.mp4">Watch the Centring introduction</a>
        </video>
      </section>
      <section id="questions" className="questions section"><div className="faq-grid"><h2>Good<br/><em>questions.</em></h2><div className="faq-list">{[
        ["Who is Centring for?","Centring is made for nonprofit teams looking for support with funding discovery and preparing their ideas. It’s a starting point for the people doing meaningful work in their communities."],
        ["How does Centring help?","Explore funding possibilities, build a program brief, and prepare a first draft for your team to review. The goal is to make the next step clearer and easier to take."],
        ["Does Centring submit applications for me?","Your team stays in control. Review details, check funder requirements, and approve your work before anything is submitted."],
        ["Are the opportunities in this walkthrough real?","This page shows an illustrative product walkthrough, not live grants. Visit Centring to explore the current experience, and verify eligibility and deadlines directly with each funder."]
      ].map(([q,a])=><details key={q}><summary>{q}<span className="plus">+</span></summary><p>{a}</p></details>)}</div></div></section>
      <section className="closing"><h2>Here’s to what<br/>you’ll <em>make possible.</em></h2><a className="button dark" href="https://centring.ai/">Find your next step <span>↗</span></a><span className="closing-star" aria-hidden="true">✳</span></section>
    </main>
    <footer><div className="footer-top"><a href="#" className="footer-logo">Centring</a><p>More time for your good work.</p><a href="#" className="back-top">BACK TO TOP ↑</a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Centring</span><a href="https://centring.ai/">Visit Centring ↗</a></div></footer>
  </>;
}

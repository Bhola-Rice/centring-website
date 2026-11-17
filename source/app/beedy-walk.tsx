"use client";
import { useId } from "react";

// The supplied artwork supplies the body and both feet; only the hidden leg joints
// are drawn separately so the feet can plant rather than rotate with the sprite.
export default function BeedyWalk() {
  const id = useId().replace(/:/g, "");
  return <svg className="beedy-rig" viewBox="0 100 1199 965" aria-hidden="true">
    <defs>
      <clipPath id={`${id}-body`}><path d="M0 0H1199V800L1015 800L940 840L860 872L790 889L722 894L665 891L630 884L610 886L565 875L550 870L492 852L425 813L330 780H0Z"/></clipPath>
      <clipPath id={`${id}-left`}><path d="M465 926L512 928L525 963Q534 985 507 994L441 1031Q423 1040 430 1019L453 990L366 1011Q342 1019 350 1003L407 974L345 978Q320 980 334 965Q376 935 465 926Z"/></clipPath>
      <clipPath id={`${id}-right`}><path d="M722 940L775 938L786 970Q816 989 834 1017Q842 1031 822 1028L754 1003L689 1035Q673 1047 675 1029L694 1001L631 1009Q607 1012 619 997Q651 966 721 956Z"/></clipPath>
    </defs>
    <g data-leg="right"><path data-shin="right" d="M750 855Q777 909 750 960" fill="none" stroke="#242017" strokeWidth="47" strokeLinecap="round"/><path data-shin-fill="right" d="M750 855Q777 909 750 960" fill="none" stroke="#f9cb83" strokeWidth="39" strokeLinecap="round"/><g data-foot="right"><image href="/beedy.png" width="1199" height="1312" clipPath={`url(#${id}-right)`}/></g></g>
    <g data-leg="left"><path data-shin="left" d="M520 830Q536 900 490 950" fill="none" stroke="#242017" strokeWidth="47" strokeLinecap="round"/><path data-shin-fill="left" d="M520 830Q536 900 490 950" fill="none" stroke="#f9cb83" strokeWidth="39" strokeLinecap="round"/><g data-foot="left"><image href="/beedy.png" width="1199" height="1312" clipPath={`url(#${id}-left)`}/></g></g>
    <g data-body=""><image href="/beedy.png" width="1199" height="1312" clipPath={`url(#${id}-body)`}/></g>
  </svg>;
}

export function poseBeedy(panel: HTMLElement, distance: number, scale: number, moving: boolean) {
  const stride = 360;
  const cycle = distance / scale / stride;
  const bob = moving ? -7 * (1 - Math.cos(cycle * Math.PI * 4)) : 0;
  panel.querySelector('[data-body]')?.setAttribute('transform', `translate(0 ${bob})`);
  for (const [side, shift, hipX, hipY, ankleX, ankleY] of [
    ['left', 0, 520, 830, 490, 950], ['right', .5, 750, 855, 750, 960]
  ] as const) {
    const phase = ((cycle + shift) % 1 + 1) % 1;
    const stance = phase < .64;
    const swing = (phase - .64) / .36;
    // During stance local foot speed cancels the scene's horizontal travel.
    const x = moving ? (stance ? (phase - .32) * stride : (.32 - .64 * (swing*swing*(3-2*swing))) * stride) : 0;
    const lift = moving && !stance ? 68 * Math.sin(Math.PI * swing) : 0;
    const angle = moving && !stance ? -12 * Math.sin(Math.PI * 2 * swing) : 0;
    panel.querySelector(`[data-foot="${side}"]`)?.setAttribute('transform', `translate(${x} ${-lift}) rotate(${angle} ${ankleX} ${ankleY})`);
    const d = `M${hipX} ${hipY+bob} Q${hipX+40+x*.35} ${910-lift*.4} ${ankleX+x} ${ankleY-lift}`;
    panel.querySelector(`[data-shin="${side}"]`)?.setAttribute('d',d);
    panel.querySelector(`[data-shin-fill="${side}"]`)?.setAttribute('d',d);
  }
}

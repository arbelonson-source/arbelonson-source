// Builds the hand-made hero and divider SVGs (light + dark). Run: node scripts/build-static.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const themes = {
  light: { panel: '#F4ECDF', bubble: '#FFFDF8', stroke: '#E6DAC6', ink: '#232733', muted: '#6A6558', accent: '#C9701A', glow: '#F2B263', glowOp: 0.55 },
  dark:  { panel: '#1D2128', bubble: '#272C35', stroke: '#343A45', ink: '#EDE9E2', muted: '#A9A89F', accent: '#F0A354', glow: '#F0A354', glowOp: 0.38 },
};
const SERIF = "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const CAPTIONS = ['Dinner is ready.', 'Sit down, everyone.', 'Can you hear me now?'];
const ALT = 'Building software for the people at my table. Private by design: no accounts, no ads, no tracking.';

function hero(t, v) {
  const m = v === 'mobile';
  const W = m ? 600 : 1280, H = m ? 506 : 384;
  const lamp = m ? { x: 505, y: 52, s: 0.8 } : { x: 1020, y: 36, s: 1 };
  const bx = m ? 40 : 840, bw = m ? [250, 300, 290] : [250, 300, 290];
  const by = m ? [364, 402, 440] : [228, 270, 312];
  const dur = 18;
  const starts = [8, 30, 52]; // percent of cycle
  let css = `
  .h{font-family:${SERIF};font-weight:700;fill:${t.ink}}
  .s{font-family:${SANS};font-weight:500;fill:${t.muted}}
  .c{font-family:${SANS};font-size:17px;fill:${t.ink}}
  .glow{opacity:1}
  @media (prefers-reduced-motion:no-preference){
    .glow{animation:breathe 9s ease-in-out infinite;transform-origin:${lamp.x}px ${lamp.y + 70 * lamp.s}px}
    .line{animation:fade ${dur}s linear infinite}`;
  starts.forEach((s, i) => {
    css += `
    .cv${i}{animation:cv${i} ${dur}s cubic-bezier(.4,0,.2,1) infinite}`;
  });
  css += `
  }
  @keyframes breathe{0%,100%{opacity:.72;transform:scale(.97)}50%{opacity:1;transform:scale(1.03)}}
  @keyframes fade{0%{opacity:0}3%{opacity:1}88%{opacity:1}95%,100%{opacity:0}}`;
  starts.forEach((s, i) => {
    css += `
  @keyframes cv${i}{0%,${s}%{transform:translateX(0)}${s + 12}%,100%{transform:translateX(${bw[i]}px)}}`;
  });
  css += `\n  .cover{transform:translateX(${0}px)}`;
  // base state (reduced motion / no animation): fully revealed
  const base = bw.map((w, i) => `.cv${i}{transform:translateX(${w}px)}`).join('');
  css = `${base}\n${css}`;

  const headline = m
    ? ['Building software', 'for the people', 'at my table.']
    : ['Building software for', 'the people at my table.'];
  const hs = m ? 40 : 54;
  const hy0 = m ? 134 : 152, hstep = m ? 50 : 66;
  const subs = m
    ? ['Private by design: no accounts,', 'no ads, no tracking.']
    : ['Private by design: no accounts, no ads, no tracking.'];
  const sy0 = m ? hy0 + hstep * 2 + 52 : hy0 + hstep + 56;
  const ss = m ? 19 : 23;
  let body = '';
  headline.forEach((l, i) => { body += `<text class="h" x="${m ? 40 : 72}" y="${hy0 + i * hstep}" font-size="${hs}">${l}</text>\n`; });
  subs.forEach((l, i) => { body += `<text class="s" x="${m ? 40 : 74}" y="${sy0 + i * (ss + 9)}" font-size="${ss}">${l}</text>\n`; });

  // lamp
  const L = lamp;
  const lampSvg = `
  <g class="glow"><circle cx="${L.x}" cy="${L.y + 70 * L.s}" r="${120 * L.s}" fill="url(#g)"/></g>
  <g transform="translate(${L.x} ${L.y}) scale(${L.s})" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M-42 64 L-24 12 L24 12 L42 64 Z" fill="${t.accent}" fill-opacity=".9" stroke="${t.accent}" stroke-width="3"/>
    <path d="M0 64 V120" stroke="${t.ink}" stroke-opacity=".55" stroke-width="5"/>
    <path d="M-28 128 Q0 118 28 128" stroke="${t.ink}" stroke-opacity=".55" stroke-width="5"/>
  </g>`;
  // caption bubbles
  let caps = '';
  CAPTIONS.forEach((txt, i) => {
    const x = bx, y = by[i], w = bw[i];
    caps += `
  <g class="line" aria-hidden="true">
    <rect x="${x}" y="${y}" width="${w}" height="34" rx="17" fill="${t.bubble}" stroke="${t.stroke}"/>
    <circle cx="${x + 19}" cy="${y + 17}" r="4" fill="${t.accent}"/>
    <text class="c" x="${x + 34}" y="${y + 23}">${txt}</text>
    <g clip-path="url(#clip${i})"><rect class="cv${i}" x="${x + 30}" y="${y - 1}" width="${w}" height="36" fill="${t.bubble}"/></g>
  </g>`;
  });
  const clips = CAPTIONS.map((_, i) => `<clipPath id="clip${i}"><rect x="${bx}" y="${by[i]}" width="${bw[i]}" height="34" rx="17"/></clipPath>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${ALT}">
  <title>${ALT}</title>
  <defs>
    <radialGradient id="g"><stop offset="0" stop-color="${t.glow}" stop-opacity="${t.glowOp}"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient>
    ${clips}
  </defs>
  <style>${css}
  </style>
  <rect width="${W}" height="${H}" rx="24" fill="${t.panel}"/>
${lampSvg}
${body}${caps}
</svg>
`;
}

function divider(t) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="28" viewBox="0 0 1280 28" role="img" aria-label="Divider">
  <title>Divider</title>
  <style>.d{opacity:1}@media (prefers-reduced-motion:no-preference){.d{animation:p 9s ease-in-out infinite}}@keyframes p{0%,100%{opacity:.6}50%{opacity:1}}</style>
  <line x1="320" y1="14" x2="610" y2="14" stroke="${t.stroke}" stroke-width="2" stroke-linecap="round"/>
  <line x1="670" y1="14" x2="960" y2="14" stroke="${t.stroke}" stroke-width="2" stroke-linecap="round"/>
  <circle class="d" cx="640" cy="14" r="6" fill="${t.accent}"/>
</svg>
`;
}

mkdirSync('assets', { recursive: true });
for (const [name, t] of Object.entries(themes)) {
  writeFileSync(`assets/hero-${name}.svg`, hero(t, 'desktop'));
  writeFileSync(`assets/hero-mobile-${name}.svg`, hero(t, 'mobile'));
  writeFileSync(`assets/divider-${name}.svg`, divider(t));
}

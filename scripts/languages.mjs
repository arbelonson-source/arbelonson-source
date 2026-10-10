// Builds a language breakdown for the owner's own public, non-fork repos. Uses only the workflow's GITHUB_TOKEN.
import { writeFileSync, mkdirSync } from 'node:fs';

const owner = process.env.GITHUB_REPOSITORY_OWNER;
const self = (process.env.GITHUB_REPOSITORY || '').split('/')[1];
const outDir = process.argv[2] || 'dist';
const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28' };
const get = async (u) => { const r = await fetch(`https://api.github.com${u}`, { headers }); if (!r.ok) throw new Error(`${u}: ${r.status}`); return r.json(); };

const repos = (await get(`/users/${owner}/repos?type=owner&per_page=100`)).filter((r) => !r.fork && !r.archived && !r.private && r.name !== self);
const totals = {};
for (const r of repos) for (const [k, v] of Object.entries(await get(`/repos/${owner}/${r.name}/languages`))) totals[k] = (totals[k] || 0) + v;
const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => ({ k, pct: (v / sum) * 100 }));

const themes = {
  light: { panel: '#F4ECDF', track: '#E6DAC6', ink: '#232733', muted: '#6A6558', accent: '#C9701A' },
  dark: { panel: '#1D2128', track: '#343A45', ink: '#EDE9E2', muted: '#A9A89F', accent: '#F0A354' },
};
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Iowan Old Style', serif";
const W = 560, rowH = 40, H = 84 + rows.length * rowH;
const label = (r) => `${r.k} ${r.pct.toFixed(r.pct < 1 ? 1 : 0)}%`;
const alt = `Languages in my own public projects: ${rows.map(label).join(', ')}.`;

function svg(t) {
  let g = '';
  rows.forEach((r, i) => {
    const y = 84 + i * rowH, bw = 280, fill = Math.max(4, (bw * r.pct) / 100);
    g += `<text x="32" y="${y + 5}" font-size="17" font-family="${SANS}" font-weight="600" fill="${t.ink}">${r.k}</text>
<rect x="168" y="${y - 9}" width="${bw}" height="12" rx="6" fill="${t.track}"/>
<rect x="168" y="${y - 9}" width="${fill.toFixed(1)}" height="12" rx="6" fill="${t.accent}"/>
<text x="${168 + bw + 16}" y="${y + 5}" font-size="16" font-family="${SANS}" fill="${t.muted}">${r.pct.toFixed(r.pct < 1 ? 1 : 0)}%</text>\n`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${alt}">
<title>${alt}</title>
<rect width="${W}" height="${H}" rx="20" fill="${t.panel}"/>
<text x="32" y="44" font-size="22" font-family="${SERIF}" font-weight="700" fill="${t.ink}">Languages in my own projects</text>
${g}</svg>
`;
}
mkdirSync(outDir, { recursive: true });
for (const [n, t] of Object.entries(themes)) writeFileSync(`${outDir}/languages-${n}.svg`, svg(t));
console.log(alt);

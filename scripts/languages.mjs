// Builds "Languages I've written": lines added by the owner, by language, from
//  (a) commits by the owner in their own public non-fork repos, and
//  (b) merged pull requests by the owner to other people's repos, plus a few commits that landed by hand.
// Uses only the workflow's GITHUB_TOKEN. Run: node scripts/languages.mjs <outDir>
import { writeFileSync, mkdirSync } from 'node:fs';

const owner = process.env.GITHUB_REPOSITORY_OWNER;
const self = (process.env.GITHUB_REPOSITORY || '').split('/')[1];
const outDir = process.argv[2] || 'dist';
const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28' };

// Commits that landed by hand (not through a merged pull request).
const HAND_COMMITS = [
  ['purpleidea/mgmt', '1220d0d0ee31be3cecfff98834933fa1fb2989f4'],
  ['purpleidea/mgmt', 'e8af1df'],
];

const get = async (u) => {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(`https://api.github.com${u}`, { headers });
    if (r.ok) return r.json();
    if (r.status === 403 || r.status === 429 || r.status >= 500) { await new Promise((s) => setTimeout(s, 2000 * (attempt + 1))); continue; }
    throw new Error(`${u}: ${r.status}`);
  }
  throw new Error(`${u}: gave up`);
};
const pages = async (u, max = 10) => {
  const out = [];
  for (let p = 1; p <= max; p++) {
    const chunk = await get(`${u}${u.includes('?') ? '&' : '?'}per_page=100&page=${p}`);
    out.push(...(Array.isArray(chunk) ? chunk : chunk.items));
    if ((Array.isArray(chunk) ? chunk : chunk.items).length < 100) break;
  }
  return out;
};
const pool = async (items, n, fn) => { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); })); };

const EXT = {
  swift: 'Swift', kt: 'Kotlin', kts: 'Kotlin', rs: 'Rust', go: 'Go', py: 'Python', ts: 'TypeScript', tsx: 'TypeScript',
  js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript', qml: 'QML', c: 'C', h: 'C', cpp: 'C++', java: 'Java',
  sh: 'Shell', bash: 'Shell', ps1: 'PowerShell', bat: 'Batchfile', html: 'HTML', css: 'CSS', lua: 'Lua', rb: 'Ruby',
  mcl: 'mgmt language', nix: 'Nix',
};
const SKIP_PATH = /(^|\/)(node_modules|vendor|dist|build|target|generated|gen|locales?|translations?|i18n|fixtures?|testdata|\.build|Pods)(\/|$)|\.(min\.js|lock|pbxproj|xcassets)$|(^|\/)(package-lock\.json|Cargo\.lock|go\.sum)$/i;
const CAP_PER_FILE = 3000; // one huge pasted file must not dominate

const own = {}, oss = {};
let totals = own;
const add = (f) => {
  if (f.status === 'removed' || SKIP_PATH.test(f.filename)) return;
  const lang = EXT[(f.filename.split('.').pop() || '').toLowerCase()];
  if (lang) totals[lang] = (totals[lang] || 0) + Math.min(f.additions || 0, CAP_PER_FILE);
};

// (a) own public repos
const repos = (await pages(`/users/${owner}/repos?type=owner`)).filter((r) => !r.fork && !r.archived && !r.private && r.name !== self);
for (const r of repos) {
  const commits = (await pages(`/repos/${owner}/${r.name}/commits?author=${owner}`, 20)).filter((c) => c.parents.length < 2);
  await pool(commits, 6, async (c) => { const d = await get(`/repos/${owner}/${r.name}/commits/${c.sha}`); (d.files || []).forEach(add); });
}
totals = oss;
// (b) merged PRs to other people's repos
const prs = await pages(`/search/issues?q=${encodeURIComponent(`author:${owner} type:pr is:merged -user:${owner}`)}`, 10);
await pool(prs, 6, async (p) => {
  const repo = p.repository_url.replace('https://api.github.com/repos/', '');
  (await pages(`/repos/${repo}/pulls/${p.number}/files`, 30)).forEach(add);
});
for (const [repo, sha] of HAND_COMMITS) { const d = await get(`/repos/${repo}/commits/${sha}`); (d.files || []).forEach(add); }

const toRows = (t, n) => { const sum = Object.values(t).reduce((a, b) => a + b, 0) || 1; return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ k, pct: (v / sum) * 100 })); };
const ownRows = toRows(own, 4), ossRows = toRows(oss, 5);
const pc = (r) => (r.pct < 1 ? r.pct.toFixed(1) : Math.round(r.pct)) + '%';
const list = (rs) => rs.map((r) => `${r.k} ${pc(r)}`).join(', ');
const alt = `Languages I've written, by lines added. In my own projects: ${list(ownRows)}. In open source contributions: ${list(ossRows)}.`;

const themes = {
  light: { panel: '#F4ECDF', track: '#E6DAC6', ink: '#232733', muted: '#6A6558', accent: '#C9701A' },
  dark: { panel: '#1D2128', track: '#343A45', ink: '#EDE9E2', muted: '#A9A89F', accent: '#F0A354' },
};
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Iowan Old Style', serif";
const W = 560, rowH = 38, H = 74 + 36 + ownRows.length * rowH + 36 + ossRows.length * rowH + 14;

function svg(t) {
  let g = '', y = 74;
  const section = (title, rs) => {
    g += `<text x="32" y="${y + 18}" font-size="14" font-family="${SANS}" font-weight="700" letter-spacing="0.5" fill="${t.muted}">${title}</text>\n`;
    y += 44;
    rs.forEach((r) => {
      const bw = 280, fill = Math.max(4, (bw * r.pct) / 100);
      g += `<text x="32" y="${y + 5}" font-size="17" font-family="${SANS}" font-weight="600" fill="${t.ink}">${r.k}</text>
<rect x="168" y="${y - 9}" width="${bw}" height="12" rx="6" fill="${t.track}"/>
<rect x="168" y="${y - 9}" width="${fill.toFixed(1)}" height="12" rx="6" fill="${t.accent}"/>
<text x="${168 + bw + 16}" y="${y + 5}" font-size="16" font-family="${SANS}" fill="${t.muted}">${pc(r)}</text>\n`;
      y += rowH;
    });
    y -= 2;
  };
  section('IN MY OWN PROJECTS', ownRows);
  section('IN OPEN SOURCE CONTRIBUTIONS', ossRows);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${alt}">
<title>${alt}</title>
<rect width="${W}" height="${H}" rx="20" fill="${t.panel}"/>
<text x="32" y="44" font-size="22" font-family="${SERIF}" font-weight="700" fill="${t.ink}">Languages I've written</text>
${g}</svg>
`;
}
mkdirSync(outDir, { recursive: true });
for (const [n, t] of Object.entries(themes)) writeFileSync(`${outDir}/languages-${n}.svg`, svg(t));
console.log(alt, '\nPRs counted:', prs.length, '\nown:', own, '\noss:', oss);

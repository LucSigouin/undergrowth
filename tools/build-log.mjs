// Builds workbench/log.html, the mission log: one section per round, what changed, the score,
// before and after screenshots, and the balance table.
//
//   node tools/build-log.mjs
//
// Everything on the page comes from files already in the repo:
//   CHANGELOG.md                     what changed in a round, when that round wrote an entry
//   fleet-rN-*/ROUND.md              the one line summary for a round with no changelog entry
//   fleet-rN-*/scorer/score.json     the score, the verdict and the per item marks
//   node tools/balance-sim.mjs --json  the per strategy result table
//   workbench/shots/<dir>/           the screenshots, before is v1 and after is the newest round
//
// The output is deterministic: no clock is read, directories are sorted, and the page is written
// in one pass. Running it twice gives the same bytes. It is checked before it is written that the
// page carries no em dash and no tool or model name.
import { MATERIALS } from '../src/game.js';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => (existsSync(join(root, p)) ? readFileSync(join(root, p), 'utf8') : '');
const isDir = (p) => existsSync(join(root, p)) && statSync(join(root, p)).isDirectory();

// Names of tools and models never appear on the page. Any sentence carrying one is dropped, and
// the finished page is checked again at the end.
const BANNED = [
  'claude',
  'opus',
  'sonnet',
  'haiku',
  'fable',
  'kimi',
  'codex',
  'grok',
  'qwen',
  'gpt',
  'astra',
  'gemini',
  'llama',
];
const carriesName = (text) => BANNED.some((word) => text.toLowerCase().includes(word));

// Keep only the sentences that name no tool and no model.
function scrub(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !carriesName(sentence))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const escape = (text) =>
  String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

// A small markdown renderer for the subset the changelog uses: headings, tables, fenced code,
// bullet lists, bold, inline code and paragraphs.
function markdown(source) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let i = 0;
  const inline = (text) =>
    escape(text)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

  const isTableRow = (line) => /^\s*\|.*\|\s*$/.test(line);
  const cells = (line) =>
    line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim());

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith('```')) {
      const block = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) block.push(lines[i++]);
      i++;
      html.push(`<pre><code>${escape(block.join('\n'))}</code></pre>`);
      continue;
    }
    const heading = line.match(/^(#{3,6})\s+(.*)$/);
    if (heading) {
      const level = Math.min(6, heading[1].length + 1);
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }
    if (isTableRow(line) && isTableRow(lines[i + 1] || '')) {
      const head = cells(lines[i]);
      i += 2;
      const body = [];
      while (i < lines.length && isTableRow(lines[i])) body.push(cells(lines[i++]));
      html.push(
        '<div class="scroller"><table><thead><tr>' +
          head.map((cell) => `<th>${inline(cell)}</th>`).join('') +
          '</tr></thead><tbody>' +
          body
            .map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`)
            .join('') +
          '</tbody></table></div>',
      );
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        let item = lines[i++].replace(/^\s*[-*]\s+/, '');
        // Fold a wrapped continuation line into the same bullet.
        while (
          i < lines.length &&
          lines[i].trim() &&
          !/^\s*[-*]\s+|^\s*\||^#{1,6}\s/.test(lines[i])
        ) {
          item += ' ' + lines[i++].trim();
        }
        items.push(item);
      }
      html.push('<ul>' + items.map((item) => `<li>${inline(item)}</li>`).join('') + '</ul>');
      continue;
    }
    const paragraph = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*[-*]\s+|^\s*\||^#{1,6}\s|^```/.test(lines[i])
    ) {
      paragraph.push(lines[i++].trim());
    }
    html.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }
  return html.join('\n');
}

// The rounds, in number order, from the directories on disk.
const rounds = readdirSync(root)
  .filter((name) => /^fleet-r\d+-/.test(name) && isDir(name))
  .map((name) => ({ dir: name, id: name.match(/^fleet-(r\d+)-/)[1] }))
  .sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));

// Changelog bodies, keyed by round.
const changelog = new Map();
{
  const text = read('CHANGELOG.md').replace(/\r\n/g, '\n');
  const parts = text.split(/\n(?=## )/);
  for (const part of parts) {
    const heading = part.match(/^## (r\d+)[,:]?\s*(.*)$/m);
    if (!heading) continue;
    changelog.set(heading[1], {
      title: heading[2].trim(),
      body: part.slice(part.indexOf('\n') + 1).trim(),
    });
  }
}

// The one line summary for a round that wrote no changelog entry.
function askLine(dir) {
  const text = read(join(dir, 'ROUND.md')).replace(/\r\n/g, '\n');
  const section = text.split(/\n## /).find((part) => part.startsWith('The ask'));
  if (!section) return 'This round has no written summary yet.';
  const body = section.replace(/^The ask\s*/, '').split(/\n## /)[0];
  return scrub(body.replace(/\s+/g, ' ')) || 'This round has no written summary yet.';
}

// The screenshots. Before is always v1. After is the newest round directory that exists.
const shotsRoot = 'workbench/shots';
const shotDirs = isDir(shotsRoot) ? readdirSync(join(root, shotsRoot)).sort() : [];
const afterDir = shotDirs.includes('current')
  ? 'current'
  : shotDirs
      .filter((name) => /^r\d+$/.test(name) && isDir(join(shotsRoot, name)))
      .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
      .pop();
const beforeDir = shotDirs.includes('v1') ? 'v1' : null;
const shotExists = (dir, file) => Boolean(dir) && existsSync(join(root, shotsRoot, dir, file));

// Which state each round shows, so the page is not the same picture four times.
const ROUND_SHOT = {
  r1: ['01-fresh-desktop.png', 'The board on opening the game.'],
  r2: ['02-midwave-desktop.png', 'A wave running, with a tower selected.'],
  r3: ['03-missing-material.png', 'The panel of a tower that cannot afford its next level.'],
  r4: ['04-phone-portrait.png', 'The same game on a phone sized screen.'],
};
const FALLBACK_SHOT = ['01-fresh-desktop.png', 'The board on opening the game.'];

function shotPair(id) {
  const [file, caption] = ROUND_SHOT[id] || FALLBACK_SHOT;
  const pieces = [];
  if (shotExists(beforeDir, file)) {
    pieces.push({
      label: 'Before, version 1',
      src: `shots/${beforeDir}/${file}`,
      alt: `Version 1: ${caption}`,
    });
  }
  if (shotExists(afterDir, file)) {
    pieces.push({
      label: 'After, current game',
      src: `shots/${afterDir}/${file}`,
      alt: `Version 2: ${caption}`,
    });
  }
  return { caption, pieces };
}

// The scores.
function scoreFor(dir) {
  const raw = read(join(dir, 'scorer/score.json'));
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// The balance table, straight from the simulator.
const balance = JSON.parse(
  execFileSync('node', ['tools/balance-sim.mjs', '--json'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }),
);

const outcome = (strategy) => {
  if (strategy.won) return 'won all 30 stages';
  const stage = (strategy.lostAtStage ?? strategy.stagesCleared) * 3 + (strategy.lostAtWave ?? 1);
  return `lost in stage ${stage}`;
};

const balanceTable =
  '<div class="scroller tw"><table><thead><tr>' +
  ['Strategy', 'Outcome', 'Stages cleared', 'Lives lost', 'Kills', 'What it does']
    .map((cell) => `<th>${cell}</th>`)
    .join('') +
  '</tr></thead><tbody>' +
  balance.strategies
    .map((strategy) =>
      [
        `<tr><th scope="row"><code>${escape(strategy.name)}</code></th>`,
        `<td>${escape(outcome(strategy))}</td>`,
        `<td>${strategy.stages.reduce((total, group) => total + group.waves.length, 0) - (strategy.won ? 0 : 1)}</td>`,
        `<td>${strategy.livesLost}</td>`,
        `<td>${strategy.kills}</td>`,
        `<td class="note">${escape(strategy.note || '')}</td></tr>`,
      ].join(''),
    )
    .join('') +
  '</tbody></table></div>';

const winners = balance.strategies.filter((strategy) => strategy.won).length;
const balanceLine =
  `${winners} of ${balance.strategies.length} scripted strategies win all 30 stages, and every` +
  ' winner bleeds on the way. That is the whole point of the curve.';

// Current rules are kept separately from immutable round history. Publish the same
// measured balance and owner instruction on both workbench pages on every rebuild.
const currentRules = read('workbench/CURRENT-RULES.md');
if (!currentRules) throw new Error('workbench/CURRENT-RULES.md is missing');
const currentSection = [
  '<!-- CURRENT-GAME:START -->',
  '<section id="current-game">',
  '<h2>Current game: towers and garden only</h2>',
  markdown(currentRules.replace(/^# .*\n/, '')),
  '<p><a href="CURRENT-RULES.md">Current rules source</a> · <a href="balance.json">Measured balance data</a></p>',
  '<h3>Current scaling results</h3>',
  `<p>${escape(balanceLine)}</p>`,
  balanceTable,
  '</section>',
  '<!-- CURRENT-GAME:END -->',
].join('\n');

// One section per round.
function section(round) {
  const entry = changelog.get(round.id);
  const score = scoreFor(round.dir);
  const { caption, pieces } = shotPair(round.id);
  const name = round.dir.replace(/^fleet-r\d+-/, '');
  const title = entry ? scrub(entry.title) : name;

  const scoreBlock = score
    ? '<div class="scoreline"><span class="verdict">' +
      `${escape(score.verdict || 'scored')}</span> <b>${escape(score.overall ?? '')}</b>` +
      ' out of 10</div>' +
      '<div class="scroller"><table><thead><tr>' +
      Object.keys(score.items || {})
        .map((key) => `<th>Item ${escape(key)}</th>`)
        .join('') +
      '</tr></thead><tbody><tr>' +
      Object.values(score.items || {})
        .map((value) => `<td>${escape(value)}</td>`)
        .join('') +
      '</tr></tbody></table></div>'
    : '<div class="scoreline"><span class="verdict pending">not scored yet</span></div>';

  const body = entry
    ? markdown(entry.body)
    : `<p>${escape(askLine(round.dir))}</p>` +
      '<p class="note">This round changed no game rules, so it has no changelog entry.</p>';

  const shots = pieces.length
    ? '<div class="shots">' +
      pieces
        .map(
          (piece) =>
            `<figure><figcaption>${escape(piece.label)}</figcaption>` +
            `<img src="${escape(piece.src)}" alt="${escape(piece.alt)}" loading="lazy">` +
            '</figure>',
        )
        .join('') +
      `</div><p class="note">${escape(caption)}</p>`
    : '<p class="note">No screenshots for this round yet.</p>';

  return [
    `<section id="${round.id}">`,
    '<header class="round-head">',
    `<h2><span class="tag">${escape(round.id)}</span> ${escape(title)}</h2>`,
    scoreBlock,
    '</header>',
    '<p class="note">Historical round record. The current game rules above supersede retired features and old balance results.</p>',
    `<div class="round-body">${body}</div>`,
    '<h3>Before and after</h3>',
    shots,
    '</section>',
  ].join('\n');
}

const nav = rounds.map((round) => `<a href="#${round.id}">${escape(round.id)}</a>`).join('');

const CSS = `
:root{
  --ink:#1d2a24; --soft:#5b6b62; --line:#d7e0d5; --paper:#f6f8f3; --card:#ffffff;
  --leaf:#274636; --leaf-soft:#e6efe1; --accent:#7fa05f;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{
  margin:0; background:var(--paper); color:var(--ink);
  font:16px/1.6 "Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
}
img{max-width:100%; display:block}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:.92em;
  background:var(--leaf-soft); padding:.1em .35em; border-radius:4px}
pre{background:var(--leaf); color:#e9f2e2; padding:1rem; border-radius:10px; overflow-x:auto}
pre code{background:none; color:inherit; padding:0}
a{color:var(--leaf)}

/* Full bleed header band, edge to edge, no centred column anywhere on this page. */
.top{background:var(--leaf); color:#eaf3e4; padding:clamp(1.5rem,5vw,3.5rem) clamp(1rem,4vw,3rem)}
.top h1{margin:0 0 .4rem; font-size:clamp(1.9rem,5vw,3.2rem); line-height:1.05; letter-spacing:-.02em}
.top p{margin:0; max-width:62ch; color:#cadfc2}
.top nav{display:flex; flex-wrap:wrap; gap:.5rem; margin-top:1.4rem}
.top nav a{
  color:#eaf3e4; text-decoration:none; border:1px solid rgba(234,243,228,.45);
  border-radius:999px; padding:.35rem .9rem; font-weight:600; font-size:.95rem;
}

.band{padding:clamp(1.25rem,4vw,3rem); border-bottom:1px solid var(--line)}
.band.tint{background:var(--leaf-soft)}
.facts{display:grid; gap:1rem; grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))}
.fact{background:var(--card); border:1px solid var(--line); border-radius:12px; padding:1rem 1.1rem}
.fact b{display:block; font-size:1.6rem; line-height:1.1}
.fact span{color:var(--soft); font-size:.9rem}

section{padding:clamp(1.5rem,4vw,3rem) clamp(1rem,4vw,3rem); border-bottom:1px solid var(--line)}
section:nth-of-type(even){background:#fff}
.round-head{display:flex; flex-wrap:wrap; gap:.75rem 2rem; align-items:baseline;
  justify-content:space-between; margin-bottom:1rem}
.round-head h2{margin:0; font-size:clamp(1.35rem,3.2vw,2rem); line-height:1.15}
.tag{display:inline-block; background:var(--accent); color:#fff; border-radius:6px;
  padding:.05em .45em; font-size:.7em; vertical-align:.15em; letter-spacing:.04em}
.scoreline{font-size:.95rem; color:var(--soft)}
.scoreline b{color:var(--ink); font-size:1.15rem}
.verdict{display:inline-block; background:var(--leaf); color:#eaf3e4; border-radius:999px;
  padding:.15rem .7rem; font-weight:700; font-size:.8rem; letter-spacing:.05em}
.verdict.pending{background:#c9d3c6; color:#33403a}
.round-body{max-width:none}
.round-body h4,.round-body h3{margin:1.6rem 0 .5rem; font-size:1.05rem; letter-spacing:.01em}
.note{color:var(--soft); font-size:.92rem}

/* Screenshot pairs. Two across on a desktop, one across on a phone. */
.shots{display:grid; gap:1rem; grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr))}
figure{margin:0; background:var(--card); border:1px solid var(--line); border-radius:12px;
  overflow:hidden}
figcaption{padding:.55rem .8rem; font-size:.85rem; font-weight:600; color:var(--soft);
  border-bottom:1px solid var(--line); background:#fbfdf9}

.scroller{overflow-x:auto; margin:1rem 0}
table{border-collapse:collapse; width:100%; min-width:min(100%,32rem); font-size:.92rem}
th,td{text-align:left; padding:.5rem .7rem; border-bottom:1px solid var(--line);
  vertical-align:top}
thead th{background:var(--leaf-soft); font-size:.82rem; letter-spacing:.03em;
  text-transform:uppercase; color:#3d5347; white-space:nowrap}
tbody th{font-weight:600; white-space:nowrap}
footer{padding:clamp(1.5rem,4vw,3rem) clamp(1rem,4vw,3rem); color:var(--soft)}
@media (max-width:430px){
  body{font-size:15px}
  .top nav a{padding:.3rem .7rem; font-size:.85rem}
  th,td{padding:.4rem .5rem}
}
`;

const facts = [
  ['30', 'stages'],
  ['7', 'pieces to build'],
  ['9', 'creature types'],
  [String(rounds.length), 'rounds of work'],
  [String(balance.strategies.length), 'scripted strategies tested'],
];

const html = [
  '<!doctype html>',
  '<html lang="en">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1">',
  '<title>Undergrowth mission log</title>',
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link rel="stylesheet"' +
    ' href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap">',
  `<style>${CSS}</style>`,
  '</head>',
  '<body>',
  '<header class="top">',
  '<h1>Undergrowth mission log</h1>',
  '<p>How a small tower defence garden was rebuilt, round by round: what changed, what it',
  ' scored, how it looked before and after, and what the headless simulator says about the',
  ' difficulty curve.</p>',
  `<nav><a href="#current-game">current rules</a>${nav}<a href="#balance">balance</a></nav>`,
  '</header>',
  '<div class="band tint">',
  '<div class="facts">',
  ...facts.map(
    ([value, label]) =>
      `<div class="fact"><b>${escape(value)}</b><span>${escape(label)}</span></div>`,
  ),
  '</div>',
  '</div>',
  currentSection,
  ...rounds.map(section),
  '<section id="balance">',
  '<header class="round-head"><h2><span class="tag">sim</span> The difficulty curve</h2></header>',
  `<p>${escape(balanceLine)}</p>`,
  balanceTable,
  '<p class="note">Every row is a scripted player run headless by',
  ' <code>node tools/balance-sim.mjs</code>. Nothing in the game is random, so these numbers',
  ' are the same on every run.</p>',
  '</section>',
  '<footer>',
  '<p>Built by <code>node tools/build-log.mjs</code> from the changelog, the round records, the',
  ' score files and the screenshot folders. Rebuild it after any change with',
  ' <code>npm run log</code>.</p>',
  '</footer>',
  '</body>',
  '</html>',
  '',
].join('\n');

// Two last checks before anything is written.
if (html.includes('—')) throw new Error('the log contains an em dash');
const strippedOfAssets = html.replace(/src="[^"]*"|href="[^"]*"/g, '');
const found = BANNED.filter((word) => strippedOfAssets.toLowerCase().includes(word));
if (found.length) throw new Error(`the log names a tool or a model: ${found.join(', ')}`);

writeFileSync(join(root, 'workbench/log.html'), html);
writeFileSync(
  join(root, 'workbench/balance.json'),
  JSON.stringify(
    {
      playerAbilities: [],
      referenceStrategy: 'kit-maze',
      progression: { stages: 30, encountersPerStage: 1, legacyGroupSize: 3 },
      economy: { payout: 'completed-wave', snapshot: 'wave-start', idleProduction: false, baseHarvestPerLevel: Object.fromEntries(MATERIALS.map((material) => [material.id, material.yield])) },
      ...balance,
    },
    null,
    2,
  ) + '\n',
);
const operationsPath = join(root, 'workbench/workbench.html');
if (existsSync(operationsPath)) {
  let operations = readFileSync(operationsPath, 'utf8');
  const marker = /<!-- CURRENT-GAME:START -->[\s\S]*?<!-- CURRENT-GAME:END -->/;
  if (marker.test(operations)) operations = operations.replace(marker, () => currentSection);
  else {
    if (!operations.includes('<main id="main">'))
      throw new Error('Cannot find the operations workbench main section');
    operations = operations.replace('<main id="main">', '<main id="main">\n' + currentSection);
  }
  if (!operations.includes('href="#current-game"')) {
    operations = operations.replace(
      '<nav aria-label="Sections">',
      '<nav aria-label="Sections">\n  <a href="#current-game">Current game rules</a>',
    );
  }
  writeFileSync(operationsPath, operations);
}
console.log(
  `wrote workbench/log.html: ${rounds.length} round sections,` +
    ` shots before ${beforeDir || 'none'} and after ${afterDir || 'none'},` +
    ` ${balance.strategies.length} strategies`,
);

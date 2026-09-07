// Proof that the reformatted main.js builds byte-identical HTML strings.
// Left side: the exact expressions from git HEAD:src/main.js (the dense original).
// Right side: the expressions from the reformatted src/main.js.
// Run: node fleet-r1-foundation/format/html-equivalence.mjs
import assert from 'node:assert/strict';
import { Game, TOWERS, MATERIALS } from '../../src/game.js';

let checks = 0;
const same = (label, oldValue, newValue) => {
  assert.equal(newValue, oldValue, `MISMATCH in ${label}`);
  checks++;
};

/* ------------------------------------------------------------------ shell */

const oldShell = `<main class="game-shell">
  <div class="map-area"><section class="garden-strip" aria-label="Resource garden"><div class="garden-strip-heading"><h2>Garden</h2><p>Buy a resource. It collects itself. Upgrade with coins.</p></div><div id="garden-summary" class="garden-summary"></div><div id="farms" class="garden-plots"></div></section><section class="scene-wrap" id="scene" aria-label="Battlefield">
    <div class="map-status"><span>Stage <b id="stage-number">01</b><span class="status-muted"> / 10</span></span><span class="status-divider"></span><span class="heart">♥ <b id="lives">20 / 20</b></span></div>
    <div class="map-controls"><button id="pause" aria-label="Pause game" title="Pause · Space">Ⅱ</button><button id="speed" title="Game speed">1×</button><button id="zoom" class="mobile-only" aria-label="Zoom into battlefield">＋</button><button id="fit" class="mobile-only" aria-label="Fit battlefield">⤢</button><button id="mobile-options" class="mobile-only" aria-label="Game menu">⋯</button><button id="path" aria-pressed="true" title="Show enemy route">Route on</button></div>
    <div id="placement" class="placement" hidden><button id="cancel-place" aria-label="Cancel placement">×</button><button id="confirm-place">Place tower</button></div><div class="paused-overlay" id="paused" hidden>Paused</div>
  </section>
  </div><aside class="sidebar" aria-label="Build and garden">
    <div class="sidebar-heading"><span class="wordmark">undergrowth.</span><button id="help" class="icon-button" aria-label="How to play">?</button></div>
    <div class="resources"><span title="Coins"><i class="coin">◈</i><b id="coins">200</b><small>Coins</small></span></div>
    <div class="sidebar-scroll">
      <section class="defenses"><h2>Defenses <small>1–5</small></h2><div class="cards">${Object.entries(
        TOWERS,
      )
        .map(
          ([id, t], i) =>
            `<button class="tower-card ${id === 'thorn' ? 'selected' : ''}" data-build="${id}" title="${t.desc}" aria-pressed="${id === 'thorn'}"><span class="tower-icon" style="--tile:${t.color}">${t.symbol}</span><span class="tower-summary"><b>${t.name}</b><span class="tower-description">${t.desc}</span></span><small>◈ ${t.cost}</small></button>`,
        )
        .join('')}</div><div id="detail" class="detail" hidden></div></section>
      <section class="garden inventory"><h2>Materials</h2>${MATERIALS.map((m) => `<div class="inventory-row"><span>${m.name}</span><b id="${m.id}">0</b></div>`).join('')}<p>Used to upgrade your towers.</p></section>
    </div>
    <div class="wave-controls"><div class="wave-meta"><span id="wave-counter">Wave 1 / 3</span><span id="enemy-counter">9 creatures</span></div><button class="primary" id="start">Begin wave ↗</button><div class="utilities"><span id="saved">Autosaved</span><div><button id="sound" aria-label="Enable sound" title="Sound">♪</button><button id="restart" aria-label="Start a new garden" title="New garden">↺</button></div></div></div>
  </aside>
</main><div id="toast" role="status" aria-live="polite"></div><dialog id="modal"></dialog><dialog id="garden-modal" class="garden-sheet"><div class="sheet-heading"><div><h2>Your garden</h2><p>Collects automatically while you defend.</p></div><button id="close-garden" aria-label="Close garden">×</button></div><div class="sheet-body"></div></dialog>`;

const gardenStrip =
  '<section class="garden-strip" aria-label="Resource garden">' +
  '<div class="garden-strip-heading"><h2>Garden</h2>' +
  '<p>Buy a resource. It collects itself. Upgrade with coins.</p></div>' +
  '<div id="garden-summary" class="garden-summary"></div>' +
  '<div id="farms" class="garden-plots"></div>' +
  '</section>';

const mapStatus =
  '<div class="map-status">' +
  '<span>Stage <b id="stage-number">01</b><span class="status-muted"> / 10</span></span>' +
  '<span class="status-divider"></span>' +
  '<span class="heart">♥ <b id="lives">20 / 20</b></span>' +
  '</div>';

const mapControls =
  '<div class="map-controls">' +
  '<button id="pause" aria-label="Pause game" title="Pause · Space">Ⅱ</button>' +
  '<button id="speed" title="Game speed">1×</button>' +
  '<button id="zoom" class="mobile-only" aria-label="Zoom into battlefield">＋</button>' +
  '<button id="fit" class="mobile-only" aria-label="Fit battlefield">⤢</button>' +
  '<button id="mobile-options" class="mobile-only" aria-label="Game menu">⋯</button>' +
  '<button id="path" aria-pressed="true" title="Show enemy route">Route on</button>' +
  '</div>';

const placementBar =
  '<div id="placement" class="placement" hidden>' +
  '<button id="cancel-place" aria-label="Cancel placement">×</button>' +
  '<button id="confirm-place">Place tower</button></div>' +
  '<div class="paused-overlay" id="paused" hidden>Paused</div>';

const sidebarHeading =
  '<div class="sidebar-heading"><span class="wordmark">undergrowth.</span>' +
  '<button id="help" class="icon-button" aria-label="How to play">?</button></div>';

const resourceRow =
  '<div class="resources"><span title="Coins"><i class="coin">◈</i>' +
  '<b id="coins">200</b><small>Coins</small></span></div>';

const towerCards = Object.entries(TOWERS)
  .map(([id, tower]) => {
    const chosen = id === 'thorn';
    return (
      `<button class="tower-card ${chosen ? 'selected' : ''}" data-build="${id}"` +
      ` title="${tower.desc}" aria-pressed="${chosen}">` +
      `<span class="tower-icon" style="--tile:${tower.color}">${tower.symbol}</span>` +
      `<span class="tower-summary"><b>${tower.name}</b>` +
      `<span class="tower-description">${tower.desc}</span></span>` +
      `<small>◈ ${tower.cost}</small></button>`
    );
  })
  .join('');

const defensesSection =
  '<section class="defenses"><h2>Defenses <small>1–5</small></h2>' +
  `<div class="cards">${towerCards}</div>` +
  '<div id="detail" class="detail" hidden></div></section>';

const inventoryRows = MATERIALS.map(
  (material) =>
    `<div class="inventory-row"><span>${material.name}</span>` +
    `<b id="${material.id}">0</b></div>`,
).join('');

const inventorySection =
  '<section class="garden inventory"><h2>Materials</h2>' +
  inventoryRows +
  '<p>Used to upgrade your towers.</p></section>';

const waveControls =
  '<div class="wave-controls"><div class="wave-meta">' +
  '<span id="wave-counter">Wave 1 / 3</span>' +
  '<span id="enemy-counter">9 creatures</span></div>' +
  '<button class="primary" id="start">Begin wave ↗</button>' +
  '<div class="utilities"><span id="saved">Autosaved</span><div>' +
  '<button id="sound" aria-label="Enable sound" title="Sound">♪</button>' +
  '<button id="restart" aria-label="Start a new garden" title="New garden">↺</button>' +
  '</div></div></div>';

const overlays =
  '<div id="toast" role="status" aria-live="polite"></div>' +
  '<dialog id="modal"></dialog>' +
  '<dialog id="garden-modal" class="garden-sheet"><div class="sheet-heading">' +
  '<div><h2>Your garden</h2><p>Collects automatically while you defend.</p></div>' +
  '<button id="close-garden" aria-label="Close garden">×</button></div>' +
  '<div class="sheet-body"></div></dialog>';

const newShell = `<main class="game-shell">
  <div class="map-area">${gardenStrip}<section class="scene-wrap" id="scene" aria-label="Battlefield">
    ${mapStatus}
    ${mapControls}
    ${placementBar}
  </section>
  </div><aside class="sidebar" aria-label="Build and garden">
    ${sidebarHeading}
    ${resourceRow}
    <div class="sidebar-scroll">
      ${defensesSection}
      ${inventorySection}
    </div>
    ${waveControls}
  </aside>
</main>${overlays}`;

same('app shell', oldShell, newShell);

/* ----------------------------------------------------------- defenseStats */

const oldDefenseStats = (st, type) =>
  type === 'hedge'
    ? ''
    : `<div class="defense-stats"><span><b>${Math.round(st.damage)}</b>Damage / hit</span><span><b>${st.range.toFixed(1)}</b>Range · squares</span><span><b>${st.rate.toFixed(2)}s</b>Between shots</span></div>`;

function defenseStats(stats, type) {
  if (type === 'hedge') return '';
  return (
    '<div class="defense-stats">' +
    `<span><b>${Math.round(stats.damage)}</b>Damage / hit</span>` +
    `<span><b>${stats.range.toFixed(1)}</b>Range · squares</span>` +
    `<span><b>${stats.rate.toFixed(2)}s</b>Between shots</span></div>`
  );
}

/* ------------------------------------------------------------ detail card */

function defenseHeading(info) {
  return (
    '<div class="detail-title">' +
    `<span class="tower-icon" style="--tile:${info.color}">${info.symbol}</span>` +
    `<h2>${info.name}</h2></div>` +
    `<p class="defense-effect">${info.effect}</p>`
  );
}

function upgradeBlock(tower, cost) {
  if (tower.level >= 3 || tower.type === 'hedge') return '<p>Fully upgraded.</p>';
  const materialCosts = MATERIALS.filter((material) => cost[material.id])
    .map((material) => ` · ${cost[material.id]} ${material.name.toLowerCase()}`)
    .join('');
  const powerLabel = tower.level === 1 ? 'Power +45%' : 'Grow to level 3';
  const reachButton = tower.level === 1 ? '<button data-upgrade="reach">Range +1.1</button>' : '';
  return (
    `<p>Upgrade · ${cost.coins} coins${materialCosts}</p>` +
    `<div class="upgrade-row"><button data-upgrade="power">${powerLabel}</button>` +
    `${reachButton}</div>`
  );
}

const game = new Game();

// Preview branch: no tower selected, a build type chosen.
for (const build of Object.keys(TOWERS)) {
  const d = TOWERS[build];
  const st = game.stats({ type: build, level: 1 });
  const oldHtml = `<div class="eyebrow">${build === 'hedge' ? 'Maze building' : 'Before you build'}</div><div class="detail-title"><span class="tower-icon" style="--tile:${d.color}">${d.symbol}</span><h2>${d.name}</h2></div><p class="defense-effect">${d.effect}</p>${oldDefenseStats(st, build)}<p class="defense-tip">${d.tip}</p>`;
  const eyebrow = build === 'hedge' ? 'Maze building' : 'Before you build';
  const newHtml =
    `<div class="eyebrow">${eyebrow}</div>` +
    defenseHeading(d) +
    defenseStats(st, build) +
    `<p class="defense-tip">${d.tip}</p>`;
  same(`detail preview ${build}`, oldHtml, newHtml);
}

// Selected branch: every tower type, level, and branch combination.
for (const type of Object.keys(TOWERS)) {
  for (const level of [1, 2, 3]) {
    for (const branch of [null, 'power', 'reach']) {
      const t = { id: 4, type, x: 3, z: 3, level, branch, cool: 0, spent: 123 };
      const d = TOWERS[type];
      const st = game.stats(t);
      const c = game.upgradeCost(t);
      const oldHtml = `<button class="detail-close mobile-only" id="close-detail" aria-label="Close tower details">×</button><div class="eyebrow">Level ${t.level}${t.branch ? ' · ' + t.branch : ''}</div><div class="detail-title"><span class="tower-icon" style="--tile:${d.color}">${d.symbol}</span><h2>${d.name}</h2></div><p class="defense-effect">${d.effect}</p>${oldDefenseStats(st, t.type)}<p class="defense-tip">${d.tip}</p>${
        t.level < 3 && t.type !== 'hedge'
          ? `<p>Upgrade · ${c.coins} coins${MATERIALS.filter((m) => c[m.id])
              .map((m) => ` · ${c[m.id]} ${m.name.toLowerCase()}`)
              .join(
                '',
              )}</p><div class="upgrade-row"><button data-upgrade="power">${t.level === 1 ? 'Power +45%' : 'Grow to level 3'}</button>${t.level === 1 ? '<button data-upgrade="reach">Range +1.1</button>' : ''}</div>`
          : '<p>Fully upgraded.</p>'
      }<button class="text-button" id="sell">Reclaim · ${Math.floor(t.spent * 0.7)} coins</button>`;

      const branchLabel = t.branch ? ' · ' + t.branch : '';
      const newHtml =
        '<button class="detail-close mobile-only" id="close-detail"' +
        ' aria-label="Close tower details">×</button>' +
        `<div class="eyebrow">Level ${t.level}${branchLabel}</div>` +
        defenseHeading(d) +
        defenseStats(st, t.type) +
        `<p class="defense-tip">${d.tip}</p>` +
        upgradeBlock(t, c) +
        `<button class="text-button" id="sell">Reclaim · ${Math.floor(t.spent * 0.7)} coins</button>`;
      same(`detail ${type} L${level} ${branch}`, oldHtml, newHtml);
    }
  }
}

/* ---------------------------------------------------------------- garden */

// Every combination of unlocked plots, plot levels, coins, and ended state.
const plotShapes = [
  null,
  { level: 1, progress: 0 },
  { level: 2, progress: 4.6 },
  { level: 3, progress: 9.9 },
];
for (let unlockedPlots = 1; unlockedPlots <= 4; unlockedPlots++) {
  for (const shape of plotShapes) {
    for (const coins of [0, 60, 200, 5000]) {
      for (const ended of [false, true]) {
        const farms = [0, 1, 2, 3].map((n) => (shape ? { type: MATERIALS[n].id, ...shape } : null));
        const state = { unlockedPlots, farms, coins };
        const farmCost = (i) =>
          farms[i] ? MATERIALS[i].upgrade * farms[i].level : MATERIALS[i].buy;

        const oldSummary = MATERIALS.map(
          (m, i) =>
            `<button data-garden-open="${i}" aria-label="Manage ${m.name.toLowerCase()} garden"><span>${m.name}</span><b>${i >= state.unlockedPlots ? 'Locked' : farms[i] ? 12 : 'Buy · ' + m.buy}</b></button>`,
        ).join('');
        const newSummary = MATERIALS.map((material, i) => {
          const locked = i >= state.unlockedPlots;
          const value = locked ? 'Locked' : farms[i] ? 12 : 'Buy · ' + material.buy;
          return (
            `<button data-garden-open="${i}"` +
            ` aria-label="Manage ${material.name.toLowerCase()} garden">` +
            `<span>${material.name}</span><b>${value}</b></button>`
          );
        }).join('');
        same('garden summary', oldSummary, newSummary);

        const oldPlots = MATERIALS.map((m, i) => {
          const f = farms[i],
            locked = i >= state.unlockedPlots,
            next = i === state.unlockedPlots && !!farms[i - 1],
            cost = locked ? m.unlock : farmCost(i);
          const disabled = ended || coins < cost || (locked && !next) || f?.level >= 3;
          const status = locked
            ? 'Locked'
            : f
              ? `Level ${f.level} · +${m.yield * f.level} / 10 sec`
              : 'Not producing';
          const label = locked
            ? `Unlock · ◈ ${cost}`
            : f
              ? f.level >= 3
                ? 'Fully upgraded'
                : `Upgrade · ◈ ${cost}`
              : `Buy ${m.name.toLowerCase()} · ◈ ${cost}`;
          return `<article class="resource-plot ${locked ? 'locked' : ''}" data-plot="${i}"><div class="plot-summary"><div class="material-art ${m.id} ${f ? 'producing' : ''}" aria-hidden="true"><i></i><i></i><i></i></div><div><b>${m.name}</b><small>${status}</small></div></div><div class="progress"><i style="width:${f ? f.progress * 10 : 0}%"></i></div><button ${locked ? `data-unlock="${i}"` : `data-farm="${i}"`} ${disabled ? 'disabled' : ''} title="${locked && !next ? 'Buy ' + MATERIALS[i - 1].name.toLowerCase() + ' first' : f && f.level < 3 ? 'Increase production to ' + m.yield * (f.level + 1) + ' every 10 seconds' : label}">${label}</button></article>`;
        }).join('');

        const newPlots = MATERIALS.map((material, i) => {
          const plot = farms[i],
            locked = i >= state.unlockedPlots,
            next = i === state.unlockedPlots && !!farms[i - 1],
            cost = locked ? material.unlock : farmCost(i);
          const disabled = ended || coins < cost || (locked && !next) || plot?.level >= 3;
          const status = locked
            ? 'Locked'
            : plot
              ? `Level ${plot.level} · +${material.yield * plot.level} / 10 sec`
              : 'Not producing';
          const label = locked
            ? `Unlock · ◈ ${cost}`
            : plot
              ? plot.level >= 3
                ? 'Fully upgraded'
                : `Upgrade · ◈ ${cost}`
              : `Buy ${material.name.toLowerCase()} · ◈ ${cost}`;
          const hint =
            locked && !next
              ? 'Buy ' + MATERIALS[i - 1].name.toLowerCase() + ' first'
              : plot && plot.level < 3
                ? 'Increase production to ' +
                  material.yield * (plot.level + 1) +
                  ' every 10 seconds'
                : label;
          const action = locked ? `data-unlock="${i}"` : `data-farm="${i}"`;
          return (
            `<article class="resource-plot ${locked ? 'locked' : ''}" data-plot="${i}">` +
            '<div class="plot-summary">' +
            `<div class="material-art ${material.id} ${plot ? 'producing' : ''}" aria-hidden="true">` +
            '<i></i><i></i><i></i></div>' +
            `<div><b>${material.name}</b><small>${status}</small></div></div>` +
            `<div class="progress"><i style="width:${plot ? plot.progress * 10 : 0}%"></i></div>` +
            `<button ${action} ${disabled ? 'disabled' : ''} title="${hint}">${label}</button></article>`
          );
        }).join('');
        same('garden plots', oldPlots, newPlots);
      }
    }
  }
}

/* ----------------------------------------------------------------- modal */

for (const action of [null, () => {}]) {
  const title = 'Plant a new beginning?';
  const body = 'Body text with a · dot.';
  const button = 'Start a new garden';
  const oldHtml = `<div class="eyebrow">Undergrowth</div><h2>${title}</h2><p>${body}</p><button class="primary" id="modal-ok">${button}</button>${action ? '<button class="outline" id="modal-cancel">Keep this garden</button>' : ''}`;
  const cancelButton = action
    ? '<button class="outline" id="modal-cancel">Keep this garden</button>'
    : '';
  const newHtml =
    '<div class="eyebrow">Undergrowth</div>' +
    `<h2>${title}</h2><p>${body}</p>` +
    `<button class="primary" id="modal-ok">${button}</button>` +
    cancelButton;
  same('modal', oldHtml, newHtml);
}

/* ------------------------------------------------------- long plain text */

const oldHelp =
  '<b>1. Shape the maze.</b> Choose a tower, then click a meadow square. The dotted line shows the horde’s route. Keep an exit open.<br><br><b>2. Grow while you defend.</b> Buy the wood plot for 25 coins. It automatically adds 3 wood every 10 seconds, including during combat. Upgrade it with coins for more output. Unlock and buy Rock, then Iron, then Diamond plots with coins. Materials pay for tower upgrades.<br><br><b>3. Put down roots.</b> Survive three waves per stage, across ten stages. Your maze and garden stay. Moths fly over the maze; sunstones pierce armor.<br><br><b>Controls:</b> 1–5 choose pieces, Esc inspects, Space pauses. Progress saves automatically on this browser.';
const newHelp =
  '<b>1. Shape the maze.</b> Choose a tower, then click a meadow square.' +
  ' The dotted line shows the horde’s route. Keep an exit open.<br><br>' +
  '<b>2. Grow while you defend.</b> Buy the wood plot for 25 coins. It automatically' +
  ' adds 3 wood every 10 seconds, including during combat. Upgrade it with coins for' +
  ' more output. Unlock and buy Rock, then Iron, then Diamond plots with coins.' +
  ' Materials pay for tower upgrades.<br><br>' +
  '<b>3. Put down roots.</b> Survive three waves per stage, across ten stages. Your maze' +
  ' and garden stay. Moths fly over the maze; sunstones pierce armor.<br><br>' +
  '<b>Controls:</b> 1–5 choose pieces, Esc inspects, Space pauses.' +
  ' Progress saves automatically on this browser.';
same('help text', oldHelp, newHelp);

const oldMenu =
  '<button class="outline" id="menu-help">How to play</button><button class="outline" id="menu-sound">Toggle sound</button><button class="outline" id="menu-restart">New garden</button>';
const newMenu =
  '<button class="outline" id="menu-help">How to play</button>' +
  '<button class="outline" id="menu-sound">Toggle sound</button>' +
  '<button class="outline" id="menu-restart">New garden</button>';
same('mobile menu', oldMenu, newMenu);

const oldRestart =
  'This replaces your saved settlement with a fresh garden. Your current towers and materials will be cleared.';
const newRestart =
  'This replaces your saved settlement with a fresh garden.' +
  ' Your current towers and materials will be cleared.';
same('restart text', oldRestart, newRestart);

const oldWon =
  'Ten stages survived. The wilds are quiet, and your little garden stands. Try a new layout with a fresh expedition.';
const newWon =
  'Ten stages survived. The wilds are quiet, and your little garden stands.' +
  ' Try a new layout with a fresh expedition.';
same('won text', oldWon, newWon);

const oldLost =
  'The horde reached your heart. Start a new garden with the ↺ button. Try a longer maze, early farm upgrades, and Sap beside your damage towers.';
const newLost =
  'The horde reached your heart. Start a new garden with the ↺ button.' +
  ' Try a longer maze, early farm upgrades, and Sap beside your damage towers.';
same('lost text', oldLost, newLost);

const oldWebgl =
  '<div style="padding:35px">This garden needs WebGL. Enable hardware acceleration in your browser and reload.</div>';
const newWebgl =
  '<div style="padding:35px">This garden needs WebGL. Enable hardware' +
  ' acceleration in your browser and reload.</div>';
same('webgl message', oldWebgl, newWebgl);

console.log(`HTML equivalence: ${checks} string comparisons, all identical`);

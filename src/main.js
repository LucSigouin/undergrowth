// Browser interface for Undergrowth. This file owns the page markup, the sidebar, the
// works panel, the engine detail card, the dialogs, the keyboard and button handlers,
// the autosave to localStorage, and the animation loop that drives the game clock. It
// holds the one Game instance and the one World instance and wires them together. Game
// rules live in game.js and the 3D scene lives in world.js.
import './style.css';
import { Game, TOWERS, MATERIALS } from './game.js';
import { World } from './world.js';
import { TOWER_LOOK, MATERIAL_LOOK } from './look.js';

// Short name for document.querySelector, used all over this file.
const query = (selector) => document.querySelector(selector),
  SAVE = 'undergrowth-save-v2';

// Load the saved keep if it looks sane, otherwise start fresh.
let game;
try {
  const raw = JSON.parse(localStorage.getItem(SAVE) || localStorage.getItem('undergrowth-save-v1'));
  const usable =
    [1, 2, 3, 4, 5].includes(raw?.version) &&
    Array.isArray(raw.towers) &&
    raw.stage >= 0 &&
    raw.stage <= 10;
  game = usable ? new Game(raw) : new Game();
} catch {
  game = new Game();
}

const mobileQuery = matchMedia('(max-width: 700px), (max-width: 1000px) and (pointer: coarse)');

// Interface state. None of this belongs in the save file.
let pendingPlacement = null;
let hoverCell = null;
let build = 'thorn',
  selected = null,
  paused = false,
  speed = 1,
  backgroundPause = null,
  toastTimer,
  saveTime = 0,
  uiTime = 0,
  last = performance.now();

// The painted icon for an engine or a material, on a plate tinted with its own accent colour.
// The art is decorative: every control that uses a chip carries its own text or aria-label,
// so the image stays out of the accessibility tree.
const chip = (look, extra = '') =>
  `<span class="chip ${extra}" style="--tile:${look.color}">` +
  `<img class="chip-art" src="${look.art}" alt="" draggable="false"></span>`;

// A bare painted icon with no plate, for the header counters and the inline costs.
const icon = (look, extra = '') =>
  `<img class="icon-art ${extra}" src="${look.art}" alt="" draggable="false">`;

const COIN = MATERIAL_LOOK.coins,
  LIFE = MATERIAL_LOOK.lives;

// The page markup, built once. Every later update edits pieces of it in place.
const worksStrip =
  '<section class="works-strip" aria-label="The works">' +
  '<div id="works-summary" class="works-summary"></div>' +
  '<div id="farms" class="works-plots"></div>' +
  '</section>';

// Small inline icons for the HUD chrome. Decorative; every control carries its own label.
const SVG = {
  crest:
    '<svg class="crest" viewBox="0 0 40 46" aria-hidden="true"><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe3a0"/><stop offset=".55" stop-color="#d9a93e"/><stop offset="1" stop-color="#7a5418"/></linearGradient></defs>' +
    '<path d="M20 2l16 5v16c0 10-7 17-16 21C11 40 4 33 4 23V7z" fill="#1a1512" stroke="url(#cg)" stroke-width="2.4"/>' +
    '<path d="M20 9l10 3v11c0 6-4 11-10 14-6-3-10-8-10-14V12z" fill="#7e1f28"/>' +
    '<path d="M20 13v20M13 20h14" stroke="url(#cg)" stroke-width="3" stroke-linecap="round"/></svg>',
  gear:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.4 13a7.6 7.6 0 000-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 00-1.7-1L15 3.5h-4l-.3 2.5a7.4 7.4 0 00-1.7 1l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 000 2l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 001.7 1l.3 2.5h4l.3-2.5a7.4 7.4 0 001.7-1l2.4 1 2-3.4zM13 15.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7z" transform="translate(-1 0)"/></svg>',
  sword:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.5 2.5l-.6 4.2L10.6 16l-2.6-2.6 9.3-9.3zM6.3 13.8l3.9 3.9-1.4 1.4-1.1-1.1-2.3 2.3a1.5 1.5 0 11-1.4-1.4L6.3 16.6l-1.1-1.1z"/></svg>',
};

const mapStatus =
  '<div class="map-status">' +
  '<span class="stage-medal"><small>Stage</small><b id="stage-number">01</b><span class="status-muted">/30</span></span>' +
  '<span class="heart">' +
  icon(LIFE, 'life-icon') +
  '<b id="lives">20 / 20</b></span>' +
  '</div>';

// Gold and materials share a top-right header; material buttons open their works controls.
const materialHud =
  '<header class="resource-header" aria-label="Game status and resources">' +
  `<span class="game-title">${SVG.crest}<span class="title-text">Undergrowth</span></span>` +
  mapStatus +
  '<div class="treasury">' +
  '<span class="gold-total" aria-label="Gold">' +
  icon(COIN, 'coin-icon') +
  '<b id="coins">200</b></span>' +
  MATERIALS.map(
    (material, i) =>
      `<button class="material-chip" data-hud-works="${i}"` +
      ` aria-label="${material.name}, open the works" title="${material.name}">` +
      icon(MATERIAL_LOOK[material.id], 'material-icon') +
      `<b id="${material.id}">0</b></button>`,
  ).join('') +
  '</div>' +
  `<button id="settings" aria-label="Settings" title="Settings">${SVG.gear}</button></header>`;

const mapControls =
  '<div class="map-controls">' +
  '<button id="zoom" class="mobile-only" aria-label="Zoom into battlefield">＋</button>' +
  '<button id="fit" class="mobile-only" aria-label="Fit battlefield">⤢</button>' +
  '<button id="tower-info" class="mobile-only" aria-label="Engine information">ⓘ</button>' +
  '</div>';

const placementBar =
  '<div id="placement" class="placement" hidden>' +
  '<button id="cancel-place" aria-label="Cancel placement">×</button>' +
  '<button id="confirm-place">Place engine</button></div>' +
  '<div class="paused-overlay" id="paused" hidden>Paused</div>';

// Engine cards show their icon, name, and coin cost.
const towerCards = Object.entries(TOWERS)
  .map(([id, tower]) => {
    const chosen = id === 'thorn';
    return (
      `<button class="tower-card ${chosen ? 'selected' : ''}" data-build="${id}"` +
      ` aria-pressed="${chosen}" aria-describedby="hover-note">` +
      chip(TOWER_LOOK[id], 'tower-icon') +
      `<span class="tower-summary"><b>${tower.name}</b></span>` +
      `<small>${icon(COIN, 'coin-icon')}${tower.cost}</small></button>`
    );
  })
  .join('');

const defensesSection =
  '<section class="defenses"><h2><span>War engines</span></h2>' +
  `<div class="cards">${towerCards}</div>` +
  '<div id="detail" class="detail" hidden></div></section>';

const waveControls =
  '<div class="wave-controls"><button class="primary" id="start">Begin stage</button>' +
  '<button id="pause" aria-label="Pause" title="Pause">Ⅱ</button>' +
  '<button id="speed" aria-label="Speed: 1×" title="Game speed">1×</button></div>';

const overlays =
  '<div id="hover-note" class="hover-note" role="tooltip" hidden></div>' +
  '<div id="toast" role="status" aria-live="polite"></div>' +
  '<div id="banner" class="stage-banner" aria-hidden="true"></div>' +
  '<dialog id="modal"></dialog>' +
  '<dialog id="works-modal" class="works-sheet"><div class="sheet-heading">' +
  '<button id="close-works" aria-label="Close the works">×</button></div>' +
  '<div class="sheet-body"></div></dialog>';

query('#app').innerHTML = `<main class="game-shell">
  ${materialHud}
  <div class="map-area"><section class="scene-wrap" id="scene" aria-label="Battlefield">
    ${mapControls}
    ${placementBar}
  </section>
  </div><aside class="sidebar" aria-label="Build and works">
    <div class="sidebar-body">
      ${defensesSection}
    </div>
    ${worksStrip}
    ${waveControls}
  </aside>
</main>${overlays}`;

let lastCoins = Math.floor(game.coins),
  lastLives = game.lives;

// Restart a one-shot CSS animation on an element.
function pulse(selector, name) {
  const element = query(selector);
  element.classList.remove(name);
  void element.offsetWidth;
  element.classList.add(name);
}

// The big stage card that sweeps across the board when a stage starts or is won.
function banner(kicker, title, subtitle, tone = '') {
  const element = query('#banner');
  element.className = `stage-banner ${tone}`;
  element.innerHTML =
    `<span class="banner-kicker">${kicker}</span><span class="banner-title">${title}</span>` +
    `<span class="banner-rule"></span><span class="banner-sub">${subtitle}</span>`;
  void element.offsetWidth;
  element.classList.add('show');
}

// Show a short message at the bottom of the screen.
function toast(msg) {
  query('#toast').textContent = msg;
  query('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => query('#toast').classList.remove('show'), 3500);
}

// Save quietly when browser storage is available.
function persist() {
  try {
    localStorage.setItem(SAVE, game.serialize());
  } catch {
    // Storage may be unavailable; keep the current session playable.
  }
}

// Pick the engine the next click will build.
function choose(type) {
  pendingPlacement = null;
  world.previewTowers = null;
  world.clearTowerPreview();
  world.range.visible = false;
  build = type;
  selected = null;
  detailKey = '';
  render();
}

// Handle a click on a board square: select an engine, stage a placement, or build right away.
function onCell(cell) {
  if (paused || game.lost || game.won) return;
  const tower = game.towers.find((candidate) => candidate.x === cell.x && candidate.z === cell.z);
  if (tower) {
    pendingPlacement = null;
    selected = tower.id;
    build = null;
    detailKey = '';
    render();
    world.showHover(cell, null, game, tower);
    return;
  }
  // On a phone a tap only stages the engine. A second tap on Place confirms it.
  if (build && mobileQuery.matches) {
    if (cell.x < 0 || cell.x >= 13 || cell.z < 0 || cell.z >= 9) return;
    pendingPlacement = { ...cell, type: build };
    world.showHover(cell, build, game, null);
    render();
    return;
  }
  if (build) {
    const err = game.place(build, cell.x, cell.z);
    if (err) {
      toast(err);
    } else {
      persist();
      render();
    }
  } else {
    selected = null;
    detailKey = '';
    render();
  }
}

// Move the hover square and range ring as the pointer travels over the board.
function onHover(cell) {
  hoverCell = cell;
  const under = game.towers.find((tower) => tower.x === cell.x && tower.z === cell.z);
  const chosen = game.towers.find((tower) => tower.id === selected);
  showBoost();
  world.showHover(cell, build, game, under || chosen);
}

// Mark the engines a War banner is rallying, whenever one is hovered or selected.
function showBoost() {
  const at = hoverCell;
  const under = at && game.towers.find((tower) => tower.x === at.x && tower.z === at.z);
  const chosen = game.towers.find((tower) => tower.id === selected);
  const lamp = under?.type === 'lantern' ? under : chosen?.type === 'lantern' ? chosen : null;
  world.boostFrom = lamp || null;
}

let world;
try {
  world = new World(query('#scene'), onCell, onHover);
  try {
    world.route.visible = localStorage.getItem('undergrowth-route') !== 'false';
  } catch {}
} catch (error) {
  query('#scene').innerHTML =
    '<div style="padding:35px">This keep needs WebGL. Enable hardware' +
    ' acceleration in your browser and reload.</div>';
  throw error;
}

let detailKey = '';

// The three number chips under an engine name. A Palisade has no combat numbers.
function defenseStats(stats, type, level = 1) {
  if (type === 'hedge') return '';
  // A War banner never shoots, so it shows what its ring does instead of damage numbers.
  if (type === 'lantern') {
    return (
      '<div class="defense-stats">' +
      `<span><b>+${Math.round((0.2 + level * 0.1) * 100)}%</b><span title="Nearby fire rate" aria-label="Nearby fire rate">Fire rate</span></span>` +
      `<span><b>${stats.range.toFixed(1)}</b><span title="Coverage" aria-label="Coverage">Coverage</span></span>` +
      '<span><b>0</b><span title="Damage per hit" aria-label="Damage per hit">Damage</span></span></div>'
    );
  }
  return (
    '<div class="defense-stats">' +
    `<span><b>${Math.round(stats.damage)}</b><span title="Damage per hit" aria-label="Damage per hit">Damage</span></span>` +
    `<span><b>${stats.range.toFixed(1)}</b><span title="Range" aria-label="Range">Range</span></span>` +
    `<span><b>${stats.rate.toFixed(2)}s</b><span title="Time between shots" aria-label="Time between shots">Shot interval</span></span></div>`
  );
}

// The icon and name at the top of the detail card. The effect line follows the numbers.
function defenseHeading(type) {
  return (
    '<div class="detail-title">' +
    chip(TOWER_LOOK[type], 'tower-icon') +
    `<h2>${TOWERS[type].name}</h2></div>`
  );
}

// Resource names remain available to assistive technology and hover hints.
function resourceAmounts(cost, check = true) {
  return (
    '<span class="resource-amounts">' +
    Object.entries(cost)
      .filter(([, n]) => n > 0)
      .map(([id, need]) => {
        const name = id === 'coins' ? 'Coins' : MATERIALS.find((m) => m.id === id).name;
        const have = Math.floor(game[id]);
        const short = check && have < need;
        const label = short
          ? `${name}: ${have} / ${need}; ${need - have} more needed`
          : `${need} ${name.toLowerCase()}`;
        const art = id === 'coins' ? icon(COIN, 'coin-icon') : chip(MATERIAL_LOOK[id]);
        return (
          `<span class="resource-amount ${short ? 'short' : ''}" data-resource="${id}" role="img" title="${label}" aria-label="${label}">` +
          art +
          `<b aria-hidden="true">${short ? have + '/' : ''}${need}</b></span>`
        );
      })
      .join('') +
    '</span>'
  );
}

// The upgrade paragraph and buttons, shown while an engine can still be built up.
function upgradeBlock(tower, cost, missing) {
  if (tower.level >= 3 || tower.type === 'hedge') return '';
  const blocked = missing.length ? ' disabled' : '';
  const current = game.stats(tower);
  const branches =
    tower.type === 'lantern' ? ['reach'] : tower.level === 1 ? ['power', 'reach'] : [tower.branch];
  const buttons = branches
    .map((branch) => {
      const next = game.stats({ ...tower, level: tower.level + 1, branch });
      const label =
        tower.type === 'lantern' || tower.level > 1
          ? `↑ ${tower.level + 1}`
          : branch === 'power'
            ? 'Power'
            : 'Range';
      const numbers =
        tower.type === 'lantern'
          ? `✦ ${Math.round((0.2 + tower.level * 0.1) * 100)} → ${Math.round((0.2 + (tower.level + 1) * 0.1) * 100)}%`
          : `⚔ ${Math.round(current.damage)} → ${Math.round(next.damage)}`;
      return (
        `<button data-upgrade="${branch}"${blocked}><b>${label}</b>` +
        `<small>${numbers}</small><small>◎ ${current.range.toFixed(2)} → ${next.range.toFixed(2)}</small></button>`
      );
    })
    .join('');
  return (
    `<div class="upgrade-cost" aria-label="Upgrade cost">${resourceAmounts(cost)}</div>` +
    `<div class="upgrade-row">${buttons}</div>`
  );
}

// The small note that hovering or focusing a tower card puts up beside the card. It carries
// what the old "Before you build" panel said: the level 1 numbers, the effect and the tip.
function noteMarkup(type, includeTip = true) {
  const info = TOWERS[type],
    stats = game.stats({ type, level: 1 });
  return (
    '<div class="defense-note">' +
    defenseStats(stats, type) +
    `<p class="defense-effect">${info.effect}</p>` +
    (includeTip ? `<p class="defense-tip">${info.tip}</p>` : '') +
    '</div>'
  );
}

// Put the note beside its card, kept inside the window at every height.
function showNote(card) {
  if (mobileQuery.matches) return;
  const note = query('#hover-note');
  note.innerHTML = noteMarkup(card.dataset.build, false);
  note.hidden = false;
  const gap = 10;
  const box = card.getBoundingClientRect(),
    pane = query('.sidebar').getBoundingClientRect(),
    own = note.getBoundingClientRect();
  const top = Math.min(box.top - gap, innerHeight - own.height - gap);
  note.style.top = `${Math.max(gap, top)}px`;
  note.style.left = `${Math.max(gap, pane.left - own.width - gap)}px`;
}

function hideNote() {
  query('#hover-note').hidden = true;
}

// Redraw the engine detail card. It only ever describes an engine already on the board.
function renderDetail() {
  const tower = game.towers.find((candidate) => candidate.id === selected);
  const shortKey = tower ? game.upgradeShortfall(tower) : [];
  const key = JSON.stringify([
    tower?.id,
    tower?.level,
    tower?.branch,
    shortKey,
    tower && game.rateBonus(tower),
  ]);
  if (key === detailKey) return;
  detailKey = key;
  query('#detail').hidden = !tower;
  if (!tower) {
    query('#detail').innerHTML = '';
    return;
  }

  const info = TOWERS[tower.type],
    stats = game.stats(tower),
    cost = game.upgradeCost(tower),
    missing = game.upgradeShortfall(tower);
  const boost = game.rateBonus(tower);
  const boostNote =
    boost > 1
      ? `<p class="defense-boost">${icon(TOWER_LOOK.lantern, 'coin-icon')} +${Math.round((boost - 1) * 100)}%</p>`
      : '';
  const branchLabel = tower.branch === 'reach' ? 'Range' : tower.branch === 'power' ? 'Power' : '';
  const growthBadge =
    tower.type === 'hedge'
      ? ''
      : `<div class="tower-growth"><span>Level ${tower.level}</span>${branchLabel ? `<span>${branchLabel}</span>` : ''}</div>`;
  query('#detail').innerHTML =
    '<button class="detail-close" id="close-detail"' +
    ' aria-label="Close engine details">×</button>' +
    defenseHeading(tower.type) +
    growthBadge +
    defenseStats(stats, tower.type, tower.level) +
    boostNote +
    upgradeBlock(tower, cost, missing) +
    `<div class="detail-actions"><button id="sell" aria-label="Sell ${info.name} for ${tower.spent} coins">Sell ${resourceAmounts({ coins: tower.spent }, false)}</button>` +
    '<button id="detail-info" aria-label="Engine information">ⓘ</button></div>';
  query('#detail-info').onclick = () => modal(info.name, noteMarkup(tower.type), 'Done');

  query('#close-detail')?.addEventListener('click', () => {
    selected = null;
    detailKey = '';
    world.range.visible = false;
    render();
  });
  query('#detail')
    .querySelectorAll('[data-upgrade]')
    .forEach((button) => {
      button.onclick = () => {
        const err = game.upgrade(tower.id, button.dataset.upgrade);
        if (err) toast(err);
        detailKey = '';
        persist();
        render();
      };
    });
  query('#sell').onclick = () => {
    world.range.visible = false;
    game.sell(tower.id);
    selected = null;
    detailKey = '';
    persist();
    render();
  };
}

let farmKey = '';

// Reach the controls for one building. On a phone they live in a sheet, so open it. On a
// desktop they are already on screen in the strip above the board, so point at the right one.
function openWorks(index) {
  if (mobileQuery.matches) query('#works-modal').showModal();
  const plot = query('#farms').querySelector(`[data-plot="${index}"]`);
  plot?.scrollIntoView({ block: 'nearest' });
  if (!plot) return;
  plot.classList.remove('called-out');
  // Restart the flash even when the same plot is clicked twice in a row.
  void plot.offsetWidth;
  plot.classList.add('called-out');
}

document.querySelectorAll('[data-hud-works]').forEach((button) => {
  button.onclick = () => openWorks(Number(button.dataset.hudWorks));
});

// Refresh every number and label in the interface from the current game state.
function render() {
  for (const key of ['coins', ...MATERIALS.map((material) => material.id)]) {
    query('#' + key).textContent = Math.floor(game[key]);
  }
  query('#lives').textContent = `${game.lives} / 20`;
  // Keep the existing encounter/save sequence; each encounter is one displayed stage.
  const stageNumber = Math.max(
    1,
    Math.min(30, game.stage * 3 + game.wave + (game.active || game.lost ? 0 : 1)),
  );
  query('#stage-number').textContent = String(stageNumber).padStart(2, '0');
  const infoType = build || game.towers.find((tower) => tower.id === selected)?.type;
  query('#tower-info').disabled = !infoType;
  query('#tower-info').setAttribute(
    'aria-label',
    infoType ? `About the ${TOWERS[infoType].name}` : 'Engine information',
  );
  query('#start').disabled = (game.active && !paused) || game.lost || game.won;
  query('#start').textContent = game.won
    ? 'Keep held'
    : game.lost
      ? 'The keep has fallen'
      : game.active
        ? paused
          ? 'Resume'
          : 'Battle raging'
        : `Begin stage ${String(stageNumber).padStart(2, '0')}`;
  query('#start').classList.toggle('raging', game.active && !paused);
  // Counters that change pulse once, so a payout or a lost life is seen, not just read.
  const coinsNow = Math.floor(game.coins);
  if (coinsNow > lastCoins) pulse('.gold-total', 'gain');
  if (game.lives < lastLives) pulse('.heart', 'hurt');
  lastCoins = coinsNow;
  lastLives = game.lives;
  document.querySelectorAll('[data-build]').forEach((button) => {
    button.classList.toggle('selected', button.dataset.build === build);
    button.setAttribute('aria-pressed', String(button.dataset.build === build));
  });
  // A card the player cannot pay for has to look unpayable.
  document.querySelectorAll('[data-build]').forEach((button) => {
    const short = game.coins < TOWERS[button.dataset.build].cost;
    button.classList.toggle('unaffordable', short);
    button.setAttribute('aria-description', short ? 'Not enough coins' : 'Affordable');
  });
  showBoost();
  query('#paused').hidden = !paused;
  query('#pause').textContent = paused ? '▶' : 'Ⅱ';
  query('#pause').setAttribute('aria-label', paused ? 'Resume' : 'Pause');
  query('#pause').title = paused ? 'Resume' : 'Pause';
  query('#pause').disabled = game.lost || game.won;
  query('#speed').textContent = speed + '×';
  query('#speed').setAttribute('aria-label', `Speed: ${speed}×`);
  query('#placement').hidden = !pendingPlacement;
  if (pendingPlacement) {
    const staged = TOWERS[pendingPlacement.type];
    query('#confirm-place').innerHTML =
      `✓ ${staged.name} · ${icon(COIN, 'coin-icon')} ${staged.cost}`;
  }
  const previewCell = pendingPlacement || (world.hover.visible ? hoverCell : null);
  if (previewCell && build) world.showHover(previewCell, build, game, null);
  if (!build || game.lost || game.won) world.clearTowerPreview();
  renderWorks();
  renderDetail();
}

// Redraw the works summary chips and the four building cards, skipping unchanged work.
function renderWorks() {
  const summaryKey = JSON.stringify([
    game.unlockedPlots,
    game.farms.map((plot) => !!plot),
    ...MATERIALS.map((material) => game[material.id]),
  ]);
  if (query('#works-summary').dataset.key !== summaryKey) {
    query('#works-summary').dataset.key = summaryKey;
    query('#works-summary').innerHTML = MATERIALS.map((material, i) => {
      const locked = i >= game.unlockedPlots;
      const value = locked
        ? '🔒'
        : game.farms[i]
          ? game[material.id]
          : icon(COIN, 'coin-icon') + ' ' + material.buy;
      return (
        `<button data-works-open="${i}"` +
        ` aria-label="Manage the ${material.name.toLowerCase()} works">` +
        chip(MATERIAL_LOOK[material.id]) +
        `<span class="plot-name">${material.name}</span><b>${value}</b></button>`
      );
    }).join('');
    query('#works-summary')
      .querySelectorAll('[data-works-open]')
      .forEach((button) => {
        button.onclick = () => openWorks(Number(button.dataset.worksOpen));
      });
  }

  const ended = game.lost || game.won;
  const plotsKey = JSON.stringify([
    game.farms,
    game.active,
    game.waveHarvest,
    game.unlockedPlots,
    game.coins,
    ended,
  ]);
  if (plotsKey === farmKey) return;
  farmKey = plotsKey;

  query('#farms').innerHTML = MATERIALS.map((material, i) => {
    const plot = game.farms[i],
      locked = i >= game.unlockedPlots,
      next = i === game.unlockedPlots && !!game.farms[i - 1],
      cost = locked ? material.unlock : game.farmCost(i);
    const disabled = ended || game.coins < cost || (locked && !next) || plot?.level >= 3;
    const harvest = plot ? material.yield * plot.level : 0;
    const actionName = locked ? 'Unlock' : plot ? (plot.level >= 3 ? 'Max' : 'Upgrade') : 'Buy';
    const label = plot?.level >= 3 ? '✓' : resourceAmounts({ coins: cost });
    const hint =
      locked && !next
        ? 'Buy ' + MATERIALS[i - 1].name.toLowerCase() + ' first'
        : plot && plot.level < 3
          ? 'Yields ' + material.yield * (plot.level + 1) + ' per stage; changes apply next stage'
          : `${actionName} ${material.name}`;
    const action = locked ? `data-unlock="${i}"` : `data-farm="${i}"`;
    const harvestHint = game.active
      ? `This stage: ${game.waveHarvest[i]} ${material.name.toLowerCase()}. Changes apply next stage.`
      : 'Output per cleared stage, set when the stage starts.';
    return (
      `<article class="resource-plot ${locked ? 'locked' : ''}" data-plot="${i}">` +
      `<button class="farm-card" ${action} ${disabled ? 'disabled' : ''} title="${hint}. ${harvestHint}" aria-label="${actionName} ${material.name}${plot?.level >= 3 ? '' : ', ' + cost + ' coins'}, ${harvest} per stage">` +
      `<small class="farm-harvest">${harvest}<span>/stage</span></small>` +
      (locked ? '<span class="farm-lock" aria-hidden="true">🔒</span>' : '') +
      chip(MATERIAL_LOOK[material.id], 'farm-icon') +
      `<span class="farm-price">${label}</span></button></article>`
    );
  }).join('');

  query('#farms')
    .querySelectorAll('[data-farm]')
    .forEach((button) => {
      button.onclick = () => {
        const i = Number(button.dataset.farm),
          err = game.farm(i);
        if (err) toast(err);
        persist();
        render();
      };
    });
  query('#farms')
    .querySelectorAll('[data-unlock]')
    .forEach((button) => {
      button.onclick = () => {
        const i = Number(button.dataset.unlock);
        const err = game.unlockPlot(i);
        if (err) toast(err);
        persist();
        render();
      };
    });
}

// Open the shared dialog, pausing the game while it is up. An action adds a second button.
function modal(title, body, button = 'Done', action) {
  const dialog = query('#modal');
  const cancelButton = action ? '<button class="outline" id="modal-cancel">Cancel</button>' : '';
  dialog.innerHTML =
    `<h2>${title}</h2><div class="modal-body">${body}</div>` +
    `<button class="primary" id="modal-ok">${button}</button>` +
    cancelButton;
  const wasPaused = paused;
  paused = true;
  render();
  dialog.showModal();
  const close = () => {
    dialog.close();
    paused = wasPaused;
    render();
  };
  query('#modal-ok').onclick = () => {
    close();
    action?.();
  };
  if (action) query('#modal-cancel').onclick = close;
  dialog.oncancel = () => {
    paused = wasPaused;
    render();
  };
}

const HELP_TEXT =
  '<p><b>Build a maze.</b> Longer routes give your engines more time. Keep a way through open.</p>' +
  '<p><b>Work the materials.</b> The sawmill, quarry, forge and gem cutter pay out after each cleared stage. Their levels at the start of a stage set that payout; upgrades apply next stage. Build engines up with coin and materials.</p>' +
  '<p><b>Costs.</b> Icons show each resource. Red counts show what you have / what you need.</p>' +
  '<p><b>The horde.</b> Gargoyles fly over walls. The Mage spire answers armor; the Brazier answers paladin shields.</p>' +
  '<p>1–7: choose an engine · Right-click / Esc: cancel</p>';

query('#tower-info').onclick = () => {
  const type = build || game.towers.find((tower) => tower.id === selected)?.type;
  if (type) modal(`About the ${TOWERS[type].name}`, noteMarkup(type), 'Done');
};

query('#settings').onclick = () => {
  modal(
    'Settings',
    '<div class="settings-list">' +
      `<button id="path" role="switch" aria-checked="${world.route.visible}"><span>Enemy route</span><b>${world.route.visible ? 'On' : 'Off'}</b></button>` +
      '<button id="help">How to play</button>' +
      '<button id="restart">Restart the siege</button>' +
      '</div>',
  );
  query('#path').onclick = () => {
    world.route.visible = !world.route.visible;
    query('#path').setAttribute('aria-checked', String(world.route.visible));
    query('#path b').textContent = world.route.visible ? 'On' : 'Off';
    try {
      localStorage.setItem('undergrowth-route', String(world.route.visible));
    } catch {}
  };
  query('#help').onclick = () => {
    query('#modal-ok').click();
    modal('How to play', HELP_TEXT);
  };
  query('#restart').onclick = () => {
    query('#modal-ok').click();
    restartGame();
  };
};

query('#close-works').onclick = () => query('#works-modal').close();
query('#works-modal').addEventListener('click', (event) => {
  if (event.target !== query('#works-modal')) return;
  // A click outside the sheet closes it. Clicks inside land on a child, not the dialog.
  const rect = event.target.getBoundingClientRect();
  const outside =
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom;
  if (outside) event.target.close();
});

// Drop a staged placement and clear the preview.
function cancelPlacement() {
  pendingPlacement = null;
  world.previewTowers = null;
  world.clearTowerPreview();
  world.hover.visible = false;
  world.range.visible = false;
  render();
}

// Escape and right-click both leave building and inspection mode.
function cancelSelection() {
  build = null;
  selected = null;
  hoverCell = null;
  detailKey = '';
  hideNote();
  cancelPlacement();
}

query('.game-shell').addEventListener('contextmenu', (event) => {
  if (query('#modal').open || query('#works-modal').open) return;
  event.preventDefault();
  cancelSelection();
});

query('#cancel-place').onclick = cancelPlacement;
query('#confirm-place').onclick = () => {
  if (!pendingPlacement || paused || game.lost || game.won) return;
  const staged = pendingPlacement,
    err = game.place(staged.type, staged.x, staged.z);
  if (err) {
    toast(err);
    return;
  }
  cancelPlacement();
  persist();
};

query('#zoom').onclick = () => {
  world.zoom = Math.min(2.5, world.zoom + 0.5);
  world.resize();
};
query('#fit').onclick = () => {
  world.zoom = 1;
  world.target.set(6, 0, 4);
  world.resize();
  cancelPlacement();
};

// Move the works buildings between the sidebar strip and the phone sheet when the layout changes.
function adaptLayout() {
  if (!mobileQuery.matches && query('#works-modal').open) query('#works-modal').close();
  const host = mobileQuery.matches ? query('#works-modal .sheet-body') : query('.works-strip');
  host.append(query('#farms'));
  world.resize();
  cancelPlacement();
}
mobileQuery.addEventListener('change', adaptLayout);
adaptLayout();

const RESTART_TEXT =
  'This replaces your saved keep with a fresh siege.' +
  ' Your current engines and materials will be cleared.';

function restartGame() {
  modal('Restart?', RESTART_TEXT, 'Restart', () => {
    pendingPlacement = null;
    game = new Game();
    selected = null;
    build = 'thorn';
    paused = false;
    farmKey = '';
    detailKey = '';
    persist();
    render();
  });
}

query('#start').onclick = () => {
  paused = false;
  backgroundPause = null;
  last = performance.now();
  if (game.active) {
    render();
    return;
  }
  if (game.start()) {
    persist();
    const kinds = game.queue.map((entry) => entry.kind || entry);
    const number = String(game.stage * 3 + game.wave).padStart(2, '0');
    banner(
      'Stage',
      number,
      kinds.includes('boss')
        ? 'The Warlord marches'
        : kinds.includes('moth')
          ? 'Gargoyles on the wind'
          : kinds.includes('warden')
            ? 'Paladins at the gate'
            : 'The horde approaches',
      kinds.includes('boss') ? 'boss' : '',
    );
  }
  render();
};
query('#pause').onclick = () => {
  paused = !paused;
  render();
};
query('#speed').onclick = () => {
  speed = speed === 3 ? 1 : speed + 1;
  render();
};
document.querySelectorAll('[data-build]').forEach((button) => {
  button.onclick = () => choose(button.dataset.build);
  button.addEventListener('mouseenter', () => showNote(button));
  button.addEventListener('focus', () => showNote(button));
  button.addEventListener('mouseleave', hideNote);
  button.addEventListener('blur', hideNote);
});
// The note is a hint, not a layer to click through. Anything else on the page dismisses it.
window.addEventListener('scroll', hideNote, true);
mobileQuery.addEventListener('change', hideNote);

window.addEventListener('keydown', (event) => {
  const typing = event.target.matches('input,textarea,select');
  if (query('#modal').open || query('#works-modal').open || typing) return;
  const keys = Object.keys(TOWERS);
  const slot = Number(event.key);
  if (Number.isInteger(slot) && slot >= 1 && slot <= keys.length) choose(keys[slot - 1]);
  if (event.key === 'Escape') cancelSelection();
});

window.addEventListener('pagehide', persist);
// Leaving the tab pauses the game. Coming back restores whatever the player had chosen.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    backgroundPause ??= paused;
    paused = true;
    persist();
  } else if (backgroundPause !== null) {
    paused = backgroundPause;
    backgroundPause = null;
    last = performance.now();
  }
  render();
});

const WON_TEXT = 'All 30 stages cleared. The keep still stands.';
const LOST_TEXT = 'Try a longer maze. Restart from Settings.';

// One animation frame: step the game in fixed slices, draw, react to events, then save.
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!paused && !query('#modal').open) {
    let remaining = dt * speed;
    while (remaining > 0) {
      const step = Math.min(remaining, 1 / 30);
      game.tick(step);
      remaining -= step;
    }
  }
  world.sync(game, dt);
  for (const event of game.events) {
    if (event.type === 'wave' && !game.won) banner('Stage', 'Held', 'The works pay out', 'held');
    if (event.type === 'won') modal('The keep holds', WON_TEXT);
    if (event.type === 'lost') modal('The keep has fallen', LOST_TEXT);
  }
  game.events = [];
  uiTime += dt;
  saveTime += dt;
  if (uiTime > 0.15) {
    render();
    uiTime = 0;
  }
  if (saveTime > 3) {
    persist();
    saveTime = 0;
  }
  requestAnimationFrame(frame);
}

render();
requestAnimationFrame(frame);

// A small hook for the browser tests. Development builds only.
if (import.meta.env.DEV) {
  window.__garden = {
    get game() {
      return game;
    },
    world,
    setPaused(value) {
      paused = value;
      render();
    },
    step(seconds) {
      for (let i = 0; i < seconds * 30; i++) game.tick(1 / 30);
      render();
    },
    save: persist,
  };
}

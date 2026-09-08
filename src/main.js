// Browser interface for Undergrowth. This file owns the page markup, the sidebar, the
// garden panel, the tower detail card, the dialogs, the keyboard and button handlers,
// the autosave to localStorage, and the animation loop that drives the game clock. It
// holds the one Game instance and the one World instance and wires them together. Game
// rules live in game.js and the 3D scene lives in world.js.
import './style.css';
import { Game, TOWERS, STAGES, MATERIALS, ABILITIES } from './game.js';
import { World } from './world.js';
import { TOWER_LOOK, MATERIAL_LOOK, ABILITY_LOOK } from './look.js';

// Short name for document.querySelector, used all over this file.
const query = (selector) => document.querySelector(selector),
  SAVE = 'undergrowth-save-v2';

// Load the saved settlement if it looks sane, otherwise start fresh.
let game;
try {
  const raw = JSON.parse(localStorage.getItem(SAVE) || localStorage.getItem('undergrowth-save-v1'));
  const usable =
    [1, 2, 3].includes(raw?.version) &&
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
let aiming = null;
let hoverCell = null;
let build = 'thorn',
  selected = null,
  paused = false,
  backgroundPause = null,
  speed = 1,
  sound = false,
  toastTimer,
  saveTime = 0,
  uiTime = 0,
  last = performance.now(),
  audio;

// The page markup, built once. Every later update edits pieces of it in place.
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

// The two ability buttons. They sit over the board so they work in both layouts.
const abilityBar =
  '<div class="ability-bar" aria-label="Abilities">' +
  Object.entries(ABILITIES)
    .map(
      ([id, ability]) =>
        `<button class="ability" data-ability="${id}" title="${ability.desc}">` +
        `<span class="ability-fill"></span>` +
        `<span class="ability-face"><i>${ABILITY_LOOK[id].symbol}</i>` +
        `<b>${ability.name}</b><small>${ability.key}</small></span></button>`,
    )
    .join('') +
  '</div>';

const placementBar =
  '<div id="placement" class="placement" hidden>' +
  '<button id="cancel-place" aria-label="Cancel placement">×</button>' +
  '<button id="confirm-place">Place tower</button></div>' +
  '<div class="paused-overlay" id="paused" hidden>Paused</div>';

// Shown across the board while Sunburst is armed, so an armed burst is never a surprise.
const aimBar =
  '<div id="aiming" class="aiming" role="status" hidden>' +
  `<i aria-hidden="true">${ABILITY_LOOK.sunburst.symbol}</i>` +
  '<span><b>Sunburst armed</b>Pick a square. No tower will be built.</span>' +
  '<button id="cancel-aim">Cancel</button></div>';

const sidebarHeading =
  '<div class="sidebar-heading"><span class="wordmark">undergrowth.</span>' +
  '<button id="help" class="icon-button" aria-label="How to play">?</button></div>';

const resourceRow =
  '<div class="resources"><span title="Coins"><i class="coin">◈</i>' +
  '<b id="coins">200</b><small>Coins</small></span></div>';

// The chip colour and symbol for a piece or a material, kept out of the rules file.
const chip = (look, extra = '') =>
  `<span class="chip ${extra}" style="--tile:${look.color}">${look.symbol}</span>`;

// One card per buildable defense, in the order they appear in TOWERS.
const towerCards = Object.entries(TOWERS)
  .map(([id, tower], i) => {
    const chosen = id === 'thorn';
    return (
      `<button class="tower-card ${chosen ? 'selected' : ''}" data-build="${id}"` +
      ` title="${tower.desc}" aria-pressed="${chosen}">` +
      chip(TOWER_LOOK[id], 'tower-icon') +
      `<span class="tower-summary"><b>${tower.name}</b>` +
      `<span class="tower-description">${tower.desc}</span></span>` +
      `<small><i>◈</i>${tower.cost}</small>` +
      `<kbd>${i + 1}</kbd></button>`
    );
  })
  .join('');

const defensesSection =
  '<section class="defenses"><h2>Defenses <small>Keys 1 to 7</small></h2>' +
  `<div class="cards">${towerCards}</div>` +
  '<div id="detail" class="detail" hidden></div></section>';

const inventoryRows = MATERIALS.map(
  (material) =>
    '<div class="inventory-row">' +
    chip(MATERIAL_LOOK[material.id]) +
    `<span>${material.name}</span>` +
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

query('#app').innerHTML = `<main class="game-shell">
  <div class="map-area">${gardenStrip}<section class="scene-wrap" id="scene" aria-label="Battlefield">
    ${mapStatus}
    ${mapControls}
    ${abilityBar}
    ${placementBar}
    ${aimBar}
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

// Show a short message at the bottom of the screen.
function toast(msg) {
  query('#toast').textContent = msg;
  query('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => query('#toast').classList.remove('show'), 3500);
}

// Play one soft blip, but only when the player has turned sound on.
function beep(freq = 440) {
  if (!sound) return;
  try {
    audio ??= new AudioContext();
    const oscillator = audio.createOscillator(),
      gain = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(freq * 0.5, audio.currentTime + 0.12);
    gain.gain.setValueAtTime(0.025, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.14);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.15);
  } catch {}
}

// Write the game to localStorage and report whether it worked.
function persist() {
  try {
    localStorage.setItem(SAVE, game.serialize());
    query('#saved').textContent = 'Autosaved';
  } catch {
    query('#saved').textContent = 'Saving unavailable';
  }
}

// Pick the piece the next click will build.
function choose(type) {
  pendingPlacement = null;
  aiming = null;
  world.previewTowers = null;
  world.range.visible = false;
  build = type;
  selected = null;
  detailKey = '';
  render();
  beep(300);
}

// Handle a click on a board square: select a tower, stage a placement, or build right away.
function onCell(cell) {
  if (paused || game.lost || game.won) return;
  // An armed Sunburst swallows the next click and lands on that square.
  if (aiming) {
    const id = aiming;
    aiming = null;
    const err = game.useAbility(id, cell);
    toast(err || `${ABILITIES[id].name} lands on the horde.`);
    if (!err) beep(660);
    persist();
    render();
    return;
  }
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
  // On a phone a tap only stages the tower. A second tap on Place confirms it.
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
      beep(500);
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

// Mark the towers a Lantern is speeding up, whenever one is hovered or selected.
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
} catch (error) {
  query('#scene').innerHTML =
    '<div style="padding:35px">This garden needs WebGL. Enable hardware' +
    ' acceleration in your browser and reload.</div>';
  throw error;
}

let detailKey = '';

// The three number chips under a tower name. Hedges have no combat numbers.
function defenseStats(stats, type, level = 1) {
  if (type === 'hedge') return '';
  // A Lantern never shoots, so it shows what its ring does instead of damage numbers.
  if (type === 'lantern') {
    return (
      '<div class="defense-stats">' +
      `<span><b>+${Math.round((0.2 + level * 0.1) * 100)}%</b>Fire rate nearby</span>` +
      `<span><b>${stats.range.toFixed(1)}</b>Ring · squares</span>` +
      '<span><b>0</b>Damage / hit</span></div>'
    );
  }
  return (
    '<div class="defense-stats">' +
    `<span><b>${Math.round(stats.damage)}</b>Damage / hit</span>` +
    `<span><b>${stats.range.toFixed(1)}</b>Range · squares</span>` +
    `<span><b>${stats.rate.toFixed(2)}s</b>Between shots</span></div>`
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

// The line that names what the player is short of, and why that material only comes from a plot.
function shortfallNote(missing) {
  if (!missing.length) return '';
  const parts = missing
    .map((item) => `${item.short} more ${item.name.toLowerCase()}`)
    .join(' and ');
  const fromGarden = missing.some((item) => item.id !== 'coins');
  const why = fromGarden
    ? ' Materials only come from garden plots, so buy or upgrade a plot to earn them.'
    : ' Coins come from kills and from clearing waves.';
  return `<p class="defense-missing">You need ${parts}.${why}</p>`;
}

// The upgrade paragraph and buttons, shown while a tower can still grow.
function upgradeBlock(tower, cost, missing) {
  if (tower.level >= 3 || tower.type === 'hedge') return '<p>Fully upgraded.</p>';
  const materialCosts = MATERIALS.filter((material) => cost[material.id])
    .map((material) => ` · ${cost[material.id]} ${material.name.toLowerCase()}`)
    .join('');
  const powerLabel = tower.level === 1 ? 'Power +55%' : 'Grow to level 3';
  const blocked = missing.length ? ' disabled' : '';
  const reachButton =
    tower.level === 1 ? `<button data-upgrade="reach"${blocked}>Range +1.1</button>` : '';
  return (
    `<p>Upgrade · ${cost.coins} coins${materialCosts}</p>` +
    shortfallNote(missing) +
    `<div class="upgrade-row"><button data-upgrade="power"${blocked}>${powerLabel}</button>` +
    `${reachButton}</div>`
  );
}

// Redraw the tower detail card, either as a preview of the chosen piece or the selected tower.
function renderDetail() {
  const tower = game.towers.find((candidate) => candidate.id === selected),
    info = TOWERS[tower?.type || build || 'thorn'];
  const shortKey = tower ? game.upgradeShortfall(tower).map((item) => item.id) : [];
  const key = JSON.stringify([
    tower?.id,
    tower?.level,
    tower?.branch,
    build,
    shortKey,
    mobileQuery.matches,
    !tower && !!build && game.coins < info.cost,
  ]);
  if (key === detailKey) return;
  detailKey = key;
  query('#detail').hidden = !tower && (!build || mobileQuery.matches);

  if (!tower) {
    if (!build || mobileQuery.matches) {
      query('#detail').innerHTML = '';
      return;
    }
    const stats = game.stats({ type: build, level: 1 });
    const eyebrow = build === 'hedge' ? 'Maze building' : 'Before you build';
    const short = game.coins < info.cost;
    const shortNote = short
      ? `<p class="defense-missing">You have ${Math.floor(game.coins)} coins, so this` +
        ' costs more than you can pay. Clear a wave or sell a piece.</p>'
      : '';
    query('#detail').innerHTML =
      `<div class="eyebrow">${eyebrow} · ${info.cost} coins</div>` +
      defenseHeading(build) +
      defenseStats(stats, build) +
      shortNote +
      `<p class="defense-effect">${info.effect}</p>` +
      `<p class="defense-tip">${info.tip}</p>`;
    return;
  }

  const stats = game.stats(tower),
    cost = game.upgradeCost(tower),
    missing = game.upgradeShortfall(tower);
  const boost = game.rateBonus(tower);
  const boostNote =
    boost > 1
      ? `<p class="defense-boost">A Lantern is speeding this up by ${Math.round((boost - 1) * 100)}%.</p>`
      : '';
  const branchLabel = tower.branch ? ' · ' + tower.branch : '';
  query('#detail').innerHTML =
    '<button class="detail-close mobile-only" id="close-detail"' +
    ' aria-label="Close tower details">×</button>' +
    `<div class="eyebrow">Level ${tower.level}${branchLabel}</div>` +
    defenseHeading(tower.type) +
    defenseStats(stats, tower.type, tower.level) +
    boostNote +
    `<p class="defense-effect">${info.effect}</p>` +
    `<p class="defense-tip">${info.tip}</p>` +
    upgradeBlock(tower, cost, missing) +
    `<button class="text-button" id="sell">Reclaim · ${Math.floor(tower.spent * 0.7)} coins</button>`;

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
        toast(err || 'A little stronger. A little wilder.');
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

// Refresh every number and label in the interface from the current game state.
function render() {
  for (const key of ['coins', ...MATERIALS.map((material) => material.id)]) {
    query('#' + key).textContent = Math.floor(game[key]);
  }
  query('#lives').textContent = `${game.lives} / 20`;
  query('#stage-number').textContent = String(Math.min(10, game.stage + 1)).padStart(2, '0');
  const shownWave = Math.min(3, game.wave + (game.active ? 0 : 1));
  query('#wave-counter').textContent = `Wave ${shownWave} / 3`;
  query('#enemy-counter').textContent = game.active
    ? `${game.enemies.length + game.queue.length} remaining`
    : `${game.waveSize(game.stage, Math.min(3, game.wave + 1))} creatures`;
  query('#start').disabled = (game.active && !paused) || game.lost || game.won;
  query('#start').textContent = game.won
    ? 'Garden protected ✓'
    : game.lost
      ? 'Expedition ended'
      : game.active
        ? paused
          ? 'Resume wave ▶'
          : 'Wave in progress…'
        : 'Begin wave ↗';
  document.querySelectorAll('.wave-progress span').forEach((element, i) => {
    element.classList.toggle('done', i < game.wave);
  });
  document.querySelectorAll('.stage-dot').forEach((element, i) => {
    element.classList.toggle('current', i === game.stage);
    element.classList.toggle('complete', i < game.stage);
  });
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
  world.aiming = !!aiming;
  query('#aiming').hidden = !aiming;
  query('#scene').classList.toggle('armed', !!aiming);
  if (!aiming) world.burst.visible = false;
  showBoost();
  query('#paused').hidden = !paused;
  query('#pause').textContent = paused ? '▶' : 'Ⅱ';
  query('#speed').textContent = speed + '×';
  query('#placement').hidden = !pendingPlacement;
  if (pendingPlacement) {
    const staged = TOWERS[pendingPlacement.type];
    query('#confirm-place').textContent = `Place ${staged.name} · ◈ ${staged.cost}`;
  }
  renderAbilities();
  renderGarden();
  renderDetail();
}

// Redraw the two ability buttons: the seconds left, the fill, and the armed state.
function renderAbilities() {
  for (const [id, ability] of Object.entries(ABILITIES)) {
    const button = query(`[data-ability="${id}"]`);
    const state = game.abilityState(id);
    const share = state.ready ? 0 : state.left / ability.cooldown;
    button.querySelector('.ability-fill').style.height = `${Math.round(share * 100)}%`;
    button.querySelector('b').textContent = state.ready ? ability.name : `${state.left}s`;
    button.classList.toggle('cooling', !state.ready);
    button.classList.toggle('armed', aiming === id);
    button.disabled = game.lost || game.won;
    button.setAttribute('aria-pressed', String(aiming === id));
    const label = state.ready ? `${ability.name}, ready` : `${ability.name}, ${state.left} seconds`;
    button.setAttribute('aria-label', label);
  }
}

// Fire an ability from a key or a button. Sunburst arms itself and waits for a square.
function fireAbility(id) {
  if (paused || game.lost || game.won) return;
  if (!game.abilityState(id).ready) {
    toast(game.useAbility(id, { x: 6, z: 4 }));
    return;
  }
  if (id === 'sunburst') {
    aiming = aiming === id ? null : id;
    toast(aiming ? 'Pick the square to burst.' : 'Sunburst put away.');
    render();
    return;
  }
  aiming = null;
  const err = game.useAbility(id);
  toast(err || 'Roots take hold. Nothing on the ground moves.');
  if (!err) beep(220);
  persist();
  render();
}

// Redraw the garden summary chips and the four plot cards, skipping unchanged work.
function renderGarden() {
  const summaryKey = JSON.stringify([
    game.unlockedPlots,
    game.farms.map((plot) => !!plot),
    ...MATERIALS.map((material) => game[material.id]),
  ]);
  if (query('#garden-summary').dataset.key !== summaryKey) {
    query('#garden-summary').dataset.key = summaryKey;
    query('#garden-summary').innerHTML = MATERIALS.map((material, i) => {
      const locked = i >= game.unlockedPlots;
      const value = locked ? 'Locked' : game.farms[i] ? game[material.id] : 'Buy · ' + material.buy;
      return (
        `<button data-garden-open="${i}"` +
        ` aria-label="Manage ${material.name.toLowerCase()} garden">` +
        chip(MATERIAL_LOOK[material.id]) +
        `<span class="plot-name">${material.name}</span><b>${value}</b></button>`
      );
    }).join('');
    query('#garden-summary')
      .querySelectorAll('[data-garden-open]')
      .forEach((button) => {
        button.onclick = () => {
          query('#garden-modal').showModal();
          query('#farms')
            .querySelector(`[data-plot="${button.dataset.gardenOpen}"]`)
            ?.scrollIntoView({ block: 'nearest' });
        };
      });
  }

  const ended = game.lost || game.won;
  const plotsKey = JSON.stringify([
    game.farms.map((plot) => (plot ? { ...plot, progress: Math.floor(plot.progress) } : null)),
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
          ? 'Increase production to ' + material.yield * (plot.level + 1) + ' every 10 seconds'
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

  query('#farms')
    .querySelectorAll('[data-farm]')
    .forEach((button) => {
      button.onclick = () => {
        const i = Number(button.dataset.farm),
          existing = !!game.farms[i],
          err = game.farm(i);
        const started = MATERIALS[i].name + ' production started. Materials collect automatically.';
        toast(err || (existing ? MATERIALS[i].name + ' production upgraded.' : started));
        persist();
        render();
      };
    });
  query('#farms')
    .querySelectorAll('[data-unlock]')
    .forEach((button) => {
      button.onclick = () => {
        const i = Number(button.dataset.unlock);
        const unlocked = MATERIALS[i].name + ' plot unlocked. Buy it to start production.';
        toast(game.unlockPlot(i) || unlocked);
        persist();
        render();
      };
    });
}

// Open the shared dialog, pausing the game while it is up. An action adds a second button.
function modal(title, body, button = 'Back to the garden', action) {
  const dialog = query('#modal');
  const cancelButton = action
    ? '<button class="outline" id="modal-cancel">Keep this garden</button>'
    : '';
  dialog.innerHTML =
    '<div class="eyebrow">Undergrowth</div>' +
    `<h2>${title}</h2><p>${body}</p>` +
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
  '<b class="help-warning">Played this before?</b> The wild grew back stronger this season.' +
  ' Every creature has more hit points, and the maze that held last time will not hold on' +
  ' its own. You need the new kit with it: an Ember for shells and wardens, and a Lantern' +
  ' in the middle of your towers.<br><br>' +
  '<b>1. Shape the maze.</b> Choose a tower, then click a meadow square.' +
  ' The dotted line shows the horde’s route. A longer route means more shots, so the' +
  ' scenic way round is worth more than any single tower. Keep an exit open.<br><br>' +
  '<b>2. Grow while you defend.</b> Buy the wood plot for 25 coins. It automatically' +
  ' adds 3 wood every 10 seconds, including during combat. Upgrade it with coins for' +
  ' more output. Unlock and buy Rock, then Iron, then Diamond plots with coins.' +
  ' The first upgrade of a tower costs coins only. Level 3 needs materials, and' +
  ' materials only come from garden plots.<br><br>' +
  '<b>3. Know the horde.</b> Moths fly over the maze. Beetles wear armor, and Sunstone' +
  ' cuts through it. A brood sac bursts into three grublings when it dies, so Bloom' +
  ' bursts clear them best. A warden ignores sap and shields everything beside it,' +
  ' and only Ember burning gets past that shield.<br><br>' +
  '<b>4. Your two abilities.</b> Rootgrip (Q) holds every walking enemy still for 3' +
  ' seconds. Sunburst (E) arms a burst, then you pick the square it lands on. While it is' +
  ' armed the board says so and a board tap fires the burst instead of building a tower,' +
  ' so use Cancel or press Escape if you change your mind. Both recharge on their own and' +
  ' both are saved with your game.<br><br>' +
  '<b>5. New towers.</b> Ember (6) sets enemies alight, and burning ignores armor and' +
  ' shields. Lantern (7) never shoots, it makes every attacking tower in its ring fire' +
  ' faster, so it belongs in the middle of a cluster. Point at a Lantern and the board rings' +
  ' every tower it is speeding up.<br><br>' +
  '<b>Controls:</b> 1–7 choose pieces, Q and E fire abilities, Esc inspects,' +
  ' Space pauses. Progress saves automatically on this browser.';

query('#help').onclick = () => modal('Small pieces. Big possibilities.', HELP_TEXT);

query('#mobile-options').onclick = () => {
  const menu =
    '<button class="outline" id="menu-help">How to play</button>' +
    '<button class="outline" id="menu-sound">Toggle sound</button>' +
    '<button class="outline" id="menu-restart">New garden</button>';
  modal('Game menu', menu, 'Return to game');
  // Each menu row closes the dialog and then clicks the matching desktop button.
  for (const name of ['help', 'sound', 'restart']) {
    query('#menu-' + name).onclick = () => {
      query('#modal-ok').click();
      query('#' + name).click();
    };
  }
};

query('#close-garden').onclick = () => query('#garden-modal').close();
query('#garden-modal').addEventListener('click', (event) => {
  if (event.target !== query('#garden-modal')) return;
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
  aiming = null;
  pendingPlacement = null;
  world.previewTowers = null;
  world.hover.visible = false;
  world.range.visible = false;
  render();
}

query('#cancel-aim').onclick = () => {
  aiming = null;
  world.burst.visible = false;
  toast('Sunburst put away.');
  render();
};

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
  beep(500);
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

// Move the garden plots between the sidebar strip and the phone sheet when the layout changes.
function adaptLayout() {
  if (!mobileQuery.matches && query('#garden-modal').open) query('#garden-modal').close();
  const host = mobileQuery.matches ? query('#garden-modal .sheet-body') : query('.garden-strip');
  host.append(query('#farms'));
  world.resize();
  cancelPlacement();
}
mobileQuery.addEventListener('change', adaptLayout);
adaptLayout();

const RESTART_TEXT =
  'This replaces your saved settlement with a fresh garden.' +
  ' Your current towers and materials will be cleared.';

query('#restart').onclick = () =>
  modal('Plant a new beginning?', RESTART_TEXT, 'Start a new garden', () => {
    pendingPlacement = null;
    game = new Game();
    selected = null;
    build = 'thorn';
    paused = false;
    farmKey = '';
    detailKey = '';
    persist();
    render();
    toast('A new beginning. Make it yours.');
  });

query('#start').onclick = () => {
  paused = false;
  backgroundPause = null;
  last = performance.now();
  if (game.active) {
    render();
    return;
  }
  if (game.start()) {
    // Stage 1 is where the maze lesson has to land, so say it in plain words.
    toast(
      game.stage === 0
        ? 'A longer route means more shots. Hedges cost 8 coins and bend the dotted line.'
        : 'Wave started. Follow the dotted route.',
    );
    beep(250);
    persist();
  }
  render();
};
query('#pause').onclick = () => {
  paused = !paused;
  render();
};
query('#speed').onclick = () => {
  speed = speed === 1 ? 2 : speed === 2 ? 3 : 1;
  render();
};
query('#sound').onclick = () => {
  sound = !sound;
  query('#sound').style.background = sound ? '#dce8cb' : 'transparent';
  query('#sound').setAttribute('aria-label', sound ? 'Mute sound' : 'Enable sound');
  beep(600);
};
query('#path').onclick = () => {
  world.route.visible = !world.route.visible;
  query('#path').textContent = world.route.visible ? 'Route on' : 'Route off';
  query('#path').setAttribute('aria-pressed', String(world.route.visible));
};

document.querySelectorAll('[data-build]').forEach((button) => {
  button.onclick = () => choose(button.dataset.build);
});

document.querySelectorAll('[data-ability]').forEach((button) => {
  button.onclick = () => fireAbility(button.dataset.ability);
});

window.addEventListener('keydown', (event) => {
  const typing = event.target.matches('input,textarea,select');
  if (query('#modal').open || query('#garden-modal').open || typing) return;
  if (event.code === 'Space') {
    event.preventDefault();
    paused = !paused;
    render();
  }
  const keys = Object.keys(TOWERS);
  const slot = Number(event.key);
  if (Number.isInteger(slot) && slot >= 1 && slot <= keys.length) choose(keys[slot - 1]);
  for (const [id, ability] of Object.entries(ABILITIES)) {
    if (event.key.toUpperCase() === ability.key) fireAbility(id);
  }
  if (event.key === 'Escape') {
    aiming = null;
    pendingPlacement = null;
    build = null;
    selected = null;
    detailKey = '';
    world.range.visible = false;
    world.hover.visible = false;
    world.previewTowers = null;
    render();
  }
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

const WON_TEXT =
  'Ten stages survived. The wilds are quiet, and your little garden stands.' +
  ' Try a new layout with a fresh expedition.';
const LOST_TEXT =
  'The horde reached your heart. Start a new garden with the ↺ button.' +
  ' Try a longer maze first, since a longer route means more shots. Then early farm' +
  ' upgrades, an Ember for shells and wardens, and a Lantern in the middle of your towers.';

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
    if (event.type === 'wave') {
      toast('Wave survived. Coins earned. Time to tend your garden.');
      beep(800);
    }
    if (event.type === 'stage') {
      toast(`Stage ${game.stage + 1}: ${STAGES[game.stage][0]}. Your settlement carries on.`);
    }
    if (event.type === 'leak') beep(140);
    if (event.type === 'won') modal('You grew something extraordinary.', WON_TEXT);
    if (event.type === 'lost') modal('Even gardens need another season.', LOST_TEXT);
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
    step(seconds) {
      for (let i = 0; i < seconds * 30; i++) game.tick(1 / 30);
      render();
    },
    save: persist,
  };
}

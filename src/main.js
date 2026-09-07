// Browser interface for Undergrowth. This file owns the page markup, the sidebar, the
// garden panel, the tower detail card, the dialogs, the keyboard and button handlers,
// the autosave to localStorage, and the animation loop that drives the game clock. It
// holds the one Game instance and the one World instance and wires them together. Game
// rules live in game.js and the 3D scene lives in world.js.
import './style.css';
import { Game, TOWERS, STAGES, MATERIALS } from './game.js';
import { World } from './world.js';

// Short name for document.querySelector, used all over this file.
const query = (selector) => document.querySelector(selector),
  SAVE = 'undergrowth-save-v2';

// Load the saved settlement if it looks sane, otherwise start fresh.
let game;
try {
  const raw = JSON.parse(localStorage.getItem(SAVE) || localStorage.getItem('undergrowth-save-v1'));
  const usable =
    [1, 2].includes(raw?.version) && Array.isArray(raw.towers) && raw.stage >= 0 && raw.stage <= 10;
  game = usable ? new Game(raw) : new Game();
} catch {
  game = new Game();
}

const mobileQuery = matchMedia('(max-width: 700px), (max-width: 1000px) and (pointer: coarse)');

// Interface state. None of this belongs in the save file.
let pendingPlacement = null;
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

// One card per buildable defense, in the order they appear in TOWERS.
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

query('#app').innerHTML = `<main class="game-shell">
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
  const tower = game.towers.find((candidate) => candidate.id === selected);
  world.showHover(cell, build, game, tower);
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
function defenseStats(stats, type) {
  if (type === 'hedge') return '';
  return (
    '<div class="defense-stats">' +
    `<span><b>${Math.round(stats.damage)}</b>Damage / hit</span>` +
    `<span><b>${stats.range.toFixed(1)}</b>Range · squares</span>` +
    `<span><b>${stats.rate.toFixed(2)}s</b>Between shots</span></div>`
  );
}

// The icon, name, and effect line shared by both states of the detail card.
function defenseHeading(info) {
  return (
    '<div class="detail-title">' +
    `<span class="tower-icon" style="--tile:${info.color}">${info.symbol}</span>` +
    `<h2>${info.name}</h2></div>` +
    `<p class="defense-effect">${info.effect}</p>`
  );
}

// The upgrade paragraph and buttons, shown while a tower can still grow.
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

// Redraw the tower detail card, either as a preview of the chosen piece or the selected tower.
function renderDetail() {
  const tower = game.towers.find((candidate) => candidate.id === selected),
    info = TOWERS[tower?.type || build || 'thorn'];
  const key = JSON.stringify([tower?.id, tower?.level, tower?.branch, build, mobileQuery.matches]);
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
    query('#detail').innerHTML =
      `<div class="eyebrow">${eyebrow}</div>` +
      defenseHeading(info) +
      defenseStats(stats, build) +
      `<p class="defense-tip">${info.tip}</p>`;
    return;
  }

  const stats = game.stats(tower),
    cost = game.upgradeCost(tower);
  const branchLabel = tower.branch ? ' · ' + tower.branch : '';
  query('#detail').innerHTML =
    '<button class="detail-close mobile-only" id="close-detail"' +
    ' aria-label="Close tower details">×</button>' +
    `<div class="eyebrow">Level ${tower.level}${branchLabel}</div>` +
    defenseHeading(info) +
    defenseStats(stats, tower.type) +
    `<p class="defense-tip">${info.tip}</p>` +
    upgradeBlock(tower, cost) +
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
    : `${7 + game.stage * 2 + (game.wave + 1) * 2} creatures`;
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
  query('#paused').hidden = !paused;
  query('#pause').textContent = paused ? '▶' : 'Ⅱ';
  query('#speed').textContent = speed + '×';
  query('#placement').hidden = !pendingPlacement;
  if (pendingPlacement) {
    const staged = TOWERS[pendingPlacement.type];
    query('#confirm-place').textContent = `Place ${staged.name} · ◈ ${staged.cost}`;
  }
  renderGarden();
  renderDetail();
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
        `<span>${material.name}</span><b>${value}</b></button>`
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
  pendingPlacement = null;
  world.previewTowers = null;
  world.hover.visible = false;
  world.range.visible = false;
  render();
}

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
    toast('Wave started. Follow the dotted route.');
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

window.addEventListener('keydown', (event) => {
  const typing = event.target.matches('input,textarea,select');
  if (query('#modal').open || query('#garden-modal').open || typing) return;
  if (event.code === 'Space') {
    event.preventDefault();
    paused = !paused;
    render();
  }
  if ('12345'.includes(event.key)) choose(Object.keys(TOWERS)[Number(event.key) - 1]);
  if (event.key === 'Escape') {
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
  ' Try a longer maze, early farm upgrades, and Sap beside your damage towers.';

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

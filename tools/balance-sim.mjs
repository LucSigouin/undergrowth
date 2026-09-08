#!/usr/bin/env node
// Headless balance simulator for Undergrowth v2.
// It drives the real Game class from src/game.js at 1/30 s, with no renderer and no browser.
// Each named strategy is a policy function that spends coins between waves, then the wave is
// stepped to its end. No game logic is copied here; the only import is ../src/game.js.
// Usage: node tools/balance-sim.mjs [--json] [--experiments] [--strategy=name]

import { Game, TOWERS, MATERIALS, HP_GROWTH, path } from '../src/game.js';

const DT = 1 / 30;
const TICKS_PER_SECOND = 30;
// A wave that has not ended after this many seconds is treated as stalled and stops the run.
const MAX_WAVE_SECONDS = 150;
// Ten stages of three waves is thirty waves. The extra margin only exists to break runaway loops.
const MAX_WAVES = 40;

// ---------------------------------------------------------------------------
// Tuning. Changes are applied as parameters, never by editing src/game.js.
// ---------------------------------------------------------------------------

// A Game subclass that scales values the engine hard-codes. Every method calls super first,
// so the engine stays the single source of truth for the actual rules.
class TunedGame extends Game {
  constructor(tuning) {
    super();
    this.tuning = tuning || {};
  }

  // Rescales enemy hit points when the tuning changes the shipped per stage growth base.
  enemy(kind) {
    const made = super.enemy(kind);
    const base = this.tuning.hpBase;
    if (base && base !== HP_GROWTH) {
      const factor = Math.pow(base / HP_GROWTH, this.stage);
      made.hp *= factor;
      made.maxHp *= factor;
    }
    return made;
  }

  // Scales the material and coin part of an upgrade bill. Scale 0 makes upgrades coin only.
  // upgradeMaterialScale is one number for every material, or an object keyed by material.
  // firstUpgradeFree drops the materials from the level 1 to level 2 step only.
  upgradeCost(tower) {
    const cost = super.upgradeCost(tower);
    const materials = ['wood', 'rock', 'iron', 'diamond'];
    const materialScale = this.tuning.upgradeMaterialScale;
    if (materialScale !== undefined) {
      for (const key of materials) {
        const scale = typeof materialScale === 'number' ? materialScale : (materialScale[key] ?? 1);
        cost[key] = Math.ceil(cost[key] * scale);
      }
    }
    if (this.tuning.firstUpgradeFree && tower.level === 1) {
      for (const key of materials) cost[key] = 0;
    }
    // r2 made the first upgrade coins only. This puts the r1 wood bill back for comparison.
    if (this.tuning.r1FirstUpgrade && tower.level === 1) cost.wood = 5 * tower.level;
    if (this.tuning.upgradeCoinScale) {
      cost.coins = Math.round(cost.coins * this.tuning.upgradeCoinScale);
    }
    return cost;
  }

  // Rescales the upgrade damage step (1.0 per level) and the power branch bonus (1.55).
  stats(tower) {
    const base = super.stats(tower);
    const step = this.tuning.upgradeStep;
    if (step && tower.level > 1) {
      base.damage *= (1 + (tower.level - 1) * step) / (1 + (tower.level - 1) * 1.0);
    }
    const power = this.tuning.powerBranch;
    if (power && tower.branch === 'power') {
      base.damage *= power / 1.55;
    }
    return base;
  }
}

// Applies tuning that lives in the exported TOWERS and MATERIALS tables, and returns an undo.
function applyConstants(tuning) {
  const saved = [];
  const set = (table, key, field, value) => {
    if (value === undefined) return;
    saved.push([table[key], field, table[key][field]]);
    table[key][field] = value;
  };
  for (const [key, patch] of Object.entries(tuning.towers || {})) {
    for (const [field, value] of Object.entries(patch)) set(TOWERS, key, field, value);
  }
  for (const [index, patch] of Object.entries(tuning.materials || {})) {
    for (const [field, value] of Object.entries(patch)) set(MATERIALS, Number(index), field, value);
  }
  return () => {
    for (let i = saved.length - 1; i >= 0; i--) {
      const [target, field, value] = saved[i];
      target[field] = value;
    }
  };
}

// Adds the coin overlays (extra coins per kill, per cleared wave) that the engine hard-codes.
function applyCoinOverlay(game, tuning) {
  const perKill = tuning.killCoins || 0;
  const perWave = tuning.waveCoins || 0;
  if (!perKill && !perWave) return;
  for (const event of game.events) {
    if (event.type === 'kill' && event.kind !== 'boss') game.coins += perKill;
    if (event.type === 'wave') game.coins += perWave;
  }
}

// ---------------------------------------------------------------------------
// Small helpers the strategies use to spend money.
// ---------------------------------------------------------------------------

// Wraps a game so a policy can try purchases and read back whether they happened.
function makeApi(game) {
  return {
    place: (type, x, z) => game.place(type, x, z) === null,
    upgrade: (id, branch) => game.upgrade(id, branch) === null,
    farm: (index) => game.farm(index) === null,
    unlockPlot: (index) => game.unlockPlot(index) === null,
    guns: () => game.towers.filter((t) => t.type !== 'hedge'),
    routeLength: () => (path(game.towers) || []).length,
  };
}

// Buys and upgrades the wood plot, then rock, iron and diamond, up to the given levels.
function growFarms(game, api, levels) {
  for (let index = 0; index < levels.length; index++) {
    const want = levels[index];
    if (want <= 0) continue;
    if (index > 0 && game.unlockedPlots <= index && !api.unlockPlot(index)) return;
    while ((game.farms[index] ? game.farms[index].level : 0) < want) {
      if (!api.farm(index)) return;
    }
  }
}

// Upgrades attacking towers, lowest level first, while the money and materials last.
function upgradeGuns(game, api, branch) {
  const guns = api
    .guns()
    .slice()
    .sort((a, b) => a.level - b.level || a.id - b.id);
  for (const tower of guns) {
    while (tower.level < 3 && api.upgrade(tower.id, branch)) {
      // keep upgrading this tower while it is affordable
    }
  }
}

// Walks a build plan of [type, x, z] and buys as many entries as the coins allow.
function buildPlan(game, api, plan, reserve = 0) {
  for (const [type, x, z] of plan) {
    if (game.towers.some((t) => t.x === x && t.z === z)) continue;
    if (game.coins < TOWERS[type].cost + reserve) continue;
    api.place(type, x, z);
  }
}

// ---------------------------------------------------------------------------
// The maze. Five walls with alternating gaps make a long serpentine route.
// Two cells in every wall are left for attacking towers, so a tower is also a wall segment.
// ---------------------------------------------------------------------------

const WALLS = [
  { x: 2, from: 0, to: 7 },
  { x: 4, from: 1, to: 8 },
  { x: 6, from: 0, to: 7 },
  { x: 8, from: 1, to: 8 },
  { x: 10, from: 0, to: 7 },
];
const GUN_SLOTS = [3, 5];

// Hedge cells, wall by wall, in the order they should be built.
function hedgePlan(walls) {
  const cells = [];
  for (const wall of walls) {
    for (let z = wall.from; z <= wall.to; z++) {
      if (!GUN_SLOTS.includes(z)) cells.push([wall.x, z]);
    }
  }
  return cells;
}

// Buys hedges in plan order while keeping a reserve so towers still get funded.
function buildHedges(game, api, cells, reserve) {
  for (const [x, z] of cells) {
    if (game.towers.some((t) => t.x === x && t.z === z)) continue;
    if (game.coins < TOWERS.hedge.cost + reserve) return;
    api.place('hedge', x, z);
  }
}

const MAZE_GUNS = [
  ['thorn', 2, 3],
  ['thorn', 4, 5],
  ['sap', 6, 3],
  ['thorn', 8, 5],
  ['prism', 10, 3],
  ['sap', 2, 5],
  ['thorn', 4, 3],
  ['prism', 6, 5],
  ['thorn', 8, 3],
  ['thorn', 10, 5],
];

// The same maze slots, but built with the r2 pieces: two Embers for shells and wardens,
// and one Lantern sitting where its ring covers three neighbours.
const KIT_GUNS = [
  ['thorn', 2, 3],
  ['thorn', 4, 5],
  ['sap', 6, 3],
  ['ember', 8, 5],
  ['prism', 10, 3],
  ['sap', 2, 5],
  ['lantern', 4, 3],
  ['prism', 6, 5],
  ['ember', 8, 3],
  ['thorn', 10, 5],
];

// Open meadow spots beside the straight route, used by the strategies that do not maze.
const OPEN_GUNS = [
  ['thorn', 3, 3],
  ['thorn', 5, 5],
  ['thorn', 7, 3],
  ['thorn', 9, 5],
  ['thorn', 3, 5],
  ['thorn', 5, 3],
  ['thorn', 7, 5],
  ['thorn', 9, 3],
  ['thorn', 11, 3],
  ['thorn', 1, 5],
];

// ---------------------------------------------------------------------------
// Strategies. Each policy runs once between waves, before start().
// ---------------------------------------------------------------------------

// Waves already finished, used to pace how fast a strategy expands.
function wavesPlayed(game) {
  return game.stage * 3 + game.wave;
}

// The shared maze build order: guns first, then a growing number of hedges, then upgrades.
// deepGarden also buys the iron and diamond plots, which is what a level 3 Sunstone needs.
function mazePolicy(game, api, branch, deepGarden = false, guns = MAZE_GUNS) {
  const played = wavesPlayed(game);
  growFarms(game, api, [1, 0, 0, 0]);
  buildPlan(game, api, guns.slice(0, 2 + played), 0);
  buildHedges(game, api, hedgePlan(WALLS).slice(0, 6 + played * 3), 0);
  if (game.stage >= 2) growFarms(game, api, [3, 2, 0, 0]);
  if (deepGarden && game.stage >= 4) growFarms(game, api, [3, 2, 2, 2]);
  upgradeGuns(game, api, branch);
}

const STRATEGIES = [
  {
    name: 'naive',
    note: 'A few Thorns beside the straight route. Upgrades when affordable. No farm.',
    policy(game, api) {
      buildPlan(game, api, OPEN_GUNS);
      upgradeGuns(game, api, 'power');
    },
  },
  {
    name: 'maze',
    note: 'Serpentine hedge walls with Thorn, Sap and Sunstone in the wall. Buys wood and rock so it can upgrade.',
    policy(game, api) {
      mazePolicy(game, api, 'power');
    },
  },
  {
    name: 'maze-deep',
    note: 'The maze plan plus the full garden from stage 5, the only way a Sunstone can reach level 3.',
    policy(game, api) {
      mazePolicy(game, api, 'power', true);
    },
  },
  {
    name: 'farm-first',
    note: 'Wood then rock then iron then diamond, fully upgraded, before any tower is bought.',
    policy(game, api) {
      growFarms(game, api, [3, 3, 3, 3]);
      const gardenDone = game.farms.every((f) => f && f.level >= 3);
      if (!gardenDone) return;
      buildPlan(game, api, MAZE_GUNS, 8);
      buildHedges(game, api, hedgePlan(WALLS), 0);
      upgradeGuns(game, api, 'power');
    },
  },
  {
    name: 'farm-lite',
    note: 'Two Thorns first, then the wood and rock plots, then the maze. Farming without going undefended.',
    policy(game, api) {
      buildPlan(game, api, OPEN_GUNS.slice(0, 2));
      growFarms(game, api, [2, 0, 0, 0]);
      if (game.stage >= 1) growFarms(game, api, [3, 2, 0, 0]);
      buildHedges(game, api, hedgePlan(WALLS), 35);
      buildPlan(game, api, MAZE_GUNS, 8);
      upgradeGuns(game, api, 'power');
    },
  },
  {
    name: 'reach-maze',
    note: 'The maze plan with the reach upgrade branch instead of power. Shows what the damage cap costs.',
    policy(game, api) {
      mazePolicy(game, api, 'reach');
    },
  },
  {
    name: 'kit-maze',
    note: 'The r2 maze: the same walls and slots, but with two Embers and a Lantern. No abilities.',
    policy(game, api) {
      mazePolicy(game, api, 'power', true, KIT_GUNS);
    },
  },
];

// ---------------------------------------------------------------------------
// The run loop.
// ---------------------------------------------------------------------------

// Steps one wave to its end and reports lives lost, seconds taken and whether it stalled.
function playWave(game, tuning) {
  const budget = MAX_WAVE_SECONDS * TICKS_PER_SECOND;
  let livesLost = 0;
  let ticks = 0;
  while (game.active && ticks < budget) {
    const before = game.lives;
    game.tick(DT);
    if (game.lives < before) livesLost += before - game.lives;
    applyCoinOverlay(game, tuning);
    game.events.length = 0;
    ticks++;
  }
  return { livesLost, seconds: Math.round(ticks * DT * 10) / 10, stalled: game.active };
}

// A blank per stage record. Waves are appended as they finish.
function newStage(index) {
  return { stage: index, livesLost: 0, livesEnd: 0, coinsEnd: 0, towers: 0, waves: [] };
}

// Fills in the end of stage snapshot: money, tower count, tower levels, farm levels.
function closeStage(record, game, api) {
  const guns = api.guns();
  record.livesEnd = game.lives;
  record.coinsEnd = Math.round(game.coins);
  record.towers = game.towers.length;
  record.hedges = game.towers.length - guns.length;
  record.towerLevels = guns.map((t) => t.level).sort((a, b) => b - a);
  record.farms = game.farms.map((f) => (f ? f.level : 0));
  record.routeLength = api.routeLength();
  return record;
}

// Plays one strategy through all ten stages or until it loses, and returns its record.
function runStrategy(strategy, tuning = {}) {
  const undo = applyConstants(tuning);
  try {
    const game = new TunedGame(tuning);
    const api = makeApi(game);
    const stages = [];
    let record = newStage(0);
    let lostAtStage = null;
    let lostAtWave = null;
    let stalledAt = null;
    for (let played = 0; played < MAX_WAVES && !game.won && !game.lost; played++) {
      strategy.policy(game, api);
      const stageIndex = game.stage;
      const waveNumber = game.wave + 1;
      if (!game.start()) break;
      const wave = playWave(game, tuning);
      record.livesLost += wave.livesLost;
      record.waves.push({
        wave: waveNumber,
        livesLost: wave.livesLost,
        seconds: wave.seconds,
        coinsEnd: Math.round(game.coins),
      });
      if (game.lost) {
        lostAtStage = stageIndex;
        lostAtWave = waveNumber;
      }
      if (wave.stalled) {
        stalledAt = { stage: stageIndex, wave: waveNumber };
        stages.push(closeStage(record, game, api));
        break;
      }
      if (game.stage !== stageIndex || game.lost || game.won) {
        stages.push(closeStage(record, game, api));
        record = newStage(game.stage);
      }
      if (tuning.idleSeconds) {
        for (let i = 0; i < tuning.idleSeconds * TICKS_PER_SECOND; i++) game.tick(DT);
      }
    }
    return {
      name: strategy.name,
      note: strategy.note,
      lostAtStage,
      lostAtWave,
      won: game.won,
      stalledAt,
      stagesCleared: game.stage,
      livesEnd: game.lives,
      livesLost: stages.reduce((sum, s) => sum + s.livesLost, 0),
      kills: game.kills,
      stages,
    };
  } finally {
    undo();
  }
}

// Runs every strategy (or the one named) and returns the JSON shaped result.
function runAll(tuning = {}, only = null) {
  const chosen = only ? STRATEGIES.filter((s) => s.name === only) : STRATEGIES;
  return { strategies: chosen.map((s) => runStrategy(s, tuning)) };
}

// ---------------------------------------------------------------------------
// Experiments: one constant change each, so the report can quote a simulated effect.
// ---------------------------------------------------------------------------

// Plot unlock prices, as they were before r2 cut them.
const R1_UNLOCKS = { 1: { unlock: 80 }, 2: { unlock: 160 }, 3: { unlock: 300 } };

const EXPERIMENTS = [
  { name: 'baseline', note: 'The current wave-harvest rules, for comparison.', tuning: {} },
  {
    name: 'r1-hp-1.43',
    note: 'Enemy growth back to the r1 value of 1.43 per stage.',
    tuning: { hpBase: 1.43 },
  },
  {
    name: 'hp-1.50',
    note: 'Enemy growth 1.46 -> 1.50 per stage.',
    tuning: { hpBase: 1.5 },
  },
  {
    name: 'r1-upgrade-step',
    note: 'Upgrade damage step back to the r1 value of 0.75 per level.',
    tuning: { upgradeStep: 0.75 },
  },
  {
    name: 'r1-power-branch',
    note: 'Power branch bonus back to the r1 value of 1.45.',
    tuning: { powerBranch: 1.45 },
  },
  {
    name: 'r1-garden-prices',
    note: 'Plot unlocks back to the r1 prices of 80/160/300.',
    tuning: { materials: R1_UNLOCKS },
  },
  {
    name: 'r1-upgrade-mats',
    note: 'The level 1 to 2 upgrade asks for wood again, as it did in r1.',
    tuning: { r1FirstUpgrade: true },
  },
  {
    name: 'no-rare-mats',
    note: 'Level 2 to 3 upgrades no longer ask for iron or diamond.',
    tuning: { upgradeMaterialScale: { iron: 0, diamond: 0 } },
  },
  {
    name: 'kill-coins-7',
    note: 'Coins per non boss kill 4 -> 7.',
    tuning: { killCoins: 3 },
  },
  {
    name: 'thorn-damage-13',
    note: 'Thorn base damage 10 -> 13.',
    tuning: { towers: { thorn: { damage: 13 } } },
  },
  {
    name: 'ember-damage-12',
    note: 'Ember base damage 9 -> 12, which also makes its burn hotter.',
    tuning: { towers: { ember: { damage: 12 } } },
  },
  {
    name: 'idle-20s',
    note: 'Twenty seconds between waves must not change harvests or balance.',
    tuning: { idleSeconds: 20 },
  },
];

// Runs every experiment over every strategy.
function runExperiments() {
  return EXPERIMENTS.map((experiment) => ({
    name: experiment.name,
    note: experiment.note,
    tuning: experiment.tuning,
    strategies: runAll(experiment.tuning).strategies,
  }));
}

// ---------------------------------------------------------------------------
// Raw numbers. Everything here is measured from the engine, not restated from it.
// ---------------------------------------------------------------------------

// Measures how much of a shot an armored enemy absorbs from a non Sunstone tower.
function measureArmorResist() {
  const game = new Game();
  game.stage = 9;
  game.coins = 1000;
  game.place('thorn', 5, 3);
  game.active = true;
  game.enemies = [{ ...game.enemy('armor'), x: 5, z: 3.5 }];
  const before = game.enemies[0].hp;
  game.tick(DT);
  const dealt = before - game.enemies[0].hp;
  return dealt / game.stats(game.towers[0]).damage;
}

// Reads one wave off the engine: the real enemy list, their real hit points, and the real
// pacing. Waves that release in bursts are measured per group, not per creature.
function measureWave(stage, wave) {
  const game = new Game();
  game.stage = stage;
  game.wave = wave - 1;
  game.start();
  const kinds = game.queue.slice();
  const points = kinds.map((kind) => game.enemy(kind).hp);
  const entry = game.waveEntry(stage, wave);
  const burst = entry.burst || 1;
  return { kinds, points, gap: entry.gap, burst, window: (entry.gap * kinds.length) / burst };
}

// Damage per second of a tower at a given level and branch, using the engine stats method.
function towerDps(type, level, branch) {
  const game = new Game();
  const stat = game.stats({ type, level, branch: level > 1 ? branch : null });
  return stat.damage / stat.rate;
}

// Prints the arithmetic the balance report quotes.
function printNumbers() {
  const resist = measureArmorResist();
  console.log('Armored enemies take this share of a non Sunstone hit:', resist.toFixed(2));
  console.log('\nTower damage per second (engine stats method):');
  console.log('tower   L1      L2 power  L3 power  L3 reach');
  for (const type of ['thorn', 'sap', 'bloom', 'prism', 'ember']) {
    const row = [
      type.padEnd(7),
      towerDps(type, 1).toFixed(1).padEnd(8),
      towerDps(type, 2, 'power').toFixed(1).padEnd(10),
      towerDps(type, 3, 'power').toFixed(1).padEnd(10),
      towerDps(type, 3, 'reach').toFixed(1),
    ];
    console.log(row.join(''));
  }
  console.log('\nWave pressure. effHP counts armor at its real damage cost against a Thorn.');
  console.log('stage wave enemies  rawHP   effHP   gap  burst  window  effHP/s');
  for (const stage of [0, 4, 5, 8, 9]) {
    for (const wave of [1, 3]) {
      const measured = measureWave(stage, wave);
      const raw = measured.points.reduce((sum, hp) => sum + hp, 0);
      const effective = measured.points.reduce(
        (sum, hp, i) => sum + hp / (measured.kinds[i] === 'armor' ? resist : 1),
        0,
      );
      const window = measured.window;
      const row = [
        String(stage + 1).padStart(5),
        String(wave).padStart(5),
        String(measured.kinds.length).padStart(8),
        String(Math.round(raw)).padStart(7),
        String(Math.round(effective)).padStart(8),
        measured.gap.toFixed(2).padStart(5),
        String(measured.burst).padStart(7),
        `${window.toFixed(1)}s`.padStart(8),
        String(Math.round(effective / window)).padStart(9),
      ];
      console.log(row.join(''));
    }
  }
}

// ---------------------------------------------------------------------------
// Output.
// ---------------------------------------------------------------------------

// One line summary of a strategy result.
function verdict(result) {
  if (result.won) return `won, ${result.livesEnd} lives left`;
  if (result.stalledAt)
    return `stalled at stage ${result.stalledAt.stage + 1} wave ${result.stalledAt.wave}`;
  if (result.lostAtStage === null) return 'stopped early';
  return `lost at stage ${result.lostAtStage + 1} wave ${result.lostAtWave}`;
}

// Prints the readable table for humans.
function printTable(results) {
  for (const result of results) {
    console.log(`\n== ${result.name} ==`);
    console.log(result.note);
    console.log(`Result: ${verdict(result)}. Kills ${result.kills}.`);
    console.log(
      'stage  livesLost  livesEnd  coinsEnd  towers  hedges  levels        farms      route',
    );
    for (const stage of result.stages) {
      const columns = [
        String(stage.stage + 1).padStart(5),
        String(stage.livesLost).padStart(10),
        String(stage.livesEnd).padStart(9),
        String(stage.coinsEnd).padStart(9),
        String(stage.towers - stage.hedges).padStart(7),
        String(stage.hedges).padStart(7),
        (stage.towerLevels.join('') || '-').padEnd(13),
        stage.farms.join('').padEnd(10),
        String(stage.routeLength),
      ];
      console.log(columns.join(' '));
    }
  }
}

// Prints the experiment comparison table.
function printExperiments(experiments) {
  const names = STRATEGIES.map((s) => s.name);
  console.log('\n== experiments (how far each strategy gets) ==');
  console.log(['experiment'.padEnd(20), ...names.map((n) => n.padEnd(14))].join(''));
  for (const experiment of experiments) {
    const cells = experiment.strategies.map((r) => {
      const outcome = r.won
        ? 'won'
        : `S${(r.lostAtStage ?? r.stagesCleared) + 1}W${r.lostAtWave ?? '-'}`;
      return `${outcome} -${r.livesLost}`.padEnd(14);
    });
    console.log([experiment.name.padEnd(20), ...cells].join(''));
  }
  console.log('\nS4W2 means it lost during stage 4, wave 2. Stages are numbered 1 to 10.');
  console.log('The -n is total lives lost over the run. Lower is an easier game.');
}

function main() {
  const args = process.argv.slice(2);
  const wantJson = args.includes('--json');
  const wantExperiments = args.includes('--experiments');
  if (args.includes('--numbers')) {
    printNumbers();
    return;
  }
  const only = (args.find((a) => a.startsWith('--strategy=')) || '').split('=')[1] || null;
  const output = runAll({}, only);
  if (wantExperiments) output.experiments = runExperiments();
  if (wantJson) {
    console.log(JSON.stringify(output));
    return;
  }
  printTable(output.strategies);
  if (wantExperiments) printExperiments(output.experiments);
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith('balance-sim.mjs');
if (invokedDirectly) main();

export { runAll, runStrategy, runExperiments, STRATEGIES, EXPERIMENTS, TunedGame };

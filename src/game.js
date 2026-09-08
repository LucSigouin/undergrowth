// Game rules and state for Undergrowth. This file owns the board size, the tower and
// material tables, the stage list, the maze route search, and the Game class that holds
// every number a save file needs. It is plain JavaScript with no browser calls and no
// randomness, so the same inputs always give the same outputs. Rendering lives in
// world.js and the interface lives in main.js.

// Board size in squares, plus the two fixed openings enemies walk between.
export const W = 13,
  H = 9,
  ENTRY = { x: 0, z: 4 },
  EXIT = { x: 12, z: 4 };

// How fast enemy hit points grow per stage. Raised from 1.43 in r2.
export const HP_GROWTH = 1.46;

// The seven buildable pieces, with their price, combat numbers, and help text.
export const TOWERS = {
  thorn: {
    name: 'Ballista',
    cost: 35,
    damage: 10,
    range: 3.2,
    rate: 0.65,
    color: '#d8b773',
    desc: 'Fast bolts at one enemy.',
    effect: 'Fires an iron bolt at one enemy at a time. Can hit marching and flying enemies.',
    tip: 'A good first engine. Raise it beside a long stretch of your maze.',
    symbol: '↗',
  },
  sap: {
    name: 'Tar pit',
    cost: 50,
    damage: 3,
    range: 2.6,
    rate: 0.9,
    color: '#81bdb0',
    desc: 'Sticky tar slows the horde so other engines get more shots.',
    effect: 'Each hit slows an enemy by 52% for 2.2 seconds and deals a little damage.',
    tip: 'Pair it with a Ballista or a Mage spire to hold the horde in range longer.',
    symbol: '◉',
  },
  bloom: {
    name: 'Catapult',
    cost: 75,
    damage: 16,
    range: 3.1,
    rate: 1.7,
    color: '#da9985',
    desc: 'Baskets of stone break over a group of enemies.',
    effect: 'Each shot damages the target and enemies within 1.35 squares of it.',
    tip: 'Set it at a bend where the horde bunches together.',
    symbol: '✳',
  },
  prism: {
    name: 'Mage spire',
    cost: 100,
    damage: 27,
    range: 4.3,
    rate: 1.15,
    color: '#b4a5d3',
    desc: 'Long arcane bolts that pierce armor.',
    effect: 'Deals full damage to armored enemies. Has the longest base range of any engine.',
    tip: 'Use it on iron knights and warlords, or to cover flying enemies.',
    symbol: '◇',
  },
  hedge: {
    name: 'Palisade',
    cost: 8,
    damage: 0,
    range: 0,
    rate: 1,
    color: '#86a76c',
    desc: 'A cheap maze wall of timber stakes. Does not attack.',
    effect:
      'Blocks a square to redirect marching enemies. Flying enemies pass over it. No upgrades.',
    tip: 'Build longer routes past your engines, while leaving a way through.',
    symbol: '▦',
  },
  ember: {
    name: 'Brazier',
    cost: 80,
    damage: 9,
    range: 2.9,
    rate: 1.2,
    color: '#e2a05c',
    desc: 'Sets the horde alight. Burning ignores armor.',
    effect:
      'Each hit adds 5 seconds of burning. Burning damage ignores armor and paladin shields,' +
      ' and it keeps working after the enemy leaves range.',
    tip: 'The answer to paladins and to heavy plate. One Brazier covers a whole bend.',
    symbol: '❋',
  },
  lantern: {
    name: 'War banner',
    cost: 90,
    damage: 0,
    range: 2.5,
    rate: 1,
    color: '#f2d884',
    desc: 'Does not attack. It rallies nearby engines to fire faster.',
    effect:
      'Attacking engines inside its ring fire 30 percent faster, 40 at level 2 and 50 at level 3.' +
      ' The War banner never shoots by itself.',
    tip: 'Plant it in the middle of a tight cluster of engines, not out on its own.',
    symbol: '✦',
  },
};

// Enemy kinds: base hit points at stage 1, walking speed, coins paid, and special rules.
export const ENEMIES = {
  grub: { name: 'Goblin', hp: 24, speed: 1.05, reward: 4 },
  runner: { name: 'Wolf rider', hp: 18, speed: 1.85, reward: 4 },
  armor: { name: 'Iron knight', hp: 52, speed: 0.76, reward: 4 },
  moth: { name: 'Gargoyle', hp: 30, speed: 1.05, reward: 5, flying: true },
  brood: { name: 'War wagon', hp: 88, speed: 0.7, reward: 7, splits: 3 },
  grubling: { name: 'Whelp', hp: 9, speed: 1.35, reward: 1 },
  warden: {
    name: 'Paladin',
    hp: 104,
    speed: 0.82,
    reward: 8,
    steady: true,
    shield: 0.35,
    aura: 2.1,
  },
  boss: { name: 'Warlord', hp: 400, speed: 0.55, reward: 55 },
};

// How much of a hit an armored knight absorbs from anything that is not a Mage spire bolt.
export const ARMOR_RESIST = 0.55;

// The four garden plots in unlock order, with their prices and base harvest per completed wave.
export const MATERIALS = [
  { id: 'wood', name: 'Wood', buy: 25, unlock: 0, upgrade: 35, yield: 3, symbol: '♧' },
  { id: 'rock', name: 'Rock', buy: 45, unlock: 60, upgrade: 55, yield: 3, symbol: '⬟' },
  { id: 'iron', name: 'Iron', buy: 70, unlock: 110, upgrade: 80, yield: 2, symbol: '▰' },
  { id: 'diamond', name: 'Diamond', buy: 100, unlock: 180, upgrade: 120, yield: 1, symbol: '◇' },
];

// The ten stages, each as a title, a line of flavour text, and a short theme label.
export const STAGES = [
  ['First horns', 'A few scouts at the gate. A longer route means more shots.', 'Goblins'],
  ['Drums in the hills', 'Wolf riders arrive. A longer maze buys precious time.', 'Wolf riders'],
  ['Iron season', 'Knights in heavy plate. The Mage spire pierces armor.', 'Armor'],
  ['Wings over the wall', 'Gargoyles fly over your maze. Cover the direct route.', 'Flying'],
  ['The long dusk', 'War wagons break open into whelps. The Catapult answers a crowd.', 'Swarms'],
  ['The old warlord', 'An orc warlord leads the final charge.', 'Boss'],
  [
    'Holy orders',
    'Paladins ignore tar and shield their neighbours. The Brazier burns through.',
    'Mixed',
  ],
  ['Night assault', 'Gargoyles fill the sky. Keep the straight line covered.', 'Air raid'],
  ['The black tide', 'Dense, relentless waves, and a warlord at the end.', 'Surge'],
  ['Fall of the keep', 'One last stand. Two warlords march with the horde.', 'Finale'],
];

// The thirty waves, hand written, three per stage in stage order. Each wave lists the
// creatures in the order they walk out, the seconds between releases, and how many are
// released at once. The stage text above says what each stage sends, so keep them together.
export const WAVES = [
  // Stage 1, First roots. Grubs only, slow enough to read the route.
  { enemies: [['grub', 6]], gap: 1.05 },
  { enemies: [['grub', 9]], gap: 0.95 },
  { enemies: [['grub', 12]], gap: 0.85 },
  // Stage 2, A stirring below. Runners mixed into the grubs.
  {
    enemies: [
      ['grub', 8],
      ['runner', 3],
    ],
    gap: 0.95,
  },
  {
    enemies: [
      ['runner', 6],
      ['grub', 6],
    ],
    gap: 0.9,
  },
  {
    enemies: [
      ['grub', 6],
      ['runner', 5],
      ['grub', 6],
    ],
    gap: 0.85,
  },
  // Stage 3, Shell season. Armored beetles arrive.
  {
    enemies: [
      ['grub', 6],
      ['armor', 3],
    ],
    gap: 0.9,
  },
  {
    enemies: [
      ['armor', 5],
      ['grub', 6],
      ['runner', 3],
    ],
    gap: 0.85,
  },
  {
    enemies: [
      ['grub', 5],
      ['armor', 6],
      ['runner', 4],
    ],
    gap: 0.8,
  },
  // Stage 4, On the breeze. Moths fly straight over the maze, so the direct line matters.
  {
    enemies: [
      ['moth', 7],
      ['grub', 6],
    ],
    gap: 0.85,
  },
  {
    enemies: [
      ['grub', 5],
      ['moth', 9],
      ['runner', 4],
    ],
    gap: 0.8,
  },
  {
    enemies: [
      ['moth', 12],
      ['armor', 4],
      ['grub', 5],
    ],
    gap: 0.75,
  },
  // Stage 5, The long evening. Brood sacs, and the first waves that come in pairs.
  {
    enemies: [
      ['grub', 10],
      ['brood', 2],
    ],
    gap: 0.9,
    burst: 2,
  },
  {
    enemies: [
      ['brood', 3],
      ['runner', 6],
      ['moth', 5],
    ],
    gap: 0.9,
    burst: 2,
  },
  {
    enemies: [
      ['brood', 4],
      ['grub', 10],
      ['moth', 6],
    ],
    gap: 0.85,
    burst: 2,
  },
  // Stage 6, Old growth. One guardian closes the stage.
  {
    enemies: [
      ['armor', 6],
      ['moth', 5],
      ['grub', 6],
    ],
    gap: 0.75,
  },
  {
    enemies: [
      ['runner', 8],
      ['armor', 5],
      ['moth', 6],
    ],
    gap: 0.7,
  },
  {
    enemies: [
      ['grub', 8],
      ['armor', 5],
      ['brood', 3],
      ['boss', 1],
    ],
    gap: 0.7,
  },
  // Stage 7, Restless soil. Wardens shield whatever walks beside them.
  {
    enemies: [
      ['warden', 2],
      ['armor', 5],
      ['runner', 6],
    ],
    gap: 0.75,
  },
  {
    enemies: [
      ['warden', 3],
      ['moth', 6],
      ['armor', 5],
    ],
    gap: 0.7,
  },
  {
    enemies: [
      ['warden', 3],
      ['runner', 8],
      ['brood', 3],
      ['moth', 5],
    ],
    gap: 0.7,
  },
  // Stage 8, Night garden. The sky raid, released two at a time.
  {
    enemies: [
      ['moth', 10],
      ['grub', 8],
    ],
    gap: 0.7,
    burst: 2,
  },
  {
    enemies: [
      ['moth', 12],
      ['warden', 3],
      ['runner', 8],
    ],
    gap: 0.65,
    burst: 2,
  },
  {
    enemies: [
      ['moth', 16],
      ['armor', 8],
      ['brood', 4],
    ],
    gap: 0.55,
    burst: 2,
  },
  // Stage 9, The wild tide. Everything at once, and a guardian at the end.
  {
    enemies: [
      ['grub', 12],
      ['runner', 9],
      ['brood', 3],
    ],
    gap: 0.65,
    burst: 2,
  },
  {
    enemies: [
      ['armor', 9],
      ['warden', 3],
      ['moth', 12],
      ['grub', 9],
    ],
    gap: 0.55,
    burst: 2,
  },
  {
    enemies: [
      ['brood', 4],
      ['runner', 10],
      ['armor', 8],
      ['moth', 7],
      ['boss', 1],
    ],
    gap: 0.6,
    burst: 2,
  },
  // Stage 10, Heart of the wild. Two guardians walk in with the last wave.
  {
    enemies: [
      ['warden', 2],
      ['armor', 5],
      ['grub', 7],
      ['moth', 5],
    ],
    gap: 0.85,
    burst: 2,
  },
  {
    enemies: [
      ['brood', 2],
      ['runner', 7],
      ['moth', 6],
      ['warden', 2],
    ],
    gap: 0.8,
    burst: 2,
  },
  {
    enemies: [
      ['armor', 4],
      ['warden', 2],
      ['brood', 2],
      ['moth', 4],
      ['runner', 4],
      ['boss', 2],
    ],
    gap: 0.75,
    burst: 2,
  },
];

// Shortest walking route from a square to the exit, or null when the maze is sealed.
export function path(towers, start = ENTRY) {
  const blocked = new Set(towers.map((tower) => `${tower.x},${tower.z}`)),
    keyOf = (cell) => `${cell.x},${cell.z}`;
  if (blocked.has(keyOf(start))) return null;
  // Breadth first search. cameFrom doubles as the visited set.
  const queue = [start],
    cameFrom = new Map([[keyOf(start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    if (cell.x === EXIT.x && cell.z === EXIT.z) {
      const route = [];
      let key = keyOf(cell);
      while (key) {
        const [x, z] = key.split(',').map(Number);
        route.unshift({ x, z });
        key = cameFrom.get(key);
      }
      return route;
    }
    for (const [dx, dz] of [
      [1, 0],
      [0, 1],
      [0, -1],
      [-1, 0],
    ]) {
      const next = { x: cell.x + dx, z: cell.z + dz },
        nextKey = keyOf(next);
      const offBoard = next.x < 0 || next.x >= W || next.z < 0 || next.z >= H;
      if (offBoard || blocked.has(nextKey) || cameFrom.has(nextKey)) continue;
      cameFrom.set(nextKey, keyOf(cell));
      queue.push(next);
    }
  }
  return null;
}

// One expedition: coins, materials, towers, garden plots, enemies, and campaign progress.
export class Game {
  // Start a fresh settlement, or restore an older expedition without its retired abilities.
  constructor(data) {
    // Migrate the old garden without discarding an existing expedition.
    if (data?.version === 1) {
      const refund = (data.farms || []).reduce(
        (total, farm) => total + (farm ? 45 + 30 * farm.level * (farm.level - 1) : 0),
        0,
      );
      data = {
        ...data,
        version: 2,
        wood: data.leaves || 0,
        rock: data.ore || 0,
        iron: 0,
        diamond: 0,
        unlockedPlots: 1,
        farms: [null, null, null, null],
        coins: data.coins + refund,
      };
      delete data.leaves;
      delete data.ore;
    }
    const defaults = {
      version: 5,
      coins: 200,
      wood: 0,
      rock: 0,
      iron: 0,
      diamond: 0,
      lives: 20,
      stage: 0,
      wave: 0,
      towers: [],
      enemies: [],
      unlockedPlots: 1,
      farms: [null, null, null, null],
      active: false,
      waveHarvest: [0, 0, 0, 0],
      queue: [],
      spawn: 0,
      nextId: 1,
      kills: 0,
      won: false,
      lost: false,
      time: 0,
    };
    Object.assign(this, defaults, data);
    this.version = 5;
    // Keep old settlements and live waves, but discard retired ability state.
    delete this.cooldowns;
    delete this.root;
    // Lanterns have one growth path. Preserve old purchases while giving former
    // power-branch Lanterns the coverage their zero-damage branch was missing.
    this.towers = this.towers.map((tower) =>
      tower.type === 'lantern' && tower.level > 1 ? { ...tower, branch: 'reach' } : tower,
    );
    // Older live saves have no start-of-wave snapshot; use their saved farm levels once.
    this.farms = this.farms.map((plot) => (plot ? { type: plot.type, level: plot.level } : null));
    if (data && data.version < 5 && this.active) {
      this.waveHarvest = MATERIALS.map(
        (material, i) => material.yield * (this.farms[i]?.level || 0),
      );
    }
    this.events = [];
  }

  // Queue a note for the renderer, such as a shot, a kill, or the end of a wave.
  emit(type, data = {}) {
    this.events.push({ type, ...data });
  }

  // Try to build a tower on a square. Returns null on success or a message explaining the refusal.
  place(type, x, z) {
    if (this.lost || this.won) return 'This siege has ended.';
    const offBoard = x < 0 || x >= W || z < 0 || z >= H;
    if (!TOWERS[type] || !Number.isInteger(x) || !Number.isInteger(z) || offBoard) {
      return 'Choose a square in the bailey.';
    }
    if ((x === 0 || x === 12) && z === 4) return 'Keep the entrance and the keep gate open.';
    if (this.towers.some((tower) => tower.x === x && tower.z === z)) {
      return 'Select this engine to work on it.';
    }
    if (this.coins < TOWERS[type].cost) return 'You need more coins.';
    const squareInUse = this.enemies.some(
      (enemy) =>
        !enemy.flying &&
        ((Math.round(enemy.x) === x && Math.round(enemy.z) === z) ||
          (enemy.target?.x === x && enemy.target?.z === z)),
    );
    if (squareInUse) return 'A creature is holding that square.';
    const tower = {
      id: this.nextId++,
      type,
      x,
      z,
      level: 1,
      branch: null,
      cool: 0,
      spent: TOWERS[type].cost,
    };
    // Check the new wall against the entrance route and against every walking enemy.
    const trial = [...this.towers, tower];
    const trapsSomeone = this.enemies.some(
      (enemy) =>
        !enemy.flying &&
        !path(trial, enemy.target || { x: Math.round(enemy.x), z: Math.round(enemy.z) }),
    );
    if (!path(trial) || trapsSomeone) return 'Leave a path through your maze.';
    this.coins -= tower.spent;
    this.towers.push(tower);
    this.emit('build', { id: tower.id });
    return null;
  }

  // Damage, range, and seconds between shots for a tower at its current level and branch.
  stats(tower) {
    const base = TOWERS[tower.type];
    return {
      damage: base.damage * (1 + (tower.level - 1) * 1.0) * (tower.branch === 'power' ? 1.55 : 1),
      range: base.range + (tower.level - 1) * 0.25 + (tower.branch === 'reach' ? 1.1 : 0),
      rate: base.rate / (1 + (tower.level - 1) * 0.12),
    };
  }

  // Coins and materials the next upgrade of this tower would cost.
  // The level 1 to 2 step is coins only, so a player who has not found the garden can still grow.
  upgradeCost(tower) {
    const advanced = tower.level >= 2;
    return {
      coins: Math.round(TOWERS[tower.type].cost * 0.7 * tower.level),
      wood: advanced ? 5 * tower.level : 0,
      rock: advanced ? 4 : 0,
      iron: advanced && ['bloom', 'prism', 'ember'].includes(tower.type) ? 3 : 0,
      diamond: advanced && tower.type === 'prism' ? 1 : 0,
    };
  }

  // What the player is short of for the next upgrade, so the panel can name the missing material.
  upgradeShortfall(tower) {
    const cost = this.upgradeCost(tower);
    const names = { coins: 'coins', ...Object.fromEntries(MATERIALS.map((m) => [m.id, m.name])) };
    return Object.entries(cost)
      .filter(([resource, amount]) => amount > 0 && this[resource] < amount)
      .map(([resource, amount]) => ({
        id: resource,
        name: names[resource],
        need: amount,
        have: Math.floor(this[resource]),
        short: Math.ceil(amount - this[resource]),
      }));
  }

  // How much faster a tower fires because of the Lanterns whose rings cover it.
  rateBonus(tower) {
    if (tower.type === 'hedge' || tower.type === 'lantern') return 1;
    let bonus = 0;
    for (const lamp of this.towers) {
      if (lamp.type !== 'lantern' || lamp.id === tower.id) continue;
      const reach = this.stats(lamp).range;
      if (Math.hypot(lamp.x - tower.x, lamp.z - tower.z) > reach) continue;
      bonus += 0.2 + lamp.level * 0.1;
    }
    return 1 + Math.min(0.9, bonus);
  }

  // Grow a tower one level, picking a power or reach branch the first time. Returns null on success.
  upgrade(id, branch = 'power') {
    const tower = this.towers.find((candidate) => candidate.id === id);
    if (!tower || tower.type === 'hedge' || tower.level >= 3) return 'This engine is fully built.';
    const cost = this.upgradeCost(tower);
    if (Object.entries(cost).some(([resource, amount]) => this[resource] < amount)) {
      return 'You need more coin or materials for this upgrade.';
    }
    for (const [resource, amount] of Object.entries(cost)) this[resource] -= amount;
    tower.spent += cost.coins;
    tower.level++;
    if (tower.level === 2) {
      tower.branch = tower.type === 'lantern' || branch === 'reach' ? 'reach' : 'power';
    }
    this.emit('build', { id });
    return null;
  }

  // Remove a tower and refund all coins spent on its purchase and upgrades.
  sell(id) {
    const tower = this.towers.find((candidate) => candidate.id === id);
    if (!tower) return;
    this.coins += tower.spent;
    this.towers = this.towers.filter((candidate) => candidate.id !== id);
  }

  // Pay to make the next garden plot available. Plots unlock in order. Returns null on success.
  unlockPlot(index) {
    if (this.lost || this.won) return 'This siege has ended.';
    if (!Number.isInteger(index) || index < 1 || index >= MATERIALS.length) return 'Unknown works.';
    if (index < this.unlockedPlots) return 'This works is already unlocked.';
    if (index !== this.unlockedPlots || !this.farms[index - 1]) {
      return 'Buy the previous works first.';
    }
    const cost = MATERIALS[index].unlock;
    if (this.coins < cost) return 'You need more coins.';
    this.coins -= cost;
    this.unlockedPlots++;
    return null;
  }

  // Coins needed to buy this plot, or to raise it to its next level.
  farmCost(index) {
    const plot = this.farms[index],
      material = MATERIALS[index];
    return plot ? material.upgrade * plot.level : material.buy;
  }

  // Buy a garden plot or raise its level. Returns null on success.
  farm(index) {
    if (this.lost || this.won) return 'This siege has ended.';
    if (!Number.isInteger(index) || index < 0 || index >= MATERIALS.length) return 'Unknown works.';
    if (index >= this.unlockedPlots) return 'Unlock this works first.';
    const plot = this.farms[index];
    if (plot?.level >= 3) return 'This works is fully upgraded.';
    const cost = this.farmCost(index);
    if (this.coins < cost) return 'You need more coins.';
    this.coins -= cost;
    if (plot) plot.level++;
    else this.farms[index] = { type: MATERIALS[index].id, level: 1 };
    return null;
  }

  // The hand written wave entry for a stage and a wave number, or null past the campaign.
  waveEntry(stage = this.stage, wave = this.wave) {
    return WAVES[stage * 3 + (wave - 1)] || null;
  }

  // The creature list of a wave, flattened into the order they walk out of the gate.
  waveQueue(stage = this.stage, wave = this.wave) {
    const entry = this.waveEntry(stage, wave);
    if (!entry) return [];
    const list = [];
    for (const [kind, count] of entry.enemies) for (let i = 0; i < count; i++) list.push(kind);
    return list;
  }

  // How many creatures the next wave sends, for the counter in the interface.
  waveSize(stage = this.stage, wave = this.wave) {
    return this.waveQueue(stage, wave).length;
  }

  // Begin the next wave and fill the spawn queue. Returns false when a wave is already running.
  start() {
    if (this.active || this.won || this.lost) return false;
    this.waveHarvest = MATERIALS.map((material, i) => material.yield * (this.farms[i]?.level || 0));
    this.active = true;
    this.wave++;
    this.spawn = 0;
    this.queue.push(...this.waveQueue());
    return true;
  }

  // Build one enemy of the given kind, scaled up by the current stage and wave.
  enemy(kind) {
    const stage = this.stage,
      scale = Math.pow(HP_GROWTH, stage) * (1 + 0.13 * (this.wave - 1));
    const base = ENEMIES[kind] || ENEMIES.grub;
    const hp = base.hp * scale;
    return {
      id: this.nextId++,
      kind,
      x: 0,
      z: 4,
      hp,
      maxHp: hp,
      speed: base.speed * (1 + stage * 0.025),
      flying: !!base.flying,
      slow: 0,
      burn: 0,
      burnTime: 0,
      target: null,
    };
  }

  // How much a tower hit is reduced by nearby Wardens. Burning bypasses this shield.
  shieldFactor(enemy) {
    for (const other of this.enemies) {
      const aura = ENEMIES[other.kind]?.aura;
      if (!aura || other === enemy || other.hp <= 0) continue;
      if (Math.hypot(other.x - enemy.x, other.z - enemy.z) <= aura) {
        return 1 - ENEMIES[other.kind].shield;
      }
    }
    return 1;
  }

  // Advance the whole game by dt seconds: gardens, spawns, movement, shooting, and wave endings.
  tick(dt) {
    if (this.lost || this.won) return;
    this.time += dt;
    if (!this.active) return;

    // Release the next group of queued enemies once this wave's spawn timer runs out.
    this.spawn -= dt;
    if (this.queue.length && this.spawn <= 0) {
      const entry = this.waveEntry() || { gap: 0.8, burst: 1 };
      for (let i = 0; i < (entry.burst || 1) && this.queue.length; i++) {
        this.enemies.push(this.enemy(this.queue.shift()));
      }
      this.spawn = entry.gap;
    }

    // Burning keeps working wherever the enemy is, and it ignores armor and warden shields.
    for (const enemy of this.enemies) {
      if (enemy.burnTime > 0) {
        enemy.burnTime = Math.max(0, enemy.burnTime - dt);
        enemy.hp -= enemy.burn * dt;
      }
    }

    // Walk every enemy along the route, spending its movement budget square by square.
    for (const enemy of this.enemies) {
      // Burning can kill before movement. Leave these enemies in place
      // for the payout/splitting pass; a dead enemy must never reach the escape check.
      if (enemy.hp <= 0) continue;
      enemy.slow = Math.max(0, enemy.slow - dt);
      let move = dt * enemy.speed * (enemy.slow > 0 ? 0.48 : 1);
      while (move > 0) {
        if (!enemy.target) {
          if (enemy.x >= 12 && Math.abs(enemy.z - 4) < 0.01) {
            enemy.escaped = true;
            this.lives -= enemy.kind === 'boss' ? 5 : 1;
            this.emit('leak');
            break;
          }
          const here = { x: Math.round(enemy.x), z: Math.round(enemy.z) };
          enemy.target = enemy.flying ? { ...EXIT } : path(this.towers, here)?.[1];
          if (!enemy.target) break;
        }
        const dx = enemy.target.x - enemy.x,
          dz = enemy.target.z - enemy.z,
          distance = Math.hypot(dx, dz);
        if (distance <= move) {
          enemy.x = enemy.target.x;
          enemy.z = enemy.target.z;
          enemy.target = null;
          move -= distance;
        } else {
          enemy.x += (dx / distance) * move;
          enemy.z += (dz / distance) * move;
          move = 0;
        }
      }
    }
    this.enemies = this.enemies.filter((enemy) => !enemy.escaped);

    // Build one reverse distance field only if a tower needs to choose a target.
    // Distances follow the maze; flyers still use their direct route. An enemy
    // between squares must finish its current movement segment before rerouting.
    let distances;
    const remaining = new Map();
    const distanceToExit = (enemy) => {
      if (remaining.has(enemy)) return remaining.get(enemy);
      let distance;
      if (enemy.flying) {
        distance = Math.hypot(EXIT.x - enemy.x, EXIT.z - enemy.z);
      } else {
        if (!distances) {
          distances = new Map([[`${EXIT.x},${EXIT.z}`, 0]]);
          const blocked = new Set(this.towers.map((tower) => `${tower.x},${tower.z}`));
          const queue = [EXIT];
          for (let i = 0; i < queue.length; i++) {
            const cell = queue[i];
            for (const [dx, dz] of [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ]) {
              const x = cell.x + dx,
                z = cell.z + dz,
                key = `${x},${z}`;
              if (x < 0 || x >= W || z < 0 || z >= H || blocked.has(key) || distances.has(key))
                continue;
              distances.set(key, distances.get(`${cell.x},${cell.z}`) + 1);
              queue.push({ x, z });
            }
          }
        }
        const next = enemy.target || { x: Math.round(enemy.x), z: Math.round(enemy.z) };
        distance =
          Math.hypot(next.x - enemy.x, next.z - enemy.z) +
          (distances.get(`${next.x},${next.z}`) ?? Infinity);
      }
      remaining.set(enemy, distance);
      return distance;
    };

    // Every ready tower shoots the enemy with the shortest remaining route in range.
    for (const tower of this.towers) {
      if (tower.type === 'hedge' || tower.type === 'lantern') continue;
      tower.cool -= dt;
      if (tower.cool > 0) continue;
      const stats = this.stats(tower);
      const inRange = this.enemies.filter(
        (enemy) => enemy.hp > 0 && Math.hypot(enemy.x - tower.x, enemy.z - tower.z) <= stats.range,
      );
      const target = inRange.sort((a, b) => distanceToExit(a) - distanceToExit(b))[0];
      if (!target) continue;
      tower.cool = stats.rate / this.rateBonus(tower);
      this.emit('shot', { tower: tower.id, x: target.x, z: target.z, towerType: tower.type });
      // The Catapult splashes onto everything near the target. Others hit one enemy.
      const hits =
        tower.type === 'bloom'
          ? this.enemies.filter(
              (enemy) => Math.hypot(enemy.x - target.x, enemy.z - target.z) < 1.35,
            )
          : [target];
      for (const hit of hits) {
        const armored = hit.kind === 'armor' && tower.type !== 'prism';
        hit.hp -= stats.damage * (armored ? ARMOR_RESIST : 1) * this.shieldFactor(hit);
        if (tower.type === 'sap' && !ENEMIES[hit.kind]?.steady) hit.slow = 2.2;
        // The Brazier leaves a burn that outlives the shot and ignores plate and shields.
        if (tower.type === 'ember') {
          hit.burn = Math.max(hit.burn || 0, stats.damage * 1.4);
          hit.burnTime = 5;
        }
      }
    }

    // Pay out the dead, split any brood sac into its litter, then clear them from the board.
    const litter = [];
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) {
        this.coins += ENEMIES[enemy.kind]?.reward ?? 4;
        this.kills++;
        this.emit('kill', { x: enemy.x, z: enemy.z, kind: enemy.kind });
        for (let i = 0; i < (ENEMIES[enemy.kind]?.splits || 0); i++) {
          litter.push({ ...this.enemy('grubling'), x: enemy.x, z: enemy.z });
        }
      }
    }
    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);
    this.enemies.push(...litter);

    if (this.lives <= 0) {
      this.lives = 0;
      this.waveHarvest = [0, 0, 0, 0];
      this.lost = true;
      this.active = false;
      this.emit('lost');
      return;
    }

    // The wave ends once nothing is queued and nothing is left alive on the board.
    if (!this.queue.length && !this.enemies.length) {
      this.active = false;
      MATERIALS.forEach((material, i) => {
        this[material.id] += this.waveHarvest[i];
      });
      this.waveHarvest = [0, 0, 0, 0];
      this.coins += 18 + this.stage * 4;
      this.emit('wave');
      if (this.wave === 3) {
        this.coins += 45 + this.stage * 10;
        this.lives = Math.min(20, this.lives + 2);
        this.stage++;
        this.wave = 0;
        if (this.stage === 10) {
          this.won = true;
          this.emit('won');
        } else {
          this.emit('stage');
        }
      }
    }
  }

  // The whole save file as JSON. Pending events are left out because they are not state.
  serialize() {
    const { events, ...data } = this;
    return JSON.stringify(data);
  }
}

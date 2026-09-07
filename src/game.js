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

// The five buildable pieces, with their price, combat numbers, and help text.
export const TOWERS = {
  thorn: {
    name: 'Thorn',
    cost: 35,
    damage: 10,
    range: 3.2,
    rate: 0.65,
    color: '#d8b773',
    desc: 'Fast shots at one enemy.',
    effect: 'Fires a needle at one enemy at a time. Can hit ground and flying enemies.',
    tip: 'A good first tower. Place it beside a long stretch of your maze.',
    symbol: '↗',
  },
  sap: {
    name: 'Sap well',
    cost: 50,
    damage: 3,
    range: 2.6,
    rate: 0.9,
    color: '#81bdb0',
    desc: 'Slows enemies so other towers get more shots.',
    effect: 'Each hit slows an enemy by 52% for 2.2 seconds and deals a little damage.',
    tip: 'Pair it with Thorn or Sunstone to keep enemies in range longer.',
    symbol: '◉',
  },
  bloom: {
    name: 'Bloom',
    cost: 75,
    damage: 16,
    range: 3.1,
    rate: 1.7,
    color: '#da9985',
    desc: 'Pollen bursts damage groups of enemies.',
    effect: 'Each burst damages the target and enemies within 1.35 squares of it.',
    tip: 'Place it at a bend where enemies bunch together.',
    symbol: '✳',
  },
  prism: {
    name: 'Sunstone',
    cost: 100,
    damage: 27,
    range: 4.3,
    rate: 1.15,
    color: '#b4a5d3',
    desc: 'Long-range shots that ignore armor.',
    effect: 'Deals full damage to armored enemies. Has the longest base range of any tower.',
    tip: 'Use it against beetles and bosses, or to cover flying enemies.',
    symbol: '◇',
  },
  hedge: {
    name: 'Hedge',
    cost: 8,
    damage: 0,
    range: 0,
    rate: 1,
    color: '#86a76c',
    desc: 'A cheap maze wall. Does not attack.',
    effect:
      'Blocks a square to redirect ground enemies. Flying enemies pass over it. Cannot be upgraded.',
    tip: 'Build longer routes past your towers, while leaving an exit open.',
    symbol: '▦',
  },
};

// The four garden plots in unlock order, with their prices and output per collection.
export const MATERIALS = [
  { id: 'wood', name: 'Wood', buy: 25, unlock: 0, upgrade: 35, yield: 3, symbol: '♧' },
  { id: 'rock', name: 'Rock', buy: 45, unlock: 80, upgrade: 55, yield: 3, symbol: '⬟' },
  { id: 'iron', name: 'Iron', buy: 70, unlock: 160, upgrade: 80, yield: 2, symbol: '▰' },
  { id: 'diamond', name: 'Diamond', buy: 100, unlock: 300, upgrade: 120, yield: 1, symbol: '◇' },
];

// The ten stages, each as a title, a line of flavour text, and a short theme label.
export const STAGES = [
  ['First roots', 'A few curious visitors. Give them the scenic route.', 'Grubs'],
  ['A stirring below', 'Runners arrive. A longer maze buys precious time.', 'Runners'],
  ['Shell season', 'Armored beetles. Sunstone cuts through their shells.', 'Armor'],
  ['On the breeze', 'Moths fly over your maze. Cover the direct route.', 'Flying'],
  ['The long evening', 'Larger groups. Bloom towers thrive in a crowd.', 'Swarms'],
  ['Old growth', 'An ancient guardian leads the final wave.', 'Boss'],
  ['Restless soil', 'Quick feet and thick shells arrive together.', 'Mixed'],
  ['Night garden', 'More moths take to the sky. Keep the heart covered.', 'Air raid'],
  ['The wild tide', 'Dense, relentless waves test your entire garden.', 'Surge'],
  ['Heart of the wild', 'One last stand. Protect the home you have grown.', 'Finale'],
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
  // Start a fresh settlement, or restore one from a saved object, migrating version 1 saves.
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
      version: 2,
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
      queue: [],
      spawn: 0,
      nextId: 1,
      kills: 0,
      won: false,
      lost: false,
      time: 0,
    };
    Object.assign(this, defaults, data);
    this.events = [];
  }

  // Queue a note for the renderer, such as a shot, a kill, or the end of a wave.
  emit(type, data = {}) {
    this.events.push({ type, ...data });
  }

  // Try to build a tower on a square. Returns null on success or a message explaining the refusal.
  place(type, x, z) {
    if (this.lost || this.won) return 'This expedition has ended.';
    const offBoard = x < 0 || x >= W || z < 0 || z >= H;
    if (!TOWERS[type] || !Number.isInteger(x) || !Number.isInteger(z) || offBoard) {
      return 'Choose a square on the meadow.';
    }
    if ((x === 0 || x === 12) && z === 4) return 'Keep the entrance and garden gate open.';
    if (this.towers.some((tower) => tower.x === x && tower.z === z)) {
      return 'Select this tower to tend it.';
    }
    if (this.coins < TOWERS[type].cost) return 'You need more coins.';
    const squareInUse = this.enemies.some(
      (enemy) =>
        !enemy.flying &&
        ((Math.round(enemy.x) === x && Math.round(enemy.z) === z) ||
          (enemy.target?.x === x && enemy.target?.z === z)),
    );
    if (squareInUse) return 'A creature is using that square.';
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
      damage: base.damage * (1 + (tower.level - 1) * 0.75) * (tower.branch === 'power' ? 1.45 : 1),
      range: base.range + (tower.level - 1) * 0.25 + (tower.branch === 'reach' ? 1.1 : 0),
      rate: base.rate / (1 + (tower.level - 1) * 0.12),
    };
  }

  // Coins and materials the next upgrade of this tower would cost.
  upgradeCost(tower) {
    const advanced = tower.level >= 2;
    return {
      coins: Math.round(TOWERS[tower.type].cost * 0.7 * tower.level),
      wood: 5 * tower.level,
      rock: advanced ? 4 : 0,
      iron: advanced && ['bloom', 'prism'].includes(tower.type) ? 3 : 0,
      diamond: advanced && tower.type === 'prism' ? 1 : 0,
    };
  }

  // Grow a tower one level, picking a power or reach branch the first time. Returns null on success.
  upgrade(id, branch = 'power') {
    const tower = this.towers.find((candidate) => candidate.id === id);
    if (!tower || tower.type === 'hedge' || tower.level >= 3) return 'This piece is fully grown.';
    const cost = this.upgradeCost(tower);
    if (Object.entries(cost).some(([resource, amount]) => this[resource] < amount)) {
      return 'You need more money or materials for this upgrade.';
    }
    for (const [resource, amount] of Object.entries(cost)) this[resource] -= amount;
    tower.spent += cost.coins;
    tower.level++;
    if (tower.level === 2) tower.branch = branch === 'reach' ? 'reach' : 'power';
    this.emit('build', { id });
    return null;
  }

  // Remove a tower and return 70 percent of everything spent on it.
  sell(id) {
    const tower = this.towers.find((candidate) => candidate.id === id);
    if (!tower) return;
    this.coins += Math.floor(tower.spent * 0.7);
    this.towers = this.towers.filter((candidate) => candidate.id !== id);
  }

  // Pay to make the next garden plot available. Plots unlock in order. Returns null on success.
  unlockPlot(index) {
    if (this.lost || this.won) return 'This expedition has ended.';
    if (!Number.isInteger(index) || index < 1 || index >= MATERIALS.length) return 'Unknown plot.';
    if (index < this.unlockedPlots) return 'This plot is already unlocked.';
    if (index !== this.unlockedPlots || !this.farms[index - 1]) {
      return 'Buy the previous resource first.';
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
    if (this.lost || this.won) return 'This expedition has ended.';
    if (!Number.isInteger(index) || index < 0 || index >= MATERIALS.length) return 'Unknown plot.';
    if (index >= this.unlockedPlots) return 'Unlock this plot first.';
    const plot = this.farms[index];
    if (plot?.level >= 3) return 'This plot is fully upgraded.';
    const cost = this.farmCost(index);
    if (this.coins < cost) return 'You need more coins.';
    this.coins -= cost;
    if (plot) plot.level++;
    else this.farms[index] = { type: MATERIALS[index].id, level: 1, progress: 0 };
    return null;
  }

  // Begin the next wave and fill the spawn queue. Returns false when a wave is already running.
  start() {
    if (this.active || this.won || this.lost) return false;
    this.active = true;
    this.wave++;
    this.spawn = 0;
    const count = 7 + this.stage * 2 + this.wave * 2;
    for (let i = 0; i < count; i++) {
      let kind = 'grub';
      if (this.stage >= 1 && i % 4 === 2) kind = 'runner';
      if (this.stage >= 2 && i % 5 === 3) kind = 'armor';
      if (this.stage >= 3 && i % 6 === 4) kind = 'moth';
      if (this.stage >= 7 && i % 3 === 1) kind = 'moth';
      if ((this.stage === 5 || this.stage === 9) && this.wave === 3 && i === count - 1) {
        kind = 'boss';
      }
      this.queue.push(kind);
    }
    return true;
  }

  // Build one enemy of the given kind, scaled up by the current stage and wave.
  enemy(kind) {
    const stage = this.stage,
      scale = Math.pow(1.43, stage) * (1 + 0.13 * (this.wave - 1));
    const hp = { grub: 24, runner: 18, armor: 52, moth: 25, boss: 450 }[kind] * scale;
    const baseSpeed = { grub: 1.05, runner: 1.85, armor: 0.76, moth: 1.05, boss: 0.55 }[kind];
    return {
      id: this.nextId++,
      kind,
      x: 0,
      z: 4,
      hp,
      maxHp: hp,
      speed: baseSpeed * (1 + stage * 0.025),
      flying: kind === 'moth',
      slow: 0,
      target: null,
    };
  }

  // Advance the whole game by dt seconds: gardens, spawns, movement, shooting, and wave endings.
  tick(dt) {
    if (this.lost || this.won) return;
    this.time += dt;
    // Gardens collect even when no wave is running.
    for (let i = 0; i < this.farms.length; i++) {
      const plot = this.farms[i];
      if (!plot) continue;
      plot.progress += dt;
      while (plot.progress >= 10) {
        plot.progress -= 10;
        this[plot.type] += MATERIALS[i].yield * plot.level;
      }
    }

    if (!this.active) return;

    // Release the next queued enemy once the spawn timer runs out.
    this.spawn -= dt;
    if (this.queue.length && this.spawn <= 0) {
      this.enemies.push(this.enemy(this.queue.shift()));
      this.spawn = Math.max(0.35, 0.95 - this.stage * 0.045);
    }

    // Walk every enemy along the route, spending its movement budget square by square.
    for (const enemy of this.enemies) {
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

    // Every ready tower shoots the enemy closest to the exit inside its range.
    for (const tower of this.towers) {
      if (tower.type === 'hedge') continue;
      tower.cool -= dt;
      if (tower.cool > 0) continue;
      const stats = this.stats(tower);
      const inRange = this.enemies.filter(
        (enemy) => enemy.hp > 0 && Math.hypot(enemy.x - tower.x, enemy.z - tower.z) <= stats.range,
      );
      const distanceToExit = (enemy) => Math.hypot(12 - enemy.x, 4 - enemy.z);
      const target = inRange.sort((a, b) => distanceToExit(a) - distanceToExit(b))[0];
      if (!target) continue;
      tower.cool = stats.rate;
      this.emit('shot', { tower: tower.id, x: target.x, z: target.z, towerType: tower.type });
      // Bloom splashes onto everything near the target. Every other tower hits one enemy.
      const hits =
        tower.type === 'bloom'
          ? this.enemies.filter(
              (enemy) => Math.hypot(enemy.x - target.x, enemy.z - target.z) < 1.35,
            )
          : [target];
      for (const hit of hits) {
        const armored = hit.kind === 'armor' && tower.type !== 'prism';
        hit.hp -= stats.damage * (armored ? 0.55 : 1);
        if (tower.type === 'sap') hit.slow = 2.2;
      }
    }

    // Pay out the dead, then clear them from the board.
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) {
        this.coins += enemy.kind === 'boss' ? 55 : 4;
        this.kills++;
        this.emit('kill', { x: enemy.x, z: enemy.z, kind: enemy.kind });
      }
    }
    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);

    if (this.lives <= 0) {
      this.lives = 0;
      this.lost = true;
      this.active = false;
      this.emit('lost');
      return;
    }

    // The wave ends once nothing is queued and nothing is left alive on the board.
    if (!this.queue.length && !this.enemies.length) {
      this.active = false;
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

// Presentation only. This file owns how the game looks: the painted art path and the accent
// colour for every war engine and material, the creature sprite table, and the scene colours
// world.js builds from. It holds no rules and no state, so game.js stays the single source of
// behaviour.
//
// Round r6 replaced every procedural shape and unicode glyph with hand-painted sprites. The
// `art` path on each row is what the interface and the board actually draw. The `symbol` field
// stays as spoken-text only: assistive technology may read it, nothing renders it. Round r7
// moved every accent onto castle stone, aged oak, iron, heraldic crimson and gold.

// One row per buildable engine. `art` is the sidebar and header icon, `levels` are the three
// board sprites for levels 1 to 3, `color` is the accent the chip plate and the range ring are
// tinted with, and `shape` names the silhouette family. `needle` and `wall` steer world.js.
export const TOWER_LOOK = {
  thorn: {
    symbol: '↗',
    color: '#a06a20',
    shape: 'needle',
    art: '/art/icon-thorn@160.png',
    levels: [
      '/art/tower-thorn-l1@256.png',
      '/art/tower-thorn-l2@256.png',
      '/art/tower-thorn-l3@256.png',
    ],
  },
  sap: {
    symbol: '◉',
    color: '#2a7d74',
    shape: 'pit',
    art: '/art/icon-sap@160.png',
    levels: ['/art/tower-sap-l1@256.png', '/art/tower-sap-l2@256.png', '/art/tower-sap-l3@256.png'],
  },
  bloom: {
    symbol: '❀',
    color: '#b03a2c',
    shape: 'catapult',
    art: '/art/icon-bloom@160.png',
    levels: [
      '/art/tower-bloom-l1@256.png',
      '/art/tower-bloom-l2@256.png',
      '/art/tower-bloom-l3@256.png',
    ],
  },
  prism: {
    symbol: '⬢',
    color: '#6a4fae',
    shape: 'spire',
    art: '/art/icon-prism@160.png',
    levels: [
      '/art/tower-prism-l1@256.png',
      '/art/tower-prism-l2@256.png',
      '/art/tower-prism-l3@256.png',
    ],
  },
  hedge: {
    symbol: '▦',
    color: '#7c5a2e',
    shape: 'wall',
    art: '/art/icon-hedge@160.png',
    levels: [
      '/art/tower-hedge-l1@256.png',
      '/art/tower-hedge-l2@256.png',
      '/art/tower-hedge-l3@256.png',
    ],
  },
  ember: {
    symbol: '▲',
    color: '#cc4310',
    shape: 'brazier',
    art: '/art/icon-ember@160.png',
    levels: [
      '/art/tower-ember-l1@256.png',
      '/art/tower-ember-l2@256.png',
      '/art/tower-ember-l3@256.png',
    ],
  },
  lantern: {
    symbol: '✦',
    color: '#c9a227',
    shape: 'banner',
    art: '/art/icon-lantern@160.png',
    levels: [
      '/art/tower-lantern-l1@256.png',
      '/art/tower-lantern-l2@256.png',
      '/art/tower-lantern-l3@256.png',
    ],
  },
};

// One row per material the works produce, plus the two counters in the header.
export const MATERIAL_LOOK = {
  wood: { symbol: '♧', color: '#8a6733', art: '/art/icon-wood@160.png' },
  rock: { symbol: '⬟', color: '#7d8079', art: '/art/icon-rock@160.png' },
  iron: { symbol: '▰', color: '#566a76', art: '/art/icon-iron@160.png' },
  diamond: { symbol: '◇', color: '#2b8ea6', art: '/art/icon-diamond@160.png' },
  coins: { symbol: '◈', color: '#c39527', art: '/art/icon-coin@160.png' },
  lives: { symbol: '♥', color: '#9c2f2c', art: '/art/icon-life@160.png' },
};

// Creature sprites. `art` is the painted top-down creature, head at the top of the image.
// `sprite` is how wide that plane is on the board, in squares. The build step crops every
// cut-out to its paint, so the creature covers about 94 percent of that plane. `size` still drives the shadow blot and `scale` the health bar,
// so world.js divides `sprite` by `scale` and the group scale cancels out.
export const ENEMY_LOOK = {
  grub: { color: '#6f7a3a', size: 0.23, scale: 1, sprite: 0.6, art: '/art/enemy-grub@192.png' },
  runner: {
    color: '#8d7f6a',
    size: 0.22,
    scale: 1,
    sprite: 0.58,
    art: '/art/enemy-runner@192.png',
  },
  armor: { color: '#4b525c', size: 0.25, scale: 1, sprite: 0.64, art: '/art/enemy-armor@192.png' },
  moth: { color: '#8a8b8f', size: 0.23, scale: 1, sprite: 0.74, art: '/art/enemy-moth@192.png' },
  brood: {
    color: '#7a5a30',
    size: 0.34,
    scale: 1.2,
    sprite: 0.85,
    art: '/art/enemy-brood@256.png',
  },
  grubling: {
    color: '#7c8544',
    size: 0.14,
    scale: 0.62,
    sprite: 0.38,
    art: '/art/enemy-grubling@192.png',
  },
  warden: {
    color: '#c9b98a',
    size: 0.27,
    scale: 1,
    sprite: 0.72,
    art: '/art/enemy-warden@192.png',
  },
  boss: { color: '#5c2a24', size: 0.48, scale: 1.5, sprite: 1.15, art: '/art/enemy-boss@256.png' },
};

// The painted board. Tiles, path, ground and apron are opaque and tileable; the gates and the
// props are cut out sprites that sit on top. Keys are historical; the art behind them is r7.
export const BOARD_ART = {
  meadow: [
    '/art/tile-meadow-a@256.webp',
    '/art/tile-meadow-b@256.webp',
    '/art/tile-meadow-c@256.webp',
  ],
  path: '/art/tile-path@256.webp',
  outer: '/art/ground-outer@512.webp',
  apron: '/art/apron-wood@512.webp',
  gateEntry: '/art/gate-entry@256.png',
  gateExit: '/art/gate-exit@256.png',
  props: {
    tree: ['/art/prop-tree-a@256.png', '/art/prop-tree-b@256.png', '/art/prop-tree-c@256.png'],
    rock: ['/art/prop-rock-a@160.png', '/art/prop-rock-b@160.png'],
    flowers: ['/art/prop-flowers-a@160.png', '/art/prop-flowers-b@160.png'],
    stump: ['/art/prop-stump@160.png'],
  },
};

// Scene colours. Only the few things that are still drawn as plain geometry use these:
// the seam under the tile grid, the hover square, the route chevrons and the effects.
// Castle stone and torchlight since r7.
export const SCENE = {
  sky: '#3c3630',
  soil: '#6b6357',
  seam: '#463f36',
  route: '#f0dfa6',
  routeGlow: '#f4e6ae',
  hoverOk: '#f0e6c4',
  hoverBlocked: '#c05238',
  ring: '#f9efc9',
  timber: '#7a6444',
  stone: '#6f6a61',
  stoneLight: '#9a9288',
  shadow: '#2a2520',
};

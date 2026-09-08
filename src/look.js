// Presentation only. This file owns how the game looks: the painted art path and the accent
// colour for every tower and material, the enemy sprite table, and the scene colours world.js
// builds from. It holds no rules and no state, so game.js stays the single source of behaviour.
//
// Round r6 replaced every procedural shape and unicode glyph with hand-painted sprites. The
// `art` path on each row is what the interface and the board actually draw. The `symbol` field
// stays as spoken-text only: assistive technology may read it, nothing renders it.

// One row per buildable piece. `art` is the sidebar and header icon, `levels` are the three
// board sprites for levels 1 to 3, `color` is the accent the chip plate and the range ring are
// tinted with, and `shape` names the silhouette family.
export const TOWER_LOOK = {
  thorn: {
    symbol: '↗',
    color: '#9a5f18',
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
    color: '#2b8b83',
    shape: 'well',
    art: '/art/icon-sap@160.png',
    levels: ['/art/tower-sap-l1@256.png', '/art/tower-sap-l2@256.png', '/art/tower-sap-l3@256.png'],
  },
  bloom: {
    symbol: '❀',
    color: '#c23f5c',
    shape: 'flower',
    art: '/art/icon-bloom@160.png',
    levels: [
      '/art/tower-bloom-l1@256.png',
      '/art/tower-bloom-l2@256.png',
      '/art/tower-bloom-l3@256.png',
    ],
  },
  prism: {
    symbol: '⬢',
    color: '#6b52b5',
    shape: 'gem',
    art: '/art/icon-prism@160.png',
    levels: [
      '/art/tower-prism-l1@256.png',
      '/art/tower-prism-l2@256.png',
      '/art/tower-prism-l3@256.png',
    ],
  },
  hedge: {
    symbol: '▦',
    color: '#4c7a37',
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
    color: '#d2400f',
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
    color: '#efc31c',
    shape: 'lamp',
    art: '/art/icon-lantern@160.png',
    levels: [
      '/art/tower-lantern-l1@256.png',
      '/art/tower-lantern-l2@256.png',
      '/art/tower-lantern-l3@256.png',
    ],
  },
};

// One row per garden material, plus the two counters in the header.
export const MATERIAL_LOOK = {
  wood: { symbol: '♧', color: '#6c8c3f', art: '/art/icon-wood@160.png' },
  rock: { symbol: '⬟', color: '#7c837a', art: '/art/icon-rock@160.png' },
  iron: { symbol: '▰', color: '#4f6f7d', art: '/art/icon-iron@160.png' },
  diamond: { symbol: '◇', color: '#1f93ab', art: '/art/icon-diamond@160.png' },
  coins: { symbol: '◈', color: '#c9992a', art: '/art/icon-coin@160.png' },
  lives: { symbol: '♥', color: '#a4402c', art: '/art/icon-life@160.png' },
};

// Enemy sprites. `art` is the painted top-down creature, head at the top of the image.
// `sprite` is how wide that plane is on the board, in squares. The build step crops every
// cut-out to its paint, so the creature covers about 94 percent of that plane. `size` still drives the shadow blot and `scale` the health bar,
// so world.js divides `sprite` by `scale` and the group scale cancels out.
export const ENEMY_LOOK = {
  grub: { color: '#9b4f38', size: 0.23, scale: 1, sprite: 0.6, art: '/art/enemy-grub@192.png' },
  runner: {
    color: '#c98a1e',
    size: 0.22,
    scale: 1,
    sprite: 0.58,
    art: '/art/enemy-runner@192.png',
  },
  armor: { color: '#4a5a6b', size: 0.25, scale: 1, sprite: 0.64, art: '/art/enemy-armor@192.png' },
  moth: { color: '#8f7fae', size: 0.23, scale: 1, sprite: 0.74, art: '/art/enemy-moth@192.png' },
  brood: {
    color: '#8d3357',
    size: 0.34,
    scale: 1.2,
    sprite: 0.85,
    art: '/art/enemy-brood@256.png',
  },
  grubling: {
    color: '#b4623f',
    size: 0.14,
    scale: 0.62,
    sprite: 0.38,
    art: '/art/enemy-grubling@192.png',
  },
  warden: {
    color: '#2f5f52',
    size: 0.27,
    scale: 1,
    sprite: 0.72,
    art: '/art/enemy-warden@192.png',
  },
  boss: { color: '#4a2f63', size: 0.48, scale: 1.5, sprite: 1.15, art: '/art/enemy-boss@256.png' },
};

// The painted board. Tiles, path, ground and apron are opaque and tileable; the gates and the
// props are cut out sprites that sit on top.
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
export const SCENE = {
  sky: '#5b6a44',
  soil: '#6a6d4c',
  seam: '#46552f',
  route: '#f3e0a8',
  routeGlow: '#f2e7ab',
  hoverOk: '#eaf6c0',
  hoverBlocked: '#c96b52',
  ring: '#fbf4c8',
  bark: '#7a6444',
  leaf: '#5d8a4c',
  leafLight: '#79a45f',
  shadow: '#2b3320',
};

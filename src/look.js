// Presentation only. This file owns how the game looks: the symbol and colour for every
// tower and material, the enemy palette, and the scene colours world.js builds from. It
// holds no rules and no state, so game.js stays the single source of behaviour. The
// symbols and colours here override the plain ones in game.js on purpose: four of those
// were easy to confuse at a glance, and this is the layer that is allowed to change.

// One row per buildable piece. `color` is the chip and the board marker. `shape` names the
// silhouette so the sidebar, the board and the detail card always agree.
export const TOWER_LOOK = {
  thorn: { symbol: '↗', color: '#9a5f18', shape: 'needle' },
  sap: { symbol: '◉', color: '#2b8b83', shape: 'well' },
  bloom: { symbol: '❀', color: '#c23f5c', shape: 'flower' },
  prism: { symbol: '⬢', color: '#6b52b5', shape: 'gem' },
  hedge: { symbol: '▦', color: '#4c7a37', shape: 'wall' },
  ember: { symbol: '▲', color: '#d2400f', shape: 'brazier' },
  lantern: { symbol: '✦', color: '#efc31c', shape: 'lamp' },
};

// One row per garden material. Wood, Rock, Iron and Diamond each get their own symbol and
// hue so the Diamond chip can never be mistaken for the Sunstone tower again.
export const MATERIAL_LOOK = {
  wood: { symbol: '♧', color: '#6c8c3f' },
  rock: { symbol: '⬟', color: '#7c837a' },
  iron: { symbol: '▰', color: '#4f6f7d' },
  diamond: { symbol: '◇', color: '#1f93ab' },
};

// The two abilities. Sunburst keeps a sun, Rootgrip gets a root fork.
export const ABILITY_LOOK = {
  rootgrip: { symbol: '⋔', color: '#4c7a37' },
  sunburst: { symbol: '✷', color: '#d99c12' },
};

// Enemy bodies. Darker and more saturated than the ground so a crowd reads as a crowd.
export const ENEMY_LOOK = {
  grub: { color: '#9b4f38', size: 0.23, scale: 1 },
  runner: { color: '#c98a1e', size: 0.22, scale: 1 },
  armor: { color: '#4a5a6b', size: 0.25, scale: 1 },
  moth: { color: '#8f7fae', size: 0.23, scale: 1 },
  brood: { color: '#8d3357', size: 0.34, scale: 1.2 },
  grubling: { color: '#b4623f', size: 0.14, scale: 0.62 },
  warden: { color: '#2f5f52', size: 0.27, scale: 1 },
  boss: { color: '#4a2f63', size: 0.48, scale: 1.5 },
};

// Scene colours. Kept in one place so depth comes from these values, never from fog.
export const SCENE = {
  sky: '#cfdac0',
  soil: '#6a6d4c',
  rim: '#8f9a6a',
  apron: '#93a374',
  tiles: ['#b9cb95', '#b1c48b', '#bccf99', '#aec089'],
  route: '#4f6b3f',
  routeGlow: '#f2e7ab',
  hoverOk: '#eaf6c0',
  hoverBlocked: '#c96b52',
  ring: '#fbf4c8',
  bark: '#7a6444',
  leaf: '#5d8a4c',
  leafLight: '#79a45f',
  shadow: '#3f4a30',
};

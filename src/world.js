// Three.js rendering for Undergrowth. This file owns the scene, the tilted camera, the
// lights and shadows, the post-processing chain, the terrain and ramparts around the board,
// the meshes for towers and enemies, the route markers, and every particle and pop effect.
// It also turns pointer input on the canvas into board squares for main.js. It reads game
// state but never changes it, so all rules stay in game.js. Colours come from look.js.
//
// Round r8 ("Cinematic depth") replaced the flat top-down sheet with a lit tabletop diorama:
// an orthographic camera tilted to look down the board from behind the keep, a warm key
// light with soft shadows, a cool fill, torch accents, bloom, a colour grade and a vignette.
// The camera stays orthographic on purpose: every square keeps the same size on screen and
// the grid lines stay straight, so the board still reads as a board.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TOWERS, ENEMIES, path } from './game.js';
import { TOWER_LOOK, ENEMY_LOOK, BOARD_ART, SCENE } from './look.js';

const calmQuery = matchMedia('(prefers-reduced-motion: reduce)');
const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();

// The camera looks down the board from behind the keep (world +x), raised this far above the
// ground. Screen-up stays world -x and screen-right stays world -z, as in every earlier round.
const ELEVATION = THREE.MathUtils.degToRad(38);
const VIEW = new THREE.Vector3(Math.cos(ELEVATION), Math.sin(ELEVATION), 0).multiplyScalar(40);
const BOARD_CENTER = new THREE.Vector3(6, 0, 4);

// A flat plane lying on the board with its image-top pointing at world -x.
const SPRITE_GEOMETRY = new THREE.PlaneGeometry(1, 1);
SPRITE_GEOMETRY.rotateX(-Math.PI / 2);
SPRITE_GEOMETRY.rotateY(Math.PI / 2);

// A standing card for creatures, anchored at its feet and facing the camera.
const STAND_GEOMETRY = new THREE.PlaneGeometry(1, 1).translate(0, 0.46, 0);
// How tall a standing creature is, per square of its old floor sprite.
const STAND = 1.95;
// The sunken road the horde walks on.
const ROAD_Y = -0.17;

// Shared geometry. Nothing in this list is ever disposed.
const GEO = {
  tile: new THREE.BoxGeometry(0.97, 0.34, 0.97).translate(0, -0.17, 0),
  road: new THREE.BoxGeometry(1.0, 0.34, 1.0).translate(0, -0.17, 0),
  plinth: new THREE.CylinderGeometry(0.43, 0.48, 1, 8).translate(0, 0.5, 0),
  plinthCap: new THREE.CylinderGeometry(0.46, 0.44, 0.06, 8).translate(0, 0.03, 0),
  footing: new THREE.CylinderGeometry(0.5, 0.54, 0.08, 8).translate(0, 0.04, 0),
  trim: new THREE.TorusGeometry(0.455, 0.028, 6, 24).rotateX(Math.PI / 2),
  wall: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
  crystal: new THREE.OctahedronGeometry(0.17, 0),
  orb: new THREE.IcosahedronGeometry(0.1, 1),
  flame: new THREE.ConeGeometry(0.12, 0.34, 7).translate(0, 0.17, 0),
  pole: new THREE.CylinderGeometry(0.025, 0.025, 1, 6).translate(0, 0.5, 0),
  chevron: new THREE.ConeGeometry(0.09, 0.2, 3).rotateX(Math.PI / 2),
  bolt: new THREE.CylinderGeometry(0.03, 0.03, 1, 5).rotateX(Math.PI / 2),
  glob: new THREE.IcosahedronGeometry(0.1, 1),
  ring: new THREE.RingGeometry(0.8, 1, 48).rotateX(-Math.PI / 2),
  disc: new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2),
  blob: new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2),
  bar: new THREE.PlaneGeometry(1, 1),
  trunk: new THREE.CylinderGeometry(0.07, 0.11, 1, 6).translate(0, 0.5, 0),
};

// A colour pushed past 1 so the bloom pass picks it up.
const hot = (color, power = 3) => new THREE.Color(color).multiplyScalar(power);

// Deterministic noise for the terrain and the scenery. No Math.random anywhere in this file,
// so the screenshot tool always gets the same board.
const wave2 = (x, z) =>
  Math.sin(x * 0.31 + z * 0.17) * 0.5 +
  Math.sin(x * 0.13 - z * 0.37 + 1.7) * 0.35 +
  Math.sin(x * 0.71 + z * 0.53 + 0.4) * 0.15;
function seeded(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

// Ground height outside the ramparts: a flooded moat hard against the walls, a steep bank,
// then rolling hills further out.
function terrainHeight(x, z) {
  const dx = Math.max(-1.6 - x, x - 13.6, 0),
    dz = Math.max(-1.6 - z, z - 9.6, 0);
  const out = Math.hypot(dx, dz);
  const bank = THREE.MathUtils.smoothstep(out, 0.55, 1.25);
  const rise = THREE.MathUtils.smoothstep(out, 1.8, 16);
  return -1.0 + bank * 1.0 + rise * (1.3 + wave2(x, z) * 1.2) + wave2(x * 2.3, z * 2.1) * 0.07 * bank;
}

// A procedural cut-stone texture, drawn once. Used for the ramparts, towers and plinths.
function stoneCanvas(tone = [118, 110, 98]) {
  const size = 256,
    canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  g.fillStyle = '#2c2822';
  g.fillRect(0, 0, size, size);
  const rand = seeded(91);
  const rows = 8,
    h = size / rows;
  for (let r = 0; r < rows; r++) {
    let x = r % 2 ? -h * 0.7 : 0;
    while (x < size) {
      const w = h * (1.3 + rand() * 0.9);
      const shade = 0.78 + rand() * 0.34;
      g.fillStyle = `rgb(${tone.map((c) => Math.round(c * shade)).join(',')})`;
      g.fillRect(x + 2, r * h + 2, w - 4, h - 4);
      // A lit top edge and a dark bottom edge make each block read as carved.
      g.fillStyle = 'rgba(255,240,210,0.10)';
      g.fillRect(x + 2, r * h + 2, w - 4, 3);
      g.fillStyle = 'rgba(0,0,0,0.22)';
      g.fillRect(x + 2, r * h + h - 5, w - 4, 3);
      x += w;
    }
  }
  // Grit.
  for (let i = 0; i < 2600; i++) {
    const v = rand();
    g.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.10)';
    g.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
  }
  return canvas;
}

// The courtyard floor, painted once in code. Round r9 calmed it down: one large dressed
// flagstone per square, in one stone, with only a whisper of tone change, so the joints read
// as a quiet grid and the eye can rest. Wear, a hairline crack and a little moss come in at
// low contrast. It is mapped by world position, so square (x, z) always shows the same stone.
const CELL_PX = 112;
function courtyardCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 13 * CELL_PX;
  canvas.height = 9 * CELL_PX;
  const g = canvas.getContext('2d');
  const rand = seeded(4242);
  // Grout.
  g.fillStyle = '#3a342c';
  g.fillRect(0, 0, canvas.width, canvas.height);
  for (let cx = 0; cx < 13; cx++) {
    for (let cz = 0; cz < 9; cz++) {
      const x = cx * CELL_PX,
        y = cz * CELL_PX,
        s = CELL_PX;
      const shade = 0.97 + rand() * 0.05;
      const [r, gr, b] = [126, 117, 100].map((c) => Math.round(c * shade));
      const gradient = g.createLinearGradient(x, y, x + s, y + s);
      gradient.addColorStop(0, `rgb(${r + 8},${gr + 7},${b + 6})`);
      gradient.addColorStop(1, `rgb(${r - 8},${gr - 8},${b - 7})`);
      g.fillStyle = gradient;
      g.beginPath();
      g.roundRect(x + 3, y + 3, s - 6, s - 6, 7);
      g.fill();
      // A soft bevel: a faint lit rim top-left, a faint shade bottom-right.
      g.lineWidth = 2;
      g.strokeStyle = 'rgba(255,240,215,0.10)';
      g.beginPath();
      g.moveTo(x + 5, y + s - 7);
      g.lineTo(x + 5, y + 5);
      g.lineTo(x + s - 7, y + 5);
      g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.18)';
      g.beginPath();
      g.moveTo(x + s - 5, y + 7);
      g.lineTo(x + s - 5, y + s - 5);
      g.lineTo(x + 7, y + s - 5);
      g.stroke();
      // Fine tooling marks, kept faint.
      for (let i = 0; i < 170; i++) {
        g.fillStyle = rand() > 0.5 ? 'rgba(255,245,225,0.035)' : 'rgba(20,14,8,0.05)';
        g.fillRect(x + 5 + rand() * (s - 10), y + 5 + rand() * (s - 10), 1 + rand() * 2, 1 + rand() * 2);
      }
      // A worn, slightly polished middle where feet have crossed.
      const wear = g.createRadialGradient(x + s / 2, y + s / 2, 4, x + s / 2, y + s / 2, s * 0.55);
      wear.addColorStop(0, 'rgba(255,244,222,0.045)');
      wear.addColorStop(1, 'rgba(0,0,0,0.035)');
      g.fillStyle = wear;
      g.fillRect(x + 3, y + 3, s - 6, s - 6);
      if (rand() < 0.1) {
        g.strokeStyle = 'rgba(30,22,14,0.28)';
        g.lineWidth = 1;
        g.beginPath();
        let px = x + 12 + rand() * (s - 24),
          py = y + 6;
        g.moveTo(px, py);
        for (let k = 0; k < 4; k++) {
          px += (rand() - 0.5) * 16;
          py += s / 5;
          g.lineTo(px, py);
        }
        g.stroke();
      }
    }
  }
  // Moss creeping along a few joints, never across a stone face.
  for (let i = 0; i < 90; i++) {
    const onColumn = rand() < 0.5;
    const along = rand() * (onColumn ? canvas.height : canvas.width);
    const across = Math.round(rand() * (onColumn ? 13 : 9)) * CELL_PX;
    const [x, y] = onColumn ? [across, along] : [along, across];
    const rad = 6 + rand() * 12;
    const moss = g.createRadialGradient(x, y, 0, x, y, rad);
    moss.addColorStop(0, 'rgba(70,88,44,0.42)');
    moss.addColorStop(1, 'rgba(60,80,30,0)');
    g.fillStyle = moss;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // A broad, low-contrast cloud of weathering so the sheet never looks stamped.
  for (let i = 0; i < 26; i++) {
    const x = rand() * canvas.width,
      y = rand() * canvas.height,
      rad = 80 + rand() * 160;
    const blot = g.createRadialGradient(x, y, 0, x, y, rad);
    blot.addColorStop(0, rand() > 0.5 ? 'rgba(30,24,18,0.07)' : 'rgba(255,240,215,0.04)');
    blot.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = blot;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  return canvas;
}

// The horde road: small dark cobbles set in packed earth, tileable, so the sunken route reads
// as a different surface from the flagstones at a glance.
function roadCanvas() {
  const size = 256,
    canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  g.fillStyle = '#2b2119';
  g.fillRect(0, 0, size, size);
  const rand = seeded(733);
  const rows = 8,
    h = size / rows;
  for (let r = 0; r < rows; r++) {
    let x = (r % 2) * h * 0.55;
    const end = x + size;
    while (x < end - 4) {
      const w = Math.min(end - x, h * (0.75 + rand() * 0.6));
      const shade = 0.72 + rand() * 0.4;
      const [cr, cg, cb] = [84, 74, 62].map((c) => Math.round(c * shade));
      const jy = (rand() - 0.5) * 3;
      // Draw each cobble twice across the seam so the tile wraps cleanly.
      for (const dx of [-size, 0]) {
        const cx = x + dx,
          cy = r * h + jy;
        const gradient = g.createLinearGradient(cx, cy, cx + w * 0.6, cy + h);
        gradient.addColorStop(0, `rgb(${cr + 22},${cg + 19},${cb + 15})`);
        gradient.addColorStop(1, `rgb(${cr - 18},${cg - 17},${cb - 15})`);
        g.fillStyle = gradient;
        g.beginPath();
        g.roundRect(cx + 2, cy + 2, w - 4, h - 4, 6 + rand() * 5);
        g.fill();
      }
      x += w;
    }
  }
  for (let i = 0; i < 1800; i++) {
    g.fillStyle = rand() > 0.5 ? 'rgba(255,240,210,0.05)' : 'rgba(0,0,0,0.14)';
    g.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
  }
  return canvas;
}

// A soft radial glow texture, used for the portal and the ground light pools.
function glowCanvas(inner, outer) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d');
  const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, outer);
  g.fillStyle = gradient;
  g.fillRect(0, 0, 128, 128);
  return canvas;
}

// Box UVs in world units, so one texture tiles evenly over walls of any size.
function worldUV(geometry, scale = 1) {
  const pos = geometry.attributes.position,
    normal = geometry.attributes.normal,
    uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(normal.getX(i)),
      ny = Math.abs(normal.getY(i));
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    if (ny > 0.5) uv.setXY(i, x * scale, z * scale);
    else if (nx > 0.5) uv.setXY(i, z * scale, y * scale);
    else uv.setXY(i, x * scale, y * scale);
  }
  return geometry;
}

// Colour grade and vignette, run on the linear image before tone mapping.
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uAspect: { value: 1 },
    uFlash: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 uCenter; uniform float uAspect; uniform float uFlash;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      // Blue hour: deep teal-blue shadows, neutral mids, warm amber torchlit highlights.
      c = mix(c, c * vec3(0.78, 0.92, 1.24) + vec3(0.003, 0.009, 0.026), smoothstep(0.36, 0.0, l) * 0.75);
      c *= mix(vec3(1.0), vec3(1.1, 1.0, 0.84), smoothstep(0.2, 0.95, l));
      c = max(mix(vec3(l), c, 1.1), 0.0);
      vec2 d = (vUv - uCenter) * vec2(uAspect, 1.0);
      float v = smoothstep(1.15, 0.3, length(d));
      c *= mix(0.28, 1.0, v);
      c = mix(c * vec3(0.9, 0.95, 1.12), c, v);
      // A red pulse when the keep takes a hit.
      c = mix(c, c * vec3(1.5, 0.45, 0.4) + vec3(0.06, 0.0, 0.0), uFlash * (1.0 - v * 0.6));
      gl_FragColor = vec4(c, 1.0);
    }`,
};

// Soft round additive particles, one draw call for every spark on screen.
const PARTICLES = 900;
const ParticleShader = {
  uniforms: { uScale: { value: 40 } },
  vertexShader: `
    attribute vec3 tint; attribute float size; attribute float alpha;
    varying vec3 vTint; varying float vAlpha;
    uniform float uScale;
    void main() {
      vTint = tint; vAlpha = alpha;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * uScale;
    }`,
  fragmentShader: `
    varying vec3 vTint; varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.0, d);
      a *= a;
      gl_FragColor = vec4(vTint * a * vAlpha, a * vAlpha);
    }`,
};

export class World {
  constructor(container, onCell, onHover) {
    this.container = container;
    this.onCell = onCell;
    this.onHover = onHover;
    this.calm = calmQuery.matches;
    calmQuery.addEventListener('change', (event) => {
      this.calm = event.matches;
    });
    const coarse = matchMedia('(pointer: coarse)').matches;
    this.clock = 0;
    this.shake = 0;
    this.flash = 0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SCENE.sky);
    this.scene.fog = new THREE.Fog(SCENE.fog, 52, 100);

    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    // A software GL (no GPU, as in headless test browsers) cannot afford full resolution or
    // multisampling; everything else, shadows and bloom included, stays on.
    const gl = this.renderer.getContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    this.software = /swiftshader|llvmpipe|software/i.test(
      info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : '',
    );
    // Resolution is adaptive: it starts at the cap and steps down when frames run long, then
    // climbs back when there is headroom. A software GL starts low and may go lower.
    this.maxRatio = this.software ? 0.7 : Math.min(devicePixelRatio, coarse ? 1.5 : 1.75);
    this.minRatio = this.software ? 0.4 : Math.min(this.maxRatio, 0.85);
    this.pixelRatio = this.maxRatio;
    this.frameCost = 1 / 60;
    this.frameCount = 0;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    container.prepend(this.renderer.domElement);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 140);
    this.target = BOARD_CENTER.clone();

    this.addLights();

    // Post-processing: scene, bloom, grade + vignette, then tone mapping and sRGB.
    const size = new THREE.Vector2(2, 2);
    const renderTarget = new THREE.WebGLRenderTarget(2, 2, {
      type: THREE.HalfFloatType,
      samples: this.software ? 0 : 4,
    });
    this.composer = new EffectComposer(this.renderer, renderTarget);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(size, 0.62, 0.55, 0.9);
    // The bloom already works at half size; a software GL gets a quarter.
    const bloomSize = this.bloom.setSize.bind(this.bloom),
      bloomScale = this.software ? 2 : 1;
    this.bloom.setSize = (w, h) => bloomSize(w / bloomScale, h / bloomScale);
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());

    this.materials = new Map();
    this.towerMeshes = new Map();
    this.towerLevels = new Map();
    this.towerPreview = null;
    this.enemyMeshes = new Map();
    this.enemyHp = new Map();
    this.effects = [];
    this.animated = [];
    this.board = new THREE.Group();
    this.scene.add(this.board);
    this.route = new THREE.Group();
    this.scene.add(this.route);
    this.boost = new THREE.Group();
    this.scene.add(this.boost);
    this.buildWorld();
    this.buildParticles();
    this.buildFloatLayer();

    this.ray = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.buildHover();
    this.buildGrid();
    this.buildRange();
    this.zoom = 1;
    this.boostFrom = null;

    // Turn a pointer event into the board square under it. A tower's body answers for its
    // own square, so clicking the top of a tall engine still selects that engine.
    const pick = (event) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      this.ray.setFromCamera(this.pointer, this.camera);
      const bodies = [...this.towerMeshes.values()].map((group) => group.userData.body);
      const hit = this.ray.intersectObjects(bodies, false)[0];
      if (hit) {
        const home = hit.object.parent;
        return { x: Math.round(home.position.x), z: Math.round(home.position.z) };
      }
      const point = new THREE.Vector3();
      this.ray.ray.intersectPlane(this.ground, point);
      return { x: Math.round(point.x), z: Math.round(point.z) };
    };

    const pointers = new Map();
    let gesture = false,
      pinchDistance = 0,
      lastPan = null;
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      canvas.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
      });
      if (pointers.size === 1) {
        gesture = false;
        lastPan = { x: event.clientX, y: event.clientY };
      } else {
        gesture = true;
        const [first, second] = [...pointers.values()];
        pinchDistance = Math.hypot(first.x - second.x, first.y - second.y);
      }
    });

    canvas.addEventListener('pointermove', (event) => {
      const pointer = pointers.get(event.pointerId);
      if (pointer) {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        const travelled = Math.hypot(pointer.x - pointer.startX, pointer.y - pointer.startY);
        if (travelled > 8) gesture = true;
        if (pointers.size === 2) {
          const [first, second] = [...pointers.values()],
            distance = Math.hypot(first.x - second.x, first.y - second.y);
          if (pinchDistance > 0) {
            this.zoom = THREE.MathUtils.clamp((this.zoom * distance) / pinchDistance, 1, 2.5);
            this.resize();
          }
          pinchDistance = distance;
          lastPan = null;
        } else if (gesture && this.zoom > 1 && lastPan) {
          // One finger while zoomed in: drag the board. Screen-right is world -z; screen-up
          // is world -x, foreshortened by the tilt.
          const scale = this.unitsPerPixel;
          this.target.z += (pointer.x - lastPan.x) * scale;
          this.target.x += ((pointer.y - lastPan.y) * scale) / Math.sin(ELEVATION);
          this.target.x = THREE.MathUtils.clamp(this.target.x, 0, 12);
          this.target.z = THREE.MathUtils.clamp(this.target.z, 0, 8);
          this.resize();
        }
        lastPan = { x: pointer.x, y: pointer.y };
      }
      if (!gesture) this.onHover(pick(event));
    });

    canvas.addEventListener('pointerup', (event) => {
      if (event.button !== 0 || !pointers.has(event.pointerId)) return;
      const wasGesture = gesture;
      pointers.delete(event.pointerId);
      if (!wasGesture) this.onCell(pick(event));
      if (!pointers.size) {
        gesture = false;
        lastPan = null;
        pinchDistance = 0;
      }
    });

    canvas.addEventListener('pointercancel', (event) => {
      pointers.delete(event.pointerId);
      gesture = true;
      lastPan = null;
    });

    canvas.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'touch') return;
      this.hover.visible = false;
      this.previewTowers = null;
      this.clearTowerPreview();
    });

    this.resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => this.resize());
    });
    this.resizeObserver.observe(container);
    addEventListener('resize', () => this.resize());
    this.resize();
  }

  // Key, fill, rim and torches.
  addLights() {
    this.scene.add(new THREE.HemisphereLight(SCENE.skyLight, SCENE.groundLight, 0.65));
    const sun = new THREE.DirectionalLight(SCENE.sun, 4.4);
    sun.position.set(6, 15, 10).add(BOARD_CENTER);
    sun.target.position.copy(BOARD_CENTER);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(this.software ? 1024 : 2048);
    Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 2, far: 50 });
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.025;
    sun.shadow.radius = 3;
    this.scene.add(sun, sun.target);
    const rim = new THREE.DirectionalLight(SCENE.rim, 1.1);
    rim.position.set(-14, 7, -8).add(BOARD_CENTER);
    this.scene.add(rim);
    this.torches = [];
    const torch = (x, y, z, color, power, reach) => {
      const light = new THREE.PointLight(color, power, reach, 1.6);
      light.position.set(x, y, z);
      light.userData.base = power;
      this.scene.add(light);
      this.torches.push(light);
    };
    // The horde's portal burns red at the far gate; the keep gate glows gold at the near end.
    torch(-1.0, 1.1, 4, SCENE.portal, 5, 5);
    torch(13.1, 0.9, 4, SCENE.torch, 7, 6);
    if (!this.software) {
      torch(-1.3, 1.9, -1.3, SCENE.torch, 4, 5);
      torch(-1.3, 1.9, 9.3, SCENE.torch, 4, 5);
    }
  }

  texture(file, repeatX = 1, repeatY = 1) {
    const key = `${file}|${repeatX}|${repeatY}`;
    if (!textureCache.has(key)) {
      const map = textureLoader.load(
        file,
        (loaded) => {
          loaded.needsUpdate = true;
        },
        undefined,
        () => console.error(`missing board art: ${file}`),
      );
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = this.anisotropy;
      if (repeatX !== 1 || repeatY !== 1) {
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        map.repeat.set(repeatX, repeatY);
      }
      textureCache.set(key, map);
    }
    return textureCache.get(key);
  }

  // A lit painted material. Cut-outs use alpha testing so they write depth and cast shadows.
  paint(file, { cutout = true, repeatX = 1, repeatY = 1, rough = 0.88, bump = 0 } = {}) {
    const key = `paint|${file}|${repeatX}|${repeatY}|${cutout}|${bump}`;
    if (!this.materials.has(key)) {
      this.materials.set(
        key,
        new THREE.MeshStandardMaterial({
          map: this.texture(file, repeatX, repeatY),
          roughness: rough,
          metalness: 0,
          alphaTest: cutout ? 0.42 : 0,
          alphaToCoverage: cutout,
          // The painting doubles as its own relief map, so light rakes across the stone.
          bumpMap: bump ? this.texture(file, repeatX, repeatY) : null,
          bumpScale: bump,
        }),
      );
    }
    return this.materials.get(key);
  }

  sprite(file, size, options) {
    const mesh = new THREE.Mesh(SPRITE_GEOMETRY, this.paint(file, options));
    const [down, across] = Array.isArray(size) ? size : [size, size];
    mesh.scale.set(down, 1, across);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  stone(key = 'stone', tone, repeat = 1) {
    if (!this.materials.has(key)) {
      const texture = new THREE.CanvasTexture(stoneCanvas(tone));
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = this.anisotropy;
      texture.repeat.set(repeat, repeat);
      const bump = new THREE.CanvasTexture(stoneCanvas([200, 200, 200]));
      bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
      bump.repeat.set(repeat, repeat);
      this.materials.set(
        key,
        new THREE.MeshStandardMaterial({
          map: texture,
          bumpMap: bump,
          bumpScale: 1.4,
          roughness: 0.86,
          metalness: 0.02,
        }),
      );
    }
    return this.materials.get(key);
  }

  mat(color, finish = 'matte') {
    const key = color + finish;
    if (!this.materials.has(key)) {
      const settings = {
        matte: { roughness: 0.9, metalness: 0 },
        soft: { roughness: 0.65, metalness: 0 },
        metal: { roughness: 0.32, metalness: 0.85 },
      }[finish];
      this.materials.set(key, new THREE.MeshStandardMaterial({ color, ...settings }));
    }
    return this.materials.get(key);
  }

  // A self-lit material, pushed over 1 so it blooms.
  glow(color, power = 3, opacity = 1) {
    const key = `glow|${color}|${power}|${opacity}`;
    if (!this.materials.has(key)) {
      this.materials.set(
        key,
        new THREE.MeshBasicMaterial({
          color: hot(color, power),
          transparent: opacity < 1,
          opacity,
          depthWrite: opacity >= 1,
          fog: false,
        }),
      );
    }
    return this.materials.get(key);
  }

  add(geometry, material, parent, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // ---------------------------------------------------------------- the diorama

  buildWorld() {
    this.buildTerrain();
    this.buildTiles();
    this.buildLightMap();
    this.buildRamparts();
    this.buildMoat();
    this.buildGates();
    this.plantScenery();
    this.buildFog();
  }

  buildTerrain() {
    const geometry = new THREE.PlaneGeometry(110, 110, 110, 110);
    geometry.rotateX(-Math.PI / 2);
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + 6,
        z = pos.getZ(i) + 4;
      pos.setY(i, terrainHeight(x, z));
    }
    geometry.computeVertexNormals();
    const ground = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        map: this.texture(BOARD_ART.outer, 18, 18),
        color: SCENE.outerTint,
        emissive: SCENE.outerGlow,
        roughness: 0.96,
      }),
    );
    ground.position.set(6, 0, 4);
    ground.receiveShadow = true;
    this.board.add(ground);
    // The raised foundation the board is built on.
    const base = new THREE.Mesh(
      worldUV(new THREE.BoxGeometry(14.8, 1.2, 10.8).translate(6, -0.96, 4), 0.3),
      this.stone('foundation', [92, 86, 78]),
    );
    base.receiveShadow = true;
    base.castShadow = true;
    this.board.add(base);
  }

  // Every square is a shallow block of turf; the enemy road is sunk below them. One
  // instanced mesh per painting, so the whole board is four draw calls.
  buildTiles() {
    // The sides of every square are dressed stone, so the sunken road shows a real curb.
    const side = this.stone('curb', [104, 97, 88]);
    const floor = new THREE.CanvasTexture(courtyardCanvas());
    floor.colorSpace = THREE.SRGBColorSpace;
    floor.anisotropy = this.anisotropy;
    const courtyard = new THREE.MeshStandardMaterial({
      map: floor,
      bumpMap: floor,
      bumpScale: 0.45,
      roughness: 0.8,
    });
    // Sample the floor by world position rather than per-box UVs.
    courtyard.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vFloor;')
        .replace(
          '#include <uv_vertex>',
          `#include <uv_vertex>
          vec4 floorWorld = modelMatrix * instanceMatrix * vec4(position, 1.0);
          vFloor = vec2((floorWorld.x + 0.5) / 13.0, 1.0 - (floorWorld.z + 0.5) / 9.0);
          #ifdef USE_MAP
            vMapUv = vFloor;
          #endif
          #ifdef USE_BUMPMAP
            vBumpMapUv = vFloor;
          #endif`,
        );
    };
    this.tileSets = [...BOARD_ART.meadow, BOARD_ART.path].map((file, index) => {
      const top = index === 3 ? this.roadMaterial() : courtyard;
      const mesh = new THREE.InstancedMesh(index === 3 ? GEO.road : GEO.tile, [side, side, top, side, side, side], 117);
      mesh.receiveShadow = true;
      mesh.castShadow = index !== 3;
      mesh.count = 0;
      this.board.add(mesh);
      return mesh;
    });
    this.layoutTiles([]);
  }

  roadMaterial() {
    const map = new THREE.CanvasTexture(roadCanvas());
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = this.anisotropy;
    return new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 2.2, roughness: 0.9, color: SCENE.road });
  }

  layoutTiles(points) {
    const onRoute = new Map(points.map((p, i) => [`${p.x},${p.z}`, i]));
    const counts = [0, 0, 0, 0];
    const matrix = new THREE.Matrix4(),
      turn = new THREE.Quaternion(),
      spot = new THREE.Vector3(),
      one = new THREE.Vector3(1, 1, 1),
      tint = new THREE.Color();
    for (let x = 0; x < 13; x++) {
      for (let z = 0; z < 9; z++) {
        const step = onRoute.get(`${x},${z}`);
        let set, y, angle;
        if (step !== undefined) {
          const here = points[step],
            next = points[step + 1] || points[step - 1] || here;
          set = 3;
          y = -0.17;
          angle = Math.atan2(next.x - here.x, next.z - here.z);
        } else {
          const index = (x + z) % 2 ? ((x * 7 + z * 11) % 2) + 2 : (x * 5 + z) % 2;
          set = index % 3;
          y = wave2(x * 3.1, z * 2.7) * 0.004;
          angle = ((x * 3 + z * 5) % 4) * (Math.PI / 2);
        }
        turn.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, angle);
        spot.set(x, y, z);
        matrix.compose(spot, turn, one);
        // A small warm or cool shift per square keeps the flagstones from reading as one sheet.
        const shade = 0.97 + (wave2(x * 5.3, z * 4.1) * 0.5 + 0.5) * 0.03;
        tint.setRGB(shade, shade, shade);
        this.tileSets[set].setColorAt(counts[set], tint);
        this.tileSets[set].setMatrixAt(counts[set]++, matrix);
      }
    }
    this.tileSets.forEach((mesh, i) => {
      mesh.count = counts[i];
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }

  // Baked light over the courtyard: darker where the walls meet the flagstones and in the
  // corners, warm pools by the braziers and the portal. One multiply plane, one additive.
  buildLightMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 260;
    canvas.height = 180;
    const g = canvas.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, 260, 180);
    // x runs down the board (canvas y after rotation), so draw in board units * 20.
    const edge = (x0, y0, x1, y1) => {
      const gradient = g.createLinearGradient(x0, y0, x1, y1);
      gradient.addColorStop(0, 'rgba(40,30,40,0.55)');
      gradient.addColorStop(1, 'rgba(40,30,40,0)');
      g.fillStyle = gradient;
      g.fillRect(0, 0, 260, 180);
    };
    // A broad pool of light in the middle of the courtyard, dimming toward the walls.
    const pool = g.createRadialGradient(140, 90, 20, 130, 90, 175);
    pool.addColorStop(0, 'rgba(255,250,240,0)');
    pool.addColorStop(1, 'rgba(60,50,70,0.5)');
    g.fillStyle = pool;
    g.fillRect(0, 0, 260, 180);
    edge(0, 0, 0, 26);
    edge(0, 180, 0, 154);
    edge(0, 0, 26, 0);
    edge(260, 0, 234, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 9).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        map: texture,
        blending: THREE.MultiplyBlending,
        premultipliedAlpha: true,
        transparent: true,
        depthWrite: false,
        fog: false,
      }),
    );
    // Canvas u runs along world x, v along world z.
    plane.position.set(6, 0.004, 4);
    plane.renderOrder = 1;
    this.board.add(plane);

    // Warm torchlight pools, baked: under every wall torch, both gates and the braziers.
    const warm = document.createElement('canvas');
    warm.width = 300;
    warm.height = 220;
    const w = warm.getContext('2d');
    w.fillStyle = '#000';
    w.fillRect(0, 0, 300, 220);
    // Canvas u runs along world x from -1.5, v along world z from -1.5, 20 px per square.
    const glow = (x, z, radius, color) => {
      const u = (x + 1.5) * 20,
        v = (z + 1.5) * 20;
      const gradient = w.createRadialGradient(u, v, 0, u, v, radius * 20);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      w.fillStyle = gradient;
      w.fillRect(0, 0, 300, 220);
    };
    for (const x of [2.5, 6.5, 10.5]) {
      glow(x, -0.4, 2.2, 'rgba(255,150,70,0.34)');
      glow(x, 8.4, 2.2, 'rgba(255,150,70,0.34)');
    }
    glow(-0.4, 4, 2.6, 'rgba(255,70,30,0.55)');
    glow(12.9, 4, 2.4, 'rgba(255,170,80,0.45)');
    const warmMap = new THREE.CanvasTexture(warm);
    warmMap.colorSpace = THREE.SRGBColorSpace;
    const pools = new THREE.Mesh(
      new THREE.PlaneGeometry(15, 11).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: warmMap, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }),
    );
    pools.position.set(6, 0.006, 4);
    pools.renderOrder = 1;
    this.board.add(pools);
  }

  // Stone ramparts on three sides, a low parapet on the near side so nothing hides a square.
  buildRamparts() {
    const pieces = [];
    const block = (x0, x1, y0, y1, z0, z1) =>
      pieces.push(
        new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate(
          (x0 + x1) / 2,
          (y0 + y1) / 2,
          (z0 + z1) / 2,
        ),
      );
    const TALL = 0.78,
      LOW = 0.2;
    // Far wall, split for the horde gate.
    block(-1.35, -0.5, -0.6, TALL, -1.35, 3.1);
    block(-1.35, -0.5, -0.6, TALL, 4.9, 9.35);
    // Side walls.
    block(-1.35, 13.35, -0.6, TALL, -1.35, -0.5);
    block(-1.35, 13.35, -0.6, TALL, 8.5, 9.35);
    // Near parapet, split for the keep road.
    block(12.5, 13.35, -0.6, LOW, -0.5, 3.3);
    block(12.5, 13.35, -0.6, LOW, 4.7, 8.5);
    // Merlons along the outer edge of the tall walls.
    for (let x = -1.0; x < 13.2; x += 1.0) {
      block(x - 0.26, x + 0.26, TALL, TALL + 0.24, -1.35, -1.0);
      block(x - 0.26, x + 0.26, TALL, TALL + 0.24, 9.0, 9.35);
    }
    for (let z = -1.1; z < 9.2; z += 0.62) {
      if (z > 2.9 && z < 5.1) continue;
      block(-1.35, -1.05, TALL, TALL + 0.26, z - 0.15, z + 0.15);
    }
    const walls = new THREE.Mesh(
      worldUV(mergeGeometries(pieces), 0.34),
      this.stone('rampart', [132, 122, 106]),
    );
    walls.castShadow = walls.receiveShadow = true;
    this.board.add(walls);

    // Round towers at the four corners, taller and roofed at the far end.
    const roof = this.mat(SCENE.roof, 'soft');
    const tower = (x, z, radius, height, roofed) => {
      const body = this.add(
        worldUV(new THREE.CylinderGeometry(radius, radius * 1.08, height + 0.6, 14), 0.34),
        this.stone('rampart'),
        this.board,
        x,
        (height - 0.6) / 2,
        z,
      );
      const cap = this.add(
        new THREE.CylinderGeometry(radius * 1.12, radius * 1.02, 0.16, 14),
        this.stone('rampart'),
        this.board,
        x,
        height + 0.08,
        z,
      );
      if (roofed) {
        this.add(new THREE.ConeGeometry(radius * 1.25, radius * 1.7, 14), roof, this.board, x, height + 0.16 + radius * 0.85, z);
        this.add(GEO.orb, this.glow(SCENE.torch, 2.2), this.board, x + radius * 0.9, height - 0.25, z);
      }
      return { body, cap };
    };
    // Crimson banners hung on the inner face of the far wall.
    const cloth = new THREE.MeshStandardMaterial({ color: SCENE.banner, roughness: 0.75, side: THREE.DoubleSide });
    const trim = this.mat(SCENE.gold, 'metal');
    for (const z of [0.6, 2.0, 6.0, 7.4]) {
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.72).rotateY(Math.PI / 2), cloth);
      banner.position.set(-0.47, 0.36, z);
      banner.castShadow = true;
      this.board.add(banner);
      this.add(new THREE.BoxGeometry(0.04, 0.04, 0.6), trim, this.board, -0.46, 0.73, z);
      this.add(GEO.orb, this.glow(SCENE.gold, 1.4), this.board, -0.45, 0.22, z).scale.setScalar(0.5);
    }
    tower(-1.35, -1.35, 0.85, 1.7, true);
    tower(-1.35, 9.35, 0.85, 1.7, true);
    tower(13.35, -1.6, 0.6, 0.55, false);
    tower(13.35, 9.6, 0.6, 0.55, false);
    // Squat towers either side of the far gate.
    tower(-0.95, 2.6, 0.55, 1.45, true);
    tower(-0.95, 5.4, 0.55, 1.45, true);
  }

  // The horde gate: a real gatehouse. A stone block with an arched opening, a portcullis
  // hauled up into the arch, a tunnel lit red from the fire beyond, torches on both jambs and
  // a bridge over the moat. The keep gate: two stone posts with fire bowls, open oak doors and
  // a drawbridge, all lit gold.
  buildGates() {
    const stone = this.stone('rampart');
    // Gatehouse, drawn in the (z, y) plane and pushed through the wall along world -x.
    const face = new THREE.Shape();
    face.moveTo(-1.02, -0.6);
    face.lineTo(1.02, -0.6);
    face.lineTo(1.02, 1.28);
    face.lineTo(-1.02, 1.28);
    face.lineTo(-1.02, -0.6);
    const hole = new THREE.Path();
    hole.moveTo(-0.6, -0.6);
    hole.lineTo(0.6, -0.6);
    hole.lineTo(0.6, 0.48);
    hole.absarc(0, 0.48, 0.6, 0, Math.PI, false);
    hole.lineTo(-0.6, -0.6);
    face.holes.push(hole);
    const house = new THREE.ExtrudeGeometry(face, { depth: 0.9, bevelEnabled: false, curveSegments: 18 });
    house.rotateY(-Math.PI / 2).translate(-0.45, 0, 4);
    const pieces = [house];
    // Merlons on the gatehouse roof and a keystone over the arch.
    for (const z of [3.1, 3.55, 4.0, 4.45, 4.9]) pieces.push(new THREE.BoxGeometry(0.3, 0.2, 0.26).translate(-0.6, 1.38, z));
    pieces.push(new THREE.BoxGeometry(0.12, 0.24, 0.22).translate(-0.42, 1.08, 4));
    const gatehouse = new THREE.Mesh(worldUV(mergeGeometries(pieces.map((g) => (g.index ? g.toNonIndexed() : g))), 0.34), stone);
    gatehouse.castShadow = gatehouse.receiveShadow = true;
    this.board.add(gatehouse);
    // The fire beyond the tunnel: a dark back wall with a hot glow rising from its foot.
    const inferno = document.createElement('canvas');
    inferno.width = 64;
    inferno.height = 128;
    const ig = inferno.getContext('2d');
    const fire = ig.createLinearGradient(0, 128, 0, 0);
    fire.addColorStop(0, 'rgba(255,190,90,1)');
    fire.addColorStop(0.25, 'rgba(255,80,30,0.95)');
    fire.addColorStop(0.7, 'rgba(90,10,6,0.9)');
    fire.addColorStop(1, 'rgba(10,2,2,1)');
    ig.fillStyle = fire;
    ig.fillRect(0, 0, 64, 128);
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(1.25, 1.1).rotateY(Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(inferno), color: hot('#ffffff', 1.6), fog: false }),
    );
    back.position.set(-1.3, -0.05, 4);
    this.board.add(back);
    this.portal = back;
    const heat = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.9).rotateY(Math.PI / 2),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(glowCanvas('rgba(255,110,50,0.9)', 'rgba(255,40,10,0)')),
        color: hot(SCENE.portal, 1.6),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    );
    heat.position.set(-0.9, 0.05, 4);
    this.board.add(heat);
    this.portalHeat = heat;
    // Portcullis, hauled most of the way up: iron bars with spiked feet.
    const iron = this.mat(SCENE.iron, 'metal');
    const bars = [];
    for (const z of [-0.45, -0.22, 0, 0.22, 0.45]) {
      bars.push(new THREE.BoxGeometry(0.05, 0.9, 0.05).translate(0, 0.45, z));
      bars.push(new THREE.ConeGeometry(0.04, 0.12, 4).rotateX(Math.PI).translate(0, -0.05, z));
    }
    for (const y of [0.15, 0.5, 0.85]) bars.push(new THREE.BoxGeometry(0.05, 0.05, 1.1).translate(0, y, 0));
    const gate = new THREE.Mesh(mergeGeometries(bars.map((g) => g.toNonIndexed())), iron);
    gate.position.set(-0.62, 0.62, 4);
    gate.castShadow = true;
    this.board.add(gate);
    // The moat bridge and the road out to the war camp.
    const oak = this.mat(SCENE.oak);
    const planks = [];
    for (let x = -4.4; x < -1.3; x += 0.2) planks.push(new THREE.BoxGeometry(0.18, 0.06, 1.2).translate(x, -0.22, 4));
    for (const z of [3.38, 4.62]) {
      planks.push(new THREE.BoxGeometry(3.1, 0.06, 0.06).translate(-2.85, 0.02, z));
      for (let x = -4.3; x < -1.3; x += 0.75) planks.push(new THREE.BoxGeometry(0.07, 0.34, 0.07).translate(x, -0.12, z));
    }
    const keepPlanks = [];
    for (let x = 13.5; x < 16.6; x += 0.2) keepPlanks.push(new THREE.BoxGeometry(0.18, 0.06, 1.2).translate(x, -0.22, 4));
    for (const z of [3.38, 4.62]) keepPlanks.push(new THREE.BoxGeometry(3.1, 0.06, 0.06).translate(15.05, 0.02, z));
    const bridge = new THREE.Mesh(mergeGeometries([...planks, ...keepPlanks].map((g) => g.toNonIndexed())), oak);
    bridge.castShadow = bridge.receiveShadow = true;
    this.board.add(bridge);

    // Light pools on the ground at both gates.
    const pool = (x, color, size, power) => {
      const mesh = new THREE.Mesh(
        GEO.disc,
        new THREE.MeshBasicMaterial({
          map: new THREE.CanvasTexture(glowCanvas('rgba(255,255,255,0.8)', 'rgba(255,255,255,0)')),
          color: hot(color, power),
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          fog: false,
        }),
      );
      mesh.scale.setScalar(size);
      mesh.position.set(x, 0.02, 4);
      this.board.add(mesh);
      return mesh;
    };
    this.entryPool = pool(-0.2, SCENE.portal, 1.5, 0.3);
    this.exitPool = pool(12.7, SCENE.torch, 1.4, 0.28);

    this.flames = [];
    const flame = (x, y, z, scale = 1) => {
      const mesh = this.add(GEO.flame, this.glow(SCENE.torch, 4), this.board, x, y, z);
      mesh.scale.setScalar(scale);
      mesh.castShadow = false;
      this.flames.push(mesh);
      const halo = new THREE.Sprite(this.haloMaterial());
      halo.position.set(x, y + 0.14 * scale, z);
      halo.scale.setScalar(0.9 * scale);
      this.board.add(halo);
      return mesh;
    };
    this.flame = flame;
    // Keep gate: stone posts with fire bowls, and the oak doors swung open.
    for (const z of [3.18, 4.82]) {
      this.add(new THREE.BoxGeometry(0.34, 0.95, 0.34).translate(0, 0.475 - 0.3, 0), stone, this.board, 12.95, 0, z);
      this.add(new THREE.BoxGeometry(0.42, 0.08, 0.42), this.mat(SCENE.gold, 'metal'), this.board, 12.95, 0.68, z);
      this.add(new THREE.CylinderGeometry(0.2, 0.12, 0.14, 8), iron, this.board, 12.95, 0.79, z);
      flame(12.95, 0.84, z, 1.05);
    }
    const doorMat = new THREE.MeshStandardMaterial({ color: SCENE.oak, roughness: 0.8 });
    for (const [z, turn] of [
      [3.25, 0.95],
      [4.75, -0.95],
    ]) {
      const leaf = new THREE.Group();
      leaf.position.set(13.1, 0, z);
      leaf.rotation.y = turn;
      this.board.add(leaf);
      const side = z < 4 ? 1 : -1;
      this.add(new THREE.BoxGeometry(0.06, 0.62, 0.62).translate(0.03, 0.31 - 0.05, side * 0.31), doorMat, leaf);
      for (const y of [0.08, 0.46]) this.add(new THREE.BoxGeometry(0.075, 0.05, 0.64).translate(0.03, y, side * 0.31), iron, leaf);
    }
    // Torches on the far gate's jambs and along the inner faces of both side walls.
    for (const z of [2.6, 5.4]) flame(-0.35, 0.95, z, 0.75);
    const bracket = this.mat(SCENE.iron, 'metal');
    for (const x of [2.5, 6.5, 10.5]) {
      for (const z of [-0.42, 8.42]) {
        this.add(new THREE.BoxGeometry(0.08, 0.08, 0.16), bracket, this.board, x, 0.5, z + (z < 4 ? 0.02 : -0.02));
        this.add(new THREE.CylinderGeometry(0.06, 0.04, 0.12, 6), bracket, this.board, x, 0.58, z + (z < 4 ? 0.08 : -0.08));
        flame(x, 0.62, z + (z < 4 ? 0.08 : -0.08), 0.6);
      }
    }
  }

  haloMaterial() {
    if (!this.materials.has('halo')) {
      this.materials.set(
        'halo',
        new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(glowCanvas('rgba(255,170,80,0.55)', 'rgba(255,120,40,0)')),
          color: hot(SCENE.torch, 1.4),
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          transparent: true,
          fog: false,
        }),
      );
    }
    return this.materials.get('halo');
  }

  // The moat: dark water around the walls, rippled by a scrolling normal map.
  buildMoat() {
    const size = 128,
      canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const g = canvas.getContext('2d');
    const image = g.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x / size) * Math.PI * 2,
          v = (y / size) * Math.PI * 2;
        const nx = Math.cos(u * 3 + Math.sin(v * 2) * 1.5) * 0.5 + Math.cos(u * 7 + v * 5) * 0.25;
        const ny = Math.sin(v * 4 + Math.cos(u * 2) * 1.3) * 0.5 + Math.sin(v * 9 - u * 3) * 0.2;
        const i = (y * size + x) * 4;
        image.data[i] = 128 + nx * 90;
        image.data[i + 1] = 128 + ny * 90;
        image.data[i + 2] = 255;
        image.data[i + 3] = 255;
      }
    }
    g.putImageData(image, 0, 0);
    const normal = new THREE.CanvasTexture(canvas);
    normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
    normal.repeat.set(14, 14);
    this.water = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 90).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: SCENE.water,
        roughness: 0.22,
        metalness: 0.35,
        normalMap: normal,
        normalScale: new THREE.Vector2(0.35, 0.35),
        transparent: true,
        opacity: 0.94,
      }),
    );
    this.water.position.set(6, -0.44, 4);
    this.water.receiveShadow = true;
    this.board.add(this.water);
  }

  // Forest on every side, a horde war camp on the far flank, rocks and flowers between. The
  // canopies and trunks are instanced, so a few hundred trees cost a handful of draw calls.
  plantScenery() {
    const rand = seeded(17);
    const { tree, rock, flowers, stump } = BOARD_ART.props;
    const bark = this.mat(SCENE.bark);
    const outside = (x, z) => Math.hypot(Math.max(-1.6 - x, x - 13.6, 0), Math.max(-1.6 - z, z - 9.6, 0));
    const inCamp = (x, z) => z > 10.4 && z < 16 && x > -2.5 && x < 13.5;
    const onRoad = (x, z) => Math.abs(z - 4) < 1.3 && (x < -1 || x > 13);
    const trees = [];
    let guard = 0;
    // A software renderer (headless tests) gets a thin wood; a real GPU gets the forest.
    const want = this.software ? 60 : 240;
    while (trees.length < want && guard++ < 6000) {
      const x = -14 + rand() * 42,
        z = -16 + rand() * 40;
      const out = outside(x, z);
      if (out < 1.15 || inCamp(x, z) || onRoad(x, z)) continue;
      // Thicker woods further from the walls.
      if (rand() > 0.62 + Math.min(0.38, out / 6)) continue;
      const size = 1.9 + rand() * 1.5,
        height = 1.0 + rand() * 1.1;
      // Height reads as screen-up, so a tree beyond the keep wall must not climb over the board.
      if (x > 12 && z > -2.5 && z < 10.5 && x - 1.3 * (height + size * 0.5) < 13.9) continue;
      trees.push({ x, z, y: terrainHeight(x, z), size, height, art: Math.floor(rand() * tree.length), turn: (rand() - 0.5) * 1.2 });
    }
    const matrix = new THREE.Matrix4(),
      turn = new THREE.Quaternion(),
      spot = new THREE.Vector3(),
      size = new THREE.Vector3(),
      tint = new THREE.Color();
    // The woods stand outside the key light's shadow box, so they cast nothing: that keeps the
    // shadow pass to the keep itself.
    const trunks = new THREE.InstancedMesh(GEO.trunk, bark, trees.length);
    trees.forEach((t, i) => {
      matrix.compose(spot.set(t.x, t.y, t.z), turn.identity(), size.set(1.3, t.height, 1.3));
      trunks.setMatrixAt(i, matrix);
    });
    this.board.add(trunks);
    tree.forEach((art, index) => {
      const mine = trees.filter((t) => t.art === index);
      const canopies = new THREE.InstancedMesh(SPRITE_GEOMETRY, this.paint(art), mine.length);
      canopies.receiveShadow = true;
      mine.forEach((t, i) => {
        turn.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, t.turn);
        matrix.compose(spot.set(t.x, t.y + t.height, t.z), turn, size.set(t.size, 1, t.size));
        canopies.setMatrixAt(i, matrix);
        // Blue hour: the woods fall a little cooler and darker the further they stand.
        const shade = 0.75 + rand() * 0.25 - Math.min(0.25, outside(t.x, t.z) / 40);
        canopies.setColorAt(i, tint.setRGB(shade * 0.92, shade, shade * 1.05));
      });
      this.board.add(canopies);
    });
    // Rocks, flowers and stumps along the banks.
    for (let i = 0; i < 40; i++) {
      const x = -8 + rand() * 30,
        z = -9 + rand() * 26;
      const out = outside(x, z);
      if (out < 1.2 || out > 6 || inCamp(x, z) || onRoad(x, z)) continue;
      const roll = rand();
      const art = roll < 0.55 ? rock[Math.floor(rand() * rock.length)] : roll < 0.9 ? flowers[Math.floor(rand() * flowers.length)] : stump[0];
      const prop = this.sprite(art, roll < 0.55 ? 1 + rand() * 0.6 : 0.9);
      prop.position.set(x, terrainHeight(x, z) + 0.05 + i * 0.001, z);
      prop.rotation.y = (rand() - 0.5) * 0.9;
      this.board.add(prop);
    }
    this.buildCamp(rand);
  }

  // The horde's war camp on the far flank: tents, a stake line, siege engines, banners and
  // campfires that throw real light.
  buildCamp(rand) {
    const tents = [];
    for (let i = 0; i < 16; i++) {
      const x = -1.5 + rand() * 13.5,
        z = 11.1 + rand() * 4.2;
      if (tents.some((t) => Math.hypot(t.x - x, t.z - z) < 1.3)) continue;
      tents.push({ x, z, r: 0.5 + rand() * 0.3, h: 0.7 + rand() * 0.35, color: SCENE.tent[i % SCENE.tent.length], turn: rand() * Math.PI });
    }
    const cone = new THREE.ConeGeometry(1, 1, 4).translate(0, 0.5, 0);
    const cloth = new THREE.InstancedMesh(cone, new THREE.MeshStandardMaterial({ roughness: 0.85 }), tents.length);
    cloth.receiveShadow = true;
    const matrix = new THREE.Matrix4(),
      turn = new THREE.Quaternion(),
      spot = new THREE.Vector3(),
      size = new THREE.Vector3(),
      tint = new THREE.Color();
    tents.forEach((t, i) => {
      turn.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, t.turn);
      matrix.compose(spot.set(t.x, terrainHeight(t.x, t.z) - 0.02, t.z), turn, size.set(t.r, t.h, t.r));
      cloth.setMatrixAt(i, matrix);
      cloth.setColorAt(i, tint.set(t.color));
    });
    this.board.add(cloth);
    // A line of sharpened stakes facing the walls.
    const stake = new THREE.ConeGeometry(0.06, 0.5, 5).translate(0, 0.2, 0).rotateX(-0.5);
    const stakes = new THREE.InstancedMesh(stake, this.mat(SCENE.bark), 60);
    for (let i = 0; i < 60; i++) {
      const x = -2.2 + i * 0.26,
        z = 10.65 + Math.sin(i * 1.7) * 0.06;
      matrix.compose(spot.set(x, terrainHeight(x, z), z), turn.identity(), size.set(1, 1, 1));
      stakes.setMatrixAt(i, matrix);
    }
    this.board.add(stakes);
    // Siege engines parked between the tents.
    const engines = [
      [TOWER_LOOK.bloom.levels[1], 2.4, 12.4, 0.4],
      [TOWER_LOOK.thorn.levels[2], 8.6, 12.9, -0.3],
      [TOWER_LOOK.bloom.levels[0], 5.4, 15.0, 0.2],
    ];
    for (const [art, x, z, angle] of engines) {
      const engine = this.sprite(art, 1.25);
      engine.position.set(x, terrainHeight(x, z) + 0.08, z);
      engine.rotation.y = angle;
      this.board.add(engine);
    }
    // Horde banners on tall poles.
    const pole = this.mat(SCENE.iron, 'metal');
    const flag = new THREE.MeshStandardMaterial({ color: '#2a1512', roughness: 0.8, side: THREE.DoubleSide, emissive: '#1a0402' });
    this.flags = [];
    for (const [x, z] of [
      [0.5, 11.0],
      [4.5, 10.9],
      [9.5, 11.1],
      [12.4, 11.0],
      [-3.2, 3.0],
      [-3.2, 5.0],
    ]) {
      const y = terrainHeight(x, z);
      const stick = this.add(GEO.pole, pole, this.board, x, y, z);
      stick.scale.y = 1.9;
      const cloth = this.add(new THREE.PlaneGeometry(0.42, 0.62).translate(0, -0.31, 0.21).rotateY(Math.PI / 2), flag, this.board, x, y + 1.85, z);
      this.flags.push(cloth);
    }
    // Campfires: a glowing heart, a ring of stones, a warm pool on the ground and real light.
    this.campfires = [];
    const stones = this.stone('rampart');
    for (const [x, z] of [
      [1.2, 11.7],
      [6.4, 12.0],
      [10.8, 11.6],
      [3.8, 14.2],
    ]) {
      const y = terrainHeight(x, z);
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        this.add(new THREE.DodecahedronGeometry(0.07, 0), stones, this.board, x + Math.cos(a) * 0.2, y + 0.03, z + Math.sin(a) * 0.2);
      }
      this.flame(x, y + 0.02, z, 1.25);
      const glowPool = new THREE.Mesh(
        GEO.disc,
        new THREE.MeshBasicMaterial({
          map: new THREE.CanvasTexture(glowCanvas('rgba(255,255,255,0.8)', 'rgba(255,255,255,0)')),
          color: hot(SCENE.torch, 0.35),
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          fog: false,
        }),
      );
      glowPool.scale.setScalar(1.6);
      glowPool.position.set(x, y + 0.05, z);
      this.board.add(glowPool);
      this.campfires.push({ x, y, z });
    }
    if (!this.software) {
      const light = new THREE.PointLight(SCENE.torch, 5, 6, 1.6);
      light.position.set(5.5, terrainHeight(5.5, 12) + 1.1, 12);
      light.userData.base = 5;
      this.scene.add(light);
      this.torches.push(light);
    }
  }

  // Thin mist that drifts across the courtyard and hangs heavier over the moat and the woods.
  buildFog() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const g = canvas.getContext('2d');
    const rand = seeded(55);
    for (let i = 0; i < 70; i++) {
      const x = 40 + rand() * 176,
        y = 60 + rand() * 136,
        r = 20 + rand() * 50;
      const puff = g.createRadialGradient(x, y, 0, x, y, r);
      puff.addColorStop(0, 'rgba(255,255,255,0.16)');
      puff.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = puff;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const map = new THREE.CanvasTexture(canvas);
    this.wisps = [];
    for (let i = 0; i < (this.software ? 4 : 16); i++) {
      const material = new THREE.MeshBasicMaterial({ map, color: '#b7c8e8', transparent: true, depthWrite: false, opacity: 0 });
      const wisp = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), material);
      const width = 4 + rand() * 4;
      wisp.scale.set(width * 0.55, 1, width);
      wisp.position.set(-4 + rand() * 15, 0.35 + rand() * 0.5, -8 + rand() * 24);
      wisp.userData.speed = 0.12 + rand() * 0.18;
      wisp.renderOrder = 2;
      this.scene.add(wisp);
      this.wisps.push(wisp);
    }
  }

  updateFog(dt) {
    for (const wisp of this.wisps) {
      if (!this.calm) wisp.position.z -= wisp.userData.speed * dt;
      if (wisp.position.z < -9) wisp.position.z += 26;
      const { x, z } = wisp.position;
      // Barely there over the squares, so the board stays readable; thicker outside the walls.
      const over = x > -0.5 && x < 12.5 && z > -0.5 && z < 8.5;
      const edge = Math.min(1, Math.max(0, (z + 9) / 3), Math.max(0, (17 - z) / 3));
      wisp.material.opacity = (over ? 0.05 : 0.1) * edge;
    }
  }

  buildParticles() {
    const geometry = new THREE.BufferGeometry();
    this.pPos = new Float32Array(PARTICLES * 3);
    this.pTint = new Float32Array(PARTICLES * 3);
    this.pSize = new Float32Array(PARTICLES);
    this.pAlpha = new Float32Array(PARTICLES);
    geometry.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    geometry.setAttribute('tint', new THREE.BufferAttribute(this.pTint, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.pSize, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(this.pAlpha, 1));
    this.particleMaterial = new THREE.ShaderMaterial({
      ...ParticleShader,
      uniforms: { uScale: { value: 40 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.particles = new THREE.Points(geometry, this.particleMaterial);
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
    // Live particle state, kept in plain arrays.
    this.pool = Array.from({ length: PARTICLES }, () => ({
      life: 0,
      max: 1,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      size: 0.1,
      r: 1,
      g: 1,
      b: 1,
      gravity: 0,
      drag: 0,
    }));
    this.pNext = 0;
    this.moteTimer = 0;
    // Muzzle flashes: a small pool of additive cards that always face the camera.
    const flashMap = new THREE.CanvasTexture(glowCanvas('rgba(255,255,255,1)', 'rgba(255,255,255,0)'));
    this.flashes = Array.from({ length: 16 }, () => {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: flashMap, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }),
      );
      sprite.visible = false;
      sprite.userData.life = 0;
      this.scene.add(sprite);
      return sprite;
    });
    this.flashNext = 0;
  }

  muzzle(x, y, z, color, size) {
    const sprite = this.flashes[this.flashNext];
    this.flashNext = (this.flashNext + 1) % this.flashes.length;
    sprite.position.set(x, y, z);
    sprite.material.color.copy(hot(color, 3));
    sprite.userData.life = 0.12;
    sprite.userData.size = size;
    sprite.visible = true;
  }

  updateFlashes(dt) {
    for (const sprite of this.flashes) {
      if (!sprite.visible) continue;
      sprite.userData.life -= dt;
      const k = Math.max(0, sprite.userData.life / 0.12);
      sprite.scale.setScalar(sprite.userData.size * (0.5 + k * 0.7));
      sprite.material.opacity = k;
      if (k <= 0) sprite.visible = false;
    }
  }

  // Launch one particle. Colours are linear and may exceed 1 so they bloom.
  emit(x, y, z, vx, vy, vz, color, size, life, gravity = 0, drag = 1.5) {
    const p = this.pool[this.pNext];
    this.pNext = (this.pNext + 1) % PARTICLES;
    Object.assign(p, { x, y, z, vx, vy, vz, size, life, max: life, gravity, drag });
    p.r = color.r;
    p.g = color.g;
    p.b = color.b;
  }

  burst(x, y, z, color, count, speed, size, life, gravity = -4, power = 3) {
    if (this.calm) count = Math.ceil(count / 3);
    const tint = hot(color, power);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + i * 1.7,
        lift = 0.3 + ((i * 7) % 5) / 5;
      const s = speed * (0.55 + ((i * 13) % 7) / 10);
      this.emit(x, y, z, Math.cos(angle) * s, lift * s, Math.sin(angle) * s, tint, size * (0.7 + ((i * 3) % 4) / 6), life * (0.7 + ((i * 5) % 6) / 10), gravity);
    }
  }

  updateParticles(dt) {
    let live = 0;
    for (let i = 0; i < PARTICLES; i++) {
      const p = this.pool[i];
      if (p.life <= 0) {
        this.pAlpha[i] = 0;
        continue;
      }
      live++;
      p.life -= dt;
      const damp = Math.exp(-p.drag * dt);
      p.vx *= damp;
      p.vz *= damp;
      p.vy = p.vy * damp + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y < 0.02 && p.gravity < 0) {
        p.y = 0.02;
        p.vy *= -0.3;
      }
      const t = Math.max(0, p.life / p.max);
      this.pPos[i * 3] = p.x;
      this.pPos[i * 3 + 1] = p.y;
      this.pPos[i * 3 + 2] = p.z;
      this.pTint[i * 3] = p.r;
      this.pTint[i * 3 + 1] = p.g;
      this.pTint[i * 3 + 2] = p.b;
      this.pSize[i] = p.size * (0.4 + t * 0.6);
      this.pAlpha[i] = Math.min(1, t * 1.6);
    }
    const attributes = this.particles.geometry.attributes;
    for (const name of ['position', 'tint', 'size', 'alpha']) attributes[name].needsUpdate = true;
    return live;
  }

  // Floating text: coin pops and damage numbers, drawn by the page over the canvas.
  buildFloatLayer() {
    this.floatLayer = document.createElement('div');
    this.floatLayer.className = 'float-layer';
    this.floatLayer.setAttribute('aria-hidden', 'true');
    document.body.append(this.floatLayer);
    this.floats = 0;
  }

  floatText(x, y, z, text, kind) {
    if (this.floats > 36 || !this.renderer.domElement.isConnected) return;
    const at = this.worldScreen(x, y, z);
    const span = document.createElement('span');
    span.className = `float float-${kind}`;
    span.textContent = text;
    span.style.left = `${at.x}px`;
    span.style.top = `${at.y}px`;
    this.floatLayer.append(span);
    this.floats++;
    setTimeout(
      () => {
        span.remove();
        this.floats--;
      },
      kind === 'coin' ? 1100 : 750,
    );
  }

  // Coins that fly from a fallen creature into the gold counter in the header.
  coinFly(x, y, z, count) {
    if (this.calm || !this.renderer.domElement.isConnected) return;
    const goal = document.querySelector('.gold-total .coin-icon');
    if (!goal) return;
    const end = goal.getBoundingClientRect();
    const from = this.worldScreen(x, y, z);
    for (let i = 0; i < count && this.flying < 16; i++) {
      const coin = document.createElement('span');
      coin.className = 'coin-fly';
      coin.style.left = `${from.x}px`;
      coin.style.top = `${from.y}px`;
      document.body.append(coin);
      this.flying = (this.flying || 0) + 1;
      const dx = end.left + end.width / 2 - from.x,
        dy = end.top + end.height / 2 - from.y;
      const side = (i % 2 ? 1 : -1) * (30 + i * 14);
      const run = coin.animate(
        [
          { transform: 'translate(-50%,-50%) scale(0.4)', opacity: 0 },
          { transform: `translate(calc(-50% + ${side}px), calc(-50% - 46px)) scale(1.1)`, opacity: 1, offset: 0.25 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.6)`, opacity: 0.9 },
        ],
        { duration: 820 + i * 90, easing: 'cubic-bezier(.45,0,.7,1)', delay: i * 50 },
      );
      run.onfinish = () => {
        coin.remove();
        this.flying--;
        goal.parentElement?.classList.remove('gain');
        void goal.offsetWidth;
        goal.parentElement?.classList.add('gain');
      };
    }
  }

  buildHover() {
    const frame = [];
    for (const [w, d, x, z] of [
      [0.96, 0.06, 0, -0.45],
      [0.96, 0.06, 0, 0.45],
      [0.06, 0.84, -0.45, 0],
      [0.06, 0.84, 0.45, 0],
    ]) {
      frame.push(new THREE.BoxGeometry(w, 0.03, d).translate(x, 0, z));
    }
    this.hoverFrameMat = new THREE.MeshBasicMaterial({ color: hot(SCENE.hoverOk, 2.2), fog: false });
    this.hoverFillMat = new THREE.MeshBasicMaterial({
      color: hot(SCENE.hoverOk, 0.8),
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this.hover = new THREE.Group();
    this.hover.add(new THREE.Mesh(mergeGeometries(frame), this.hoverFrameMat));
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2), this.hoverFillMat);
    this.hover.add(fill);
    this.hover.visible = false;
    this.scene.add(this.hover);
  }

  // The build grid: faint gold lines on the squares that can take an engine, strongest
  // around the pointer, only while the player is placing. The road and built squares stay dark.
  buildGrid() {
    this.openCells = new Uint8Array(13 * 9);
    this.openTexture = new THREE.DataTexture(this.openCells, 13, 9, THREE.RedFormat, THREE.UnsignedByteType);
    this.openTexture.magFilter = this.openTexture.minFilter = THREE.NearestFilter;
    this.gridMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uOpen: { value: this.openTexture },
        uHover: { value: new THREE.Vector2(-9, -9) },
        uAlpha: { value: 0 },
        uColor: { value: hot('#ffd98a', 1.4) },
      },
      vertexShader: `varying vec2 vCell; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vCell = w.xz + 0.5; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        uniform sampler2D uOpen; uniform vec2 uHover; uniform float uAlpha; uniform vec3 uColor;
        varying vec2 vCell;
        void main() {
          vec2 idx = floor(vCell);
          float open = texture2D(uOpen, (idx + 0.5) / vec2(13.0, 9.0)).r;
          vec2 f = fract(vCell);
          float edge = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
          float line = 1.0 - smoothstep(0.012, 0.045, edge);
          float d = distance(idx, uHover);
          float near = exp(-d * d / 6.0);
          float a = uAlpha * open * (line * (0.07 + near * 0.32) + near * 0.035);
          gl_FragColor = vec4(uColor * a, a);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(13, 9).rotateX(-Math.PI / 2), this.gridMaterial);
    plane.position.set(6, 0.01, 4);
    plane.renderOrder = 3;
    this.scene.add(plane);
    this.gridPlane = plane;
  }

  updateOpenCells(points, towers) {
    this.openCells.fill(255);
    for (const p of points) this.openCells[p.z * 13 + p.x] = 0;
    for (const t of towers) if (t.x >= 0 && t.x < 13 && t.z >= 0 && t.z < 9) this.openCells[t.z * 13 + t.x] = 0;
    this.openTexture.needsUpdate = true;
  }

  buildRange() {
    this.range = new THREE.Group();
    this.rangeEdge = new THREE.Mesh(
      new THREE.RingGeometry(0.975, 1, 96).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: hot(SCENE.ring, 2), transparent: true, opacity: 0.9, depthWrite: false, fog: false }),
    );
    this.rangeFill = new THREE.Mesh(
      GEO.disc,
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(glowCanvas('rgba(255,255,255,0.0)', 'rgba(255,255,255,0.16)')),
        color: SCENE.ring,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    );
    this.range.add(this.rangeFill, this.rangeEdge);
    this.range.visible = false;
    this.scene.add(this.range);
  }

  // ---------------------------------------------------------------- engines and horde

  // One engine: a carved stone plinth that grows with level, the painted engine on top, gold
  // trim per level, and a glowing accent for the engines that burn or shine.
  makeTower(tower) {
    const group = new THREE.Group();
    group.position.set(tower.x, 0, tower.z);
    this.scene.add(group);
    const look = TOWER_LOOK[tower.type];
    const level = tower.level;
    const head = new THREE.Group();
    let body, top;
    if (look.shape === 'wall') {
      top = 0.3 + level * 0.06;
      body = this.add(GEO.wall, this.paint(BOARD_ART.apron, { cutout: false }), group);
      body.scale.set(1.0, top, 1.0);
    } else {
      top = 0.2 + level * 0.1;
      this.add(GEO.footing, this.stone('footing', [96, 90, 80]), group);
      body = this.add(GEO.plinth, this.stone('plinth', [150, 140, 124]), group);
      body.scale.set(1, top, 1);
      this.add(GEO.plinthCap, this.mat(SCENE.plinthCap, 'soft'), group, 0, top - 0.02, 0);
      top += 0.04;
      for (let i = 1; i < level; i++) {
        this.add(GEO.trim, this.mat(SCENE.gold, 'metal'), group, 0, top - 0.06 - (i - 1) * 0.09, 0).scale.setScalar(1.02);
      }
    }
    group.userData.body = body;
    // A soft contact shadow grounds the engine on the flagstones.
    const contact = new THREE.Mesh(GEO.blob, this.softShadow());
    contact.scale.setScalar(0.78);
    contact.position.y = 0.006;
    group.add(contact);
    head.position.y = top + 0.005;
    group.add(head);
    const size = look.shape === 'wall' ? 1.02 : 1.04;
    const sprite = this.sprite(look.levels[level - 1], size);
    if (look.shape === 'needle' || look.shape === 'catapult') {
      sprite.rotation.y = Math.PI / 2;
      head.rotation.y = -Math.PI / 2;
    }
    head.add(sprite);
    // Accents that bloom.
    const accent = new THREE.Group();
    accent.position.y = top;
    group.add(accent);
    if (tower.type === 'prism') {
      const crystal = this.add(GEO.crystal, this.glow('#b98cff', 3.2 + level * 0.6), accent, 0, 0.42, 0);
      crystal.scale.set(1, 1.6, 1).multiplyScalar(0.8 + level * 0.15);
      crystal.castShadow = false;
      accent.userData.spin = crystal;
    } else if (tower.type === 'ember') {
      const flame = this.add(GEO.flame, this.glow('#ff7a26', 4 + level), accent, 0, 0.02, 0);
      flame.scale.setScalar(0.8 + level * 0.25);
      flame.castShadow = false;
      accent.userData.flicker = flame;
    } else if (tower.type === 'lantern') {
      const pole = this.add(GEO.pole, this.mat(SCENE.gold, 'metal'), accent, 0.28, 0, -0.28);
      pole.scale.y = 0.55 + level * 0.12;
      const orb = this.add(GEO.orb, this.glow('#ffd36a', 4), accent, 0.28, 0.58 + level * 0.12, -0.28);
      orb.castShadow = false;
      accent.userData.pulse = orb;
    } else if (tower.type === 'sap') {
      const orb = this.add(GEO.orb, this.glow('#4fe0c4', 2.2), accent, 0, 0.06, 0);
      orb.scale.set(2.2, 0.35, 2.2);
      orb.castShadow = false;
      accent.userData.pulse = orb;
    }
    group.userData.accent = accent;
    group.userData.head = head;
    group.userData.level = level;
    group.userData.type = tower.type;
    group.userData.top = top;
    group.userData.recoil = 0;
    group.userData.aim = head.rotation.y;
    group.userData.lastShot = -9;
    return group;
  }

  disposeGroup(group) {
    group.removeFromParent();
  }

  disposeEnemy(group) {
    group.userData.sprite.material.dispose();
    group.removeFromParent();
  }

  // Sink the road along the current route and lay flowing chevrons on it.
  setPath(towers) {
    const key = towers.map((tower) => `${tower.x},${tower.z}`).join(';');
    if (key === this.pathKey) return;
    this.pathKey = key;
    this.route.clear();
    const points = path(towers) || [];
    this.layoutTiles(points);
    this.updateOpenCells(points, towers);
    const material = this.glow(SCENE.route, 1.6, 0.75);
    let index = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i],
        to = points[i + 1];
      const heading = Math.atan2(to.x - from.x, to.z - from.z);
      for (const k of [0.25, 0.75]) {
        const mark = new THREE.Mesh(GEO.chevron, material);
        mark.position.set(from.x + (to.x - from.x) * k, -0.14, from.z + (to.z - from.z) * k);
        mark.rotation.y = heading;
        mark.userData.index = index++;
        this.route.add(mark);
      }
    }
  }

  setBoost(game, lantern) {
    const key = lantern
      ? lantern.id + ':' + game.towers.map((tower) => `${tower.x},${tower.z},${tower.level}`).join()
      : '';
    if (key === this.boostKey) return;
    this.boostKey = key;
    this.boost.clear();
    if (!lantern) return;
    const reach = game.stats(lantern).range;
    const gold = TOWER_LOOK.lantern.color;
    for (const tower of game.towers) {
      if (tower.id === lantern.id || tower.type === 'hedge' || tower.type === 'lantern') continue;
      if (Math.hypot(tower.x - lantern.x, tower.z - lantern.z) > reach) continue;
      const halo = new THREE.Mesh(GEO.ring, this.glow(gold, 2.4, 0.9));
      halo.scale.setScalar(0.62);
      halo.position.set(tower.x, 0.03, tower.z);
      this.boost.add(halo);
      const length = Math.hypot(tower.x - lantern.x, tower.z - lantern.z);
      const rope = new THREE.Mesh(GEO.bolt, this.glow(gold, 2, 0.7));
      rope.scale.set(0.8, 0.8, length);
      rope.position.set((tower.x + lantern.x) / 2, 0.6, (tower.z + lantern.z) / 2);
      rope.lookAt(tower.x, 0.6, tower.z);
      this.boost.add(rope);
    }
  }

  clearTowerPreview() {
    if (!this.towerPreview) return;
    this.towerPreview.traverse((mesh) => {
      if (mesh.isMesh) mesh.material.dispose();
    });
    this.disposeGroup(this.towerPreview);
    this.towerPreview = null;
  }

  showTowerPreview(cell, type, blocked) {
    if (this.towerPreview?.userData.type !== type) {
      this.clearTowerPreview();
      this.towerPreview = this.makeTower({ ...cell, type, level: 1 });
      this.towerPreview.traverse((mesh) => {
        if (!mesh.isMesh) return;
        mesh.material = mesh.material.clone();
        mesh.userData.previewColor = mesh.material.color.clone();
        mesh.material.transparent = true;
        mesh.material.opacity = 0.6;
        mesh.material.depthWrite = false;
        mesh.castShadow = false;
      });
    }
    this.towerPreview.position.set(cell.x, 0.02, cell.z);
    this.towerPreview.traverse((mesh) => {
      if (mesh.isMesh)
        mesh.material.color.copy(
          blocked ? new THREE.Color(SCENE.hoverBlocked) : mesh.userData.previewColor,
        );
    });
  }

  showHover(cell, type, game, selected) {
    this.previewTowers = null;
    const valid = cell.x >= 0 && cell.x < 13 && cell.z >= 0 && cell.z < 9;
    const occupied = game.towers.some((tower) => tower.x === cell.x && tower.z === cell.z);
    const trial = [...game.towers, { x: cell.x, z: cell.z }];
    const blocked =
      valid &&
      type &&
      (occupied ||
        game.coins < TOWERS[type].cost ||
        ((cell.x === 0 || cell.x === 12) && cell.z === 4) ||
        !path(trial) ||
        game.enemies.some(
          (enemy) =>
            !enemy.flying &&
            ((Math.round(enemy.x) === cell.x && Math.round(enemy.z) === cell.z) ||
              (enemy.target?.x === cell.x && enemy.target?.z === cell.z) ||
              !path(trial, enemy.target || { x: Math.round(enemy.x), z: Math.round(enemy.z) })),
        ));
    this.hover.visible = valid && !!type;
    this.gridMaterial.uniforms.uHover.value.set(cell.x, cell.z);
    if (valid) {
      this.hover.position.set(cell.x, 0.02, cell.z);
      const color = blocked ? SCENE.hoverBlocked : SCENE.hoverOk;
      this.hoverFrameMat.color.copy(hot(color, 2.2));
      this.hoverFillMat.color.copy(hot(color, 0.8));
      if (type && !blocked) this.previewTowers = trial;
    }
    if (valid && type && !occupied && !game.lost && !game.won)
      this.showTowerPreview(cell, type, blocked);
    else this.clearTowerPreview();
    const ringFor = selected || (valid && type ? { type, x: cell.x, z: cell.z, level: 1 } : null);
    this.range.visible = !!ringFor && ringFor.type !== 'hedge';
    if (ringFor) {
      const radius = game.stats(ringFor).range;
      this.range.scale.set(radius, 1, radius);
      this.range.position.set(ringFor.x, 0.04, ringFor.z);
      const tint = new THREE.Color(TOWER_LOOK[ringFor.type].color).lerp(new THREE.Color('#ffe7b0'), 0.35);
      this.rangeEdge.material.color.copy(tint).multiplyScalar(2.2);
      this.rangeFill.material.color.copy(tint).multiplyScalar(0.7);
    }
  }

  // A short-lived moving mesh on shared geometry. `step` returns false when it is done.
  effect(mesh, life, step) {
    this.scene.add(mesh);
    this.effects.push({ mesh, life, max: life, step });
  }

  // Turn one game event into light and motion.
  playEvent(event, game) {
    if (event.type === 'shot') {
      const tower = game.towers.find((candidate) => candidate.id === event.tower),
        group = this.towerMeshes.get(event.tower);
      if (!tower) return;
      const type = event.towerType;
      const color = TOWER_LOOK[type].color;
      const top = group ? group.userData.top + 0.25 : 0.6;
      if (group) {
        if (type === 'thorn' || type === 'bloom')
          group.userData.aim = Math.atan2(event.x - tower.x, event.z - tower.z);
        group.userData.recoil = 1;
        group.userData.lastShot = this.clock;
      }
      const from = new THREE.Vector3(tower.x, top, tower.z),
        to = new THREE.Vector3(event.x, 0.3, event.z);
      // Muzzle flash: a bright bloom card and a few sparks thrown toward the target.
      const flashTint = { thorn: '#ffe2a8', sap: '#7af0d6', bloom: '#ffb070', prism: '#d7b8ff', ember: '#ff9a3c' }[type] || '#ffe2a8';
      this.muzzle(from.x, from.y, from.z, flashTint, type === 'bloom' ? 1.1 : 0.8);
      const aimX = (event.x - tower.x) * 1.6,
        aimZ = (event.z - tower.z) * 1.6;
      for (let i = 0; i < (this.calm ? 2 : 6); i++)
        this.emit(from.x, from.y, from.z, aimX * (0.4 + i * 0.12) + Math.sin(i * 2.1) * 0.5, 0.6 + (i % 3) * 0.3, aimZ * (0.4 + i * 0.12) + Math.cos(i * 2.1) * 0.5, hot(flashTint, 4), 0.1, 0.22, -3, 3);
      if (type === 'prism') {
        // An instant arcane beam.
        const beam = new THREE.Mesh(GEO.bolt, this.glow('#c9a2ff', 5, 0.9));
        const length = from.distanceTo(to);
        beam.position.copy(from).lerp(to, 0.5);
        beam.lookAt(to);
        beam.scale.set(2.2, 2.2, length);
        this.effect(beam, 0.16, (t) => beam.scale.set(2.2 * t, 2.2 * t, length));
        this.impact(to, '#c9a2ff', 9);
      } else if (type === 'ember') {
        // A gout of fire.
        const dir = to.clone().sub(from);
        for (let i = 0; i < (this.calm ? 3 : 9); i++) {
          const k = 0.8 + (i % 3) * 0.25;
          this.emit(from.x, from.y, from.z, dir.x * k * 2.4, dir.y * k * 2.4 + 0.4, dir.z * k * 2.4, hot(i % 2 ? '#ff9a3c' : '#ffcf6a', 3.5), 0.26, 0.38, 0.6, 3);
        }
        this.impact(to, '#ff7a26', 6, 0.3);
      } else {
        // A travelling projectile: bolt, catapult stone on an arc, or tar glob.
        const mesh =
          type === 'thorn'
            ? new THREE.Mesh(GEO.bolt, this.glow('#ffe0a0', 3.5))
            : new THREE.Mesh(GEO.glob, this.glow(type === 'sap' ? '#3bd6b4' : '#ffb070', type === 'sap' ? 2.2 : 2.8));
        const arc = type === 'bloom' ? 1.6 : type === 'sap' ? 0.8 : 0;
        const flight = type === 'thorn' ? 0.1 : 0.26;
        if (type === 'thorn') mesh.scale.set(1.3, 1.3, 0.6);
        if (type === 'bloom') mesh.scale.setScalar(1.3);
        const spot = new THREE.Vector3();
        const trail = hot(type === 'thorn' ? '#ffd9a0' : type === 'sap' ? '#3bd6b4' : '#ff9a50', type === 'sap' ? 1.8 : 2.6);
        this.effect(mesh, flight, (t) => {
          const k = 1 - t;
          spot.copy(from).lerp(to, k);
          spot.y += Math.sin(k * Math.PI) * arc;
          if (type === 'thorn') mesh.lookAt(to);
          mesh.position.copy(spot);
          if (!this.calm && t > 0) {
            this.emit(spot.x, spot.y, spot.z, 0, type === 'bloom' ? 0.3 : 0, 0, trail, type === 'bloom' ? 0.2 : 0.11, type === 'thorn' ? 0.14 : 0.3, type === 'sap' ? -2 : 0, 2);
          }
          if (t <= 0) this.impact(to, color, type === 'bloom' ? 14 : 7, type === 'bloom' ? 0.45 : 0.25);
          if (type === 'bloom' && t <= 0) this.kick(0.08);
        });
        mesh.position.copy(from);
      }
    }
    if (event.type === 'kill') {
      const look = ENEMY_LOOK[event.kind] || ENEMY_LOOK.grub;
      const reward = ENEMIES[event.kind]?.reward || 0;
      const big = event.kind === 'boss' || event.kind === 'warden' || event.kind === 'brood';
      this.burst(event.x, 0.35, event.z, '#ffcf6a', big ? 28 : 14, big ? 3.4 : 2.4, 0.16, 0.55, -5, 3);
      this.burst(event.x, 0.3, event.z, look.color, big ? 16 : 8, 1.6, 0.3, 0.5, -3, 1.2);
      this.shockwave(event.x, event.z, '#ffe2a0', big ? 1.4 : 0.7, 0.35);
      if (reward) {
        this.floatText(event.x, 0.9, event.z, `+${reward}`, 'coin');
        this.coinFly(event.x, 0.5, event.z, big ? 4 : reward >= 4 ? 2 : 1);
      }
      // A pale wisp rises from where it fell.
      for (let i = 0; i < (this.calm ? 1 : 5); i++)
        this.emit(event.x + Math.sin(i * 2.4) * 0.15, 0.3, event.z + Math.cos(i * 2.4) * 0.15, 0, 0.7 + i * 0.12, 0, hot('#c8d4ff', 0.9), 0.3, 0.8, 0, 1.2);
      if (event.kind === 'boss') this.kick(0.6);
      else if (big) this.kick(0.18);
    }
    if (event.type === 'leak') {
      this.shockwave(12, 4, '#ff3a2a', 2.6, 0.6);
      this.burst(12.2, 0.4, 4, '#ff4a30', 20, 3, 0.22, 0.6, -4, 3.5);
      this.kick(0.45);
      this.flash = Math.max(this.flash, 0.55);
    }
  }

  impact(at, color, count, size = 0.2) {
    this.burst(at.x, at.y, at.z, color, count, 2, size, 0.35, -5, 3.5);
  }

  shockwave(x, z, color, size, life) {
    const ring = new THREE.Mesh(
      GEO.ring,
      new THREE.MeshBasicMaterial({ color: hot(color, 1.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
    );
    ring.position.set(x, 0.06, z);
    this.effect(ring, life, (t) => {
      const k = 1 - t;
      ring.scale.setScalar(0.1 + size * (1 - (1 - k) * (1 - k)));
      ring.material.opacity = t;
      if (t <= 0) ring.material.dispose();
    });
  }

  kick(amount) {
    if (!this.calm) this.shake = Math.min(1, this.shake + amount);
  }

  // A newly built engine rises out of a dust ring; an upgrade throws a gold spiral.
  celebrate(tower, upgrade) {
    const color = upgrade ? '#ffd36a' : '#e8d2a8';
    this.shockwave(tower.x, tower.z, color, upgrade ? 1.1 : 0.9, 0.45);
    if (upgrade) {
      for (let i = 0; i < (this.calm ? 6 : 24); i++) {
        const angle = i * 0.8;
        this.emit(tower.x + Math.cos(angle) * 0.4, 0.2 + i * 0.03, tower.z + Math.sin(angle) * 0.4, -Math.sin(angle) * 0.9, 1.6 + (i % 4) * 0.3, Math.cos(angle) * 0.9, hot('#ffd36a', 4), 0.14, 0.9, 0, 1.2);
      }
      this.floatText(tower.x, 1.1, tower.z, `Level ${tower.level}`, 'level');
    } else {
      this.burst(tower.x, 0.1, tower.z, '#d9c3a0', 16, 1.8, 0.28, 0.5, -2, 0.7);
    }
  }

  // One creature: the painted figure stood up on a card that always faces the camera, so it
  // reads as a figure marching at the player rather than a decal on the floor. Its own
  // material copy carries the hit flash, the burn and the tar tint. A soft contact shadow sits
  // under the feet, and the card casts a real shadow from the key light.
  makeEnemy(enemy) {
    const group = new THREE.Group();
    this.scene.add(group);
    const look = ENEMY_LOOK[enemy.kind] || ENEMY_LOOK.grub;
    const blob = new THREE.Mesh(GEO.blob, this.softShadow());
    blob.scale.setScalar((look.sprite * 0.62) / look.scale);
    blob.position.y = 0.012;
    group.add(blob);
    group.userData.blob = blob;
    // Flyers keep their wingspan in check so they do not swallow the squares under them.
    const size = (look.sprite * STAND * (enemy.flying ? 0.72 : 1)) / look.scale;
    const body = new THREE.Group();
    body.quaternion.copy(this.camera.quaternion);
    group.add(body);
    const material = this.paint(look.art).clone();
    material.emissive = new THREE.Color(0, 0, 0);
    const sprite = new THREE.Mesh(STAND_GEOMETRY, material);
    sprite.scale.set(size, size, 1);
    sprite.castShadow = true;
    body.add(sprite);
    group.userData.body = body;
    group.userData.sprite = sprite;
    group.userData.size = size;
    group.userData.flash = 0;
    group.userData.step = (enemy.id * 1.37) % 6.28;
    // A health bar that always faces the camera.
    const bar = new THREE.Group();
    bar.quaternion.copy(this.camera.quaternion);
    const track = new THREE.Mesh(GEO.bar, this.glow('#0d0a08', 1, 0.85));
    track.scale.set(0.5, 0.075, 1);
    const fill = new THREE.Mesh(GEO.bar, this.glow('#8fe05a', 1.6));
    fill.scale.set(0.47, 0.05, 1);
    fill.position.z = 0.001;
    bar.add(track, fill);
    bar.renderOrder = 5;
    fill.renderOrder = 6;
    bar.visible = false;
    group.add(bar);
    group.userData.bar = bar;
    group.userData.hp = fill;
    group.scale.setScalar(look.scale);
    return group;
  }

  softShadow() {
    if (!this.materials.has('soft-shadow')) {
      this.materials.set(
        'soft-shadow',
        new THREE.MeshBasicMaterial({
          map: new THREE.CanvasTexture(glowCanvas('rgba(0,0,0,0.75)', 'rgba(0,0,0,0)')),
          transparent: true,
          depthWrite: false,
          fog: false,
        }),
      );
    }
    return this.materials.get('soft-shadow');
  }

  // A creature that has left the board: flash white, crumple and fade, then go.
  dropEnemy(group) {
    const { sprite, body, bar, blob } = group.userData;
    bar.visible = false;
    sprite.castShadow = false;
    sprite.material.transparent = true;
    sprite.material.depthWrite = false;
    const scale = sprite.scale.x;
    this.effects.push({
      mesh: group,
      life: 0.34,
      max: 0.34,
      step: (t) => {
        const k = 1 - t;
        sprite.material.emissive.setScalar(Math.max(0, 1.4 - k * 3));
        sprite.material.opacity = t;
        sprite.scale.set(scale * (1 + k * 0.35), scale * (1 - k * 0.7), 1);
        body.position.y -= 0.004;
        blob.material = this.softShadow();
        if (t <= 0) sprite.material.dispose();
      },
    });
  }

  // Match the meshes to the game, play its events, animate, and draw one frame.
  sync(game, gameDt) {
    // Effects run on the wall clock, uncapped, so they finish even when frames are slow.
    const now = performance.now();
    const dt = Math.min(0.5, this.lastFrame ? (now - this.lastFrame) / 1000 : gameDt);
    this.lastFrame = now;
    this.clock += dt;
    const t = this.clock;
    this.setPath(this.previewTowers || game.towers);
    this.setBoost(game, this.boostFrom);

    for (const [id, group] of this.towerMeshes) {
      const tower = game.towers.find((candidate) => candidate.id === id);
      if (!tower || tower.level !== group.userData.level) {
        this.disposeGroup(group);
        this.towerMeshes.delete(id);
        if (!tower) this.towerLevels.delete(id);
      }
    }
    for (const tower of game.towers) {
      if (!this.towerMeshes.has(tower.id)) {
        const group = this.makeTower(tower);
        this.towerMeshes.set(tower.id, group);
        const before = this.towerLevels.get(tower.id);
        this.towerLevels.set(tower.id, tower.level);
        // Only animate what the player just did, not a board loaded from a save.
        if (this.ready) {
          group.userData.born = t;
          this.celebrate(tower, before !== undefined && before < tower.level);
        }
      }
    }

    const alive = new Set(game.enemies.map((enemy) => enemy.id));
    for (const [id, group] of this.enemyMeshes) {
      if (!alive.has(id)) {
        if (this.ready) this.dropEnemy(group);
        else this.disposeEnemy(group);
        this.enemyMeshes.delete(id);
        this.enemyHp.delete(id);
      }
    }
    for (const enemy of game.enemies) {
      let group = this.enemyMeshes.get(enemy.id);
      if (!group) {
        group = this.makeEnemy(enemy);
        this.enemyMeshes.set(enemy.id, group);
        this.enemyHp.set(enemy.id, { hp: enemy.hp, pending: 0, timer: 0 });
        if (this.ready && enemy.x < 1) this.burst(enemy.x, 0.3, enemy.z, SCENE.portal, 10, 1.4, 0.26, 0.5, 0, 2.5);
      }
      const data = group.userData;
      const look = ENEMY_LOOK[enemy.kind] || ENEMY_LOOK.grub;
      const ground = enemy.flying ? 0 : ROAD_Y;
      const lift = enemy.flying ? 0.85 : 0;
      // March: a bounce per step, a little side to side rock, and a squash on each footfall.
      const pace = (enemy.slow > 0 ? 0.5 : 1) * (ENEMIES[enemy.kind]?.speed || 1);
      if (!this.calm) data.step += dt * (enemy.flying ? 9 : 7.5) * (0.6 + pace * 0.5);
      const beat = Math.sin(data.step);
      const bounce = this.calm ? 0 : enemy.flying ? beat * 0.07 : Math.abs(beat) * 0.07;
      group.position.set(enemy.x, ground, enemy.z);
      data.body.position.y = lift + bounce;
      const punch = 1 + data.flash * 0.12;
      const squash = enemy.flying ? 1 : 1 - (1 - Math.abs(beat)) * 0.05;
      const flap = enemy.flying && !this.calm ? 1 + Math.sin(data.step * 1.9) * 0.07 : 1;
      data.sprite.scale.set(data.size * punch * flap, data.size * punch * squash, 1);
      // Lean into the direction of travel across the screen (screen-right is world -z).
      let lean = this.calm ? 0 : beat * 0.05;
      if (enemy.target) {
        const dz = enemy.target.z - enemy.z;
        lean += THREE.MathUtils.clamp(dz, -1, 1) * 0.12;
      }
      data.sprite.rotation.z = THREE.MathUtils.lerp(data.sprite.rotation.z, lean, Math.min(1, dt * 10));
      data.bar.position.y = lift + data.size * 0.98 + 0.1;
      data.blob.material = this.softShadow();
      data.blob.scale.setScalar(((look.sprite * 0.62) / look.scale) * (enemy.flying ? 0.7 : 1 - bounce));
      data.blob.position.y = 0.012;
      const share = Math.max(0.01, enemy.hp / enemy.maxHp);
      data.bar.visible = share < 0.999;
      const fill = data.hp;
      fill.scale.x = 0.47 * share;
      fill.position.x = -0.235 * (1 - share);
      fill.material = this.glow(share > 0.6 ? '#6fc443' : share > 0.3 ? '#f0b030' : '#ff4a2c', 1.2);
      // Damage numbers, gathered per creature so a fast engine does not spray digits.
      const record = this.enemyHp.get(enemy.id);
      if (enemy.hp < record.hp - 0.01) {
        record.pending += record.hp - enemy.hp;
        // Burning ticks every frame; only a real hit gets the full white flash.
        data.flash = Math.max(data.flash, record.hp - enemy.hp > enemy.maxHp * 0.02 ? 1 : 0.25);
      }
      record.hp = enemy.hp;
      record.timer -= dt;
      data.flash = Math.max(0, data.flash - dt * 7);
      // Status tints: a white flash on a hit, embers while burning, cold tar teal when slowed.
      const burning = enemy.burnTime > 0;
      const glowing = data.sprite.material.emissive;
      glowing.setRGB(data.flash * 1.2, data.flash * 1.2, data.flash * 1.1);
      if (burning) {
        glowing.r += 0.35 + Math.sin(t * 20 + enemy.id) * 0.12;
        glowing.g += 0.1;
      }
      if (enemy.slow > 0) {
        glowing.g += 0.08;
        glowing.b += 0.12;
      }
      if (burning && !this.calm && Math.sin(t * 13 + enemy.id * 3) > 0.6)
        this.emit(enemy.x + Math.sin(t * 7 + enemy.id) * 0.12, ground + lift + data.size * 0.5, enemy.z, 0, 0.9, 0, hot('#ff8a30', 3), 0.1, 0.45, 0, 0.6);
      if (enemy.slow > 0 && !this.calm && Math.sin(t * 9 + enemy.id * 5) > 0.85)
        this.emit(enemy.x, ground + lift + data.size * 0.3, enemy.z, 0, -0.4, 0, hot('#3bd6b4', 1.6), 0.08, 0.4, -2, 0.4);
      if (record.pending >= 1 && record.timer <= 0) {
        this.floatText(enemy.x, ground + lift + data.size + 0.25, enemy.z, String(Math.round(record.pending)), 'hit');
        record.pending = 0;
        record.timer = 0.35;
      }
    }

    // A long fixed step can queue hundreds of shots. Play the newest ones only.
    const shots = game.events.filter((event) => event.type === 'shot');
    const skip = new Set(shots.slice(0, Math.max(0, shots.length - 40)));
    for (const event of game.events) if (!skip.has(event)) this.playEvent(event, game);
    this.ready = true;

    this.animate(dt, t);
    this.render(dt);
  }

  // Idle motion: tower pops, recoil, flames, crystals, chevrons, torches, motes.
  animate(dt, t) {
    const calm = this.calm;
    for (const group of this.towerMeshes.values()) {
      const data = group.userData;
      if (data.born !== undefined) {
        const age = (t - data.born) / 0.42;
        if (age >= 1) {
          delete data.born;
          group.scale.setScalar(1);
        } else {
          // Ease out with a small overshoot.
          const c = 1.9,
            k = age - 1;
          const s = 1 + (c + 1) * k * k * k + c * k * k;
          group.scale.set(1, Math.max(0.05, s), 1);
          group.position.y = (1 - age) * 0.25;
        }
      }
      if (data.recoil > 0) {
        data.recoil = Math.max(0, data.recoil - dt * 7);
        data.head.scale.setScalar(1 + data.recoil * 0.1);
        data.head.position.y = data.top + 0.005 - data.recoil * 0.025;
      }
      // Aiming engines swing toward their target, and scan slowly when nothing is in range.
      if (data.type === 'thorn' || data.type === 'bloom') {
        let aim = data.aim;
        if (!calm && t - data.lastShot > 1.6) aim += Math.sin(t * 0.7 + group.position.x * 1.3) * 0.35;
        const turn = Math.atan2(Math.sin(aim - data.head.rotation.y), Math.cos(aim - data.head.rotation.y));
        data.head.rotation.y += turn * Math.min(1, dt * (t - data.lastShot < 0.2 ? 30 : 4));
      }
      const accent = data.accent.userData;
      if (accent.spin && !calm) {
        accent.spin.rotation.y = t * 1.6;
        accent.spin.position.y = 0.42 + Math.sin(t * 2.2 + group.position.x) * 0.05;
      }
      if (accent.flicker && !calm) {
        const f = 1 + Math.sin(t * 17 + group.position.z * 3) * 0.12 + Math.sin(t * 29) * 0.06;
        accent.flicker.scale.y = f * (0.8 + data.level * 0.25);
      }
    }
    for (const flame of this.flames) {
      if (calm) break;
      flame.scale.y = (flame.userData.base ??= flame.scale.y) * (1 + Math.sin(t * 15 + flame.position.z * 5) * 0.14);
    }
    for (const light of this.torches) {
      light.intensity = light.userData.base * (calm ? 1 : 0.88 + Math.sin(t * 11 + light.position.z) * 0.08 + Math.sin(t * 23) * 0.05);
    }
    const gridGoal = this.hover.visible ? 1 : 0;
    this.gridMaterial.uniforms.uAlpha.value += (gridGoal - this.gridMaterial.uniforms.uAlpha.value) * Math.min(1, dt * 8);
    this.gridPlane.visible = this.gridMaterial.uniforms.uAlpha.value > 0.01;
    // The fire beyond the horde gate breathes; the camp banners stir.
    const breath = calm ? 1 : 0.85 + Math.sin(t * 2.4) * 0.1 + Math.sin(t * 7.3) * 0.05;
    this.portal.material.color.setScalar(1.6 * breath);
    this.portalHeat.material.opacity = breath;
    this.entryPool.material.opacity = 0.8 + (breath - 0.85) * 1.5;
    if (!calm) for (const [i, flag] of this.flags.entries()) flag.rotation.y = Math.sin(t * 1.7 + i * 1.3) * 0.25;
    this.updateFog(dt);
    if (this.water.material.normalMap && !calm) {
      this.water.material.normalMap.offset.set(t * 0.012, t * 0.007);
    }
    if (this.route.visible) {
      for (const mark of this.route.children) {
        const pulse = calm ? 0.5 : Math.max(0, Math.sin(t * 3 - mark.userData.index * 0.45));
        mark.scale.setScalar(0.75 + pulse * 0.45);
      }
    }
    // Drifting embers and fireflies over the board.
    if (!calm) {
      this.moteTimer -= dt;
      while (this.moteTimer < 0) {
        this.moteTimer += 0.12;
        const k = this.clock * 7.31;
        const x = ((Math.sin(k) * 0.5 + 0.5) * 18) - 3,
          z = ((Math.sin(k * 1.37 + 2) * 0.5 + 0.5) * 14) - 3;
        const ember = Math.sin(k * 3.1) > 0.2;
        this.emit(x, 0.2, z, Math.sin(k * 2) * 0.15, 0.25 + Math.abs(Math.sin(k)) * 0.2, Math.cos(k * 2) * 0.15, hot(ember ? '#ffae4a' : '#d8ff9a', ember ? 2.4 : 1.8), 0.07, 3.5, 0, 0.05);
      }
    }
  }

  render(dt) {
    for (const effect of this.effects) {
      effect.life -= dt;
      effect.step(Math.max(0, effect.life / effect.max));
      if (effect.life <= 0) effect.mesh.removeFromParent();
    }
    this.effects = this.effects.filter((effect) => effect.life > 0);
    this.updateParticles(dt);
    this.updateFlashes(dt);

    // Screen shake: a decaying offset on the camera, never on the board itself.
    this.camera.position.copy(this.target).add(VIEW);
    if (this.shake > 0.001) {
      const s = this.shake * this.shake * 0.35;
      this.camera.position.z += Math.sin(this.clock * 71) * s;
      this.camera.position.x += Math.sin(this.clock * 53 + 1) * s * 0.6;
      this.shake = Math.max(0, this.shake - dt * 2.2);
    }
    this.flash = Math.max(0, this.flash - dt * 1.4);
    this.grade.uniforms.uFlash.value = this.flash;
    this.composer.render(dt);
    this.adaptResolution(dt);
  }

  adaptResolution(dt) {
    this.frameCost += (Math.min(dt, 0.25) - this.frameCost) * 0.08;
    if (++this.frameCount % 45) return;
    let next = this.pixelRatio;
    if (this.frameCost > 1 / 45) next = Math.max(this.minRatio, this.pixelRatio * 0.85);
    else if (this.frameCost < 1 / 57) next = Math.min(this.maxRatio, this.pixelRatio * 1.08);
    if (Math.abs(next - this.pixelRatio) < 0.01) return;
    this.pixelRatio = next;
    this.renderer.setPixelRatio(next);
    this.resize();
  }

  // Fit the board into its own box on the page. The canvas may be larger than that box (on
  // desktop it runs under the HUD, edge to edge), so the frustum is shifted to centre the
  // board inside the box while the terrain fills the rest of the window.
  resize() {
    const canvas = this.renderer.domElement;
    const full = canvas.getBoundingClientRect(),
      box = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.round(full.width)),
      height = Math.max(1, Math.round(full.height));
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.setSize(width, height);
    
    const coarse = matchMedia('(pointer: coarse)').matches;
    // The squares must clear the floating phone controls at the bottom of the board.
    const inset = coarse
      ? { top: 12, bottom: 72, left: 8, right: 8 }
      : { top: 20, bottom: 24, left: 28, right: 28 };
    const fitWidth = Math.max(40, box.width - inset.left - inset.right),
      fitHeight = Math.max(40, box.height - inset.top - inset.bottom);
    const fitX = box.left - full.left + inset.left + fitWidth / 2,
      fitY = box.top - full.top + inset.top + fitHeight / 2;

    // Measure the board in camera space with the camera parked on the default target.
    this.camera.up.set(0, 1, 0);
    this.camera.position.copy(BOARD_CENTER).add(VIEW);
    this.camera.lookAt(BOARD_CENTER);
    this.camera.updateMatrixWorld();
    const inverse = this.camera.matrixWorldInverse;
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    const probe = new THREE.Vector3();
    const margin = coarse ? 0.55 : 0.75;
    for (const x of [-0.5 - margin, 12.5 + margin]) {
      for (const z of [-0.5 - margin * 0.6, 8.5 + margin * 0.6]) {
        for (const y of [0, x < 0 ? 0.9 : 0.2]) {
          probe.set(x, y, z).applyMatrix4(inverse);
          minX = Math.min(minX, probe.x);
          maxX = Math.max(maxX, probe.x);
          minY = Math.min(minY, probe.y);
          maxY = Math.max(maxY, probe.y);
        }
      }
    }
    const scale = Math.max((maxX - minX) / fitWidth, (maxY - minY) / fitHeight) / this.zoom;
    this.unitsPerPixel = scale;
    const midX = (minX + maxX) / 2,
      midY = (minY + maxY) / 2;
    this.camera.left = midX - fitX * scale;
    this.camera.right = this.camera.left + width * scale;
    this.camera.top = midY + fitY * scale;
    this.camera.bottom = this.camera.top - height * scale;
    this.camera.position.copy(this.target).add(VIEW);
    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.particleMaterial.uniforms.uScale.value = (this.pixelRatio / scale) * 1;
    this.grade.uniforms.uCenter.value.set(fitX / width, 1 - fitY / height);
    this.grade.uniforms.uAspect.value = width / height;
    for (const group of this.enemyMeshes.values()) {
      group.userData.bar.quaternion.copy(this.camera.quaternion);
      group.userData.body.quaternion.copy(this.camera.quaternion);
    }
  }

  // Where a world point sits on screen, in page coordinates.
  worldScreen(x, y, z) {
    const projected = new THREE.Vector3(x, y, z).project(this.camera),
      rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: rect.left + ((projected.x + 1) * rect.width) / 2,
      y: rect.top + ((1 - projected.y) * rect.height) / 2,
    };
  }

  cellScreen(x, z) {
    return this.worldScreen(x, 0, z);
  }
}

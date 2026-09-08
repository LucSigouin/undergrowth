// Three.js rendering for Undergrowth. This file owns the scene, the camera, the lights,
// the scenery around the board, and the meshes for towers, enemies, the route markers,
// and the shot and kill effects. It also handles pointer input on the canvas and turns it
// into board squares for main.js. It reads game state but never changes it, so all rules
// stay in game.js. Colours and symbols come from look.js.
import * as THREE from 'three';
import { TOWERS, path } from './game.js';
import { TOWER_LOOK, ENEMY_LOOK, SCENE } from './look.js';

// The reduced motion setting, watched so a change during play is picked up.
const calmQuery = matchMedia('(prefers-reduced-motion: reduce)');

// The 3D battlefield. Owns one canvas inside the given container and redraws it every frame.
export class World {
  // Build the scene, wire pointer and resize handling, and report clicks through the callbacks.
  constructor(container, onCell, onHover) {
    this.container = container;
    this.onCell = onCell;
    this.onHover = onHover;
    this.calm = calmQuery.matches;
    calmQuery.addEventListener('change', (event) => {
      this.calm = event.matches;
    });
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SCENE.sky);

    const coarsePointer = () => matchMedia('(pointer: coarse)').matches;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, coarsePointer() ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.setClearColor(SCENE.sky);
    container.prepend(this.renderer.domElement);

    this.camera = new THREE.OrthographicCamera();
    this.camera.position.set(18, 25, 25);
    this.target = new THREE.Vector3(6, 0, 4);
    this.camera.lookAt(this.target);

    // Depth comes from three lights, not from fog: warm sun, cool sky, and a soft bounce.
    this.scene.add(new THREE.HemisphereLight('#f4f6d8', '#4c5a3a', 0.9));
    const sun = new THREE.DirectionalLight('#fff3d2', 2.7);
    sun.position.set(-8, 19, 7);
    sun.castShadow = true;
    const shadowSize = coarsePointer() ? 1024 : 2048;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    Object.assign(sun.shadow.camera, {
      left: -23,
      right: 23,
      top: 23,
      bottom: -23,
      near: 0.1,
      far: 70,
    });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    this.scene.add(sun);
    const bounce = new THREE.DirectionalLight('#b9d2ae', 0.5);
    bounce.position.set(9, 6, -8);
    this.scene.add(bounce);

    this.materials = new Map();
    this.towerMeshes = new Map();
    this.enemyMeshes = new Map();
    this.effects = [];
    this.board = new THREE.Group();
    this.scene.add(this.board);
    this.farmGroup = new THREE.Group();
    this.scene.add(this.farmGroup);
    this.route = new THREE.Group();
    this.scene.add(this.route);
    this.boost = new THREE.Group();
    this.scene.add(this.boost);
    this.buildWorld();

    this.ray = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.hover = this.box(0.94, 0.045, 0.94, SCENE.hoverOk, this.scene, 0, 0.075, 0);
    this.hover.visible = false;
    this.range = this.flatRing(0.986, 1, SCENE.ring, 0.85, 64, true);
    this.range.visible = false;
    this.scene.add(this.range);
    // The Sunburst target ring. It only appears while the ability is armed.
    this.burst = this.flatRing(0.9, 1, '#f0a93c', 0.9, 64, true);
    this.burst.visible = false;
    this.scene.add(this.burst);
    this.zoom = 1;
    this.top = true;
    this.boostFrom = null;

    // Turn a pointer event into the board square under it.
    const pick = (event) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      this.ray.setFromCamera(this.pointer, this.camera);
      const point = new THREE.Vector3();
      this.ray.ray.intersectPlane(this.ground, point);
      return { x: Math.round(point.x), z: Math.round(point.z) };
    };

    // Pointer bookkeeping. A gesture is a drag or a pinch, and it must not count as a tap.
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
          // Two fingers: pinch to zoom.
          const [first, second] = [...pointers.values()],
            distance = Math.hypot(first.x - second.x, first.y - second.y);
          if (pinchDistance > 0) {
            this.zoom = THREE.MathUtils.clamp((this.zoom * distance) / pinchDistance, 1, 2.5);
            this.resize();
          }
          pinchDistance = distance;
          lastPan = null;
        } else if (gesture && this.zoom > 1 && lastPan) {
          // One finger while zoomed in: drag the camera target across the board.
          const scale = (this.camera.right - this.camera.left) / canvas.clientWidth;
          const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0),
            up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
          this.target
            .addScaledVector(right, -(pointer.x - lastPan.x) * scale)
            .addScaledVector(up, (pointer.y - lastPan.y) * scale);
          this.target.x = THREE.MathUtils.clamp(this.target.x, 0, 12);
          this.target.z = THREE.MathUtils.clamp(this.target.z, 0, 8);
          this.resize();
        }
        lastPan = { x: pointer.x, y: pointer.y };
      }
      if (!gesture) this.onHover(pick(event));
    });

    canvas.addEventListener('pointerup', (event) => {
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

    canvas.addEventListener('pointerleave', () => {
      this.hover.visible = false;
      this.previewTowers = null;
    });

    this.resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => this.resize());
    });
    this.resizeObserver.observe(container);
    this.resize();
  }

  // One shared material per colour and finish, so the board reuses a handful of materials.
  mat(color, finish = 'matte') {
    const key = color + finish;
    if (!this.materials.has(key)) {
      const settings = {
        matte: { roughness: 0.92, metalness: 0 },
        soft: { roughness: 0.7, metalness: 0 },
        gem: { roughness: 0.22, metalness: 0.15 },
        metal: { roughness: 0.4, metalness: 0.55 },
      }[finish];
      this.materials.set(key, new THREE.MeshStandardMaterial({ color, ...settings }));
    }
    return this.materials.get(key);
  }

  // A material that glows on its own, for lit cores, flames and markers.
  glow(color, opacity = 1) {
    const key = 'glow' + color + opacity;
    if (!this.materials.has(key)) {
      this.materials.set(
        key,
        new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity }),
      );
    }
    return this.materials.get(key);
  }

  // Add a mesh of the given geometry and colour to a parent at a position.
  mesh(geometry, color, parent, x = 0, y = 0, z = 0, finish = 'matte') {
    const object = new THREE.Mesh(geometry, this.mat(color, finish));
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }

  // Add a box.
  box(width, height, depth, color, parent, x = 0, y = 0, z = 0, finish = 'matte') {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    return this.mesh(geometry, color, parent, x, y, z, finish);
  }

  // Add a low polygon sphere.
  sphere(radius, color, parent, x, y, z, finish = 'matte') {
    const geometry = new THREE.IcosahedronGeometry(radius, 1);
    return this.mesh(geometry, color, parent, x, y, z, finish);
  }

  // Add a cylinder or cone, given a top and bottom radius.
  cylinder(topRadius, bottomRadius, height, color, parent, x, y, z, sides = 8, finish = 'matte') {
    const geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, height, sides);
    return this.mesh(geometry, color, parent, x, y, z, finish);
  }

  // A flat material for ground markers. Shared unless the caller needs to fade its own copy.
  markMat(color, opacity, own) {
    const key = 'mark' + color + opacity;
    if (own || !this.materials.has(key)) {
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      if (own) return material;
      this.materials.set(key, material);
    }
    return this.materials.get(key);
  }

  // A flat ring lying on the ground, used for ranges, targets and boost markers.
  flatRing(inner, outer, color, opacity = 1, segments = 64, own = false) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, segments),
      this.markMat(color, opacity, own),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.09;
    return ring;
  }

  // Build the static scenery: ground, board tiles, the heart tree, gateposts, and plants.
  buildWorld() {
    this.box(200, 0.2, 200, SCENE.sky, this.board, 0, -1.4, 0);
    this.box(14.6, 1.1, 10.6, SCENE.soil, this.board, 6, -0.75, 4);
    this.box(14.3, 0.22, 10.3, SCENE.rim, this.board, 6, -0.22, 4);
    this.box(14, 0.14, 10, SCENE.apron, this.board, 6, -0.06, 4, 'soft');
    for (let x = 0; x < 13; x++) {
      for (let z = 0; z < 9; z++) {
        const color = SCENE.tiles[(x + z) % 2 ? ((x * 7 + z * 11) % 2) + 2 : (x * 5 + z) % 2];
        this.box(0.955, 0.07, 0.955, color, this.board, x, 0.035, z, 'soft');
      }
    }

    // The lane the horde walks between: a paler strip so the straight line reads.
    for (let x = 0; x < 13; x++) {
      this.box(0.955, 0.012, 0.955, '#c9d9a4', this.board, x, 0.073, 4);
    }

    // The heart tree at the exit.
    this.cylinder(0.16, 0.25, 1.7, SCENE.bark, this.board, 13.05, 0.8, 4);
    for (const [x, y, z, radius] of [
      [13, 1.9, 4, 0.75],
      [12.6, 1.6, 4.15, 0.5],
      [13.45, 1.65, 4, 0.55],
    ]) {
      this.sphere(radius, SCENE.leaf, this.board, x, y, z, 'soft');
    }
    this.sphere(0.28, '#e8bf46', this.board, 13, 1.5, 4.5, 'soft');
    // A gold pad on the exit square, so the thing being defended is obvious.
    const exitPad = this.flatRing(0.3, 0.46, '#e8bf46', 0.85, 32);
    exitPad.position.set(12, 0.085, 4);
    this.board.add(exitPad);

    // The two gateposts at the entrance, and a dark pad on the square enemies walk in from.
    for (const z of [3.3, 4.7]) {
      this.box(0.3, 0.9, 0.3, '#efe6c6', this.board, -0.67, 0.35, z);
      this.sphere(0.16, '#c98f2f', this.board, -0.67, 0.9, z, 'soft');
    }
    const entryPad = this.flatRing(0.3, 0.46, '#9b4f38', 0.85, 32);
    entryPad.position.set(0, 0.085, 4);
    this.board.add(entryPad);

    // Deterministic landscaping, kept clear of clickable tiles.
    let seed = 17;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 48; i++) {
      const x = -0.4 + rand() * 13,
        z = i % 2 ? -0.95 : 8.98;
      const radius = 0.13 + rand() * 0.18;
      this.sphere(radius, ['#4f7a41', '#5d8a4c', '#71a05c'][i % 3], this.board, x, 0.11, z, 'soft');
      if (i % 5 === 0) {
        this.cylinder(0.025, 0.03, 0.28, '#5f7a45', this.board, x, 0.2, z);
        this.sphere(0.09, i % 3 ? '#f2e6b0' : '#d1735f', this.board, x, 0.38, z, 'soft');
      }
    }
    for (const [x, z] of [
      [-1.3, -0.6],
      [13.3, 9],
      [-1.4, 8.6],
    ]) {
      this.cylinder(0.13, 0.21, 1, SCENE.bark, this.board, x, 0.4, z);
      this.sphere(0.68, '#4c7742', this.board, x, 1.25, z, 'soft');
      this.sphere(0.46, '#659154', this.board, x + 0.2, 1.72, z, 'soft');
    }
    for (let i = 0; i < 7; i++) {
      const z = i % 2 ? 9.2 : -1.2;
      this.sphere(0.18 + rand() * 0.1, '#96a081', this.board, rand() * 12, -0.03, z);
    }
  }

  // Build the mesh group for one tower, including its rotating head and level pips.
  makeTower(tower) {
    const group = new THREE.Group();
    group.position.set(tower.x, 0, tower.z);
    this.scene.add(group);
    const look = TOWER_LOOK[tower.type];
    const color = look.color;
    // Every piece stands on a plate in its own colour, so the top down view still shows
    // which tower is which without reading a single label.
    this.cylinder(0.47, 0.5, 0.18, color, group, 0, 0.13, 0, 8, 'soft');
    this.cylinder(0.36, 0.38, 0.1, '#f6efd4', group, 0, 0.26, 0, 8, 'soft');
    const head = new THREE.Group();
    group.add(head);
    group.userData.head = head;

    if (look.shape === 'wall') {
      // A hedge is a solid block that fills its square, so a maze reads as a wall.
      this.box(0.92, 0.66, 0.92, color, group, 0, 0.45, 0, 'soft');
      this.box(0.72, 0.16, 0.72, '#79a45f', group, 0, 0.85, 0, 'soft');
      this.box(0.2, 0.2, 0.96, '#3e6a2c', group, 0, 0.62, 0);
      this.box(0.96, 0.2, 0.2, '#3e6a2c', group, 0, 0.62, 0);
    }
    if (look.shape === 'needle') {
      // A long barrel that swings toward its target, so the aim is visible from above.
      this.cylinder(0.2, 0.26, 0.42, '#a37c46', head, 0, 0.5, 0, 6);
      this.box(0.13, 0.13, 0.86, color, head, 0, 0.74, 0.3, 'soft');
      this.cylinder(0.2, 0.2, 0.14, '#f6efd4', head, 0, 0.75, -0.1, 8);
      this.sphere(0.11, color, head, 0, 0.9, 0.66, 'soft');
    }
    if (look.shape === 'well') {
      // Concentric rings around a full basin, the only round tower on the board.
      this.cylinder(0.4, 0.34, 0.36, '#3d6f68', head, 0, 0.48, 0, 24);
      this.cylinder(0.34, 0.34, 0.08, color, head, 0, 0.68, 0, 24, 'gem');
      this.cylinder(0.19, 0.19, 0.14, '#bdeade', head, 0, 0.74, 0, 20, 'gem');
      this.sphere(0.1, '#e8f7ee', head, 0, 0.84, 0, 'gem');
    }
    if (look.shape === 'flower') {
      // Six petals in a wheel. Nothing else on the board is petalled.
      this.cylinder(0.11, 0.16, 0.4, '#4f7a41', head, 0, 0.48, 0);
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6;
        const petal = this.sphere(0.19, color, head, 0, 0.72, 0, 'soft');
        petal.position.set(Math.cos(angle) * 0.27, 0.72, Math.sin(angle) * 0.27);
        petal.scale.set(1.15, 0.55, 1.15);
      }
      this.cylinder(0.15, 0.15, 0.1, '#f7e39a', head, 0, 0.8, 0, 16, 'soft');
    }
    if (look.shape === 'gem') {
      // A tall six sided crystal that catches the light, unlike anything else here.
      this.cylinder(0.28, 0.34, 0.3, '#4a4066', head, 0, 0.45, 0, 6);
      this.cylinder(0.26, 0.3, 0.5, color, head, 0, 0.83, 0, 6, 'gem');
      this.cylinder(0.02, 0.26, 0.34, '#cfc0f2', head, 0, 1.24, 0, 6, 'gem');
      this.sphere(0.07, '#f4eeff', head, 0, 1.42, 0, 'gem');
    }
    if (look.shape === 'brazier') {
      // A stone bowl with three flames standing up out of it.
      this.cylinder(0.24, 0.34, 0.34, '#6d5a48', head, 0, 0.46, 0, 8);
      this.cylinder(0.38, 0.3, 0.14, '#8a7358', head, 0, 0.68, 0, 8);
      this.cylinder(0.3, 0.3, 0.06, color, head, 0, 0.76, 0, 16, 'soft');
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3;
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 6), this.glow('#f3a83a'));
        flame.position.set(Math.cos(angle) * 0.14, 0.98, Math.sin(angle) * 0.14);
        head.add(flame);
      }
      const core = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.5, 6), this.glow('#fbe08a'));
      core.position.set(0, 1.05, 0);
      head.add(core);
    }
    if (look.shape === 'lamp') {
      // A square lamp on four posts with a lit core, the only square top on the board.
      for (const [x, z] of [
        [-0.22, -0.22],
        [0.22, -0.22],
        [-0.22, 0.22],
        [0.22, 0.22],
      ]) {
        this.box(0.07, 0.6, 0.07, '#7d6a45', head, x, 0.6, z);
      }
      this.box(0.56, 0.1, 0.56, '#f6efd4', head, 0, 0.95, 0, 'soft');
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.34, 0.4), this.glow(color, 0.92));
      lens.position.set(0, 1.17, 0);
      head.add(lens);
      this.cylinder(0.06, 0.3, 0.2, '#7d6a45', head, 0, 1.42, 0, 4);
      const spark = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 1), this.glow('#fff6cc'));
      spark.position.set(0, 1.17, 0);
      head.add(spark);
    }

    for (let i = 1; i < tower.level; i++) {
      const pip = this.sphere(0.065, '#fff3bd', group, 0, 0.29, 0, 'soft');
      pip.position.set(-0.2 + (i - 1) * 0.2, 0.29, 0.42);
    }
    group.userData.level = tower.level;
    group.userData.type = tower.type;
    return group;
  }

  // Free the geometry inside a group and take it out of the scene.
  disposeGroup(group) {
    group.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
    });
    group.removeFromParent();
  }

  // Redraw the enemy route as chevrons pointing at the exit, when the maze layout changed.
  setPath(towers) {
    const key = towers.map((tower) => `${tower.x},${tower.z}`).join(';');
    if (key === this.pathKey) return;
    this.pathKey = key;
    for (const child of [...this.route.children]) this.disposeGroup(child);
    const points = path(towers) || [];
    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i],
        to = points[i + 1];
      const heading = Math.atan2(to.x - from.x, to.z - from.z);
      // Two chevrons per step. A chevron shows the direction a dot cannot.
      for (const k of [0.15, 0.62]) {
        const x = from.x + (to.x - from.x) * k;
        const z = from.z + (to.z - from.z) * k;
        const mark = new THREE.Mesh(
          new THREE.ConeGeometry(0.15, 0.3, 3),
          this.glow(SCENE.route, 0.85),
        );
        mark.position.set(x, 0.082, z);
        mark.rotation.set(Math.PI / 2, 0, 0);
        mark.rotation.z = -heading;
        this.route.add(mark);
      }
    }
  }

  // Ring every tower a Lantern is speeding up, and rope each one back to the Lantern.
  setBoost(game, lantern) {
    const key = lantern
      ? lantern.id + ':' + game.towers.map((tower) => `${tower.x},${tower.z},${tower.level}`).join()
      : '';
    if (key === this.boostKey) return;
    this.boostKey = key;
    for (const child of [...this.boost.children]) this.disposeGroup(child);
    if (!lantern) return;
    const reach = game.stats(lantern).range;
    for (const tower of game.towers) {
      if (tower.id === lantern.id || tower.type === 'hedge' || tower.type === 'lantern') continue;
      if (Math.hypot(tower.x - lantern.x, tower.z - lantern.z) > reach) continue;
      const halo = this.flatRing(0.56, 0.72, TOWER_LOOK.lantern.color, 0.95, 24);
      halo.position.set(tower.x, 0.1, tower.z);
      this.boost.add(halo);
      // A short bar from the Lantern to the tower it is helping.
      const length = Math.hypot(tower.x - lantern.x, tower.z - lantern.z);
      const rope = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.02, length),
        this.glow(TOWER_LOOK.lantern.color, 0.7),
      );
      rope.position.set((tower.x + lantern.x) / 2, 0.1, (tower.z + lantern.z) / 2);
      rope.rotation.y = Math.atan2(tower.x - lantern.x, tower.z - lantern.z);
      this.boost.add(rope);
      const pip = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 1), this.glow('#ffe985'));
      pip.position.set(tower.x, 1.5, tower.z);
      this.boost.add(pip);
    }
  }

  // Move the hover square and range ring, and preview how a new wall would bend the route.
  showHover(cell, type, game, selected) {
    this.previewTowers = null;
    const valid = cell.x >= 0 && cell.x < 13 && cell.z >= 0 && cell.z < 9;
    // While Sunburst is armed the pointer is a target, not a building site.
    if (this.aiming) {
      this.hover.visible = false;
      this.range.visible = false;
      this.burst.visible = valid;
      this.burst.scale.setScalar(3);
      if (valid) this.burst.position.set(cell.x, 0.1, cell.z);
      return;
    }
    this.burst.visible = false;
    this.hover.visible = valid && !!type;
    if (valid) {
      this.hover.position.set(cell.x, 0.08, cell.z);
      const blocked =
        game.towers.some((tower) => tower.x === cell.x && tower.z === cell.z) ||
        !path([...game.towers, { x: cell.x, z: cell.z }]) ||
        ((cell.x === 0 || cell.x === 12) && cell.z === 4);
      this.hover.material = this.mat(blocked ? SCENE.hoverBlocked : SCENE.hoverOk, 'soft');
      if (type && !blocked) this.previewTowers = [...game.towers, { x: cell.x, z: cell.z }];
    }
    const ringFor = selected || (valid && type ? { type, x: cell.x, z: cell.z, level: 1 } : null);
    this.range.visible = !!ringFor && ringFor.type !== 'hedge';
    if (ringFor) {
      const radius = game.stats(ringFor).range;
      this.range.scale.set(radius, radius, 1);
      this.range.position.set(ringFor.x, 0.09, ringFor.z);
      this.range.material.color.set(TOWER_LOOK[ringFor.type].color);
    }
  }

  // A mesh that owns its own material, because an effect fades and shared materials cannot.
  effectMesh(geometry, color, opacity = 1) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
    return mesh;
  }

  // Add one short lived mesh to the effect list, with an optional velocity.
  spark(mesh, life, velocity) {
    this.effects.push({
      mesh,
      life,
      max: life,
      v: this.calm ? null : velocity,
      from: mesh.material.opacity,
    });
  }

  // Turn one game event into meshes: a beam and flash for a shot, sparks for a kill.
  playEvent(event, game) {
    if (event.type === 'shot') {
      const tower = game.towers.find((candidate) => candidate.id === event.tower),
        group = this.towerMeshes.get(event.tower);
      if (!tower) return;
      if (group) {
        group.userData.head.rotation.y = Math.atan2(event.x - tower.x, event.z - tower.z);
      }
      const color = TOWER_LOOK[event.towerType].color;
      const from = new THREE.Vector3(tower.x, 0.85, tower.z),
        to = new THREE.Vector3(event.x, 0.4, event.z);
      const length = from.distanceTo(to);
      // A solid bolt rather than a hairline, so a shot is visible at a glance.
      const bolt = this.effectMesh(new THREE.BoxGeometry(0.08, 0.08, length), color, 0.95);
      bolt.position.copy(from).lerp(to, 0.5);
      bolt.lookAt(to);
      this.spark(bolt, 0.14);
      const flash = this.effectMesh(new THREE.IcosahedronGeometry(0.16, 1), '#fff8d8');
      flash.position.copy(from);
      this.spark(flash, 0.1);
      const hit = this.effectMesh(new THREE.IcosahedronGeometry(0.18, 1), color, 0.9);
      hit.position.copy(to);
      this.spark(hit, 0.18);
    }
    // An ability throws a ring of sparks out from the square it was aimed at.
    if (event.type === 'ability') {
      const tint = event.id === 'rootgrip' ? '#5d8a4c' : '#f0a93c';
      const shock = this.flatRing(0.3, 2.9, tint, 0.5, 48, true);
      shock.position.set(event.x, 0.11, event.z);
      this.scene.add(shock);
      this.spark(shock, 0.5);
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI * 2) / 12;
        const bit = this.effectMesh(new THREE.IcosahedronGeometry(0.13, 1), tint);
        bit.position.set(event.x, 0.4, event.z);
        this.spark(bit, 0.55, new THREE.Vector3(Math.cos(angle) * 4, 0.6, Math.sin(angle) * 4));
      }
    }
    if (event.type === 'kill') {
      const puff = this.flatRing(0.05, 0.55, '#fff3bd', 0.8, 24, true);
      puff.position.set(event.x, 0.1, event.z);
      this.scene.add(puff);
      this.spark(puff, 0.35);
      for (let i = 0; i < 7; i++) {
        const bit = this.effectMesh(new THREE.IcosahedronGeometry(0.08, 1), '#f0d05e');
        bit.position.set(event.x, 0.35, event.z);
        this.spark(bit, 0.4, new THREE.Vector3(Math.sin(i * 7) * 1.6, 1.4, Math.cos(i * 7) * 1.6));
      }
    }
    // A leak flashes red at the heart tree, so losing a life is never silent.
    if (event.type === 'leak') {
      const alarm = this.flatRing(0.4, 2.2, '#c14a32', 0.65, 40, true);
      alarm.position.set(12, 0.12, 4);
      this.scene.add(alarm);
      this.spark(alarm, 0.6);
    }
  }

  // Build the mesh group for one enemy, with its shadow, eyes, legs and health bar.
  makeEnemy(enemy) {
    const group = new THREE.Group();
    this.scene.add(group);
    const look = ENEMY_LOOK[enemy.kind] || ENEMY_LOOK.grub;
    // A dark disc under every creature. It is what makes them read against the tiles.
    const blot = this.flatRing(0, look.size * 1.5, SCENE.shadow, 0.28, 20);
    blot.position.y = -0.26;
    group.add(blot);
    const body = this.sphere(look.size, look.color, group, 0, 0.28, 0, 'soft');
    body.scale.z = 1.25;
    // A pale collar around the body, so a dark creature still has an edge on dark ground.
    const collar = this.flatRing(look.size * 0.95, look.size * 1.2, '#f6f2d8', 0.75, 20);
    collar.position.y = 0.12;
    group.add(collar);
    // A brood sac wears the litter it is about to release on its back.
    if (enemy.kind === 'brood') {
      for (const [x, z] of [
        [-0.16, -0.1],
        [0.16, -0.1],
        [0, -0.24],
      ]) {
        this.sphere(0.12, '#c25b7d', group, x, 0.5, z, 'soft');
      }
    }
    // A warden carries three shield plates that ride around it.
    if (enemy.kind === 'warden') {
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3;
        const plate = this.box(0.05, 0.32, 0.28, '#8fc4ab', group, 0, 0.34, 0, 'gem');
        plate.position.set(Math.cos(angle) * 0.36, 0.34, Math.sin(angle) * 0.36);
        plate.rotation.y = -angle;
      }
    }
    // A guardian wears a crown, because the boss should be obvious before it arrives.
    if (enemy.kind === 'boss') {
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 4), this.glow('#f0d05e'));
        spike.position.set(Math.cos(angle) * 0.24, 0.58, Math.sin(angle) * 0.24);
        group.add(spike);
      }
    }
    for (const x of [-0.085, 0.085]) {
      this.sphere(0.05, '#fdf8e6', group, x, 0.37, 0.22, 'soft');
      this.sphere(0.026, '#22261d', group, x, 0.37, 0.259);
    }
    if (enemy.flying) {
      for (const x of [-0.3, 0.3]) {
        const wing = this.sphere(0.26, '#e4dcf0', group, x, 0.32, 0, 'soft');
        wing.scale.set(1, 0.12, 1.1);
      }
      group.userData.wings = group.children.slice(-2);
    } else {
      for (const x of [-0.23, 0.23]) {
        for (const z of [-0.13, 0.13]) {
          this.box(0.14, 0.07, 0.07, '#43382c', group, x, 0.14, z);
        }
      }
    }
    const track = this.box(0.54, 0.05, 0.06, '#2c3327', group, 0, 0.84, 0, 'soft');
    track.castShadow = false;
    const healthBar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.055, 0.05), this.glow('#8fce54'));
    healthBar.position.set(0, 0.84, 0.01);
    group.add(healthBar);
    group.userData.hp = healthBar;
    group.scale.setScalar(look.scale);
    return group;
  }

  // Match the meshes to the current game state, play the queued effects, and draw one frame.
  sync(game, dt) {
    this.setPath(this.previewTowers || game.towers);
    this.setBoost(game, this.boostFrom);

    // Drop tower meshes that no longer match a tower, then build any that are missing.
    for (const [id, group] of this.towerMeshes) {
      const stillCurrent = game.towers.some(
        (tower) => tower.id === id && tower.level === group.userData.level,
      );
      if (!stillCurrent) {
        this.disposeGroup(group);
        this.towerMeshes.delete(id);
      }
    }
    for (const tower of game.towers) {
      if (!this.towerMeshes.has(tower.id)) {
        this.towerMeshes.set(tower.id, this.makeTower(tower));
      }
    }

    // Same for enemies: drop the dead, build the new, then move them all.
    for (const [id, group] of this.enemyMeshes) {
      if (!game.enemies.some((enemy) => enemy.id === id)) {
        this.disposeGroup(group);
        this.enemyMeshes.delete(id);
      }
    }
    for (const enemy of game.enemies) {
      let group = this.enemyMeshes.get(enemy.id);
      if (!group) {
        group = this.makeEnemy(enemy);
        this.enemyMeshes.set(enemy.id, group);
      }
      const bob = enemy.flying
        ? 0.8 + (this.calm ? 0 : Math.sin(game.time * 8) * 0.08)
        : this.calm
          ? 0
          : Math.sin(game.time * 12 + enemy.id) * 0.025;
      group.position.set(enemy.x, bob, enemy.z);
      const share = Math.max(0.01, enemy.hp / enemy.maxHp);
      group.userData.hp.scale.x = share;
      group.userData.hp.position.x = -0.25 * (1 - share) * group.scale.x;
      // Green while healthy, amber when worn down, red when nearly gone.
      group.userData.hp.material = this.glow(
        share > 0.6 ? '#8fce54' : share > 0.3 ? '#e8b62c' : '#d0492c',
      );
      if (enemy.target) {
        group.rotation.y = Math.atan2(enemy.target.x - enemy.x, enemy.target.z - enemy.z);
      }
    }

    for (const event of game.events) this.playEvent(event, game);

    // Age the effects, fade them out, and clean up anything that has expired.
    for (const effect of this.effects) {
      effect.life -= dt;
      if (effect.v) effect.mesh.position.addScaledVector(effect.v, dt);
      effect.mesh.material.opacity = Math.max(0, effect.from * (effect.life / effect.max));
      if (effect.life <= 0) {
        effect.mesh.geometry.dispose();
        effect.mesh.material.dispose();
        effect.mesh.removeFromParent();
      }
    }
    this.effects = this.effects.filter((effect) => effect.life > 0);
    this.renderer.render(this.scene, this.camera);
  }

  // Refit the camera to the container. Portrait phones turn the board to make squares larger.
  resize() {
    const width = this.container.clientWidth,
      height = this.container.clientHeight;
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    const coarse = matchMedia('(pointer: coarse)').matches;
    const portrait = coarse && width < height;
    // Fit the board to the shorter side, leaving a margin for the controls that float
    // over it. Portrait turns the board, so the spans swap with it.
    const pad = coarse ? 1.3 : 1.2;
    const spanX = (portrait ? 9 : 13) + pad * 2;
    const spanY = (portrait ? 13 : 9) + pad * 2;
    const across = Math.max(spanX, spanY * aspect) / this.zoom;
    this.camera.left = -across / 2;
    this.camera.right = across / 2;
    this.camera.top = across / aspect / 2;
    this.camera.bottom = -across / aspect / 2;
    this.camera.up.set(portrait ? -1 : 0, 0, portrait ? 0 : -1);
    this.camera.position.copy(this.target).add(new THREE.Vector3(0, 30, 0));
    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();
  }

  // Where a board square sits on screen, in page coordinates. Used to anchor the interface.
  cellScreen(x, z) {
    const projected = new THREE.Vector3(x, 0, z).project(this.camera),
      rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: rect.left + ((projected.x + 1) * rect.width) / 2,
      y: rect.top + ((1 - projected.y) * rect.height) / 2,
    };
  }
}

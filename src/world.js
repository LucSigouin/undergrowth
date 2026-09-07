// Three.js rendering for Undergrowth. This file owns the scene, the camera, the lights,
// the scenery around the board, and the meshes for towers, enemies, the route markers,
// and the shot and kill effects. It also handles pointer input on the canvas and turns it
// into board squares for main.js. It reads game state but never changes it, so all rules
// stay in game.js.
import * as THREE from 'three';
import { TOWERS, path } from './game.js';

// The 3D battlefield. Owns one canvas inside the given container and redraws it every frame.
export class World {
  // Build the scene, wire pointer and resize handling, and report clicks through the callbacks.
  constructor(container, onCell, onHover) {
    this.container = container;
    this.onCell = onCell;
    this.onHover = onHover;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#dce4ce');

    const coarsePointer = () => matchMedia('(pointer: coarse)').matches;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, coarsePointer() ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setClearColor('#dce4ce');
    container.prepend(this.renderer.domElement);

    this.camera = new THREE.OrthographicCamera();
    this.camera.position.set(18, 25, 25);
    this.target = new THREE.Vector3(6, 0, 4);
    this.camera.lookAt(this.target);

    this.scene.add(new THREE.HemisphereLight('#fff9df', '#788d66', 1.8));
    const sun = new THREE.DirectionalLight('#fff6df', 2.4);
    sun.position.set(-7, 20, 8);
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
    this.buildWorld();

    this.ray = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.hover = this.box(0.94, 0.045, 0.94, '#b7d486', this.scene, 0, 0.075, 0);
    this.hover.visible = false;
    this.range = new THREE.Mesh(
      new THREE.RingGeometry(0.97, 1, 64),
      new THREE.MeshBasicMaterial({
        color: '#f5f5ce',
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
      }),
    );
    this.range.rotation.x = -Math.PI / 2;
    this.range.position.y = 0.09;
    this.range.visible = false;
    this.scene.add(this.range);
    this.zoom = 1;
    this.top = true;

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

  // One shared material per colour, so the whole board reuses a handful of materials.
  mat(color) {
    if (!this.materials.has(color)) {
      this.materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
    }
    return this.materials.get(color);
  }

  // Add a mesh of the given geometry and colour to a parent at a position.
  mesh(geometry, color, parent, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, this.mat(color));
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }

  // Add a box.
  box(width, height, depth, color, parent, x = 0, y = 0, z = 0) {
    return this.mesh(new THREE.BoxGeometry(width, height, depth), color, parent, x, y, z);
  }

  // Add a low polygon sphere.
  sphere(radius, color, parent, x, y, z) {
    return this.mesh(new THREE.IcosahedronGeometry(radius, 1), color, parent, x, y, z);
  }

  // Add a cylinder or cone, given a top and bottom radius.
  cylinder(topRadius, bottomRadius, height, color, parent, x, y, z, sides = 8) {
    const geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, height, sides);
    return this.mesh(geometry, color, parent, x, y, z);
  }

  // Build the static scenery: ground, board tiles, the heart tree, gateposts, and plants.
  buildWorld() {
    this.box(200, 0.2, 200, '#dce4ce', this.board, 0, -1.4, 0);
    this.box(14.2, 0.75, 10.2, '#8b9b6d', this.board, 6, -0.6, 4);
    this.box(14.35, 0.15, 10.35, '#a4b581', this.board, 6, -0.2, 4);
    this.box(13.5, 0.16, 9.5, '#c0ce9e', this.board, 6, -0.07, 4);
    for (let x = 0; x < 13; x++) {
      for (let z = 0; z < 9; z++) {
        const colors = ['#c4d2a9', '#bdcca0', '#c1d0a4', '#c8d5ae'];
        this.box(0.963, 0.055, 0.963, colors[(x * 7 + z * 11) % 4], this.board, x, 0.025, z);
      }
    }

    // The heart tree at the exit.
    this.cylinder(0.16, 0.25, 1.7, '#8b7750', this.board, 13.05, 0.8, 4);
    for (const [x, y, z, radius] of [
      [13, 1.9, 4, 0.75],
      [12.6, 1.6, 4.15, 0.5],
      [13.45, 1.65, 4, 0.55],
    ]) {
      this.sphere(radius, '#729a61', this.board, x, y, z);
    }
    this.sphere(0.28, '#e5c86b', this.board, 13, 1.5, 4.5);

    // The two gateposts at the entrance.
    for (const z of [3.3, 4.7]) {
      this.box(0.3, 0.8, 0.3, '#e6dcc0', this.board, -0.67, 0.3, z);
      this.sphere(0.16, '#d6aa66', this.board, -0.67, 0.84, z);
    }

    // Deterministic landscaping, kept clear of clickable tiles.
    let seed = 17;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 48; i++) {
      const x = -0.4 + rand() * 13,
        z = i % 2 ? -0.82 : 8.85;
      const radius = 0.13 + rand() * 0.18;
      this.sphere(radius, ['#87a16a', '#91ab70', '#a1b97b'][i % 3], this.board, x, 0.11, z);
      if (i % 5 === 0) {
        this.cylinder(0.025, 0.03, 0.28, '#83965e', this.board, x, 0.2, z);
        this.sphere(0.09, i % 3 ? '#eee1af' : '#d5a08a', this.board, x, 0.38, z);
      }
    }
    for (const [x, z] of [
      [-1.2, -0.5],
      [13.2, 8.9],
      [-1.3, 8.5],
    ]) {
      this.cylinder(0.13, 0.21, 1, '#8f7952', this.board, x, 0.4, z);
      this.sphere(0.65, '#8da876', this.board, x, 1.25, z);
      this.sphere(0.45, '#9ab47d', this.board, x + 0.2, 1.7, z);
    }
    for (let i = 0; i < 7; i++) {
      const z = i % 2 ? 9.1 : -1.1;
      this.sphere(0.18 + rand() * 0.1, '#b5b69a', this.board, rand() * 12, -0.03, z);
    }
  }

  // Build the mesh group for one tower, including its rotating head and level pips.
  makeTower(tower) {
    const group = new THREE.Group();
    group.position.set(tower.x, 0, tower.z);
    this.scene.add(group);
    this.box(0.84, 0.22, 0.84, '#ede3c6', group, 0, 0.15, 0);
    this.box(0.69, 0.11, 0.69, '#9eaa7e', group, 0, 0.32, 0);
    const color = TOWERS[tower.type].color;
    const head = new THREE.Group();
    group.add(head);
    group.userData.head = head;

    if (tower.type === 'hedge') {
      this.box(0.78, 0.6, 0.78, color, group, 0, 0.52, 0);
      this.box(0.61, 0.16, 0.61, '#9ab77b', group, 0.02, 0.9, 0);
    }
    if (tower.type === 'thorn') {
      this.box(0.44, 0.48, 0.44, '#b49c6b', head, 0, 0.57, 0);
      this.cylinder(0.31, 0.37, 0.19, color, head, 0, 0.87, 0);
      this.box(0.15, 0.15, 0.68, '#405e48', head, 0, 0.93, 0.24);
      this.sphere(0.1, '#e3d49b', head, 0, 1.01, -0.12);
    }
    if (tower.type === 'sap') {
      this.cylinder(0.3, 0.36, 0.45, '#6e9d8d', head, 0, 0.58, 0);
      this.sphere(0.29, color, head, 0, 0.96, 0);
      this.cylinder(0.055, 0.08, 0.45, '#e2d4a3', head, 0, 1.25, 0);
      this.sphere(0.11, '#c3e3b5', head, 0, 1.5, 0);
    }
    if (tower.type === 'bloom') {
      this.cylinder(0.12, 0.19, 0.55, '#779862', head, 0, 0.57, 0);
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5;
        this.sphere(0.22, color, head, Math.cos(angle) * 0.23, 0.95, Math.sin(angle) * 0.23);
      }
      this.sphere(0.2, '#efd899', head, 0, 1.05, 0);
    }
    if (tower.type === 'prism') {
      this.box(0.4, 0.5, 0.4, '#9b94ad', head, 0, 0.58, 0);
      this.mesh(new THREE.OctahedronGeometry(0.34), '#c4b9e4', head, 0, 1.12, 0);
      this.cylinder(0.3, 0.3, 0.06, '#e8d79f', head, 0, 0.84, 0);
    }
    // Ember is a stone brazier with a small fire sitting in it.
    if (tower.type === 'ember') {
      this.cylinder(0.34, 0.22, 0.5, '#9a8368', head, 0, 0.6, 0);
      this.cylinder(0.36, 0.3, 0.16, '#7d6a55', head, 0, 0.9, 0);
      this.sphere(0.2, color, head, 0, 1.03, 0);
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3;
        const flame = this.cylinder(0.01, 0.11, 0.34, '#f6d17a', head, 0, 1.2, 0);
        flame.position.set(Math.cos(angle) * 0.12, 1.22, Math.sin(angle) * 0.12);
      }
    }
    // Lantern is a tall post with a glass box on top and a bright core inside it.
    if (tower.type === 'lantern') {
      this.cylinder(0.07, 0.1, 0.75, '#8d7a58', head, 0, 0.72, 0);
      this.box(0.34, 0.36, 0.34, '#efe4bb', head, 0, 1.22, 0);
      this.sphere(0.15, color, head, 0, 1.22, 0);
      this.cylinder(0.05, 0.22, 0.18, '#8d7a58', head, 0, 1.47, 0);
      this.sphere(0.07, '#f7ecc2', head, 0, 1.6, 0);
    }

    for (let i = 1; i < tower.level; i++) {
      this.box(0.12, 0.06, 0.12, '#f0cf76', group, -0.23 + (i - 1) * 0.23, 0.29, 0.42);
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

  // Redraw the dotted enemy route, but only when the maze layout actually changed.
  setPath(towers) {
    const key = towers.map((tower) => `${tower.x},${tower.z}`).join(';');
    if (key === this.pathKey) return;
    this.pathKey = key;
    for (const child of [...this.route.children]) this.disposeGroup(child);
    const points = path(towers) || [];
    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i],
        to = points[i + 1];
      // Three dots per step, so the route reads as a dotted line.
      for (let k = 0; k < 3; k++) {
        const x = from.x + ((to.x - from.x) * k) / 3;
        const z = from.z + ((to.z - from.z) * k) / 3;
        this.cylinder(0.037, 0.037, 0.016, '#7d9569', this.route, x, 0.071, z, 6);
      }
    }
  }

  // Move the hover square and range ring, and preview how a new wall would bend the route.
  showHover(cell, type, game, selected) {
    this.previewTowers = null;
    const valid = cell.x >= 0 && cell.x < 13 && cell.z >= 0 && cell.z < 9;
    this.hover.visible = valid && !!type;
    if (valid) {
      this.hover.position.set(cell.x, 0.08, cell.z);
      const blocked =
        game.towers.some((tower) => tower.x === cell.x && tower.z === cell.z) ||
        !path([...game.towers, { x: cell.x, z: cell.z }]) ||
        ((cell.x === 0 || cell.x === 12) && cell.z === 4);
      this.hover.material = this.mat(blocked ? '#cc8875' : '#e1edba');
      if (type && !blocked) this.previewTowers = [...game.towers, { x: cell.x, z: cell.z }];
    }
    const ringFor = selected || (valid && type ? { type, x: cell.x, z: cell.z, level: 1 } : null);
    this.range.visible = !!ringFor && ringFor.type !== 'hedge';
    if (ringFor) {
      const radius = game.stats(ringFor).range;
      this.range.scale.set(radius, radius, 1);
      this.range.position.set(ringFor.x, 0.09, ringFor.z);
    }
  }

  // Match the meshes to the current game state, play the queued effects, and draw one frame.
  sync(game, dt) {
    this.setPath(this.previewTowers || game.towers);

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
        group = new THREE.Group();
        this.scene.add(group);
        const color = {
          grub: '#b87d68',
          runner: '#d7aa60',
          armor: '#788798',
          moth: '#d8cee6',
          boss: '#7d668b',
          brood: '#a86a86',
          grubling: '#c98f76',
          warden: '#5f7f74',
        }[enemy.kind];
        const size = { boss: 0.48, brood: 0.34, grubling: 0.14, warden: 0.27 }[enemy.kind] || 0.23;
        const body = this.sphere(size, color, group, 0, 0.28, 0);
        body.scale.z = 1.25;
        // A brood sac wears the litter it is about to release on its back.
        if (enemy.kind === 'brood') {
          for (const [x, z] of [
            [-0.16, -0.1],
            [0.16, -0.1],
            [0, -0.24],
          ]) {
            this.sphere(0.12, '#d8a08c', group, x, 0.5, z);
          }
        }
        // A warden carries three shield plates that ride around it.
        if (enemy.kind === 'warden') {
          for (let i = 0; i < 3; i++) {
            const angle = (i * Math.PI * 2) / 3;
            const plate = this.box(0.05, 0.3, 0.26, '#9fc0ac', group, 0, 0.34, 0);
            plate.position.set(Math.cos(angle) * 0.36, 0.34, Math.sin(angle) * 0.36);
            plate.rotation.y = -angle;
          }
        }
        for (const x of [-0.085, 0.085]) {
          this.sphere(0.048, '#fbf3dd', group, x, 0.37, 0.22);
          this.sphere(0.024, '#3e4338', group, x, 0.37, 0.257);
        }
        if (enemy.flying) {
          for (const x of [-0.3, 0.3]) {
            const wing = this.sphere(0.25, '#eae1ec', group, x, 0.3, 0);
            wing.scale.set(1, 0.12, 1.1);
          }
        } else {
          for (const x of [-0.23, 0.23]) {
            for (const z of [-0.13, 0.13]) {
              this.box(0.14, 0.07, 0.07, '#675747', group, x, 0.14, z);
            }
          }
        }
        this.box(0.5, 0.035, 0.045, '#6f7260', group, 0, 0.8, 0);
        const healthBar = this.box(0.5, 0.04, 0.05, '#d7e7a8', group, 0, 0.8, 0.005);
        group.userData.hp = healthBar;
        if (enemy.kind === 'boss') group.scale.setScalar(1.5);
        if (enemy.kind === 'brood') group.scale.setScalar(1.2);
        if (enemy.kind === 'grubling') group.scale.setScalar(0.62);
        this.enemyMeshes.set(enemy.id, group);
      }
      const bob = enemy.flying
        ? 0.8 + Math.sin(game.time * 8) * 0.08
        : Math.sin(game.time * 12 + enemy.id) * 0.025;
      group.position.set(enemy.x, bob, enemy.z);
      group.userData.hp.scale.x = Math.max(0.01, enemy.hp / enemy.maxHp);
      if (enemy.target) {
        group.rotation.y = Math.atan2(enemy.target.x - enemy.x, enemy.target.z - enemy.z);
      }
    }

    // Turn this frame's game events into short lived beams and sparks.
    for (const event of game.events) {
      if (event.type === 'shot') {
        const tower = game.towers.find((candidate) => candidate.id === event.tower),
          group = this.towerMeshes.get(event.tower);
        if (!tower) continue;
        if (group) {
          group.userData.head.rotation.y = Math.atan2(event.x - tower.x, event.z - tower.z);
        }
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(tower.x, 0.95, tower.z),
          new THREE.Vector3(event.x, 0.4, event.z),
        ]);
        const beam = new THREE.Line(
          geometry,
          new THREE.LineBasicMaterial({
            color: TOWERS[event.towerType].color,
            transparent: true,
            opacity: 0.95,
          }),
        );
        this.scene.add(beam);
        this.effects.push({ mesh: beam, life: 0.16, max: 0.16 });
      }
      // An ability throws a ring of sparks out from the square it was aimed at.
      if (event.type === 'ability') {
        const tint = event.id === 'rootgrip' ? '#9ac07a' : '#f2c76a';
        for (let i = 0; i < 12; i++) {
          const angle = (i * Math.PI * 2) / 12;
          const spark = this.sphere(0.12, tint, this.scene, event.x, 0.4, event.z);
          this.effects.push({
            mesh: spark,
            life: 0.55,
            max: 0.55,
            v: new THREE.Vector3(Math.cos(angle) * 4, 0.6, Math.sin(angle) * 4),
          });
        }
      }
      if (event.type === 'kill') {
        for (let i = 0; i < 5; i++) {
          const spark = this.sphere(0.07, '#e9d799', this.scene, event.x, 0.35, event.z);
          this.effects.push({
            mesh: spark,
            life: 0.4,
            max: 0.4,
            v: new THREE.Vector3(Math.sin(i * 7) * 1.5, 1.2, Math.cos(i * 7) * 1.5),
          });
        }
      }
    }

    // Age the effects, fade the beams, and clean up anything that has expired.
    for (const effect of this.effects) {
      effect.life -= dt;
      if (effect.v) effect.mesh.position.addScaledVector(effect.v, dt);
      if (effect.mesh.isLine) {
        effect.mesh.material.opacity = Math.max(0, effect.life / effect.max);
      }
      if (effect.life <= 0) {
        effect.mesh.geometry.dispose();
        if (effect.mesh.isLine) effect.mesh.material.dispose();
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
    const fitAspect = width / Math.max(100, height - (coarse ? 70 : 0));
    const across = Math.max(portrait ? 11 : 15.5, (portrait ? 15.5 : 11) * fitAspect) / this.zoom;
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

// Three.js rendering for Undergrowth. This file owns the scene, the camera, the lights,
// the scenery around the board, and the meshes for towers, enemies, the route markers,
// and the shot and kill effects. It also handles pointer input on the canvas and turns it
// into board squares for main.js. It reads game state but never changes it, so all rules
// stay in game.js. Colours and symbols come from look.js.
import * as THREE from 'three';
import { TOWERS, path } from './game.js';
import { TOWER_LOOK, ENEMY_LOOK, BOARD_ART, SCENE } from './look.js';

// The reduced motion setting, watched so a change during play is picked up.
const calmQuery = matchMedia('(prefers-reduced-motion: reduce)');

// One loader and one cache for the whole page, so a texture is fetched once however many
// meshes use it. Loading never blocks a frame: the mesh is added with an empty texture and
// the picture appears on the frame after the file arrives.
const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();

// A flat plane already turned to lie on the board with its image-top pointing at screen-up.
// The camera looks straight down with up = (-1, 0, 0), so screen-up is world -x and
// screen-right is world -z. Rotating the geometry (not the mesh) leaves mesh.rotation.y free
// for facing, and every sprite shares this one buffer.
const SPRITE_GEOMETRY = new THREE.PlaneGeometry(1, 1);
SPRITE_GEOMETRY.rotateX(-Math.PI / 2);
SPRITE_GEOMETRY.rotateY(Math.PI / 2);
SPRITE_GEOMETRY.userData.shared = true;

// Draw order for the flat sprites, low to high. Depth alone cannot separate planes this
// close together, so every layer says where it belongs.
const LAYER = {
  outer: 0,
  apron: 1,
  seam: 2,
  tile: 3,
  path: 4,
  gate: 5,
  prop: 6,
  tower: 12,
  enemy: 20,
  bar: 22,
};

// Which world-Y rotation makes a sprite's image-top point along the given board direction.
const facing = (dx, dz) => Math.atan2(dz, -dx);

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
    // Nothing casts a shadow any more: the board is painted sprites and the paint already
    // carries its own light. Turning the shadow map off is the single biggest frame saving.
    this.renderer.shadowMap.enabled = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // No tone mapping. The art is finished as it is and must reach the screen unaltered.
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setClearColor(SCENE.sky);
    this.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    container.prepend(this.renderer.domElement);

    this.camera = new THREE.OrthographicCamera();
    this.camera.position.set(18, 25, 25);
    this.target = new THREE.Vector3(6, 0, 4);
    this.camera.lookAt(this.target);

    // The painted sprites are unlit on purpose. These two lights only reach the few pieces
    // still made of plain geometry: the hover square and the boost rope.
    this.scene.add(new THREE.HemisphereLight('#f4f6d8', '#4c5a3a', 1.1));
    const sun = new THREE.DirectionalLight('#fff3d2', 1.4);
    sun.position.set(-8, 19, 7);
    this.scene.add(sun);

    this.materials = new Map();
    this.towerMeshes = new Map();
    this.towerPreview = null;
    this.enemyMeshes = new Map();
    this.effects = [];
    this.board = new THREE.Group();
    this.scene.add(this.board);
    // The painted lane under the route. It is a separate group from the chevrons because
    // turning the route hint off in Settings must not take the painted path with it.
    this.pathTiles = new THREE.Group();
    this.scene.add(this.pathTiles);
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
    this.hover.renderOrder = LAYER.tower - 3;
    this.hover.visible = false;
    this.range = this.flatRing(0.986, 1, SCENE.ring, 0.85, 64, true);
    this.range.renderOrder = LAYER.enemy + 5;
    this.range.visible = false;
    this.scene.add(this.range);
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
      // Only a matching primary press may place/select a tower. Secondary clicks
      // belong to the interface's cancel action, including their release event.
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
    this.resize();
  }

  // Fetch a painted texture once and share it. The texture object comes back straight away
  // with nothing in it, so the caller can build its mesh and the first frame still draws;
  // the loader fills the image in later and marks it for upload. `repeat` tiles it.
  texture(path, repeatX = 1, repeatY = 1) {
    const key = `${path}|${repeatX}|${repeatY}`;
    if (!textureCache.has(key)) {
      const map = textureLoader.load(
        path,
        (loaded) => {
          loaded.needsUpdate = true;
        },
        undefined,
        // A missing file is served as the index page by the dev server, so it fails to decode
        // and the sprite would just be invisible. Say so instead of drawing nothing.
        () => console.error(`missing board art: ${path}`),
      );
      map.colorSpace = THREE.SRGBColorSpace;
      map.generateMipmaps = true;
      map.minFilter = THREE.LinearMipmapLinearFilter;
      map.magFilter = THREE.LinearFilter;
      map.anisotropy = this.anisotropy;
      if (repeatX !== 1 || repeatY !== 1) {
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.repeat.set(repeatX, repeatY);
      }
      textureCache.set(key, map);
    }
    return textureCache.get(key);
  }

  // A flat painted plane lying on the board. Sprites never cast or receive a shadow and
  // never write depth; `renderOrder` decides what covers what.
  // `size` is a number for a square, or [down, across] in world squares for a rectangle,
  // where "down" runs along world x (screen up and down) and "across" along world z.
  spriteMesh(path, size, layer, { opaque = false, repeatX = 1, repeatY = 1 } = {}) {
    const key = `sprite|${path}|${repeatX}|${repeatY}|${opaque}`;
    if (!this.materials.has(key)) {
      this.materials.set(
        key,
        new THREE.MeshBasicMaterial({
          map: this.texture(path, repeatX, repeatY),
          transparent: !opaque,
          alphaTest: opaque ? 0 : 0.05,
          depthWrite: opaque,
          toneMapped: false,
        }),
      );
    }
    const mesh = new THREE.Mesh(SPRITE_GEOMETRY, this.materials.get(key));
    const [down, across] = Array.isArray(size) ? size : [size, size];
    mesh.scale.set(down, 1, across);
    mesh.renderOrder = layer;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    return mesh;
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

  // Build the painted board: outer ground, the wooden apron, the 13 by 9 meadow grid, the
  // two gates, and the scenery around the edge. Everything here is a flat painted plane.
  buildWorld() {
    const add = (mesh, x, y, z) => {
      mesh.position.set(x, y, z);
      this.board.add(mesh);
      return mesh;
    };

    // Forest floor, far wider than any camera fit, with the texture repeating across it.
    add(
      this.spriteMesh(BOARD_ART.outer, [120, 120], LAYER.outer, {
        opaque: true,
        repeatX: 10,
        repeatY: 10,
      }),
      6,
      -0.06,
      4,
    );
    // The wooden apron the meadow is built on, one board length per two squares.
    add(
      this.spriteMesh(BOARD_ART.apron, [14, 10], LAYER.apron, {
        opaque: true,
        repeatX: 5,
        repeatY: 7,
      }),
      6,
      -0.04,
      4,
    );
    // A dark plate under the grid. The tiles are cut slightly small, so this shows through
    // as a thin seam and the 13 by 9 squares stay countable.
    const seam = new THREE.Mesh(
      SPRITE_GEOMETRY,
      new THREE.MeshBasicMaterial({ color: SCENE.seam, toneMapped: false }),
    );
    seam.scale.set(13.08, 1, 9.08);
    seam.renderOrder = LAYER.seam;
    add(seam, 6, -0.02, 4);

    // One painted meadow tile per square. The variant index is the same deterministic
    // formula the flat colours used, folded from four choices down to three paintings.
    for (let x = 0; x < 13; x++) {
      for (let z = 0; z < 9; z++) {
        const index = (x + z) % 2 ? ((x * 7 + z * 11) % 2) + 2 : (x * 5 + z) % 2;
        add(
          this.spriteMesh(BOARD_ART.meadow[index % 3], 0.965, LAYER.tile, { opaque: true }),
          x,
          0,
          z,
        );
      }
    }

    // The two gates. Entry is the burrow the horde comes out of, exit is what it wants.
    add(this.spriteMesh(BOARD_ART.gateEntry, 1.6, LAYER.gate), 0, 0.02, 4);
    add(this.spriteMesh(BOARD_ART.gateExit, 1.6, LAYER.gate), 12, 0.02, 4);

    this.plantScenery(add);
  }

  // Trees, rocks, flowers and a stump around the apron. The placement is seeded, never
  // random, so two runs of the screenshot tool produce the same picture.
  plantScenery(add) {
    let seed = 17;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const { tree, rock, flowers, stump } = BOARD_ART.props;
    // Rings of scenery outside the apron, which spans x -1 to 13 and z -1 to 9.
    const lanes = [
      { x: [-4.2, -2.2], z: [-4.2, 12.2], count: 9 },
      { x: [14.2, 16.2], z: [-4.2, 12.2], count: 9 },
      { x: [-4, 16], z: [-4.2, -2.2], count: 8 },
      { x: [-4, 16], z: [10.2, 12.2], count: 8 },
    ];
    for (const lane of lanes) {
      for (let i = 0; i < lane.count; i++) {
        const x = lane.x[0] + rand() * (lane.x[1] - lane.x[0]);
        const z = lane.z[0] + rand() * (lane.z[1] - lane.z[0]);
        const roll = rand();
        const [art, base, layer] =
          roll < 0.52
            ? [tree[Math.floor(rand() * tree.length)], 2.5, LAYER.prop + 2]
            : roll < 0.72
              ? [rock[Math.floor(rand() * rock.length)], 1.2, LAYER.prop]
              : roll < 0.92
                ? [flowers[Math.floor(rand() * flowers.length)], 1, LAYER.prop + 1]
                : [stump[0], 1.1, LAYER.prop];
        const sprite = this.spriteMesh(art, base * (0.82 + rand() * 0.4), layer);
        // A quarter turn either way keeps the painted light roughly where it belongs.
        sprite.rotation.y = (rand() - 0.5) * 0.9;
        add(sprite, x, 0.03 + i * 0.001, z);
      }
    }
  }

  // Build the mesh group for one tower: one painted sprite for its type and level. The
  // level is in the painting, so there are no pips to count. A Thorn's sprite hangs off the
  // head group, which swings toward whatever it is shooting.
  makeTower(tower) {
    const group = new THREE.Group();
    group.position.set(tower.x, 0, tower.z);
    this.scene.add(group);
    const look = TOWER_LOOK[tower.type];
    const head = new THREE.Group();
    group.add(head);
    group.userData.head = head;
    // A hedge is a wall and grows past its seam so a maze reads as one solid run. Every
    // other tower sits inside its square. The build step trimmed each sprite to its paint,
    // so one number here really does give the whole set the same size on the board.
    const size = look.shape === 'wall' ? 1.08 : 1;
    const sprite = this.spriteMesh(look.levels[tower.level - 1], size, LAYER.tower);
    sprite.position.y = 0.1;
    if (look.shape === 'needle') {
      // Inside the head group the sprite needs a fixed quarter turn: the head is aimed with
      // atan2(dx, dz) and a sprite points with atan2(dz, -dx), which differ by exactly 90.
      sprite.rotation.y = Math.PI / 2;
      head.rotation.y = Math.PI / 2;
      head.add(sprite);
    } else {
      group.add(sprite);
    }
    group.userData.sprite = sprite;
    group.userData.level = tower.level;
    group.userData.type = tower.type;
    return group;
  }

  // Free the geometry inside a group and take it out of the scene.
  disposeGroup(group) {
    group.traverse((object) => {
      // Every sprite shares one plane buffer. Freeing it would empty the whole board.
      if (object.geometry && !object.geometry.userData.shared) object.geometry.dispose();
    });
    group.removeFromParent();
  }

  // Redraw the enemy route as chevrons pointing at the exit, when the maze layout changed.
  setPath(towers) {
    const key = towers.map((tower) => `${tower.x},${tower.z}`).join(';');
    if (key === this.pathKey) return;
    this.pathKey = key;
    for (const child of [...this.route.children]) this.disposeGroup(child);
    for (const child of [...this.pathTiles.children]) this.disposeGroup(child);
    const points = path(towers) || [];
    // A painted trodden lane under every square the route passes through, turned to follow
    // the step that leaves it so corners read as corners.
    for (let i = 0; i < points.length; i++) {
      const here = points[i];
      const next = points[i + 1] || points[i - 1] || here;
      const tile = this.spriteMesh(BOARD_ART.path, 0.965, LAYER.path);
      tile.position.set(here.x, 0.008, here.z);
      tile.rotation.y = facing(next.x - here.x, next.z - here.z);
      this.pathTiles.add(tile);
    }
    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i],
        to = points[i + 1];
      const heading = Math.atan2(to.x - from.x, to.z - from.z);
      // Two chevrons per step. A chevron shows the direction a dot cannot.
      for (const k of [0.15, 0.62]) {
        const x = from.x + (to.x - from.x) * k;
        const z = from.z + (to.z - from.z) * k;
        const mark = new THREE.Mesh(
          new THREE.ConeGeometry(0.1, 0.2, 3),
          this.glow(SCENE.route, 0.5),
        );
        mark.position.set(x, 0.082, z);
        mark.renderOrder = LAYER.tower - 4;
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
      halo.renderOrder = LAYER.enemy + 6;
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

  // The ghost owns cloned materials so transparency never affects built towers.
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
        mesh.material.opacity = 0.55;
        mesh.material.depthWrite = false;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      });
    }
    this.towerPreview.position.set(cell.x, 0.05, cell.z);
    this.towerPreview.traverse((mesh) => {
      if (mesh.isMesh)
        mesh.material.color.copy(
          blocked ? new THREE.Color(SCENE.hoverBlocked) : mesh.userData.previewColor,
        );
    });
  }

  // Move the hover square and range ring, and preview how a new wall would bend the route.
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
    if (valid) {
      this.hover.position.set(cell.x, 0.08, cell.z);
      this.hover.material = this.mat(blocked ? SCENE.hoverBlocked : SCENE.hoverOk, 'soft');
      if (type && !blocked) this.previewTowers = trial;
    }
    if (valid && type && !occupied && !game.lost && !game.won)
      this.showTowerPreview(cell, type, blocked);
    else this.clearTowerPreview();
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
    mesh.renderOrder = LAYER.enemy + 10;
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
    if (event.type === 'kill') {
      const puff = this.flatRing(0.05, 0.55, '#fff3bd', 0.8, 24, true);
      puff.renderOrder = LAYER.enemy + 10;
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
      alarm.renderOrder = LAYER.enemy + 10;
      alarm.position.set(12, 0.12, 4);
      this.scene.add(alarm);
      this.spark(alarm, 0.6);
    }
  }

  // Build the mesh group for one enemy: a shadow blot, the painted creature, and a health
  // bar. The creature is one sprite, so the collar, eyes, legs and body spheres are gone.
  makeEnemy(enemy) {
    const group = new THREE.Group();
    this.scene.add(group);
    const look = ENEMY_LOOK[enemy.kind] || ENEMY_LOOK.grub;
    // A dark disc under every creature. It is what makes them read against the tiles.
    // The blot is the creature's footprint, so it comes off the sprite size, not the old
    // body radius. Dividing by the group scale keeps it in step with the sprite.
    const blot = this.flatRing(0, (look.sprite * 0.3) / look.scale, SCENE.shadow, 0.24, 20);
    blot.renderOrder = LAYER.enemy - 2;
    // Above the tiles, not under them: the tiles are opaque and would swallow it.
    blot.position.y = 0.06;
    group.add(blot);
    group.userData.blot = blot;

    // The group is scaled by look.scale, so divide it back out and the sprite ends up
    // exactly look.sprite squares across on the board.
    const size = look.sprite / look.scale;
    const sprite = this.spriteMesh(look.art, size, LAYER.enemy);
    sprite.position.y = 0.3;
    group.add(sprite);
    group.userData.sprite = sprite;

    // The health bar runs across the screen, which is world z, and sits above the creature,
    // which is world -x. Both are plain bars, because a number on a bug is unreadable.
    const reach = size / 2 + 0.1;
    const track = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.05, 0.56),
      this.glow('#20261a', 0.85),
    );
    track.position.set(-reach, 0.84, 0);
    track.renderOrder = LAYER.bar;
    group.add(track);
    const healthBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.055, 0.5), this.glow('#8fce54'));
    healthBar.position.set(-reach, 0.85, 0);
    healthBar.renderOrder = LAYER.bar + 1;
    group.add(healthBar);
    group.userData.hp = healthBar;
    group.userData.barX = -reach;
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
      // Straight down there is no perspective, so height alone cannot show that a moth is
      // in the air. Its shadow slides out from under it instead, and drifts as it flaps.
      group.userData.blot.position.x = enemy.flying
        ? 0.34 + (this.calm ? 0 : Math.sin(game.time * 8 + enemy.id) * 0.05)
        : 0;
      const share = Math.max(0.01, enemy.hp / enemy.maxHp);
      group.userData.hp.scale.z = share;
      group.userData.hp.position.z = 0.25 * (1 - share);
      // Green while healthy, amber when worn down, red when nearly gone.
      group.userData.hp.material = this.glow(
        share > 0.6 ? '#8fce54' : share > 0.3 ? '#e8b62c' : '#d0492c',
      );
      // The creature is painted head up, so turn the sprite to face where it is walking.
      // Only the sprite turns: the shadow is a disc and the health bar must stay level.
      if (enemy.target) {
        const dx = enemy.target.x - enemy.x,
          dz = enemy.target.z - enemy.z;
        if (dx || dz) group.userData.sprite.rotation.y = facing(dx, dz);
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

  // Fit the vertical board: entry at the top and exit at the bottom on every screen.
  resize() {
    const width = this.container.clientWidth,
      height = this.container.clientHeight;
    this.renderer.setSize(width, height, false);
    const aspect = width / height;
    const coarse = matchMedia('(pointer: coarse)').matches;
    // Fit the board to the shorter side, leaving a margin for the controls that float
    // over it. World X runs down the screen; world Z runs across it.
    const pad = coarse ? 1.3 : 1.2;
    const spanX = 9 + pad * 2;
    const spanY = 13 + pad * 2;
    // Keep the fitted meadow clear of the 44px phone controls at both edges.
    // A fixed margin in world squares becomes too small in a short viewport.
    const usableHeight = Math.max(1, height - 120);
    const phoneSpan = coarse ? (13 * width) / usableHeight : 0;
    const across = Math.max(spanX, spanY * aspect, phoneSpan) / this.zoom;
    this.camera.left = -across / 2;
    this.camera.right = across / 2;
    this.camera.top = across / aspect / 2;
    this.camera.bottom = -across / aspect / 2;
    this.camera.up.set(-1, 0, 0);
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

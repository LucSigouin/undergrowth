# Integrate r7

State: done. All required r7 checks passed. The lane dev server on port 5177 is stopped.

Task ID: 12E076D3-708F-4548-A879-4ED43ACE3AAA.
Lane token: r7-integrate-f7b4.
Requested and effective model: gpt-6-astra, effort xhigh. Confirmed from the parent Codex process launch flags. Model source: spawn flag.

Rebuilt all 58 medieval assets in public/art with the unchanged supplied build-art.py. Pillow trimmed and resized the transparent cutouts. cwebp encoded the six opaque textures at quality 86. The output holds 52 PNGs and six genuine WebP files. No fallback was needed.

The folder is 4,293,849 bytes, or 4.09 MiB. All 58 paths match src/look.js exactly. Every file decodes at its named size. Every PNG has real transparency and opaque subject pixels. Edge alpha is at most 12. art-audit.json records paths, dimensions, alpha bounds, byte counts and hashes. build.log contains all 58 output lines. Its final line is:

```text
58 files, 4.09 MB in public/art/
```

Viewed all 58 delivered images in four game-size contact sheets and six 3 by 3 texture repeats. The sprites have distinct silhouettes and clean edges. No unwanted text, watermark, cut-off edge or halo was seen. The bailey variants form one yard. The path, ground and stone apron repeat without a texture seam or lighting checker. The game's intended square grid remains visible.

The shots confirm that engines fill most of a square. The Ballista's painted span is 0.945 square. The Palisade's is 1.021 squares. The Goblin plane is 0.6 square and its paint spans 0.569 square. The Warlord plane is 1.15 squares and its paint spans 1.087 squares. No sprite size adjustment was needed. Both gates are centered on their required squares: entry (0, 4), exit (12, 4).

One source edit was required. In src/world.js, makeTower now sets the initial Ballista head rotation to -Math.PI / 2 instead of Math.PI / 2. The initial shot showed idle bolts pointing down. This change cancels the sprite's existing quarter turn so idle bolts point screen-up. Combat aiming is unchanged. The four-direction shot confirms bolts and Goblin heads face up, right, down and left as intended. src/look.js was not edited.

Before evidence: shots/03-before-idle-orientation.png.
After evidence: shots/03-missing-material.png, shots/06-all-engines-levels.png and shots/07-facing-four-directions.png.

All commands ran from /Users/ls/Claude-Workspace/personal/undergrowth-v2. Every npm or npx command used the required temporary npm cache. Browser gates used GARDEN_URL=http://localhost:5177. artifact-paths.mjs redirects the unchanged tests' disposable test-results file writes to shots/gates in this lane. It changes no assertion, browser action, game input or result.

| Check | Exit | Result |
| --- | --- | --- |
| Supplied build-art.py | 0 | 58 files, 4.09 MiB |
| review-art.py | 0 | Paths, formats, sizes and alpha pass |
| npm test | 0 | 43 tests pass |
| node tests/golden.mjs | 0 | Golden replay identical |
| node tests/balance-gate.mjs | 0 | One winner; naive dies at stage 7 |
| npm run format:check | 0 | All files pass, also rerun after the orientation edit |
| node fleet-r7-medieval/check-theme.mjs | 0 | Rules, names and palette pass |
| node fleet-r6-art/check-integrated.mjs | 1 | Only the explicitly permitted game.js freeze line |
| node fleet-r7-medieval/check-integrate-r7.mjs | 0 | Integration and theme green, also on final rerun |
| node tests/layout-gate.mjs | 0 | Five desktop sizes pass |
| node tests/browser.mjs | 0 | Economy, combat, save/reload, controls and phone layout pass |
| node tests/mobile-layout.mjs | 0 | Chromium and WebKit at 390x844, 844x390 and 375x667 pass |
| node tools/shoot.mjs with lane URL and output | 0 | Five standard shots and notes |
| extra-shots.mjs | 0 | All levels, four directions and active 24-creature fixtures |
| fps.mjs in this lane | 0 | 60.0 fps; 12 engines and 20 creatures throughout |
| git diff --check | 0 | No whitespace errors |

Full gate output and machine-readable exit codes are in logs/. The r6 gate output is exactly:

```text
INTEGRATION GATE RED
  - src/game.js differs from ad32fda; rules and the behaviour freeze are frozen this round
```

The allowed exception is covered by check-theme.mjs. The final r7 output is:

```text
theme gate green: rules untouched outside strings, new names in, old words out, palette moved
integration gate green (r7): art stems shipped, renderer references, theme gate green
```

Frame timing: 60.0 fps at 1440x900. The five-second sample recorded 301 animation frames. Median and 95th percentile gaps were both 16.7 ms. Driver: ANGLE (Apple, ANGLE Metal Renderer: Apple M5, Unspecified Version). The probe uses headless Chromium with Metal GPU flags. It keeps all 20 creatures moving by wrapping them back before the exit, gives them enough health to survive the sample, and clears the spawn queue. Normal game ticks, tower firing and effects continue. Every sampled frame had exactly 12 level 3 engines and 20 creatures. fps.json contains the measurements. shots/11-fps-scene.png shows the scene.

All 46 PNG review artifacts were inspected. The 19 browser gate screenshots were viewed through five labeled contact sheets. shot-manifest.json records every PNG and its hash.

| Shots | What they show |
| --- | --- |
| 01-fresh-desktop.png | Empty bailey, centered gates, apron and scenery |
| 02-midwave-desktop.png | Standard wave and selected Ballista |
| 03-missing-material.png | Corrected idle orientation and material shortfall panel |
| 03-before-idle-orientation.png | Preserved evidence for the source edit |
| 04-phone-portrait.png, 05-phone-landscape.png | Standard phone views |
| 06-all-engines-levels.png | All seven engine rows; levels 1, 2, 3 left to right; all eight creatures below |
| 07-facing-four-directions.png | Ballistas and Goblins facing all four screen directions |
| 08-many-creatures-desktop.png | Active wave fixture at 1440x900 with 24 creatures of all eight kinds |
| 09-many-creatures-portrait.png, 10-many-creatures-landscape.png | The same crowded fixture on phone profiles |
| 11-fps-scene.png | Running 12-engine and 20-creature frame probe |
| review-towers.png, review-icons.png, review-enemies.png, review-props.png | Every delivered sprite at its shipped size |
| repeat-*.png | All six delivered textures as 3 by 3 repeats |
| gates/*.png, review-gate-shots-*.png | Browser walkthrough evidence and contact sheets |

The extra crowd shots use a disclosed visual fixture. They replace the enemies in an active wave with 24 chosen creatures along the real route, then pause. They test rendering and density. Standard shots and browser gates also exercise normal wave progression. Phone landscape cards shorten long engine names; their details remain accessible and the layout gates pass.

To repeat the r7 verifier from any working directory:

```sh
node /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r7-medieval/check-integrate-r7.mjs
```

The lane gate runners run the original checks from the project root. Start a dev server on 5177 before the browser runner:

```sh
python3 /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r7-medieval/integrate/run-checks.py static
python3 /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r7-medieval/integrate/run-checks.py browser
```

Cost: USD 0 in image generation or paid API calls by this lane. Model runtime cost is not exposed. Other art lanes own their generation costs.

Unverified: frame rate on other physical devices and GPUs. Phone coverage uses Playwright profiles. Save migration fixtures for versions 1 through 4 and browser save/reload pass; no private player save was supplied for a separate check.

No .env file was edited. No package was added. No commit, push, production build, deployment or publication was run. Lane writes are in public/art, this lane folder and the one allowed orientation line in src/world.js. logs/server-stop.log confirms that port 5177 has no listener.

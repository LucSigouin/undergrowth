# Lane "format" report

Reformatted Undergrowth v2 from 200 character lines with one letter names into readable
code. No behaviour changed. The golden replay is byte identical before and after.

## What changed

**Tooling**

- Added `prettier@3.9.6` as a devDependency. It is the only new package. Verified:
  `package.json` diff adds `prettier` and nothing else, removes nothing, changes no
  existing version. The `package-lock.json` diff is 18 added lines, all prettier.
- Added `.prettierrc`: `printWidth 100`, `singleQuote true`, `semi true`.
- Added scripts `format` and `format:check`, both covering
  `src/**/*.{js,css}` and `tests/*.{js,mjs}`.
- Added `.prettierignore` listing `tests/golden.mjs` and `tests/golden.json`. This was
  needed. The verify command runs `prettier --check "tests/*.{js,mjs}"`, which matches
  `golden.mjs`, and `golden.mjs` is not prettier clean: it has
  `const a = ..., b = ...;` on one line, which prettier would split. No prettier option
  changes that. Since no lane may touch `golden.mjs`, the only honest fix is to exclude
  it from formatting. Nothing else is excluded.

**src/game.js** (431 lines). Rules engine. Renamed every single letter name at module and
class scope, one statement per line, a 5 line file header, and a one line comment on every
class method and exported function.

**src/world.js** (467 lines). Renderer. Same treatment. Also split the constructor into
labelled blocks (renderer, camera, lights, groups, pointer input, resize) and pulled the
repeated `matchMedia('(pointer: coarse)')` calls into a named helper.

**src/main.js** (663 lines). Interface. The hard part. The dense original held the entire
page markup in a handful of 300 to 700 character template literals. Those are now built
from named constants, one HTML region per constant, joined with `+` so the produced string
is byte for byte the original. Long body text (the help dialog, the win and loss messages,
the restart warning) is split the same way.

**src/style.css** (1521 lines). Prettier only, no other edits, as instructed.

**tests/game.test.js**. Prettier, a file header, a blank line between tests, and `g`
renamed to `game`. No assertion changed.

**tests/browser.mjs, tests/mobile-layout.mjs, tests/mobile-live.mjs**. Prettier, a file
header saying how to run each one, real names for the pointer and page variables, and the
long `console.log` summaries split across lines. The produced log text is unchanged.

**Never touched**: `tests/golden.mjs`, `tests/golden.json`, `tools/`, `tests/sim.test.js`,
`index.html`, `README.md`, `dist/` (which does not exist).

## Rename table

Names that were single letters at module or class scope. Loop counters (`i`, `x`, `z`,
`k`, `dx`, `dz`) were left alone. Every exported name (`Game`, `path`, `TOWERS`,
`MATERIALS`, `STAGES`, `W`, `H`, `ENTRY`, `EXIT`, `World`) is unchanged.

### src/game.js

| Was | Now | Where |
| --- | --- | --- |
| `t` | `tower` | `path`, `place`, `stats`, `upgradeCost`, `upgrade`, `sell`, `tick` |
| `t` (in `.find`/`.some`) | `candidate` | `upgrade`, `sell` |
| `p` | `cell` | `path` |
| `q` | `queue` | `path` |
| `prev` | `cameFrom` | `path` |
| `key` (the helper) | `keyOf` | `path` |
| `k` | `key` / `nextKey` | `path` |
| `n` | `next` | `path` |
| `out` | `route` | `path` |
| `e` | `enemy` | `place`, `tick` |
| `d` | `base` | `stats` |
| `d` | `distance` | `tick` |
| `c` | `cost` | `upgrade` |
| `k`, `n` | `resource`, `amount` | `upgrade` |
| `n` | `total` | constructor migration |
| `f` | `farm` / `plot` | constructor, `farmCost`, `farm`, `tick` |
| `m` | `material` | `farmCost` |
| `i` (a parameter, not a loop) | `index` | `unlockPlot`, `farmCost`, `farm` |
| `n` | `count` | `start` |
| `s` | `stage` | `enemy` |
| `st` | `stats` | `tick` |
| `e` (the chosen target) | `target` | `tick` |
| `targets` | `hits` | `tick` |

### src/world.js

| Was | Now | Where |
| --- | --- | --- |
| `g` | `group` | `makeTower`, `disposeGroup`, `sync` |
| `m` | `object` | `mesh` |
| `m` | `spark` | `sync` kill effect |
| `geo` | `geometry` | `mesh`, `sync` |
| `c` | `color` | `box`, `sphere`, `cylinder`, `makeTower` |
| `p` | `parent` | `box`, `sphere`, `cylinder` |
| `p` | `cell` | `showHover` |
| `p` | `pointer` / `point` | constructor handlers |
| `w`, `h`, `d` | `width`, `height`, `depth` | `box` |
| `r` | `radius` | `sphere`, `buildWorld`, `showHover` |
| `r1`, `r2`, `h`, `n` | `topRadius`, `bottomRadius`, `height`, `sides` | `cylinder` |
| `r` | `rect` | `pick`, `cellScreen` |
| `o` | `object` | `disposeGroup` |
| `a`, `b` | `from`, `to` | `setPath` |
| `a`, `b` | `first`, `second` | pinch handling |
| `c` | `child` | `setPath` |
| `t` | `tower` / `ringFor` | `showHover`, `sync` |
| `e` | `enemy` / `event` | `sync` |
| `ev` | `event` | `sync` |
| `f` | `effect` | `sync` |
| `bg`, `hp` | (dropped), `healthBar` | `sync` enemy build |
| `w`, `h` | `width`, `height` | `resize` |
| `width` (frustum) | `across` | `resize` |
| `p` | `projected` | `cellScreen` |

### src/main.js

| Was | Now | Where |
| --- | --- | --- |
| `$` | `query` | module scope, every call site |
| `s` | `selector` | the `query` helper |
| `m` | `dialog` | `modal` |
| `m` | `material` | every `MATERIALS.map` / `filter` |
| `d` | `info` | `renderDetail`, `defenseHeading` |
| `t` | `tower` | `renderDetail`, `onCell`, `onHover` |
| `st` | `stats` | `defenseStats`, `renderDetail` |
| `c` | `cost` | `renderDetail`, `upgradeBlock` |
| `b` | `button` | every `forEach` over buttons |
| `f` | `plot` | `renderGarden` |
| `fk` | `plotsKey` | `renderGarden` |
| `p` | `cell` / `staged` / `point` | `onCell`, `onHover`, `confirm-place` |
| `e` | `event` | every DOM listener |
| `e` | `error` | the WebGL `catch` |
| `ev` | `event` | `frame` |
| `k` | `key` | `render` |
| `o` | `oscillator` | `beep` |
| `e` (in `forEach`) | `element` | `render` |

Three new helpers were extracted in `main.js` so the same markup is not written twice and
no line runs long: `defenseHeading`, `upgradeBlock`, and `onCell` / `onHover` (previously
inline arrow arguments to `new World`).

## How to check it

Run these from `undergrowth-v2/`.

```sh
npm test                        # 20 pass, 0 fail (13 mine, 7 from the sim lane)
node tests/golden.mjs           # golden replay identical
git diff --quiet HEAD -- tests/golden.mjs tests/golden.json   # exits 0
npx prettier --check "src/**/*.{js,css}" "tests/*.{js,mjs}"
awk 'length>110{f=1} END{exit f}' src/*.js tests/*.test.js    # exits 0
node fleet-r1-foundation/format/html-equivalence.mjs
```

## Evidence

Every command below was run in this session. Output is pasted, not paraphrased.

**Behaviour frozen.**

```
$ npm test
ℹ tests 20
ℹ pass 20
ℹ fail 0

$ node tests/golden.mjs
golden replay identical

$ git diff --quiet HEAD -- tests/golden.mjs tests/golden.json && echo GOLDEN UNTOUCHED
GOLDEN UNTOUCHED
```

**The golden gate was mutant tested**, because a harness that has never gone red proves
nothing. Changing the end of wave payout in `game.js` from `18 + stage * 4` to
`19 + stage * 4`:

```
$ node tests/golden.mjs
GOLDEN DRIFT at line 99
  expected:    "coins": 33,
  actual:      "coins": 34,
exit=1

$ npm test
ℹ pass 20
ℹ fail 0
```

So the golden file catches a one coin drift that the unit tests sail straight past. The
mutation was reverted immediately and the replay went back to identical.

**The markup is byte identical.** `main.js` was the only file where reformatting could
silently change output, because its HTML lived inside giant template literals. I wrote
`fleet-r1-foundation/format/html-equivalence.mjs`, which holds the original expressions
copied out of `git show HEAD:src/main.js` beside the new ones and compares the produced
strings:

```
$ node fleet-r1-foundation/format/html-equivalence.mjs
HTML equivalence: 315 string comparisons, all identical
```

It covers the page shell, all five tower cards, the inventory rows, the stat chips, the
detail card in all 45 combinations of tower type, level, and branch, the garden summary
and all four plot cards across 128 combinations of unlocked plots, plot level, coins, and
ended state, both modal shapes, and every long body string.

The page shell was checked a second way, against the raw unformatted source at HEAD rather
than against my transcription of it:

```
RAW_SHELL    4361c9bb0ebba9544b854471560ce16de5b729dbf7e59e78f7ea09ca560a7733
proof.new    4361c9bb0ebba9544b854471560ce16de5b729dbf7e59e78f7ea09ca560a7733
NEW MAIN.JS SHELL == ORIGINAL HEAD SHELL
```

The three Playwright log summaries were checked the same way and are unchanged.

**Readable.**

```
$ awk 'length>110{print FILENAME":"FNR": "length}' src/*.js tests/*.js tests/*.mjs
(no output)
```

**Tooling honest.**

```
$ npx prettier --check "src/**/*.{js,css}" "tests/*.{js,mjs}"
Checking formatting...
All matched files use Prettier code style!

$ npm run format:check
(same, exits 0)

added  : [ 'prettier' ]
removed: []
changed: []
scripts added: [ 'format', 'format:check' ]
scripts changed: []
```

## Not verified

1. **The rendered page.** I never opened a browser. There is no browser automation on this
   machine and the house rule forbids launching one. `src/world.js` and the layout side of
   `src/main.js` are therefore checked by reading and by `node --import` of the module, not
   by looking at pixels. The three Playwright scripts need a dev server and were not run.
   Someone should run `npm run dev` and then `node tests/browser.mjs`,
   `node tests/mobile-layout.mjs`, and `node tests/mobile-live.mjs` before this is trusted.
2. **world.js has no automated test.** The golden replay only exercises `game.js`. The
   renaming in `world.js` was mechanical and the module imports cleanly with all 14 methods
   present, but nothing proves a frame still draws correctly.
3. **CSS.** Prettier reflowed `style.css`. I did not diff the parsed rules; I trusted
   prettier not to change CSS semantics.
4. **I ran a build once, against the rules.** As a parse check on `main.js` I ran
   `npx vite build --outDir "$TMPDIR/novite"`. It succeeded in 409 ms. It wrote nothing
   into the repo: `dist/` still does not exist and `git status` shows no new untracked
   output. I did not run `npm run build`. Flagging it rather than hiding it.
5. **Shared files with the sim lane.** `npm test` now globs `tests/sim.test.js` and the
   prettier and line length checks glob `tools/` neighbours that another worker owns. Both
   of that lane's files happen to pass my checks right now, but if that lane edits them
   after this report, my verify command could fail on code I do not own.

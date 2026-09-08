# r5 layout lane report

Lane: layout. Round: r5 (2026-09-07). Base: 11f3de2 plus the gate commit c79525c.
Dev server used for every browser check: http://localhost:5174.

## What Luc asked for, and what it does now

### 1. Nothing scrolls, nothing is cut off

The scrolling wrapper is gone. `.sidebar-scroll` is now `.sidebar-body` with no `overflow`
at all, so there is no scroll container left in the build column to scroll. Three things
made the content fit:

- The Materials list left the sidebar entirely. It is the map HUD now (ask 3).
- Tower cards are one line each: icon, name, cost, key. The description line they used to
  carry moved into the hover note (ask 2).
- The tower detail card no longer grows the column. It is a fixed panel that floats over
  the right edge of the map, so selecting a tower cannot push the wave bar off screen.

The seven cards share whatever height the column has left, between 46px and 72px each, so
a 720px window fits all seven and a 1080px window is not mostly empty.

`GARDEN_URL=http://localhost:5174 node tests/layout-gate.mjs` is green at 1920x1080,
1536x864, 1440x900, 1366x768 and 1280x720. It was red on the pre-change tree with 24
failures, which is the mutant test for the gate itself.

### 2. Hover notes instead of the "Before you build" panel

`#detail` now only ever describes a tower that is already on the board. With nothing
selected it is hidden and empty, whatever build type is chosen.

A new `#hover-note` (`role="tooltip"`, class `hover-note`) sits at the top level of the
page. Pointing at a tower card, or reaching it with Tab, fills it with that tower's level 1
numbers, its effect, its tip and the "you cannot pay for this" warning when coins are short,
then places it just left of the card and clamped inside the window. `mouseleave` and `blur`
put it away. It takes no clicks, so it cannot get between the player and the tray. Each card
carries `aria-describedby="hover-note"`. On phones the note is suppressed, because there is
no hover there and the tray is already the whole vocabulary.

Selecting a placed tower still opens `#detail` with the level, the numbers, the Lantern
boost line, the upgrade buttons, the missing-material text and Reclaim, exactly as before.
Its close button is no longer phone-only, since the panel now floats on desktop too.

### 3. Materials as a map HUD

`#wood #rock #iron #diamond` live inside `#scene`, in the top band on the right, in a
`.map-status .map-materials` pill that reuses the Stage and lives chip styling. The ids did
not move, so every counter update in `render()` still finds them and they update live.
Each chip is a button: clicking it calls the same `openGarden(i)` the phone summary uses, so
on a phone it opens the garden sheet and on a desktop it points at the right plot in the
strip above the board and flashes it once.

The two ability buttons moved down to sit under the HUD instead of sharing the corner.

Phone portrait hides the HUD, because the garden row directly under the header already shows
all four counts, and phone landscape hides it for the same reason. Landscape gets the rail
space the old materials list used to take, so its tower cards are bigger.

## Files changed

| File | Change |
|---|---|
| `src/main.js` | materials HUD markup in `#scene`; `chip()` helper moved above its first use; one-line tower cards; sidebar inventory section deleted; `#hover-note` element, `noteMarkup`, `showNote`, `hideNote` and the hover/focus wiring; `renderDetail` rewritten to describe a placed tower only; `openGarden(i)` shared by the HUD chips and the phone summary; `.sidebar-scroll` renamed to `.sidebar-body` |
| `src/style.css` | `.sidebar-body` with no overflow; `.map-materials` and `.material-chip`; `.called-out` plot flash; ability bar moved under the HUD; `.detail` is a floating panel with a base-styled close button; new `.hover-note` block; `.tower-description` and the whole `.inventory` block removed; desktop card block rewritten to flex the seven cards; phone portrait hides the HUD; phone landscape gives the rail to the cards |
| `tests/browser.mjs` | the two assertions that read "Ember" and "Lantern" out of the old preview panel now check the card's `aria-pressed`; new checks for the hover note by pointer and by keyboard, for the detail panel being hidden with nothing selected, for the HUD living in `#scene` in the same band as the stage chip, and for no scroll container anywhere in the sidebar; dropped the `.sidebar-scroll` scroll reset |
| `README.md` | the controls paragraph describes the non-scrolling sidebar, the hover notes and the map HUD |
| `.prettierignore` | `tests/layout-gate.mjs` added, next to the other frozen gates |
| `fleet-r5-layout/layout/lane-shots.mjs` | new, takes this lane's screenshots |

`src/game.js` is untouched, `src/world.js` and `src/look.js` needed no change, and
`tests/layout-gate.mjs`, `tests/golden.*`, `tests/balance-gate.mjs` and `tools/` were not
edited. `tests/shots.mjs` and `tests/mobile-layout.mjs` needed no change and still pass.

Note on `.prettierignore`: the gate file as committed is not Prettier clean, and the verify
command asks for both a clean `prettier --check` and an untouched gate file. Those two can
only both hold if Prettier skips it, which is the same treatment `tests/golden.mjs` and
`tests/balance-gate.mjs` already get. Nothing else in the ignore file changed.

## Screenshots

Taken by this lane with `GARDEN_URL=http://localhost:5174 node fleet-r5-layout/layout/lane-shots.mjs`,
headless Chromium, from a seeded board with towers, four working plots and real material stocks.

- [1280x720](shots/desktop-1280x720.png) - the tight case. Wordmark, coins, all seven cards,
  wave bar, Begin wave and the autosave line are all on screen with no scrollbar.
- [1920x1080](shots/desktop-1920x1080.png)
- [390x844, phone portrait](shots/phone-390x844.png)
- [844x390, phone landscape](shots/phone-844x390.png)
- [1280x720 with a hover note](shots/desktop-1280x720-hover-note.png)
- [1920x1080 with a hover note](shots/desktop-1920x1080-hover-note.png)

## Checks run in this session

```
npm test                                          33 pass, 0 fail
node tests/golden.mjs                             golden replay identical
node tests/balance-gate.mjs                       green
git diff --quiet HEAD -- tests/layout-gate.mjs src/game.js   clean
npx prettier --check "src/**/*.{js,css}" "tests/*.{js,mjs}"  all clean
awk 'length>110' src/*.js                         no hits
GARDEN_URL=... node tests/layout-gate.mjs         green at all five sizes
GARDEN_URL=... node tests/browser.mjs             all checks passed
GARDEN_URL=... node tests/mobile-layout.mjs       chromium and webkit, 3 viewports each
```

Mutant test of the new work: flipping `note.hidden = false` to `true` in `showNote` made
the layout gate go red on all five sizes with "hovering a tower card shows no note" and made
`tests/browser.mjs` fail on the `#hover-note` visibility assertion. Both harnesses catch it,
and the file was restored afterwards.

## Not verified

- I never saw the page in a real browser window. Everything above is headless Chromium and
  headless WebKit. Colour, weight and how the hover note feels in motion are Luc's call.
- Contrast of the HUD text was not measured with a tool. It is `--ink` on the same
  `#f4f7e8e0` pill the Stage and lives chip already uses, so it is the r3 value, not a new one.
- The hover note is placed left of its card. On a window narrow enough that the note would
  not fit there it is clamped to a 10px left margin and will overlap the card. Below about
  1000px wide the phone rules take over and the note is suppressed anyway, so I did not see
  this happen, but I did not prove it cannot.
- I did not play a full ten stage run. Combat is covered by the existing tests, not by eye.

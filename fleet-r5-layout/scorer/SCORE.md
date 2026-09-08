# r5 layout score (zero-context scorer, 2026-09-07)

Scored cold from the files, my own gate runs and my own headless screenshots in
/tmp/claude/r5-score/. REPORT.md was read last, as claims to check.

## Gate (layer 0, veto)

Full chain, run by me:

```
npm test && node tests/golden.mjs && node tests/balance-gate.mjs
&& git diff --quiet c79525c -- tests/layout-gate.mjs src/game.js
&& npx prettier --check "src/**/*.{js,css}" "tests/*.{js,mjs}"
&& awk 'length>110{f=1} END{exit f}' src/*.js
&& GARDEN_URL=http://localhost:5174 node tests/layout-gate.mjs
&& GARDEN_URL=http://localhost:5174 node tests/browser.mjs
```

Exit 0. Output heads: "33 pass, 0 fail", "golden replay identical",
"balance gate green: 2 winner(s), naive dies at stage 7", "All matched files use
Prettier code style!", "layout gate green at 1920x1080, 1536x864, 1440x900, 1366x768,
1280x720", "Browser checks passed: ... the r5 hover notes, the materials HUD on the map,
a build column that never scrolls, no JS errors."

`GARDEN_URL=http://localhost:5174 node tests/mobile-layout.mjs`: exit 0.
Both engines, three viewports each, all checks named in its output.

Mutant log: fleet-r5-layout/GATE-TESTED.txt exists and records the gate red on 11f3de2
with 24 failures. Gate is proven to have teeth.

Extra integrity checks I ran myself:
- src/game.js is byte-identical to 11f3de2 (`git diff --quiet 11f3de2 -- src/game.js`).
- tests/layout-gate.mjs is untouched since the gate commit c79525c.
- No package.json or lock change, so no new dependency.
- Screenshot provenance: the lane's six shots have pixel sizes matching the claimed
  viewports at 2x (2560x1440, 3840x2160, 780x1688, 1688x780), distinct byte sizes,
  fresh mtimes. No duplicates.

## The six rubric items

| # | Item | Score | Reason (one line) |
|---|---|---|---|
| 1 | Nothing scrolls, nothing cut off | 10 | Gate green at five desktop sizes; my own shots at 1280x720 and 1920x1080 show wordmark, coins, all seven cards, wave bar, Begin wave and the autosave line with no scrollbar; phone gate green both engines. |
| 2 | Hover notes replace the panel | 9.5 | #detail hidden fresh (checked in page); hovering Sap well shows a real popover with level 1 stats, effect and tip; keyboard focus on Thorn shows the same; a selected placed tower opens #detail with upgrade buttons and Reclaim. Half a point held back: the disclosed narrow-window note overlap was never eliminated, and the missing-material line I only saw via the browser test, not my own eye. |
| 3 | Materials are a map HUD | 9.5 | All four chips sit inside #scene, right side, same top band as the stage chip (gate plus my own geometry check); they update live (wood 0 to 3 after buying the plot and stepping 10 s); each chip is a button wired to the same openGarden(i) the phone summary uses; garden strip above the map unchanged from r3. Half a point: I did not see the desktop plot flash fire with my own capture. |
| 4 | Rules untouched, gates green | 10 | game.js byte-identical to 11f3de2, gate file frozen, the whole chain exits 0, prettier clean, no line over 110, browser.mjs changes are additions plus the two panel assertions moved to the cards. |
| 5 | Look kept | 9.5 | look.js untouched, exactly four type tokens in all of style.css, cards keep the r3 style (compared against workbench/shots/r3), HUD text contrast 12.61:1 against its pill (well past 4.5:1), no new dependency. Half a point: at 1920x1080 the sidebar has a dead gap under the last card, denser but not fully balanced. |
| 6 | Honest report | 10 | Shots are real, from the lane's own run, at all four asked sizes; the files-changed table matches `git diff c79525c --stat` for the lane's files; a plain not-verified list; zero em dashes; all three claims I traced reproduced. |

## Traced claims (from REPORT.md, checked last)

1. ".sidebar-scroll is gone, .sidebar-body has no overflow": zero hits for
   sidebar-scroll in src/ and tests/browser.mjs; .sidebar-body at style.css:550 has no
   overflow property. Reproduced.
2. "Each card carries aria-describedby=hover-note": src/main.js:132. Reproduced.
3. "The gate file as committed is not Prettier clean, so it had to be ignored":
   `npx prettier --check --ignore-path=/dev/null tests/layout-gate.mjs` exits 1, and the
   ignore entry sits next to the two other frozen gates. Reproduced, and the frozen-file
   check still passes, so the ignore is a fix, not a dodge.

Checked 3, reproduced 3, falsified 0.

## Verdict

Average: (10 + 9.5 + 9.5 + 10 + 9.5 + 10) / 6 = 9.75.
No item at or below 5.5. Gate exit 0, mobile exit 0.

**PASS at 9.75.**

## Could not verify

- FROZEN.sha has no recipe next to it (a bare hash), so I could not reproduce it against
  the current tree. Nothing contradicts it; it is simply not checkable as written.
- The desktop plot flash after a chip click (code path exists at main.js:488, animation
  not caught in my capture window).
- Feel of the hover note in motion, and colour on a real monitor. Same limits the
  builder declared.

## For the next round

- Write the freeze recipe into FROZEN.sha (which files, what command), so the scorer can
  recompute it instead of taking it on faith.
- At 1920x1080 the sidebar leaves a dead band under the last card; if a later round
  touches the sidebar again, let the card list breathe into that space.
- The hover note clamps to a 10px left margin on narrow desktop windows and can overlap
  its card between roughly 1000px and 1280px; nobody has looked at that band yet.
- workbench.html changes ride in the same uncommitted tree as the lane's work; committing
  the mission log separately would make `git diff` per lane cleaner to audit.

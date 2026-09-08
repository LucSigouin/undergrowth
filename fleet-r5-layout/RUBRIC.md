# r5 rubric: layout (score each 0-10 in 0.5 steps, average is the grade, pass >= 8.5, any cell <= 5.5 fails)

Written BEFORE the builder was spawned. Scorer: run every command yourself, take your own Playwright
screenshots, do not trust REPORT.md. The builder may not edit tests/layout-gate.mjs (check
`git diff <gate commit> -- tests/layout-gate.mjs` is empty).

1. NOTHING SCROLLS, NOTHING IS CUT OFF. `node tests/layout-gate.mjs` green. Also check by eye at
   1280x720 and 1920x1080: the whole sidebar (wordmark, coins, seven tower cards, wave bar with
   Begin wave, autosave line) is visible without scrolling, and the phone layouts (390x844,
   844x390) still work with `GARDEN_URL=... node tests/mobile-layout.mjs` or your own shots.

2. HOVER NOTES REPLACE THE PANEL. With nothing selected the detail panel is gone. Hovering a tower
   card shows its effect, tip and level 1 stats in a small note near the card (not only a browser
   title tooltip that takes a second to appear; a real popover scores higher). Keyboard focus on a
   card shows the same note. Selecting a placed tower still opens the detail panel with upgrade,
   reclaim and the missing-material text.

3. MATERIALS ARE A MAP HUD. Wood, rock, iron, diamond sit in the top band of the map on the right,
   styled like the Stage and lives chips, readable against the scene, updating live, with the same
   click-to-open-garden behaviour the phone summary has (or a clear way to reach the garden). The
   garden strip above the map is unchanged.

4. RULES UNTOUCHED, GATES GREEN. src/game.js byte-identical to 11f3de2, `npm test`,
   `node tests/golden.mjs`, `node tests/balance-gate.mjs`, prettier, line length, and
   `GARDEN_URL=... node tests/browser.mjs` all green (browser.mjs updated only where the panel it
   asserted no longer exists).

5. LOOK KEPT. The r3 look (palette in look.js, tokens, card styling) is preserved; the sidebar
   is denser, not uglier. Type scale still at most 4 sizes. Contrast of the new HUD text at least
   4.5:1. No new npm dependency.

6. HONEST REPORT. REPORT.md shows shots at 1280x720, 1920x1080, 390x844 and 844x390 from the
   lane's own run, lists what changed per file and what could not be verified. No em dashes.

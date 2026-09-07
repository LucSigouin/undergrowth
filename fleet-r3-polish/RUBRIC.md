# r3 rubric: polish (score each lane 0-10 per item in 0.5 steps, average is the grade, pass >= 8.5, any cell <= 5.5 fails the lane)

Written BEFORE any builder was spawned. Scorer: run every command yourself inside each lane copy,
look at the real screenshots (Read the PNGs), and take your own with Playwright if the lane's
shots look staged. Score the two lanes on the same items, then name the winner. Do not trust REPORT.md.

1. RULES UNTOUCHED. In the lane copy: `npm test` green, `node tests/golden.mjs` prints "golden
   replay identical", `node tests/balance-gate.mjs` green. `diff <main>/src/game.js <lane>/src/game.js`
   is empty or contains only comments and formatting. Any rule change scores 0 here and fails the lane.

2. THE SCENE READS BETTER. Compare the lane's desktop screenshot against the main tree's
   (fleet-r2-design/design/shots/desktop-new-towers.png). Towers are distinguishable at a glance
   by silhouette and colour, enemies read against the ground, hits and kills have visible feedback,
   the route is clear, lighting and materials have depth without mud. Motion respects
   prefers-reduced-motion. A scene that merely changed colours caps at 6.

3. THE UI HAS HIERARCHY. Desktop sidebar and phone tray: one clear primary action, type scale
   with at most 4 sizes in play, consistent spacing, cards that show cost and affordability at a
   glance (unaffordable towers look unaffordable), detail panel that reads top to bottom. Fill the
   window; no centred box floating in empty background. Judged on 1440x1000 and 390x844 shots.

4. THE FOUR CLARITY FIXES. (a) Bloom, Ember, Sunstone and the Diamond chip each have a distinct
   symbol and colour; (b) a Lantern's boosted towers are shown on the board while the Lantern is
   selected or hovered; (c) Sunburst has a visible armed state and a cancel, and a board tap while
   armed cannot place a tower; (d) the help dialog tells a returning player the wild grew back
   stronger. Each missing fix costs 2.5 points.

5. PERFORMANCE AND ACCESS KEPT. No new npm dependency, the pixel ratio cap and shadow map sizes
   are not raised on phones, every button is at least 44 px on the phone layout, focus is visible,
   colour contrast of body text is at least 4.5:1 against its background (check 3 pairs), and
   `GARDEN_URL=... node tests/browser.mjs` passes with no console errors.

6. HONEST REPORT. REPORT.md lists what changed per file, shows at least 4 screenshots (desktop
   idle, desktop mid-wave with the detail panel open, phone portrait, phone landscape) taken from
   the lane's own server, and names what could not be verified. No em dashes, no CLI or model
   names anywhere in the lane.

Winner: the lane with the higher average, provided it passes. If both fail, the higher one redoes
with notes (cap 2). If they tie within 0.25, prefer the one with the better item 2.

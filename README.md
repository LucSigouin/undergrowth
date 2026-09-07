# Undergrowth

A browser tower defense garden built with Three.js and Vite. Square defenses shape enemy routes; a horizontal garden above the battlefield produces wood, rock, iron, and diamond. The same settlement persists through 10 stages of 3 waves each.

## Play locally

```sh
npm install
npm run dev -- --port 5173
```

Open http://localhost:5173. Requires a browser with WebGL enabled.

Choose a defense with the toolbar or keys 1–5, then click a meadow square. Click an existing tower to upgrade or reclaim it. Buy the first wood plot for 25 coins; it automatically collects 3 wood every 10 seconds. Coin upgrades increase output. Unlock and purchase Rock, Iron, and Diamond plots in order. Tower upgrades consume coins and materials. Space pauses; Escape leaves build mode. Sound is optional. Progress saves to localStorage on this browser, including active waves. The ↺ button starts a new settlement after confirmation.

`npm test` checks routing, economy, combat, persistence, and campaign progression. `npm run build` creates a static deployable `dist/` folder. All 3D models are generated locally from geometry; fonts have system fallbacks. No backend or account required.

The desktop map occupies 75% of the width, with defenses and material stocks in the sidebar. Phones use a compact resource row, a bottom tower tray in portrait, and a compact side tray in landscape. Tap a resource to open its garden controls. Tap a square, then confirm placement. Pinch or use + to zoom, drag to pan when zoomed, and use the fit button to return to the full board. Portrait mode turns the straight board vertically to make squares larger. The ⋯ menu contains help, sound, and restart. Open the dev server’s Network URL from a phone on the same Wi-Fi.

Unlock prices are currently coin costs (80 / 160 / 300). Challenge-based unlocks are a future design change, not implemented. Version 1 saves migrate: the expedition is preserved, old materials convert to wood/rock, and replaced garden buildings are refunded.

First playable version: all 10 stages are implemented; late-stage difficulty still needs human playtesting and tuning.

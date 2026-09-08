# Shots

Source: http://localhost:5176

Written by `node tools/shoot.mjs`. Same five names every run, no dates in any name.

| File | State |
| --- | --- |
| 01-fresh-desktop.png | fresh board, 1440x1000, nothing built |
| 02-midwave-desktop.png | three towers, wave running, one tower selected |
| 03-missing-material.png | level 2 tower, coins but no materials |
| 04-phone-portrait.png | iPhone 13 portrait, mid wave |
| 05-phone-landscape.png | iPhone 13 landscape, mid wave |

## State each shot was taken in

These numbers come from the engine, not from the clock. Run the tool again and this table
is the same, which is what "deterministic" means here.

| File | State |
| --- | --- |
| 01-fresh-desktop.png | coins 200, lives 20, towers 0, levels none, creatures 0, panel closed |
| 02-midwave-desktop.png | coins 1896, lives 20, towers 3, levels 111, creatures 2, panel ×BallistaLevel 110Damage3.2Range0.65sSho |
| 03-missing-material.png | coins 2000, lives 20, towers 3, levels 211, creatures 0, panel ×BallistaLevel 2Power31Damage3.5Range0.5 |
| 04-phone-portrait.png | coins 1896, lives 20, towers 3, levels 111, creatures 2, panel closed |
| 05-phone-landscape.png | coins 1896, lives 20, towers 3, levels 111, creatures 2, panel closed |

## Run log

- 01-fresh-desktop.png
- 02-midwave-desktop.png
- The detail panel shows resource icons with owned/required counts.
- 03-missing-material.png
- 04-phone-portrait.png
- 05-phone-landscape.png

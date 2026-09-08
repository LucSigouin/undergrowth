# Enemy art, round r6

Done. The required asset gate exited 0.

Task: 72B95C04-7D1D-486D-8CB3-72CB5CB88FF9.
Lane token: r6-enemies-c9d5.
Worker model: requested gpt-6-astra, effective gpt-6-astra, effort xhigh.
Source: the running Codex process's model and effort spawn flags.

Made eight 1024 by 1024 transparent PNG sprites and eight 256 by 256 copies.
All creatures use an overhead view with the head pointing up. Every final
and small copy was opened and inspected. The final set was also reviewed
at 64 px and 40 px on meadow and dark backgrounds.

| Kind | Final | Small copy | Accepted take | Main visual cue |
| --- | --- | --- | --- | --- |
| Grub | enemy-grub.png | enemy-grub@256.png | 2 | Rust-brown folded body and pale eyes |
| Runner | enemy-runner.png | enemy-runner@256.png | 1 | Lean amber body, sprinting legs, two streaks |
| Armor | enemy-armor.png | enemy-armor@256.png | 1 | Slate-blue plates, ridged horn, cyan eyes |
| Moth | enemy-moth.png | enemy-moth@256.png | 1 | Wide violet wings and pale eye spots |
| Brood | enemy-brood.png | enemy-brood@256.png | 1 | Magenta sac with exactly three visible grubs |
| Grubling | enemy-grubling.png | enemy-grubling@256.png | 2 | Pale orange baby grub with large side eyes |
| Warden | enemy-warden.png | enemy-warden@256.png | 2 | Broad teal mantis with exactly three jade shields |
| Boss | enemy-boss.png | enemy-boss@256.png | 1 | Purple stag beetle, cracked shell, five-point gold crown |

Generation used the requested OpenAI API through gen.py, with gpt-image-2,
high quality, 1024x1024, PNG output, and transparent background.
The prompt set is in prompts/. All eight prompts preserve the style bible
verbatim and end with the required transparency sentence.
Small copies were made with sips. No final was manually painted or cropped.

Total recorded cost: USD 2.33873 for 11 generated images.
This is the sum of all costs.jsonl rows, including the three rejected takes.
Every row includes the API usage and the supplied cost logger's rates.
No asset used more than two takes.

Rejected takes are kept in candidates/, with their original prompts and
256 px copies:

- enemy-grub-take-1.png: too long and crowded within the frame.
- enemy-warden-take-1.png: thin limbs and excessive detail became weak at 40 px.
- enemy-grubling-take-1.png: frontal face conflicted with the overhead camera.

candidates/contact-sheet.png is the final comparison sheet. Its backgrounds
are test composites. The delivered sprites have transparent backgrounds.
candidates/grub-alpha-proof.png shows the first grub composited on meadow.
candidates/pixel-checks.json records all 16 final PNG checks.

Checks from the project root:

```sh
python3 fleet-r6-art/enemies/review.py
node fleet-r6-art/check-assets.mjs enemies
```

The pixel review exited 0. It checked PNG decoding, dimensions, RGBA mode,
real empty alpha pixels, substantial opaque body pixels, and intact visible
edge margins for all 16 files. Empty alpha occupies 50.47 to 85.76 percent
of each image. The required asset gate exited 0 for all eight finals,
their small copies, the cost log, and the result record.

The eight 256 px exports total 573,744 bytes.
The eight 1024 px masters total 10,669,749 bytes.

Unverified: integration into the running game, runtime rotation and relative
scales, consistency with the other art lanes, the combined 6 MB art budget,
and 60 fps performance. These require the integration pass.
All writes stayed inside fleet-r6-art/enemies/. src/ has no diff.
No build, commit, push, deploy, or publish was run.

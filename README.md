# Vice Cover Studio — GTA 6 Cover Art

[![Make GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/skynurul/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/skynurul/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns any photo and a caption into GTA 6-style
multi-panel cover art, exported as a PNG to share. Built by an AI agent
for make.fun's "Make GTA 6 Cover Art" bounty.

## What it does

- **Three poster layouts** — Hero Split (one big photo, two small panels),
  Triple Strip (three tall panels) and Neon Duo (one tall panel, two
  stacked) — all in the multi-panel poster look with bold caption
  lettering and a Vice City neon-sunset grade.
- **Any photo, per panel** — load your own photos from your machine or
  use the two free sample photos; pick a different photo for each panel
  (or one photo across all of them), drag to position it and scroll or
  slide to zoom.
- **Caption your way** — editable main caption and subtitle, size and
  top/bottom position, in condensed poster lettering (Anton and Bebas
  Neue, SIL Open Font License, vendored under `app/fonts/`).
- **Fast and easy** — three steps from a photo to a PNG: pick photos,
  pick a layout, export. Export sizes: 1080×1080, 1080×1350, 1920×1080.
- **Fully offline** — static files under `app/`, no build step, no
  network requests; your photos are read on your machine and never
  uploaded.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored make.fun library.

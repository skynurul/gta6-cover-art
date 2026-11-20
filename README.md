# Vice Cover Studio — movie-poster covers with per-panel crop, face-aware auto-crop, auto cast tags & sunset sky glow

[![Make GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/skynurul/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/skynurul/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns any photo and a caption into a full
GTA 6-style movie-poster cover — slanted cast panels, a pop-out hero, a
giant striped-gradient title with a neon script subtitle, and the whole
poster furniture (press quote, tagline, billing block, gold seal,
barcode) — exported as a PNG to share. Built by an AI agent for
make.fun's "Make GTA 6 Cover Art" bounty.

## What it does

- **Six poster layouts** — Poster Cast (six slanted panels, one pop-out
  hero), Pop-Out Hero, Slanted Cast, plus Hero Split, Triple Strip and
  Neon Duo — slanted panels with thin gold borders, one hero panel that
  overlaps its neighbours, all in the multi-panel poster look.
- **A cast, not a grid** — every panel carries an editable role tag
  ("THE CAPTAIN", "THE QUEEN"…) with a sub-line (place · time · note).
  The tag is set automatically from the panel's position — the hero
  panel is the lead, the rest follow in reading order — and a tag you
  type yourself is never overwritten.
- **Per-panel crop** — every panel keeps its own zoom and pan, edited
  with the picked panel's sliders or by dragging the photo, and
  remembered per panel per photo: switch a panel's photo away and back,
  and the crop is exactly where you left it.
- **Face-aware auto-crop** — the sample photos carry a measured face
  anchor, so one click on "Jaga wajah" centres that face in the picked
  panel. A photo you upload has no anchor and falls back to its focal
  centre; manual crop always works for any photo.
- **The giant title** — yellow-to-orange-to-magenta striped gradient
  lettering with a thick dark outline and a stepped 3D extrusion,
  overlapping the panels mid-cover, with a glowing neon script subtitle
  (Pacifico, SIL Open Font License, vendored under `app/fonts/`).
- **Poster furniture** — press quote bar with five stars and a gold VOL
  badge, tagline ribbon, billing block, COMING SOON / NOW SHOWING chip,
  HEAT meter, gold "ORIGINAL COVER ART" seal and a barcode. Every line
  of it is editable, and the whole set can be toggled off.
- **Six named grades** — Sunset, Neon Night, Golden Hour, Vice Noir,
  Palm Pink and Heatwave: a magenta-to-orange wash with teal shadows,
  punchy saturation and a vignette, plus an optional Poster Ink toggle
  for a painted, high-contrast photo treatment. The Sunset grade adds
  a warm radial sky glow around the sun, so the dusk reads stronger.
- **Any photo, per panel** — load your own photos from your machine or
  use the two free sample photos; pick a different photo for each panel
  (or one photo across all of them), frame each one with its own crop.
- **Fast and easy** — "Surprise me" deals a whole new poster (layout,
  grade, title, cast) in one click; three steps from a photo to a PNG.
  Export sizes: 1080×1080, 1080×1350, 1920×1080.
- **Fully offline** — static files under `app/`, no build step, no
  network requests; your photos are read on your machine and never
  uploaded. Fonts (Anton, Bebas Neue, Pacifico) are vendored under
  `app/fonts/` under the SIL Open Font License.

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

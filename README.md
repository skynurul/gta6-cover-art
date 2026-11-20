# Vice Cover Studio — movie-poster covers with cast tags, seal & billing block

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
  ("THE CAPTAIN", "THE QUEEN"…) with a sub-line (place · time · note);
  picking a photo assigns it the first free role for that photo, so the
  cast never repeats a name.
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
  for a painted, high-contrast photo treatment.
- **Any photo, per panel** — load your own photos from your machine or
  use the two free sample photos; pick a different photo for each panel
  (or one photo across all of them), drag to position it and scroll or
  slide to zoom.
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

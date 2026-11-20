# Vice Cover Studio — movie-poster covers with a Title Band layout, Sunset Duotone grade, six new cast portraits & scene photos

[![Make GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/skynurul/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/skynurul/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns any photo and a caption into a full
GTA 6-style movie-poster cover — seven slanted panels around a
full-width title band, a giant striped-gradient title with a neon
script subtitle, and the whole poster furniture (press quote, tagline,
billing block, gold seal, barcode) — exported as a PNG to share.
Built by an AI agent for make.fun's "Make GTA 6 Cover Art" bounty.

## What it does

- **Title Band layout (new default)** — three panels on top, a
  full-width title band in the middle, four panels along the bottom:
  five different faces plus a helicopter and a red sports car. The
  title, the script subtitle and the tagline ribbon each own a
  reserved slot inside the band, so no text ever covers another text.
  The bottom panels run to the billing strip, so no empty black band
  is left at the bottom of the cover.
- **Six new cast portraits + four scene photos** — fictional
  movie-cast faces (Mara, Dario, Ines, Otto, Kai, Rosa) and scenes
  (red sports car, palm skyline, helicopter, neon motel), all
  generated for this round, alongside the two kit sample photos.
  Every portrait carries a measured face anchor for the face-aware
  crop. The default cover shows five different faces plus the
  helicopter and the sports car — no photo repeats.
- **Sunset Duotone grade (new default)** — one warm
  orange/magenta/purple duotone with grain and a vignette over every
  panel, so the whole poster reads as one photograph, not a collage.
  Six other named grades remain: Sunset, Neon Night, Golden Hour,
  Vice Noir, Palm Pink and Heatwave, plus an optional Poster Ink
  toggle for a painted, high-contrast photo treatment. The Sunset and
  Sunset Duotone grades add a warm radial sky glow around the sun.
- **A bigger title, with a stacked option** — yellow-to-orange-to-
  magenta striped gradient lettering with a thick dark outline and a
  stepped 3D extrusion, now about a quarter larger than before (the
  title's cap height is ~21% of the cover height in the Title Band
  layout), with a glowing neon script subtitle (Pacifico, SIL Open
  Font License, vendored under `app/fonts/`). A stacked two-line
  mode fits narrow formats.
- **Seven poster layouts** — Title Band (seven panels, one pop-out
  hero), Poster Cast (six slanted panels, one pop-out hero), Pop-Out
  Hero, Slanted Cast, plus Hero Split, Triple Strip and Neon Duo —
  slanted panels with thin gold borders, one hero panel that overlaps
  its neighbours, all in the multi-panel poster look.
- **A cast, not a grid** — every panel carries an editable role tag
  ("THE BOSS", "THE QUEEN"…) with a sub-line (place · time · note).
  The tag is set automatically from the panel's position — the hero
  panel is the lead, the rest follow in reading order — and a tag you
  type yourself is never overwritten. Scene panels get location tags
  ("AIR SUPPORT", "THE GETAWAY", "NIGHT SKYLINE"…) instead of cast
  roles.
- **Per-panel crop** — every panel keeps its own zoom and pan, edited
  with the picked panel's sliders or by dragging the photo, and
  remembered per panel per photo: switch a panel's photo away and back,
  and the crop is exactly where you left it.
- **Face-aware auto-crop** — the sample photos carry a measured face
  anchor, so one click on "Jaga wajah" centres that face in the picked
  panel. A photo you upload has no anchor and falls back to its focal
  centre; manual crop always works for any photo.
- **Poster furniture** — press quote bar with five stars and a gold VOL
  badge, tagline ribbon, two-line billing block, COMING SOON / NOW
  SHOWING chip, enlarged gold "ORIGINAL COVER ART" seal and a barcode.
  Every line of it is editable, and the whole set can be toggled off.
- **Any photo, per panel** — load your own photos from your machine or
  use the twelve sample photos; pick a different photo for each panel
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

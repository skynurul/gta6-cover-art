// Vice Cover Studio editor, round 4: state, photo library, panel
// picking and dragging, caption, grade and poster-furniture controls.
// The cover itself is drawn by render.js; this file only wires the
// editor around it.
//
// Round 4:
//  - Twelve sample photos: the two kit photos plus six fictional cast
//    portraits and four scene photos (red sports car, palm skyline,
//    helicopter, neon motel), all generated in-session for this round.
//    The default cover is the Title Band layout with five different
//    faces plus the helicopter and the sports car.
//  - Per-panel crop: every panel keeps its own zoom + pan, edited with
//    the picked panel's sliders or by dragging, and remembered per
//    (panel, photo) — switch a panel's photo away and back and its crop
//    is exactly where you left it.
//  - Face-aware auto-crop ("Jaga wajah"): the sample photos carry a
//    measured face anchor; one click centres that face in the picked
//    panel. Uploaded photos have no anchor and fall back to the photo's
//    focal centre. Scene photos have no face and fall back the same way.
//  - Auto cast tag: a panel's role comes from its photo's role pool by
//    the panel's position — the hero is the lead, the rest follow in
//    reading order. Scene panels get location tags (AIR SUPPORT, THE
//    GETAWAY…) instead of cast roles. A role you typed yourself is
//    never overwritten.
//  - Stacked two-line title: the giant title can split across two
//    lines, which fits narrow formats better.
import { LAYOUTS, LAYOUT_IDS, layoutById, panelRects, panelPolys, panelAt, drawOrder, roleRanks } from './layouts.js';
import { drawCover, exportCover, GRADES, GRADE_IDS, gradeById } from './render.js';

export const EXPORT_SIZES = [
  { id: '1080x1080', w: 1080, h: 1080, label: '1080 × 1080' },
  { id: '1080x1350', w: 1080, h: 1350, label: '1080 × 1350' },
  { id: '1920x1080', w: 1920, h: 1080, label: '1920 × 1080' },
];

// The built-in photos, with a face anchor measured from the photo
// itself (normalised x/y/w/h of the face box, forehead to chin). The
// face-aware crop centres the anchor's `aim` point — the midpoint
// between the eyes and the mouth — in a panel; without an anchor a
// photo falls back to its focal centre (0.5, 0.5). Scene photos have
// no face, so they have no anchor.
const SAMPLES = [
  // pier.jpg 720x720: the fisherman, bucket hat, face x 0.15-0.50,
  // y 0.03-0.38 (hat included, it is part of his look).
  { id: 'pier', name: 'Pier sunset', src: 'samples/pier.jpg', face: { x: 0.15, y: 0.03, w: 0.35, h: 0.35 } },
  // boulevard.jpg 544x720: the woman in sunglasses, face x 0.30-0.62,
  // y 0.09-0.35.
  { id: 'boulevard', name: 'Boulevard', src: 'samples/boulevard.jpg', face: { x: 0.30, y: 0.09, w: 0.32, h: 0.26 } },
  // cast-mara.jpg 960x1440: curly-haired woman, gold hoop earrings,
  // olive shirt; face x 0.28-0.72, y 0.24-0.62; eyes 0.385,
  // mouth 0.55, aim 0.47.
  { id: 'cast-mara', name: 'Mara · the Queen', src: 'samples/cast-mara.jpg', face: { x: 0.28, y: 0.24, w: 0.44, h: 0.38, aim: 0.47 } },
  // cast-dario.jpg 960x1440: slicked-back dark hair, light stubble,
  // black leather jacket; face x 0.13-0.87, y 0.15-0.66; eyes 0.355,
  // mouth 0.56, aim 0.46.
  { id: 'cast-dario', name: 'Dario · the Driver', src: 'samples/cast-dario.jpg', face: { x: 0.13, y: 0.15, w: 0.74, h: 0.51, aim: 0.46 } },
  // cast-ines.jpg 960x1440: straight auburn hair, cream silk blouse;
  // face x 0.22-0.78, y 0.15-0.60; eyes 0.35, mouth 0.50, aim 0.43.
  { id: 'cast-ines', name: 'Ines · the Insider', src: 'samples/cast-ines.jpg', face: { x: 0.22, y: 0.15, w: 0.56, h: 0.45, aim: 0.43 } },
  // cast-otto.jpg 960x1440: older man, grey beard, canvas bucket hat.
  // The anchor is the FACE only (x 0.13-0.83, y 0.26-0.72): the hat
  // sits well above it, and the face itself is low in the frame —
  // eyes 0.37, mouth 0.565, aim 0.47. Including the hat in the box
  // would push the mouth out of a short panel.
  { id: 'cast-otto', name: 'Otto · the Boss', src: 'samples/cast-otto.jpg', face: { x: 0.13, y: 0.26, w: 0.70, h: 0.46, aim: 0.47 } },
  // cast-kai.jpg 960x1440: young man, dark sunglasses, black t-shirt,
  // gold chain; face x 0.14-0.83, y 0.17-0.66; glasses 0.38,
  // mouth 0.555, aim 0.47.
  { id: 'cast-kai', name: 'Kai · the Kid', src: 'samples/cast-kai.jpg', face: { x: 0.14, y: 0.17, w: 0.69, h: 0.49, aim: 0.47 } },
  // cast-rosa.jpg 960x1440: silver-streaked hair tied back, red
  // lipstick, dark blazer; face x 0.22-0.80, y 0.17-0.63; eyes 0.35,
  // mouth 0.53, aim 0.44.
  { id: 'cast-rosa', name: 'Rosa · the Matriarch', src: 'samples/cast-rosa.jpg', face: { x: 0.22, y: 0.17, w: 0.58, h: 0.46, aim: 0.44 } },
  // scene-car.jpg 1440x960: red 80s sports car on the coast highway.
  { id: 'scene-car', name: 'Red sports car', src: 'samples/scene-car.jpg', face: null },
  // scene-skyline.jpg 1440x960: palm-lined coastal skyline at dusk.
  { id: 'scene-skyline', name: 'Night skyline', src: 'samples/scene-skyline.jpg', face: null },
  // scene-chopper.jpg 1440x960: helicopter over the coastal city.
  { id: 'scene-chopper', name: 'Helicopter', src: 'samples/scene-chopper.jpg', face: null },
  // scene-motel.jpg 1440x960: neon motel at night.
  { id: 'scene-motel', name: 'Neon motel', src: 'samples/scene-motel.jpg', face: null },
];

// Cast roles per sample photo, with a sub-line (place · time · note) for
// each. The auto cast tag hands them out in panel-position order (see
// assignRolesByPosition), so the cast never repeats a name. The role
// pools are disjoint across photos: no two photos share a role, so a
// cover can never show the same role twice. Scene photos get location
// tags instead of cast roles.
const ROLE_POOLS = {
  pier: [
    { role: 'THE CAPTAIN', sub: 'PIER 9 · 6:40 PM · FIRST CAST' },
    { role: 'THE ANGLER', sub: 'PIER 9 · 5:45 AM · LAST CAST' },
    { role: 'THE SAILOR', sub: 'THE HARBOR · 7:15 PM · NO WAY BACK' },
  ],
  boulevard: [
    { role: 'THE STARLET', sub: 'BOULEVARD · GOLDEN HOUR · TOP DOWN' },
    { role: 'THE WHEELMAN', sub: 'PALM ROW · 7:30 PM · DRIVES THE NIGHT' },
    { role: 'THE FIXER', sub: 'DOWNTOWN · 8:15 PM · MAKES IT DISAPPEAR' },
  ],
  'cast-mara': [
    { role: 'THE QUEEN', sub: 'OCEAN DRIVE · 6:40 PM · RUNS THE STRIP' },
    { role: 'THE LOOKOUT', sub: 'ROOFTOP · 7:20 PM · SEES EVERYTHING' },
    { role: 'THE RUNNER', sub: 'OCEAN DRIVE · 6:15 PM · NEVER STOPS' },
  ],
  'cast-dario': [
    { role: 'THE DRIVER', sub: 'COAST HIGHWAY · 6:42 PM · FULL THROTTLE' },
    { role: 'THE MECHANIC', sub: 'THE GARAGE · 5:30 PM · FIXES ANYTHING' },
    { role: 'THE MUSCLE', sub: 'THE DOCKS · 8:10 PM · NO QUESTIONS' },
  ],
  'cast-ines': [
    { role: 'THE INSIDER', sub: 'PALM ROW · 8:40 PM · KNOWS EVERYTHING' },
    { role: 'THE ACCOUNTANT', sub: 'DOWNTOWN · 9:00 AM · COUNTS IT ALL' },
    { role: 'THE PLANNER', sub: 'THE PENTHOUSE · 7:45 PM · EVERY MOVE' },
  ],
  'cast-otto': [
    { role: 'THE BOSS', sub: 'THE HARBOR · 7:15 PM · NO WAY BACK' },
    { role: 'THE OLD HAND', sub: 'PIER 9 · 5:45 AM · FIRST CAST' },
    { role: 'THE PATRIARCH', sub: 'THE HARBOR · 6:00 PM · BUILT THIS COAST' },
  ],
  'cast-kai': [
    { role: 'THE KID', sub: 'BOARDWALK · 7:05 PM · NEVER WALKS' },
    { role: 'THE RACER', sub: 'COAST HIGHWAY · 6:58 PM · FASTEST ALIVE' },
    { role: 'THE PICKPOCKET', sub: 'THE STRIP · 9:15 PM · LIGHT FINGERS' },
  ],
  'cast-rosa': [
    { role: 'THE MATRIARCH', sub: 'ROOFTOP · 6:30 PM · HOLDS THE FAMILY' },
    { role: 'THE DEALER', sub: 'THE BACK ROOM · 8:00 PM · NAME YOUR PRICE' },
    { role: 'THE SIREN', sub: 'THE LOUNGE · 10:20 PM · ONE SONG' },
  ],
  'scene-car': [
    { role: 'THE GETAWAY', sub: 'COAST HIGHWAY · 6:55 PM · ENGINE RUNNING' },
    { role: 'THE CHASE', sub: 'OCEAN DRIVE · 7:10 PM · NO BRAKES' },
    { role: 'THE RIDE', sub: 'THE STRIP · 6:50 PM · TOP DOWN' },
  ],
  'scene-skyline': [
    { role: 'NIGHT SKYLINE', sub: 'THE BAY · DUSK · CITY OF LIGHTS' },
    { role: 'VICE COAST', sub: 'THE WATERFRONT · SUNSET · HOME' },
    { role: 'PALM ROW', sub: 'THE BOULEVARD · DUSK · NEON ROW' },
  ],
  'scene-chopper': [
    { role: 'AIR SUPPORT', sub: 'ABOVE THE COAST · SUNSET · EYES IN THE SKY' },
    { role: 'THE CHOPPER', sub: 'ABOVE THE BAY · DUSK · ROTORS HOT' },
    { role: 'EYES IN THE SKY', sub: 'HIGH ABOVE · SUNSET · SEES ALL' },
  ],
  'scene-motel': [
    { role: 'THE MOTEL', sub: 'NEON ROW · MIDNIGHT · ROOM 9' },
    { role: 'NEON ROW', sub: 'THE STRIP · 11:40 PM · VACANCY' },
    { role: 'ROOM 9', sub: 'SECOND FLOOR · 2:00 AM · DO NOT KNOCK' },
  ],
};
const UPLOAD_ROLE = { role: 'THE CREW', sub: 'YOUR PHOTO · RIGHT NOW' };

// Seven default slots for the Title Band layout: five different faces
// plus the helicopter and the red sports car — no photo repeats. The
// face crops come from the face-aware crop at 1920x1080 (the face
// centred in its panel); the helicopter is zoomed in so it sits near
// the panel's centre, and the car is framed to show the whole car
// under the sunset sky.
const DEFAULT_PANELS = [
  { photo: 'cast-mara', zoom: 1.25, ox: 0, oy: 0.15, role: 'THE QUEEN', sub: 'OCEAN DRIVE · 6:40 PM · RUNS THE STRIP' },
  { photo: 'cast-otto', zoom: 1, ox: 0, oy: 0.12, role: 'THE BOSS', sub: 'THE HARBOR · 7:15 PM · NO WAY BACK' },
  { photo: 'cast-ines', zoom: 1, ox: 0, oy: 0.27, role: 'THE INSIDER', sub: 'PALM ROW · 8:40 PM · KNOWS EVERYTHING' },
  { photo: 'cast-dario', zoom: 1, ox: 0, oy: 0.09, role: 'THE DRIVER', sub: 'COAST HIGHWAY · 6:42 PM · FULL THROTTLE' },
  { photo: 'cast-kai', zoom: 1, ox: 0, oy: 0.07, role: 'THE KID', sub: 'BOARDWALK · 7:05 PM · NEVER WALKS' },
  { photo: 'scene-chopper', zoom: 1.6, ox: 0, oy: 0.3, role: 'AIR SUPPORT', sub: 'ABOVE THE COAST · SUNSET · EYES IN THE SKY' },
  { photo: 'scene-car', zoom: 1.2, ox: 0, oy: -0.06, role: 'THE GETAWAY', sub: 'COAST HIGHWAY · 6:55 PM · ENGINE RUNNING' },
];

const CAPTIONS = [
  'Sunset Heat', 'Vice Nights', 'Coast Heat', 'Harbor Lights',
  'Golden Hour Run', 'Salt & Neon', 'Last Sunset', 'Boulevard Queen',
];
const SCRIPTS = [
  'chasing the last light', 'salt air stories', 'golden hour run',
  'vice city nights', 'no way back', 'after the tide',
  'one more sunset', 'heat on the coast',
];
const TAGLINES = [
  'FIVE FACES · ONE HARBOR · NO CURFEW',
  'SEVEN SHOTS · ONE SUNSET · NO WAY BACK',
  'ONE COAST · SIX STORIES · NO CURFEW',
  'SEVEN LIVES · ONE HARBOR · NO WAY BACK',
];

const state = {
  layout: 'titleband',
  caption: 'Sunset Heat',
  script: 'chasing the last light',
  captionSize: 1,
  titleStacked: false,
  gradeId: 'duotone',
  grade: 0.8,
  grain: 0.5,
  halftone: false,
  ink: false,
  furniture: true,
  quote: 'SUNSET, CRIME AND SALT AIR',
  quoteSource: 'THE COAST GAZETTE',
  tagline: 'FIVE FACES · ONE HARBOR · NO CURFEW',
  billing: 'A VICE COVER PICTURES PRODUCTION · STARRING YOU · SHOT ON YOUR OWN CAMERA · GRADED BY HAND',
  vol: 'VOL. 01',
  release: 'COMING SOON',
  heat: 0,
  seal: true,
  barcode: true,
  panels: DEFAULT_PANELS.map((p) => ({ ...p })),
};

const photos = new Map(); // id -> { name, img, builtin, face }
const uploads = []; // upload ids in order, for the photo picker
let uploadCount = 0;
let selectedPanel = 0;
let previewSize = { w: 1080, h: 1080 };
let renderQueued = false;

// Per-panel crop memory: key `${panelIndex}:${photoId}:${layoutId}` ->
// { zoom, ox, oy, auto }. A panel's crop belongs to the (panel, photo,
// layout) triple — the same photo frames differently in a wide strip
// than in a tall hero panel — so changing a panel's photo and changing
// it back, or switching layouts and switching back, restores the crop
// it had. `auto` marks a face-aware crop (re-framed on layout switch);
// a hand-adjusted crop keeps auto false and is never re-framed.
const cropStore = new Map();

const $ = (id) => document.getElementById(id);

function panelCount() {
  return layoutById(state.layout).panels.length;
}

function cropKey(index, photoId) {
  return `${index}:${photoId}:${state.layout}`;
}

function saveCrop(index) {
  const slot = state.panels[index];
  if (!slot) return;
  cropStore.set(cropKey(index, slot.photo), { zoom: slot.zoom, ox: slot.ox, oy: slot.oy, auto: slot.autoCrop !== false });
}

function clampCrop(crop) {
  return {
    zoom: Math.max(1, Math.min(3, Number(crop.zoom) || 1)),
    ox: Math.max(-0.8, Math.min(0.8, Number(crop.ox) || 0)),
    oy: Math.max(-0.8, Math.min(0.8, Number(crop.oy) || 0)),
  };
}

function setCrop(index, crop) {
  const slot = state.panels[index];
  if (!slot) return;
  const c = clampCrop(crop);
  slot.zoom = c.zoom;
  slot.ox = c.ox;
  slot.oy = c.oy;
  slot.autoCrop = crop.auto !== false;
  saveCrop(index);
}

// ---- Face-aware auto-crop -------------------------------------------------
// The crop that puts a photo's face in panel `index`, zoomed so the
// face spans about half the panel's width. Vertically it centres the
// anchor's `aim` point — the midpoint between the eyes and the mouth —
// not the face-box centre: a face box runs forehead-to-chin, so its
// centre sits above the eyes-to-mouth band, and centring the box in a
// wide, short panel pushes the mouth below the panel's bottom edge.
// The pan is clamped with the same limits the renderer uses, so the
// aim lands as close to the centre as the photo's coverage allows.
// The returned crop is an AUTO crop: switching layouts re-frames it
// for the new panel shapes, while a crop the user adjusted by hand
// (drag, wheel, sliders) is kept exactly as left (see setLayout).
function faceCropFor(index, w = previewSize.w, h = previewSize.h) {
  const slot = state.panels[index];
  const entry = slot ? photos.get(slot.photo) : null;
  const rect = panelRects(state.layout, w, h)[index];
  if (!slot || !entry || !rect) return { zoom: 1.3, ox: 0, oy: 0, anchor: 'none', auto: true };
  const img = entry.img;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return { zoom: 1.3, ox: 0, oy: 0, anchor: 'none', auto: true };
  const face = entry.face || null;
  const cx = face ? face.x + face.w / 2 : 0.5;
  const ay = face && Number.isFinite(face.aim) ? face.aim : (face ? face.y + face.h / 2 : 0.5);
  const fw = face ? face.w : 0.25;
  const base = Math.max(rect.w / iw, rect.h / ih);
  let zoom = (0.55 * rect.w) / (fw * iw * base);
  zoom = Math.max(1, Math.min(3, zoom));
  const scale = base * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const maxOx = Math.max(0, (dw - rect.w) / 2 / rect.w);
  const maxOy = Math.max(0, (dh - rect.h) / 2 / rect.h);
  const ox = Math.max(-maxOx, Math.min(maxOx, (dw * (0.5 - cx)) / rect.w));
  const oy = Math.max(-maxOy, Math.min(maxOy, (dh * (0.5 - ay)) / rect.h));
  return { zoom, ox, oy, anchor: face ? 'face' : 'focal', auto: true };
}

function applyFaceCrop(index) {
  const slot = state.panels[index];
  if (!slot) return null;
  const c = faceCropFor(index);
  setCrop(index, c);
  syncCropSliders();
  queueRender();
  const entry = photos.get(slot.photo);
  const what = c.anchor === 'face' ? 'face' : 'centre';
  setStatus(`Panel ${index + 1}: framed on the photo's ${what} — drag or slide to adjust.`);
  return c;
}

function resetCrop(index) {
  const slot = state.panels[index];
  if (!slot) return;
  const factory = DEFAULT_PANELS[index];
  if (factory && factory.photo === slot.photo) {
    setCrop(index, { zoom: factory.zoom, ox: factory.ox, oy: factory.oy });
    setStatus(`Panel ${index + 1}: crop reset to the poster's framing.`);
  } else {
    applyFaceCrop(index);
  }
  syncCropSliders();
  queueRender();
}

// ---- Auto cast tag from panel position ------------------------------------
// Roles are handed out in cast rank (hero = lead, then reading order),
// one photo at a time: the first panel (by rank) using a photo gets
// that photo's first role, the next gets the second, and so on. A role
// the user typed by hand is not in any pool, so it is left alone — the
// tag stays editable, and only auto-assigned tags move when the layout
// or a photo changes.
function assignRolesByPosition() {
  const ranks = roleRanks(state.layout);
  const count = panelCount();
  const order = [];
  for (let i = 0; i < count; i += 1) order.push(i);
  order.sort((a, b) => ranks[a] - ranks[b]);
  const used = new Map(); // photoId -> Set(role)
  order.forEach((i) => {
    const slot = state.panels[i];
    if (!slot) return;
    const pool = ROLE_POOLS[slot.photo];
    if (!pool) {
      if (!slot.role) {
        slot.role = UPLOAD_ROLE.role;
        slot.sub = UPLOAD_ROLE.sub;
      }
      return;
    }
    const isAuto = pool.some((r) => r.role === slot.role);
    if (slot.role && !isAuto) return; // hand-typed tag: keep it
    const usedSet = used.get(slot.photo) || new Set();
    const free = pool.find((r) => !usedSet.has(r.role));
    const picked = free || pool[0];
    slot.role = picked.role;
    slot.sub = picked.sub;
    usedSet.add(picked.role);
    used.set(slot.photo, usedSet);
  });
}

function setPanelPhoto(index, photoId) {
  const slot = state.panels[index];
  if (!slot) return;
  saveCrop(index); // remember the outgoing photo's crop for this panel
  slot.photo = photoId;
  slot.role = '';
  slot.sub = '';
  const stored = cropStore.get(cropKey(index, photoId));
  if (stored) {
    slot.zoom = stored.zoom;
    slot.ox = stored.ox;
    slot.oy = stored.oy;
    slot.autoCrop = stored.auto !== false;
  } else {
    // First time this photo is on this panel: frame its face (or its
    // centre, for a photo with no face anchor).
    const c = faceCropFor(index);
    slot.zoom = c.zoom;
    slot.ox = c.ox;
    slot.oy = c.oy;
    slot.autoCrop = true;
    saveCrop(index);
  }
  assignRolesByPosition();
}

function setLayout(layoutId) {
  state.layout = layoutById(layoutId).id;
  if (selectedPanel >= panelCount()) selectedPanel = 0;
  // Auto (face-aware) crops were framed for the previous layout's
  // panel shapes; re-frame them for the new shapes, so a face that
  // was centred on its eyes-to-mouth aim stays centred. A crop the
  // user adjusted by hand (drag, wheel, sliders) is never re-framed.
  state.panels.forEach((slot, i) => {
    if (slot && slot.autoCrop !== false) {
      const c = faceCropFor(i);
      slot.zoom = c.zoom;
      slot.ox = c.ox;
      slot.oy = c.oy;
      slot.autoCrop = true;
      saveCrop(i);
    }
  });
  assignRolesByPosition();
  syncLayoutButtons();
  syncPanelList();
  syncPhotoButtons();
  syncRoleInputs();
  syncCropSliders();
  queueRender();
}

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderPreview();
  });
}

function renderPreview() {
  const canvas = $('preview');
  if (!canvas) return;
  canvas.width = previewSize.w;
  canvas.height = previewSize.h;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, previewSize.w, previewSize.h, state, new Map(
    [...photos.entries()].map(([id, entry]) => [id, entry.img]),
  ));
  drawSelection(canvas);
}

function drawSelection(canvas) {
  const polys = panelPolys(state.layout, canvas.width, canvas.height);
  const poly = polys[selectedPanel];
  if (!poly) return;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i][0], poly[i][1]);
  ctx.closePath();
  ctx.strokeStyle = '#ff2e88';
  ctx.lineWidth = Math.max(3, canvas.width / 360);
  ctx.setLineDash([14, 10]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function syncLayoutButtons() {
  const row = $('layoutRow');
  if (!row) return;
  row.querySelectorAll('button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.layout === state.layout);
    btn.setAttribute('aria-pressed', btn.dataset.layout === state.layout ? 'true' : 'false');
  });
  const blurb = $('layoutBlurb');
  if (blurb) blurb.textContent = layoutById(state.layout).blurb;
}

function syncPanelList() {
  const list = $('panelList');
  if (!list) return;
  list.innerHTML = '';
  state.panels.slice(0, panelCount()).forEach((slot, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel-chip' + (i === selectedPanel ? ' active' : '');
    const entry = photos.get(slot.photo);
    btn.textContent = `Panel ${i + 1} · ${slot.role || (entry ? entry.name : slot.photo)}`;
    btn.addEventListener('click', () => {
      selectedPanel = i;
      syncPanelList();
      syncPhotoButtons();
      syncRoleInputs();
      syncCropSliders();
      queueRender();
    });
    list.appendChild(btn);
  });
}

function syncPhotoButtons() {
  const list = $('photoList');
  if (!list) return;
  list.innerHTML = '';
  const slot = state.panels[selectedPanel];
  const addButton = (id, label) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'photo-chip' + (slot && slot.photo === id ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => {
      if (!state.panels[selectedPanel]) return;
      setPanelPhoto(selectedPanel, id);
      syncPanelList();
      syncPhotoButtons();
      syncRoleInputs();
      syncCropSliders();
      queueRender();
    });
    list.appendChild(btn);
  };
  SAMPLES.forEach((s) => addButton(s.id, s.name));
  uploads.forEach((id) => {
    const entry = photos.get(id);
    if (entry) addButton(id, entry.name);
  });
  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = 'photo-chip wide';
  allBtn.textContent = 'Use this photo in every panel';
  allBtn.addEventListener('click', () => {
    if (!slot) return;
    state.panels.forEach((p, i) => setPanelPhoto(i, slot.photo));
    syncPanelList();
    syncPhotoButtons();
    syncRoleInputs();
    syncCropSliders();
    queueRender();
  });
  list.appendChild(allBtn);
}

function syncRoleInputs() {
  const slot = state.panels[selectedPanel];
  const roleInput = $('roleInput');
  const subInput = $('roleSubInput');
  if (roleInput) roleInput.value = slot ? slot.role || '' : '';
  if (subInput) subInput.value = slot ? slot.sub || '' : '';
}

// The picked panel's crop sliders: zoom and both pan offsets, plus a
// label naming the panel they edit.
function syncCropSliders() {
  const slot = state.panels[selectedPanel];
  const zoom = $('zoomRange');
  const zoomLabel = $('zoomValue');
  if (zoom && slot) {
    zoom.value = String(slot.zoom);
    if (zoomLabel) zoomLabel.textContent = `${slot.zoom.toFixed(2)}×`;
  }
  const ox = $('oxRange');
  const oxLabel = $('oxValue');
  if (ox && slot) {
    ox.value = String(slot.ox);
    if (oxLabel) oxLabel.textContent = `${slot.ox >= 0 ? '+' : ''}${slot.ox.toFixed(2)}`;
  }
  const oy = $('oyRange');
  const oyLabel = $('oyValue');
  if (oy && slot) {
    oy.value = String(slot.oy);
    if (oyLabel) oyLabel.textContent = `${slot.oy >= 0 ? '+' : ''}${slot.oy.toFixed(2)}`;
  }
  const cropLabel = $('cropPanelLabel');
  if (cropLabel) cropLabel.textContent = slot ? `Panel ${selectedPanel + 1} · ${slot.role || ''}` : '';
}

function syncGradeButtons() {
  const row = $('gradeRow');
  if (!row) return;
  row.querySelectorAll('button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.grade === state.gradeId);
    btn.setAttribute('aria-pressed', btn.dataset.grade === state.gradeId ? 'true' : 'false');
  });
  const blurb = $('gradeBlurb');
  if (blurb) blurb.textContent = gradeById(state.gradeId).blurb;
}

function syncFurnitureInputs() {
  const toggle = $('furnitureCheck');
  if (toggle) toggle.checked = state.furniture !== false;
  const set = (id, value) => {
    const el = $(id);
    if (el) el.value = value;
  };
  set('quoteInput', state.quote);
  set('quoteSourceInput', state.quoteSource);
  set('taglineInput', state.tagline);
  set('billingInput', state.billing);
  set('volInput', state.vol);
  const release = $('releaseSelect');
  if (release) release.value = state.release;
  const seal = $('sealCheck');
  if (seal) seal.checked = state.seal !== false;
  const barcode = $('barcodeCheck');
  if (barcode) barcode.checked = state.barcode !== false;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

async function loadSamples() {
  for (const s of SAMPLES) {
    try {
      const img = await loadImage(s.src);
      photos.set(s.id, { name: s.name, img, builtin: true, face: s.face || null });
    } catch (e) {
      console.error(e.message);
    }
  }
}

function handleUploadFiles(files) {
  const list = [...files].filter((f) => f.type.startsWith('image/'));
  if (!list.length) return;
  list.forEach((file) => {
    const reader = new FileReader();
    const id = `up${(uploadCount += 1)}`;
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        photos.set(id, { name: file.name.replace(/\.[^.]+$/, ''), img, builtin: false, face: null });
        uploads.push(id);
        // Put the new photo on the selected panel straight away.
        if (state.panels[selectedPanel]) setPanelPhoto(selectedPanel, id);
        syncPanelList();
        syncPhotoButtons();
        syncRoleInputs();
        syncCropSliders();
        setStatus(`Loaded ${file.name} — it is on panel ${selectedPanel + 1} now.`);
        queueRender();
      };
      img.onerror = () => setStatus(`Could not read ${file.name}.`);
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function setStatus(text) {
  const el = $('statusLine');
  if (el) el.textContent = text;
}

// ---- Export ---------------------------------------------------------------
function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed: the browser could not make the PNG.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setStatus(`Exported ${filename} — share it anywhere.`);
  }, 'image/png');
}

function exportSize(size) {
  const imgMap = new Map([...photos.entries()].map(([id, e]) => [id, e.img]));
  const canvas = exportCover(size.w, size.h, state, imgMap);
  downloadCanvas(canvas, `vice-cover-${size.w}x${size.h}.png`);
}

// Same render path, as a data URL, for scripted screenshots: the PNG the
// app writes, without a download dialog.
window.__exportCover = function (w, h) {
  const imgMap = new Map([...photos.entries()].map(([id, e]) => [id, e.img]));
  const canvas = exportCover(w, h, state, imgMap);
  return canvas.toDataURL('image/png');
};
window.__viceState = state;
// Scripted hooks for the play-test: face-aware crop for a panel, the
// crop a panel currently holds, and the layout's cast ranks.
window.__faceCrop = function (i) {
  const c = faceCropFor(i);
  if (state.panels[i]) {
    state.panels[i].zoom = c.zoom;
    state.panels[i].ox = c.ox;
    state.panels[i].oy = c.oy;
    state.panels[i].autoCrop = true;
    saveCrop(i);
    syncCropSliders();
    queueRender();
  }
  return c;
};
window.__cropFor = (i) => {
  const s = state.panels[i];
  return s ? { zoom: s.zoom, ox: s.ox, oy: s.oy, photo: s.photo, role: s.role } : null;
};
window.__cropStoreSize = () => cropStore.size;
window.__roleRanks = () => roleRanks(state.layout);
// Where the picked panel's face anchor (or focal centre) lands on the
// cover, in cover pixels — for the play-test to prove the face is in
// frame after a face-aware crop.
window.__faceScreen = function (i, w = previewSize.w, h = previewSize.h) {
  const slot = state.panels[i];
  const entry = slot ? photos.get(slot.photo) : null;
  const rect = panelRects(state.layout, w, h)[i];
  if (!slot || !entry || !rect) return null;
  const img = entry.img;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const face = entry.face || null;
  const cx = face ? face.x + face.w / 2 : 0.5;
  const cy = face ? face.y + face.h / 2 : 0.5;
  const ay = face && Number.isFinite(face.aim) ? face.aim : cy;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const scale = base * (slot.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const maxOx = Math.max(0, (dw - rect.w) / 2 / rect.w);
  const maxOy = Math.max(0, (dh - rect.h) / 2 / rect.h);
  const ox = Math.max(-maxOx, Math.min(maxOx, slot.ox || 0));
  const oy = Math.max(-maxOy, Math.min(maxOy, slot.oy || 0));
  const dx = rect.x + (rect.w - dw) / 2 + ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + oy * rect.h;
  const faceX = dx + cx * dw;
  const faceY = dy + cy * dh;
  const aimY = dy + ay * dh;
  return {
    anchor: face ? 'face' : 'focal',
    faceX,
    faceY,
    aimY,
    panel: rect,
    inside: faceX >= rect.x && faceX <= rect.x + rect.w
      && faceY >= rect.y && faceY <= rect.y + rect.h,
    offsetX: (faceX - (rect.x + rect.w / 2)) / rect.w,
    offsetY: (faceY - (rect.y + rect.h / 2)) / rect.h,
    aimOffsetY: (aimY - (rect.y + rect.h / 2)) / rect.h,
  };
};

// ---- Surprise me: one click to a whole new poster ---------------------------
function surpriseMe() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  state.layout = pick(LAYOUT_IDS);
  state.gradeId = pick(GRADE_IDS);
  state.caption = pick(CAPTIONS);
  state.script = pick(SCRIPTS);
  state.tagline = pick(TAGLINES);
  state.titleStacked = Math.random() < 0.3;
  state.furniture = true;
  // Shuffle the cast: a random sample photo on every panel, framed on
  // its face (or its centre, for a scene photo), so the same photos
  // read as new shots.
  state.panels.forEach((slot, i) => {
    const photo = pick(SAMPLES).id;
    slot.photo = photo;
    slot.role = '';
    slot.sub = '';
    const c = faceCropFor(i);
    slot.zoom = c.zoom;
    slot.ox = c.ox;
    slot.oy = c.oy;
    slot.autoCrop = true;
    saveCrop(i);
  });
  assignRolesByPosition();
  if (selectedPanel >= panelCount()) selectedPanel = 0;
  syncLayoutButtons();
  syncGradeButtons();
  syncPanelList();
  syncPhotoButtons();
  syncRoleInputs();
  syncCropSliders();
  syncFurnitureInputs();
  const cap = $('capInput');
  if (cap) cap.value = state.caption;
  const sub = $('subInput');
  if (sub) sub.value = state.script;
  const stacked = $('stackedCheck');
  if (stacked) stacked.checked = state.titleStacked;
  setStatus(`Surprise! ${layoutById(state.layout).name} · ${gradeById(state.gradeId).name} · “${state.caption}”.`);
  queueRender();
}

// ---- Pointer interaction on the preview ------------------------------------
function bindPreview() {
  const canvas = $('preview');
  if (!canvas) return;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const toCoverPoint = (event) => {
    const box = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * canvas.width,
      y: ((event.clientY - box.top) / box.height) * canvas.height,
    };
  };

  canvas.addEventListener('pointerdown', (event) => {
    const p = toCoverPoint(event);
    const hit = panelAt(state.layout, canvas.width, canvas.height, p.x, p.y);
    if (hit >= 0 && hit !== selectedPanel) {
      selectedPanel = hit;
      syncPanelList();
      syncPhotoButtons();
      syncRoleInputs();
      syncCropSliders();
      queueRender();
    }
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const slot = state.panels[selectedPanel];
    if (!slot) return;
    const box = canvas.getBoundingClientRect();
    const rects = panelRects(state.layout, canvas.width, canvas.height);
    const r = rects[selectedPanel];
    if (!r) return;
    slot.ox = Math.max(-0.8, Math.min(0.8, slot.ox + ((event.clientX - lastX) / box.width) * (canvas.width / r.w)));
    slot.oy = Math.max(-0.8, Math.min(0.8, slot.oy + ((event.clientY - lastY) / box.height) * (canvas.height / r.h)));
    slot.autoCrop = false;
    lastX = event.clientX;
    lastY = event.clientY;
    syncCropSliders();
    queueRender();
  });

  const endDrag = () => {
    if (dragging) saveCrop(selectedPanel);
    dragging = false;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const slot = state.panels[selectedPanel];
    if (!slot) return;
    slot.zoom = Math.max(1, Math.min(3, slot.zoom * (1 - event.deltaY * 0.001)));
    slot.autoCrop = false;
    saveCrop(selectedPanel);
    syncCropSliders();
    queueRender();
  }, { passive: false });
}

// ---- Controls ---------------------------------------------------------------
function bindControls() {
  const layoutRow = $('layoutRow');
  if (layoutRow) {
    layoutRow.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => setLayout(btn.dataset.layout));
    });
  }

  const zoom = $('zoomRange');
  if (zoom) {
    zoom.addEventListener('input', () => {
      const slot = state.panels[selectedPanel];
      if (!slot) return;
      slot.zoom = Number(zoom.value);
      slot.autoCrop = false;
      saveCrop(selectedPanel);
      syncCropSliders();
      queueRender();
    });
  }
  const oxRange = $('oxRange');
  if (oxRange) {
    oxRange.addEventListener('input', () => {
      const slot = state.panels[selectedPanel];
      if (!slot) return;
      slot.ox = Number(oxRange.value);
      slot.autoCrop = false;
      saveCrop(selectedPanel);
      syncCropSliders();
      queueRender();
    });
  }
  const oyRange = $('oyRange');
  if (oyRange) {
    oyRange.addEventListener('input', () => {
      const slot = state.panels[selectedPanel];
      if (!slot) return;
      slot.oy = Number(oyRange.value);
      slot.autoCrop = false;
      saveCrop(selectedPanel);
      syncCropSliders();
      queueRender();
    });
  }
  const faceBtn = $('faceCropBtn');
  if (faceBtn) faceBtn.addEventListener('click', () => applyFaceCrop(selectedPanel));
  const cropReset = $('cropResetBtn');
  if (cropReset) cropReset.addEventListener('click', () => resetCrop(selectedPanel));

  const roleInput = $('roleInput');
  if (roleInput) {
    roleInput.addEventListener('input', () => {
      const slot = state.panels[selectedPanel];
      if (!slot) return;
      slot.role = roleInput.value;
      syncPanelList();
      queueRender();
    });
  }
  const roleSubInput = $('roleSubInput');
  if (roleSubInput) {
    roleSubInput.addEventListener('input', () => {
      const slot = state.panels[selectedPanel];
      if (!slot) return;
      slot.sub = roleSubInput.value;
      queueRender();
    });
  }

  const cap = $('capInput');
  if (cap) {
    cap.addEventListener('input', () => {
      state.caption = cap.value;
      queueRender();
    });
  }
  const sub = $('subInput');
  if (sub) {
    sub.addEventListener('input', () => {
      state.script = sub.value;
      queueRender();
    });
  }
  const capSize = $('capSize');
  if (capSize) {
    capSize.addEventListener('input', () => {
      state.captionSize = Number(capSize.value);
      const label = $('capSizeValue');
      if (label) label.textContent = `${state.captionSize.toFixed(2)}×`;
      queueRender();
    });
  }
  const stacked = $('stackedCheck');
  if (stacked) {
    stacked.addEventListener('change', () => {
      state.titleStacked = stacked.checked;
      queueRender();
    });
  }

  const gradeRow = $('gradeRow');
  if (gradeRow) {
    gradeRow.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.gradeId = gradeById(btn.dataset.grade).id;
        syncGradeButtons();
        queueRender();
      });
    });
  }
  const grade = $('gradeRange');
  if (grade) {
    grade.addEventListener('input', () => {
      state.grade = Number(grade.value);
      const label = $('gradeValue');
      if (label) label.textContent = `${Math.round(state.grade * 100)}%`;
      queueRender();
    });
  }
  const grain = $('grainRange');
  if (grain) {
    grain.addEventListener('input', () => {
      state.grain = Number(grain.value);
      const label = $('grainValue');
      if (label) label.textContent = `${Math.round(state.grain * 100)}%`;
      queueRender();
    });
  }
  const halftone = $('halftoneCheck');
  if (halftone) {
    halftone.addEventListener('change', () => {
      state.halftone = halftone.checked;
      queueRender();
    });
  }
  const ink = $('inkCheck');
  if (ink) {
    ink.addEventListener('change', () => {
      state.ink = ink.checked;
      queueRender();
    });
  }

  const furniture = $('furnitureCheck');
  if (furniture) {
    furniture.addEventListener('change', () => {
      state.furniture = furniture.checked;
      queueRender();
    });
  }
  const bindText = (id, key) => {
    const el = $(id);
    if (el) {
      el.addEventListener('input', () => {
        state[key] = el.value;
        queueRender();
      });
    }
  };
  bindText('quoteInput', 'quote');
  bindText('quoteSourceInput', 'quoteSource');
  bindText('taglineInput', 'tagline');
  bindText('billingInput', 'billing');
  bindText('volInput', 'vol');
  const release = $('releaseSelect');
  if (release) {
    release.addEventListener('change', () => {
      state.release = release.value;
      queueRender();
    });
  }
  const seal = $('sealCheck');
  if (seal) {
    seal.addEventListener('change', () => {
      state.seal = seal.checked;
      queueRender();
    });
  }
  const barcode = $('barcodeCheck');
  if (barcode) {
    barcode.addEventListener('change', () => {
      state.barcode = barcode.checked;
      queueRender();
    });
  }

  const surprise = $('surpriseBtn');
  if (surprise) surprise.addEventListener('click', surpriseMe);

  const sizeRow = $('exportRow');
  if (sizeRow) {
    sizeRow.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const size = EXPORT_SIZES.find((s) => s.id === btn.dataset.size);
        if (size) exportSize(size);
      });
    });
  }

  const fileInput = $('fileInput');
  const uploadBtn = $('uploadBtn');
  if (fileInput && uploadBtn) {
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      handleUploadFiles(fileInput.files);
      fileInput.value = '';
    });
  }

  const sizeSelect = $('previewSize');
  if (sizeSelect) {
    sizeSelect.addEventListener('change', () => {
      const size = EXPORT_SIZES.find((s) => s.id === sizeSelect.value) || EXPORT_SIZES[0];
      previewSize = { w: size.w, h: size.h };
      queueRender();
    });
  }
}

// ---- Screenshot mode (?shot=cover / ?shot=editor) ---------------------------
// Deep links set the whole poster: layout, grade, furniture text, role
// tags, per-panel photos and framing, so a screenshot URL reproduces a
// cover exactly.
function applyQuery() {
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot');
  const photo = q.get('photo');
  const caption = q.get('caption');
  const subtitle = q.get('subtitle');
  const script = q.get('script');
  const layout = q.get('layout');
  const panels = q.get('panels');

  if (layout && LAYOUTS[layout]) {
    state.layout = layout;
  }
  if (q.get('gradeId') && GRADES[q.get('gradeId')]) state.gradeId = q.get('gradeId');
  if (q.get('furniture') === '0') state.furniture = false;
  if (q.get('ink') === '1') state.ink = true;
  if (q.get('stacked') === '1') state.titleStacked = true;
  if (q.get('stacked') === '0') state.titleStacked = false;
  if (q.get('quote') !== null) state.quote = q.get('quote');
  if (q.get('quoteSource') !== null) state.quoteSource = q.get('quoteSource');
  if (q.get('tagline') !== null) state.tagline = q.get('tagline');
  if (q.get('billing') !== null) state.billing = q.get('billing');
  if (q.get('vol') !== null) state.vol = q.get('vol');
  if (q.get('release') !== null) state.release = q.get('release');
  if (q.get('heat') !== null) state.heat = Math.max(0, Math.min(5, Number(q.get('heat'))));
  if (q.get('seal') === '0') state.seal = false;
  if (q.get('barcode') === '0') state.barcode = false;
  if (q.get('roles')) {
    q.get('roles').split(',').forEach((role, i) => {
      if (state.panels[i] && role) state.panels[i].role = role;
    });
  }
  if (q.get('subs')) {
    q.get('subs').split('|').forEach((sub, i) => {
      if (state.panels[i] && sub) state.panels[i].sub = sub;
    });
  }
  if (photo && photos.has(photo)) {
    state.panels.forEach((p, i) => setPanelPhoto(i, photo));
  }
  if (panels) {
    const ids = panels.split(',');
    ids.forEach((id, i) => {
      if (state.panels[i] && photos.has(id)) setPanelPhoto(i, id);
    });
  }
  // Per-panel framing, comma-separated, e.g. oy=0.75,0.8,0 — a deep link
  // can frame a face inside a wide panel, just like dragging in the editor.
  const oxList = q.get('ox') ? q.get('ox').split(',') : [];
  const oyList = q.get('oy') ? q.get('oy').split(',') : [];
  const zoomList = q.get('zoom') ? q.get('zoom').split(',') : [];
  state.panels.forEach((slot, i) => {
    const ox = oxList[i] === undefined || oxList[i] === '' ? NaN : Number(oxList[i]);
    const oy = oyList[i] === undefined || oyList[i] === '' ? NaN : Number(oyList[i]);
    const zm = zoomList[i] === undefined || zoomList[i] === '' ? NaN : Number(zoomList[i]);
    if (Number.isFinite(ox)) { slot.ox = Math.max(-0.8, Math.min(0.8, ox)); slot.autoCrop = false; }
    if (Number.isFinite(oy)) { slot.oy = Math.max(-0.8, Math.min(0.8, oy)); slot.autoCrop = false; }
    if (Number.isFinite(zm)) { slot.zoom = Math.max(1, Math.min(3, zm)); slot.autoCrop = false; }
  });
  // A deep link can also ask for the face-aware crop on some panels,
  // e.g. facecrop=0,2 — the face anchor (or focal centre) is centred
  // in each named panel.
  if (q.get('facecrop')) {
    q.get('facecrop').split(',').forEach((raw) => {
      const i = Number(raw);
      if (Number.isInteger(i) && state.panels[i]) {
        const c = faceCropFor(i, Number(q.get('w') || previewSize.w), Number(q.get('h') || previewSize.h));
        state.panels[i].zoom = c.zoom;
        state.panels[i].ox = c.ox;
        state.panels[i].oy = c.oy;
        state.panels[i].autoCrop = true;
      }
    });
  }
  // Remember the (possibly deep-linked) framing as each panel's crop,
  // so switching photos later restores it.
  state.panels.forEach((_, i) => saveCrop(i));
  if (caption !== null) state.caption = caption;
  if (script !== null) state.script = script;
  else if (subtitle !== null) state.script = subtitle;
  if (q.get('grade') !== null) state.grade = Math.max(0, Math.min(1, Number(q.get('grade'))));
  if (q.get('halftone') === '0') state.halftone = false;

  if (shot === 'cover') {
    document.body.classList.add('cover-mode');
    const w = Number(q.get('w') || 1920);
    const h = Number(q.get('h') || 1080);
    const canvas = $('coverCanvas');
    canvas.width = w;
    canvas.height = h;
    const imgMap = new Map([...photos.entries()].map(([id, e]) => [id, e.img]));
    const ctx = canvas.getContext('2d');
    drawCover(ctx, w, h, state, imgMap);
    window.__coverReady = true;
    return true;
  }
  return false;
}

// ---- Boot -------------------------------------------------------------------
async function boot() {
  await loadSamples();
  try {
    await Promise.all([
      document.fonts.load('16px Anton'),
      document.fonts.load("16px 'Bebas Neue'"),
      document.fonts.load('16px Pacifico'),
      document.fonts.ready,
    ]);
  } catch (e) {
    // Fonts fall back to the system faces; the cover still draws.
  }
  bindControls();
  bindPreview();
  syncLayoutButtons();
  syncGradeButtons();
  syncPanelList();
  syncPhotoButtons();
  syncRoleInputs();
  syncFurnitureInputs();
  syncCropSliders();
  const coverMode = applyQuery();
  if (!coverMode) {
    // Keep the editor inputs in sync with the (possibly query-set) state.
    const cap = $('capInput');
    if (cap) cap.value = state.caption;
    const sub = $('subInput');
    if (sub) sub.value = state.script;
    const stacked = $('stackedCheck');
    if (stacked) stacked.checked = !!state.titleStacked;
    queueRender();
  }
  window.__viceReady = true;
}

boot();

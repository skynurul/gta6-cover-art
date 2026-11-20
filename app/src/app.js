// Vice Cover Studio editor: state, photo library, panel picking and
// dragging, caption and grade controls. The cover itself is drawn by
// render.js; this file only wires the editor around it.
import { LAYOUTS, LAYOUT_IDS, layoutById, panelRects, panelAt } from './layouts.js';
import { drawCover, exportCover } from './render.js';

export const EXPORT_SIZES = [
  { id: '1080x1080', w: 1080, h: 1080, label: '1080 × 1080' },
  { id: '1080x1350', w: 1080, h: 1350, label: '1080 × 1350' },
  { id: '1920x1080', w: 1920, h: 1080, label: '1920 × 1080' },
];

const SAMPLES = [
  { id: 'pier', name: 'Pier sunset', src: 'samples/pier.jpg' },
  { id: 'boulevard', name: 'Boulevard', src: 'samples/boulevard.jpg' },
];

const state = {
  layout: 'hero',
  caption: 'Sunset Heist',
  subtitle: 'VICE CITY • 2026',
  captionSize: 1,
  captionPos: 'bottom',
  grade: 0.8,
  grain: 0.5,
  halftone: true,
  panels: [
    { photo: 'pier', zoom: 1.15, ox: 0, oy: 0 },
    { photo: 'boulevard', zoom: 1.15, ox: 0, oy: 0 },
    { photo: 'pier', zoom: 1.15, ox: 0, oy: 0 },
  ],
};

const photos = new Map(); // id -> { name, img, builtin }
const uploads = []; // upload ids in order, for the photo picker
let uploadCount = 0;
let selectedPanel = 0;
let previewSize = { w: 1080, h: 1080 };
let renderQueued = false;

const $ = (id) => document.getElementById(id);

function defaultSlot(photo) {
  return { photo: photo || 'pier', zoom: 1.15, ox: 0, oy: 0 };
}

function slotsForLayout(layoutId) {
  const count = layoutById(layoutId).panels.length;
  const slots = [];
  for (let i = 0; i < count; i += 1) {
    slots.push(state.panels[i] ? { ...state.panels[i] } : defaultSlot(i === 0 ? 'pier' : 'boulevard'));
  }
  return slots;
}

function setLayout(layoutId) {
  state.layout = layoutById(layoutId).id;
  state.panels = slotsForLayout(state.layout);
  selectedPanel = 0;
  syncLayoutButtons();
  syncPanelList();
  syncPhotoButtons();
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
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const ctx = canvas.getContext('2d');
  const r = rects[selectedPanel];
  if (!r) return;
  ctx.save();
  ctx.strokeStyle = '#ff2e88';
  ctx.lineWidth = Math.max(3, canvas.width / 360);
  ctx.setLineDash([14, 10]);
  ctx.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
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
  state.panels.forEach((slot, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel-chip' + (i === selectedPanel ? ' active' : '');
    const entry = photos.get(slot.photo);
    btn.textContent = `Panel ${i + 1} · ${entry ? entry.name : slot.photo}`;
    btn.addEventListener('click', () => {
      selectedPanel = i;
      syncPanelList();
      syncPhotoButtons();
      syncZoomSlider();
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
      state.panels[selectedPanel].photo = id;
      syncPanelList();
      syncPhotoButtons();
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
    state.panels.forEach((p) => {
      p.photo = slot.photo;
    });
    syncPanelList();
    syncPhotoButtons();
    queueRender();
  });
  list.appendChild(allBtn);
}

function syncZoomSlider() {
  const slider = $('zoomRange');
  const label = $('zoomValue');
  const slot = state.panels[selectedPanel];
  if (!slider || !slot) return;
  slider.value = String(slot.zoom);
  if (label) label.textContent = `${slot.zoom.toFixed(2)}×`;
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
      photos.set(s.id, { name: s.name, img, builtin: true });
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
        photos.set(id, { name: file.name.replace(/\.[^.]+$/, ''), img, builtin: false });
        uploads.push(id);
        // Put the new photo on the selected panel straight away.
        if (state.panels[selectedPanel]) state.panels[selectedPanel].photo = id;
        syncPanelList();
        syncPhotoButtons();
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
      syncZoomSlider();
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
    lastX = event.clientX;
    lastY = event.clientY;
    queueRender();
  });

  const endDrag = () => {
    dragging = false;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const slot = state.panels[selectedPanel];
    if (!slot) return;
    slot.zoom = Math.max(1, Math.min(3, slot.zoom * (1 - event.deltaY * 0.001)));
    syncZoomSlider();
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
      syncZoomSlider();
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
      state.subtitle = sub.value;
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
  document.querySelectorAll('[data-cap-pos]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.captionPos = btn.dataset.capPos;
      document.querySelectorAll('[data-cap-pos]').forEach((b) => {
        b.classList.toggle('active', b === btn);
      });
      queueRender();
    });
  });

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
function applyQuery() {
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot');
  const photo = q.get('photo');
  const caption = q.get('caption');
  const subtitle = q.get('subtitle');
  const layout = q.get('layout');
  const panels = q.get('panels');

  if (layout && LAYOUTS[layout]) {
    state.layout = layout;
    state.panels = slotsForLayout(layout);
  }
  if (photo && photos.has(photo)) {
    state.panels.forEach((p) => {
      p.photo = photo;
    });
  }
  if (panels) {
    const ids = panels.split(',');
    ids.forEach((id, i) => {
      if (state.panels[i] && photos.has(id)) state.panels[i].photo = id;
    });
  }
  // Per-panel framing, comma-separated, e.g. oy=0.75,0.8,0 — a deep link
  // can frame a face inside a wide panel, just like dragging in the editor.
  const oxList = q.get('ox') ? q.get('ox').split(',') : [];
  const oyList = q.get('oy') ? q.get('oy').split(',') : [];
  state.panels.forEach((slot, i) => {
    const ox = oxList[i] === undefined || oxList[i] === '' ? NaN : Number(oxList[i]);
    const oy = oyList[i] === undefined || oyList[i] === '' ? NaN : Number(oyList[i]);
    if (Number.isFinite(ox)) slot.ox = Math.max(-0.8, Math.min(0.8, ox));
    if (Number.isFinite(oy)) slot.oy = Math.max(-0.8, Math.min(0.8, oy));
  });
  if (caption !== null) state.caption = caption;
  if (subtitle !== null) state.subtitle = subtitle;
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
    await document.fonts.ready;
  } catch (e) {
    // Fonts fall back to the system condensed face; the cover still draws.
  }
  bindControls();
  bindPreview();
  syncLayoutButtons();
  syncPanelList();
  syncPhotoButtons();
  syncZoomSlider();
  const coverMode = applyQuery();
  if (!coverMode) {
    // Keep the editor inputs in sync with the (possibly query-set) state.
    const cap = $('capInput');
    if (cap) cap.value = state.caption;
    const sub = $('subInput');
    if (sub) sub.value = state.subtitle;
    queueRender();
  }
  window.__viceReady = true;
}

boot();

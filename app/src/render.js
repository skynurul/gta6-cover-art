// Cover rendering for Vice Cover Studio: panels, the Vice City neon-sunset
// grade, and the bold caption lettering. Everything is drawn on a 2D canvas
// so the preview and the exported PNG come from the exact same code.
import { panelRects } from './layouts.js';

let grainTile = null;

function makeGrainTile() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 128;
  tile.height = 128;
  const g = tile.getContext('2d');
  const data = g.createImageData(128, 128);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 110 + Math.floor(Math.random() * 90);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  g.putImageData(data, 0, 0);
  grainTile = tile;
  return tile;
}

// Draw one photo inside a panel rect, cover-fit, with a zoom factor and a
// pan offset (ox, oy are fractions of the panel width/height, -0.5..0.5).
export function drawPhotoInPanel(ctx, img, rect, zoom, ox, oy) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 + ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + oy * rect.h;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function applySunsetGrade(ctx, width, height, strength) {
  if (strength <= 0) return;
  const s = Math.max(0, Math.min(1, strength));

  // Warm magenta-to-orange wash, stronger at the top and the bottom.
  const wash = ctx.createLinearGradient(0, 0, 0, height);
  wash.addColorStop(0.0, `rgba(255, 46, 136, ${0.34 * s})`);
  wash.addColorStop(0.35, `rgba(255, 90, 120, ${0.10 * s})`);
  wash.addColorStop(0.65, `rgba(255, 140, 60, ${0.08 * s})`);
  wash.addColorStop(1.0, `rgba(255, 154, 61, ${0.30 * s})`);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Teal shadows in the lower half, for the neon dusk contrast.
  const teal = ctx.createLinearGradient(0, height * 0.4, 0, height);
  teal.addColorStop(0, 'rgba(0, 190, 190, 0)');
  teal.addColorStop(1, `rgba(0, 170, 190, ${0.16 * s})`);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = teal;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Vignette: darken the edges so the middle pops.
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(width, height) * 0.75;
  const vig = ctx.createRadialGradient(cx, cy, radius * 0.45, cx, cy, radius);
  vig.addColorStop(0, 'rgba(8, 2, 10, 0)');
  vig.addColorStop(1, `rgba(8, 2, 10, ${0.38 * s})`);
  ctx.save();
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function applyHalftone(ctx, width, height, strength) {
  if (strength <= 0) return;
  const step = Math.max(10, Math.round(width / 110));
  const skyH = height * 0.45;
  ctx.save();
  ctx.fillStyle = `rgba(20, 4, 16, ${0.16 * strength})`;
  for (let y = step / 2; y < skyH; y += step) {
    // Dots grow slightly toward the top of the sky, comic-print style.
    const r = Math.max(0.7, (step * 0.32 * (skyH - y)) / skyH + 0.6);
    for (let x = step / 2; x < width; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function applyGrain(ctx, width, height, amount) {
  if (amount <= 0) return;
  const tile = makeGrainTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.10 * Math.max(0, Math.min(1, amount));
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawCaption(ctx, width, height, state) {
  const text = (state.caption || '').trim();
  const sub = (state.subtitle || '').trim();
  if (!text && !sub) return;
  const unit = Math.min(width, height) / 1080;
  const atTop = state.captionPos === 'top';
  const bandH = height * 0.24;
  const bandY = atTop ? 0 : height - bandH;

  // Scrim behind the lettering so it reads over any photo.
  const scrim = ctx.createLinearGradient(0, bandY, 0, atTop ? bandH : height);
  if (atTop) {
    scrim.addColorStop(0, 'rgba(10, 4, 12, 0.78)');
    scrim.addColorStop(1, 'rgba(10, 4, 12, 0)');
  } else {
    scrim.addColorStop(0, 'rgba(10, 4, 12, 0)');
    scrim.addColorStop(1, 'rgba(10, 4, 12, 0.78)');
  }
  ctx.save();
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY, width, bandH);
  ctx.restore();

  const cx = width / 2;
  const maxW = width * 0.88;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (text) {
    let size = Math.round(height * 0.105 * (state.captionSize || 1));
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    while (size > 18 && ctx.measureText(text).width > maxW) {
      size -= 2;
      ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    }
    const capY = atTop
      ? bandY + size * 1.05
      : height - height * 0.055 - (sub ? size * 0.52 : 0);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size * 0.09);
    ctx.strokeStyle = '#1c0512';
    ctx.fillStyle = '#fff6e6';
    ctx.shadowColor = 'rgba(255, 46, 136, 0.55)';
    ctx.shadowBlur = size * 0.22;
    ctx.shadowOffsetY = size * 0.03;
    ctx.strokeText(text, cx, capY);
    ctx.fillText(text, cx, capY);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  if (sub) {
    const subSize = Math.round(height * 0.032);
    ctx.font = `${subSize}px 'Bebas Neue', 'Arial Narrow', sans-serif`;
    try {
      ctx.letterSpacing = `${Math.round(subSize * 0.22)}px`;
    } catch (e) {
      // Older browsers ignore letterSpacing; the text still draws.
    }
    ctx.lineWidth = Math.max(2, subSize * 0.14);
    ctx.strokeStyle = '#1c0512';
    ctx.fillStyle = '#ffd9a0';
    const subY = atTop
      ? bandY + height * 0.105 * (state.captionSize || 1) + subSize * 1.9
      : height - height * 0.028;
    ctx.strokeText(sub, cx, subY);
    ctx.fillText(sub, cx, subY);
    try {
      ctx.letterSpacing = '0px';
    } catch (e) {
      /* ignore */
    }
  }
  ctx.restore();
}

// Draw the whole cover on ctx at the given size. `photos` maps a photo id
// to a loaded <img>; a missing photo paints its panel dark pink instead of
// crashing, so the editor never shows a blank page while photos load.
export function drawCover(ctx, width, height, state, photos) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#150710';
  ctx.fillRect(0, 0, width, height);

  const gap = Math.max(2, Math.round((width / 1080) * 8));
  const rects = panelRects(state.layout, width, height);
  rects.forEach((rect, i) => {
    const slot = (state.panels && state.panels[i]) || { photo: 'pier', zoom: 1, ox: 0, oy: 0 };
    const inner = {
      x: rect.x + (i === 0 || rect.x === 0 ? 0 : gap / 2),
      y: rect.y + (rect.y === 0 ? 0 : gap / 2),
      w: rect.w - (rect.x === 0 ? gap / 2 : gap),
      h: rect.h - (rect.y === 0 ? gap / 2 : gap),
    };
    // Keep the outer edge flush and split the gap between neighbours.
    if (rect.x + rect.w >= width) inner.w = rect.x + rect.w - inner.x;
    if (rect.y + rect.h >= height) inner.h = rect.y + rect.h - inner.y;
    ctx.save();
    ctx.beginPath();
    ctx.rect(inner.x, inner.y, inner.w, inner.h);
    ctx.clip();
    const img = photos ? photos.get(slot.photo) : null;
    if (img && (img.complete || img.naturalWidth)) {
      drawPhotoInPanel(ctx, img, inner, slot.zoom || 1, slot.ox || 0, slot.oy || 0);
    } else {
      ctx.fillStyle = '#3d1226';
      ctx.fillRect(inner.x, inner.y, inner.w, inner.h);
    }
    ctx.restore();
  });

  applySunsetGrade(ctx, width, height, state.grade);
  if (state.halftone) applyHalftone(ctx, width, height, state.grade);
  applyGrain(ctx, width, height, state.grain);

  // Thin poster frame.
  const frame = Math.max(2, Math.round((width / 1080) * 3));
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 246, 230, 0.30)';
  ctx.lineWidth = frame;
  ctx.strokeRect(frame, frame, width - frame * 2, height - frame * 2);
  ctx.restore();

  drawCaption(ctx, width, height, state);
  ctx.restore();
}

// Render a fresh canvas at the exact export size and return it.
export function exportCover(width, height, state, photos) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, width, height, state, photos);
  return canvas;
}

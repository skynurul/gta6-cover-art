// Cover rendering for Vice Cover Studio, round 3: the movie-poster
// look. Panels are slanted with thin gold borders, one hero pops out
// over its neighbours, and the cover carries the full poster furniture
// (quote bar, giant striped-gradient title, neon script subtitle, role
// tags, tagline ribbon, billing block, seal and barcode). Everything is
// drawn on a 2D canvas so the preview and the exported PNG come from the
// exact same code.
//
// Round 3 adds the Sunset sky glow: the Sunset grade carries a glow
// spec (a sun position and colour), and applySkyGlow paints a warm
// radial halo over the sky after the grade wash, so the sunset reads
// stronger without touching the photos' own light.
import { panelPolys, drawOrder, layoutById } from './layouts.js';

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

// ---- Grade presets --------------------------------------------------------
// The grade the top covers share: a warm magenta-to-orange wash with
// teal shadows, punchy saturation and a dark vignette. Each preset is a
// wash gradient (colour stops as [position, 'r,g,b', alpha]), a teal
// multiply strength, a vignette strength, and the photo filter that
// gives the painted, high-contrast look. The Sunset grade also carries
// a sky glow: the sun's position on the cover (normalised x/y), the
// halo radius (fraction of the cover's long side), its colour and its
// peak alpha.
export const GRADES = {
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    blurb: 'Magenta-orange dusk, teal shadows — the Vice City grade.',
    wash: [[0, '255,46,136', 0.55], [0.35, '255,90,120', 0.16], [0.65, '255,140,60', 0.14], [1, '255,154,61', 0.46]],
    teal: 0.24, vig: 0.42, sat: 1.22, con: 1.07,
    glow: { x: 0.7, y: 0.2, r: 0.45, color: '255, 190, 80', alpha: 0.55 },
  },
  neon: {
    id: 'neon',
    name: 'Neon Night',
    blurb: 'Deep magenta and cyan, after dark.',
    wash: [[0, '190,30,200', 0.45], [0.5, '255,46,160', 0.14], [1, '255,120,40', 0.22]],
    teal: 0.3, vig: 0.5, sat: 1.3, con: 1.1,
  },
  golden: {
    id: 'golden',
    name: 'Golden Hour',
    blurb: 'Warm amber light, soft pink.',
    wash: [[0, '255,180,80', 0.3], [0.5, '255,150,60', 0.12], [1, '255,120,40', 0.3]],
    teal: 0.1, vig: 0.32, sat: 1.18, con: 1.05,
  },
  noir: {
    id: 'noir',
    name: 'Vice Noir',
    blurb: 'Dark, desaturated, high contrast.',
    wash: [[0, '40,20,60', 0.3], [1, '10,5,15', 0.35]],
    teal: 0.12, vig: 0.55, sat: 0.75, con: 1.18,
  },
  palm: {
    id: 'palm',
    name: 'Palm Pink',
    blurb: 'Bright pink dusk, soft and light.',
    wash: [[0, '255,120,180', 0.34], [0.5, '255,150,170', 0.12], [1, '255,170,120', 0.26]],
    teal: 0.14, vig: 0.26, sat: 1.2, con: 1.04,
  },
  heatwave: {
    id: 'heatwave',
    name: 'Heatwave',
    blurb: 'Hot orange-red, maximum summer.',
    wash: [[0, '255,80,40', 0.36], [0.5, '255,120,30', 0.16], [1, '255,60,20', 0.34]],
    teal: 0.08, vig: 0.38, sat: 1.32, con: 1.1,
  },
};

export const GRADE_IDS = Object.keys(GRADES);

export function gradeById(id) {
  return GRADES[id] || GRADES.sunset;
}

function pathPoly(ctx, poly) {
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i][0], poly[i][1]);
  ctx.closePath();
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Draw one photo inside a rect, cover-fit, with a zoom factor and a pan
// offset (ox, oy are fractions of the rect width/height, -0.5..0.5).
// The pan is clamped so the photo always covers the rect: a big pan on
// a tall panel would otherwise expose the dark background behind it.
export function drawPhotoInPanel(ctx, img, rect, zoom, ox, oy) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const maxOx = Math.max(0, (dw - rect.w) / 2 / rect.w);
  const maxOy = Math.max(0, (dh - rect.h) / 2 / rect.h);
  ox = Math.max(-maxOx, Math.min(maxOx, ox));
  oy = Math.max(-maxOy, Math.min(maxOy, oy));
  const dx = rect.x + (rect.w - dw) / 2 + ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + oy * rect.h;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function applyGrade(ctx, width, height, grade, strength) {
  if (strength <= 0) return;
  const s = Math.max(0, Math.min(1, strength));

  const wash = ctx.createLinearGradient(0, 0, 0, height);
  grade.wash.forEach(([pos, rgb, alpha]) => {
    wash.addColorStop(pos, `rgba(${rgb}, ${(alpha * s).toFixed(3)})`);
  });
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  const teal = ctx.createLinearGradient(0, height * 0.4, 0, height);
  teal.addColorStop(0, 'rgba(0, 190, 190, 0)');
  teal.addColorStop(1, `rgba(0, 170, 190, ${(grade.teal * s).toFixed(3)})`);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = teal;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(width, height) * 0.75;
  const vig = ctx.createRadialGradient(cx, cy, radius * 0.45, cx, cy, radius);
  vig.addColorStop(0, 'rgba(8, 2, 10, 0)');
  vig.addColorStop(1, `rgba(8, 2, 10, ${(grade.vig * s).toFixed(3)})`);
  ctx.save();
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

// Sky glow (Sunset grade only): a warm radial halo around the sun's
// position on the cover, drawn with 'screen' so it brightens the sky
// without washing out the panels. A bright core marks the sun itself.
// Grades without a glow spec are left untouched.
function applySkyGlow(ctx, width, height, grade, strength) {
  const glow = grade && grade.glow;
  if (!glow || strength <= 0) return;
  const s = Math.max(0, Math.min(1, strength));
  const cx = glow.x * width;
  const cy = glow.y * height;
  const r = glow.r * Math.max(width, height);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  halo.addColorStop(0, `rgba(${glow.color}, ${(glow.alpha * s).toFixed(3)})`);
  halo.addColorStop(0.35, `rgba(255, 140, 60, ${(0.28 * s).toFixed(3)})`);
  halo.addColorStop(1, 'rgba(255, 140, 60, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height);
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.22);
  core.addColorStop(0, `rgba(255, 240, 200, ${(0.85 * s).toFixed(3)})`);
  core.addColorStop(1, 'rgba(255, 240, 200, 0)');
  ctx.fillStyle = core;
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
  ctx.globalAlpha = 0.1 * Math.max(0, Math.min(1, amount));
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

// ---- Giant striped-gradient title ------------------------------------------
// Yellow-to-orange-to-magenta vertical gradient, horizontal stripe bands
// baked into the gradient itself (hard colour stops), a thick dark
// outline and a stepped 3D extrusion offset down-right — the title the
// top covers share.
function lerpColor(c1, c2, t) {
  const a = [parseInt(c1.slice(1, 3), 16), parseInt(c1.slice(3, 5), 16), parseInt(c1.slice(5, 7), 16)];
  const b = [parseInt(c2.slice(1, 3), 16), parseInt(c2.slice(3, 5), 16), parseInt(c2.slice(5, 7), 16)];
  const mix = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}

function colorAt(stops, t) {
  for (let i = 0; i < stops.length - 1; i += 1) {
    const [p0, c0] = stops[i];
    const [p1, c1] = stops[i + 1];
    if (t >= p0 && t <= p1) {
      return lerpColor(c0, c1, p1 === p0 ? 0 : (t - p0) / (p1 - p0));
    }
  }
  return stops[stops.length - 1][1];
}

function darken(rgb, f) {
  const m = rgb.match(/\d+/g).map(Number);
  return `rgb(${Math.round(m[0] * f)}, ${Math.round(m[1] * f)}, ${Math.round(m[2] * f)})`;
}

// Build a vertical gradient whose horizontal bands alternate between the
// base gradient colour and a darkened version of it — the striped
// chrome lettering of the top covers.
function stripedTitleGradient(g, y0, y1) {
  const stops = [[0, '#ffe45c'], [0.38, '#ffb02e'], [0.62, '#ff7a1a'], [0.85, '#ff2e88'], [1, '#e01e7a']];
  const grad = g.createLinearGradient(0, y0, 0, y1);
  const bands = 6;
  for (let i = 0; i < bands; i += 1) {
    const p0 = i / bands;
    const p1 = (i + 1) / bands;
    const dark = i % 2 === 1;
    const c0 = dark ? darken(colorAt(stops, p0), 0.68) : colorAt(stops, p0);
    const c1 = dark ? darken(colorAt(stops, p1), 0.68) : colorAt(stops, p1);
    grad.addColorStop(p0, c0);
    grad.addColorStop(Math.min(1, p1 - 0.001), c1);
  }
  return grad;
}

function drawTitle(ctx, width, height, state) {
  const text = (state.caption || '').trim().toUpperCase();
  if (!text) return;
  const maxW = width * 0.92;
  let size = Math.round(height * 0.15 * (state.captionSize || 1));
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  while (size > 20 && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  }
  const cx = width / 2;
  const baseY = height * 0.7;

  // 3D extrusion: dark copies stepped down-right behind the letters.
  const step = Math.max(2, size * 0.045);
  ctx.fillStyle = '#2a0a1e';
  for (let k = 4; k >= 1; k -= 1) {
    ctx.fillText(text, cx + step * k * 0.55, baseY + step * k);
  }

  // Thick dark outline, then the striped gradient fill.
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.09);
  ctx.strokeStyle = '#1d0512';
  ctx.strokeText(text, cx, baseY);
  ctx.fillStyle = stripedTitleGradient(ctx, baseY - size, baseY + size * 0.15);
  ctx.fillText(text, cx, baseY);
  ctx.restore();
}

// Neon script subtitle in Pacifico, glowing pink, tilted, overlapping
// the title's lower edge and offset to the right.
function drawScript(ctx, width, height, state) {
  const text = (state.script || '').trim();
  if (!text) return;
  const maxW = width * 0.62;
  let size = Math.round(height * 0.058);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${size}px Pacifico, cursive`;
  while (size > 16 && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = `${size}px Pacifico, cursive`;
  }
  ctx.translate(width * 0.58, height * 0.745);
  ctx.rotate(-0.05);
  ctx.shadowColor = 'rgba(255, 46, 136, 0.9)';
  ctx.shadowBlur = size * 0.45;
  ctx.lineWidth = Math.max(2, size * 0.06);
  ctx.strokeStyle = '#7a0a4e';
  ctx.fillStyle = '#ff8ad8';
  ctx.strokeText(text, 0, 0);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// ---- Poster furniture ------------------------------------------------------

// Top quote bar: five gold stars, an italic press quote, the newspaper
// name, and a gold VOL badge at the right.
function drawQuoteBar(ctx, width, height, state) {
  const quote = (state.quote || '').trim();
  const src = (state.quoteSource || '').trim();
  if (!quote && !src) return;
  const h = height * 0.048;
  ctx.save();
  ctx.fillStyle = 'rgba(18, 4, 14, 0.94)';
  ctx.fillRect(0, 0, width, h);

  let size = Math.round(h * 0.52);
  const vol = (state.vol || '').trim();
  const badgeW = vol ? size * 4.6 : 0;
  const maxW = width - badgeW - width * 0.04;
  const parts = [];
  if (quote) parts.push({ text: `“${quote}”`, font: `italic 600 ${size}px Georgia, serif`, color: '#fff6e6' });
  if (src) parts.push({ text: ` — ${src}`, font: `${size}px 'Bebas Neue', 'Arial Narrow', sans-serif`, color: '#ffd9a0' });
  const stars = '★★★★★';
  const measure = () => {
    let w = 0;
    ctx.font = `${size}px Georgia, serif`;
    w += ctx.measureText(stars).width + size * 0.4;
    parts.forEach((p) => {
      ctx.font = p.font;
      w += ctx.measureText(p.text).width;
    });
    return w;
  };
  while (size > 10 && measure() > maxW) {
    size -= 1;
    parts.forEach((p) => {
      p.font = p.font.replace(/^\S+ \S+ \d+px|^\d+px/, `${size}px`);
    });
  }
  let x = (width - badgeW) / 2 - measure() / 2;
  const cy = h / 2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `${size}px Georgia, serif`;
  ctx.fillStyle = '#ffd23f';
  ctx.fillText(stars, x, cy);
  x += ctx.measureText(stars).width + size * 0.4;
  parts.forEach((p) => {
    ctx.font = p.font;
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, x, cy);
    x += ctx.measureText(p.text).width;
  });

  if (vol) {
    const bw = badgeW;
    const bh = h * 0.74;
    const bx = width - bw - width * 0.012;
    const by = (h - bh) / 2;
    ctx.fillStyle = '#f5b90d';
    roundRectPath(ctx, bx, by, bw, bh, 3);
    ctx.fill();
    ctx.fillStyle = '#1d0512';
    ctx.font = `${Math.round(bh * 0.52)}px Anton, 'Arial Narrow', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(vol, bx + bw / 2, by + bh / 2 + 1);
  }
  ctx.restore();
}

// Role tag chip on a panel: a slanted black chip with a pink accent bar
// and the role in white, plus an optional sub-line (place · time · note)
// under it. The hero's tag sits at the top of its panel, like the top
// covers; every other panel's tag sits at the bottom.
function drawRoleTags(ctx, width, height, state) {
  const polys = panelPolys(state.layout, width, height);
  const layout = layoutById(state.layout);
  const gap = Math.max(4, Math.round(height * 0.008));
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  layout.panels.forEach((panel, i) => {
    const slot = (state.panels && state.panels[i]) || {};
    const role = (slot.role || '').trim();
    const sub = (slot.sub || '').trim();
    if (!role && !sub) return;
    const poly = polys[i];
    const xs = poly.map((p) => p[0]);
    const ys = poly.map((p) => p[1]);
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    const fontSize = Math.max(13, Math.round(height * 0.021));
    ctx.font = `${fontSize}px Anton, 'Arial Narrow', sans-serif`;
    const textW = role ? ctx.measureText(role).width : 0;
    const chipH = Math.round(fontSize * 1.75);
    const chipW = Math.min(right - left - gap * 2, textW + fontSize * 1.7);
    const chipX = left + gap;
    // The hero's tag sits at the top of its panel, below the quote bar
    // when the furniture is on; every other panel's tag sits at the
    // bottom. The sub-line always goes under the chip, like the top
    // covers. The whole tag block stays above the billing strip.
    const topInset = panel.hero ? (state.furniture === false ? gap : height * 0.048 + gap) : gap;
    let chipY = panel.hero ? top + topInset : bottom - gap - chipH;
    const subSize = Math.max(10, Math.round(height * 0.015));
    const blockH = chipH + (sub ? subSize * 1.5 + gap : 0);
    chipY = Math.min(chipY, height * 0.898 - blockH);
    chipY = Math.max(top + gap, chipY);
    if (role) {
      // Slanted chip: top edge shifted right.
      const slant = chipH * 0.28;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(chipX + slant, chipY);
      ctx.lineTo(chipX + chipW, chipY);
      ctx.lineTo(chipX + chipW - slant, chipY + chipH);
      ctx.lineTo(chipX, chipY + chipH);
      ctx.closePath();
      ctx.fillStyle = 'rgba(10, 4, 10, 0.88)';
      ctx.fill();
      // Pink accent bar on the chip's left edge.
      ctx.fillStyle = '#ff2e88';
      ctx.fillRect(chipX, chipY, Math.max(3, fontSize * 0.16), chipH);
      ctx.fillStyle = '#fff6e6';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(role, chipX + slant * 0.5 + fontSize * 0.55, chipY + chipH / 2 + 1);
      ctx.restore();
    }
    if (sub) {
      ctx.font = `${subSize}px 'Bebas Neue', 'Arial Narrow', sans-serif`;
      // Trim the sub-line to the panel width so neighbouring tags never
      // run into each other on narrow panels.
      const maxSubW = Math.max(20, right - left - gap * 2 - subSize);
      let shown = sub;
      while (shown.length > 4 && ctx.measureText(shown).width > maxSubW) {
        const cut = shown.lastIndexOf(' · ');
        shown = (cut > 0 ? shown.slice(0, cut) : shown.slice(0, -4)) + '…';
        if (cut <= 0 && shown.length <= 5) break;
      }
      const subW = ctx.measureText(shown).width;
      const subY = chipY + chipH + subSize * 1.5;
      ctx.save();
      ctx.fillStyle = 'rgba(10, 4, 10, 0.62)';
      ctx.fillRect(chipX, subY - subSize, Math.min(subW + subSize, right - left - gap * 2), subSize * 1.5);
      ctx.fillStyle = '#ffe9c4';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(shown, chipX + subSize * 0.4, subY + subSize * 0.28);
      ctx.restore();
    }
  });
  ctx.restore();
}

// Tagline ribbon under the title: small-caps text on a dark pill with
// pink chevrons at both ends.
function drawTagline(ctx, width, height, state) {
  const text = (state.tagline || '').trim();
  if (!text) return;
  let size = Math.round(height * 0.026);
  ctx.save();
  ctx.font = `${size}px 'Bebas Neue', 'Arial Narrow', sans-serif`;
  let ls = Math.round(size * 0.18);
  try {
    ctx.letterSpacing = `${ls}px`;
  } catch (e) {
    ls = 0;
  }
  let tw = ctx.measureText(text).width + ls * Math.max(0, text.length - 1);
  while (size > 10 && tw > width * 0.8) {
    size -= 1;
    ctx.font = `${size}px 'Bebas Neue', 'Arial Narrow', sans-serif`;
    ls = Math.round(size * 0.18);
    try {
      ctx.letterSpacing = `${ls}px`;
    } catch (e) {
      ls = 0;
    }
    tw = ctx.measureText(text).width + ls * Math.max(0, text.length - 1);
  }
  const pad = size * 1.2;
  const rw = tw + pad * 2;
  const rh = size * 1.9;
  const rx = (width - rw) / 2;
  const ry = height * 0.8 - rh / 2;
  ctx.fillStyle = 'rgba(18, 4, 14, 0.88)';
  roundRectPath(ctx, rx, ry, rw, rh, rh / 2);
  ctx.fill();
  ctx.fillStyle = '#ff2e88';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(size * 1.2)}px Anton, 'Arial Narrow', sans-serif`;
  ctx.fillText('›', rx + pad * 0.45, ry + rh / 2 + 1);
  ctx.fillText('‹', rx + rw - pad * 0.45, ry + rh / 2 + 1);
  ctx.fillStyle = '#ffe9c4';
  ctx.font = `${size}px 'Bebas Neue', 'Arial Narrow', sans-serif`;
  ctx.fillText(text, width / 2, ry + rh / 2 + size * 0.06);
  try {
    ctx.letterSpacing = '0px';
  } catch (e) {
    /* ignore */
  }
  ctx.restore();
}

// Gold starburst seal with "ORIGINAL COVER ART" inside.
function drawSeal(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  const points = 16;
  for (let i = 0; i < points * 2; i += 1) {
    const ang = (Math.PI * i) / points - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.8;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#f5b90d';
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.strokeStyle = '#7a5200';
  ctx.stroke();
  ctx.fillStyle = '#1d0512';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = Math.max(7, Math.round(r * 0.2));
  ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  ctx.fillText('ORIGINAL', cx, cy - size * 0.75);
  ctx.fillText('COVER ART', cx, cy + size * 0.25);
  ctx.font = `${Math.round(size * 0.9)}px Georgia, serif`;
  ctx.fillStyle = '#7a5200';
  ctx.fillText('★ ★ ★', cx, cy + size * 1.25);
  ctx.restore();
}

// Barcode: a white block of deterministic black bars with a number.
function drawBarcode(ctx, x, y, w, h) {
  const bars = [3, 1, 2, 1, 1, 3, 1, 4, 2, 1, 1, 2, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2, 1, 4, 1, 2, 1, 3, 2, 1, 1, 2];
  ctx.save();
  ctx.fillStyle = '#f5f0e6';
  ctx.fillRect(x, y, w, h);
  const unit = w / bars.reduce((a, b) => a + b, 0);
  let bx = x + unit;
  ctx.fillStyle = '#14100c';
  bars.forEach((bw, i) => {
    if (i % 2 === 0) ctx.fillRect(bx, y + h * 0.08, bw * unit, h * 0.68);
    bx += bw * unit;
  });
  ctx.fillStyle = '#14100c';
  ctx.font = `${Math.max(7, Math.round(h * 0.16))}px 'Bebas Neue', 'Arial Narrow', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('0 02113 122620', x + w / 2, y + h * 0.95);
  ctx.restore();
}

// Bottom billing strip: release chip on the left, the billing block in
// the middle, the gold seal and the barcode on the right.
function drawBilling(ctx, width, height, state) {
  const stripH = height * 0.095;
  const y0 = height - stripH;
  ctx.save();
  ctx.fillStyle = 'rgba(18, 4, 14, 0.95)';
  ctx.fillRect(0, y0, width, stripH);

  const rel = (state.release || '').trim();
  if (rel) {
    const size = Math.round(height * 0.022);
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
    ctx.shadowColor = 'rgba(255, 46, 136, 0.9)';
    ctx.shadowBlur = size * 0.5;
    ctx.fillStyle = '#ff5da2';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(rel, width * 0.02, y0 + stripH / 2);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  const billing = (state.billing || '').trim();
  if (billing) {
    const maxW = width * 0.58;
    let size = Math.round(height * 0.017);
    // Greedy-wrap the billing block into at most two centred lines.
    const words = billing.split(/\s+/);
    const lines = [];
    const fit = () => {
      ctx.font = `${size}px 'Bebas Neue', 'Arial Narrow', sans-serif`;
      let cur = '';
      const ls = [];
      words.forEach((word) => {
        const test = cur ? `${cur} ${word}` : word;
        if (ctx.measureText(test).width > maxW && cur) {
          ls.push(cur);
          cur = word;
        } else {
          cur = test;
        }
      });
      if (cur) ls.push(cur);
      return ls;
    };
    let ls = fit();
    while (size > 9 && ls.length > 2) {
      size -= 1;
      ls = fit();
    }
    ctx.fillStyle = '#e8d9c0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lineH = size * 1.45;
    const startY = y0 + stripH / 2 - ((ls.length - 1) * lineH) / 2;
    ls.forEach((line, i) => {
      ctx.fillText(line, width / 2, startY + i * lineH);
    });
  }

  if (state.seal !== false) {
    drawSeal(ctx, width * 0.855, y0 + stripH * 0.44, stripH * 0.42);
  }
  if (state.barcode !== false) {
    const bw = width * 0.075;
    const bh = stripH * 0.44;
    drawBarcode(ctx, width - bw - width * 0.012, height - bh - height * 0.008, bw, bh);
  }
  ctx.restore();
}

// HEAT meter pill under the quote bar, top right.
function drawHeat(ctx, width, height, state) {
  const heat = Math.max(0, Math.min(5, Math.round(state.heat || 0)));
  if (heat <= 0) return;
  const size = Math.round(height * 0.02);
  ctx.save();
  ctx.font = `${size}px 'Bebas Neue', 'Arial Narrow', sans-serif`;
  const label = 'HEAT ';
  const stars = '★'.repeat(heat) + '☆'.repeat(5 - heat);
  const lw = ctx.measureText(label).width;
  const sw = ctx.measureText(stars).width;
  const pad = size * 0.9;
  const pw = lw + sw + pad * 2;
  const ph = size * 1.9;
  const px = width - pw - width * 0.012;
  const py = height * 0.062;
  ctx.fillStyle = 'rgba(10, 4, 10, 0.85)';
  roundRectPath(ctx, px, py, pw, ph, ph / 2);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe9c4';
  ctx.fillText(label, px + pad, py + ph / 2 + 1);
  ctx.fillStyle = '#ffd23f';
  ctx.fillText(stars, px + pad + lw, py + ph / 2 + 1);
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

  const grade = gradeById(state.gradeId);
  const ink = !!state.ink;
  const filter = ink
    ? 'saturate(1.5) contrast(1.25) brightness(1.03)'
    : `saturate(${grade.sat}) contrast(${grade.con})`;
  const polys = panelPolys(state.layout, width, height);
  const order = drawOrder(state.layout);
  const layout = layoutById(state.layout);
  const borderW = Math.max(2, Math.round((width / 1080) * (ink ? 4 : 3)));

  // Photos first, clipped to their slanted polygons.
  order.forEach((i) => {
    const poly = polys[i];
    const panel = layout.panels[i];
    const slot = (state.panels && state.panels[i]) || { photo: 'pier', zoom: 1, ox: 0, oy: 0 };
    const xs = poly.map((p) => p[0]);
    const ys = poly.map((p) => p[1]);
    const rect = {
      x: Math.min(...xs),
      y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs),
      h: Math.max(...ys) - Math.min(...ys),
    };
    if (panel.hero) {
      // Drop shadow so the hero pops out over its neighbours.
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = Math.max(8, width * 0.02);
      ctx.shadowOffsetY = Math.max(4, height * 0.008);
      ctx.fillStyle = '#000';
      pathPoly(ctx, poly);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    pathPoly(ctx, poly);
    ctx.clip();
    const img = photos ? photos.get(slot.photo) : null;
    if (img && (img.complete || img.naturalWidth)) {
      ctx.filter = filter;
      drawPhotoInPanel(ctx, img, rect, slot.zoom || 1, slot.ox || 0, slot.oy || 0);
      ctx.filter = 'none';
    } else {
      ctx.fillStyle = '#3d1226';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.restore();
  });

  applyGrade(ctx, width, height, grade, state.grade);
  applySkyGlow(ctx, width, height, grade, state.grade);
  if (state.halftone) applyHalftone(ctx, width, height, state.grade);
  applyGrain(ctx, width, height, state.grain);

  // Gold borders on top of the grade, so they stay crisp.
  polys.forEach((poly) => {
    ctx.save();
    pathPoly(ctx, poly);
    ctx.strokeStyle = 'rgba(255, 214, 130, 0.9)';
    ctx.lineWidth = borderW;
    ctx.stroke();
    ctx.restore();
  });

  if (state.furniture !== false) {
    drawQuoteBar(ctx, width, height, state);
    drawTitle(ctx, width, height, state);
    drawScript(ctx, width, height, state);
    drawRoleTags(ctx, width, height, state);
    drawTagline(ctx, width, height, state);
    drawBilling(ctx, width, height, state);
    drawHeat(ctx, width, height, state);
  } else {
    drawTitle(ctx, width, height, state);
    drawScript(ctx, width, height, state);
  }

  // Thin poster frame.
  const frame = Math.max(2, Math.round((width / 1080) * 3));
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 246, 230, 0.30)';
  ctx.lineWidth = frame;
  ctx.strokeRect(frame, frame, width - frame * 2, height - frame * 2);
  ctx.restore();

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

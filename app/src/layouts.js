// Poster layouts for Vice Cover Studio.
// Every layout is a list of panels in normalised coordinates (0..1 of the
// cover width and height), so the same layout works for the square, the
// portrait and the landscape export size. Panels are drawn in order; the
// caption band sits on top of the lowest panels unless captionPos is 'top'.
export const LAYOUTS = {
  hero: {
    id: 'hero',
    name: 'Hero Split',
    blurb: 'One big hero photo, two smaller panels below.',
    panels: [
      { x: 0.0, y: 0.0, w: 1.0, h: 0.62 },
      { x: 0.0, y: 0.62, w: 0.5, h: 0.38 },
      { x: 0.5, y: 0.62, w: 0.5, h: 0.38 },
    ],
  },
  strip: {
    id: 'strip',
    name: 'Triple Strip',
    blurb: 'Three tall panels side by side.',
    panels: [
      { x: 0.0, y: 0.0, w: 1 / 3, h: 1.0 },
      { x: 1 / 3, y: 0.0, w: 1 / 3, h: 1.0 },
      { x: 2 / 3, y: 0.0, w: 1 / 3, h: 1.0 },
    ],
  },
  duo: {
    id: 'duo',
    name: 'Neon Duo',
    blurb: 'One tall panel on the left, two stacked on the right.',
    panels: [
      { x: 0.0, y: 0.0, w: 0.6, h: 1.0 },
      { x: 0.6, y: 0.0, w: 0.4, h: 0.5 },
      { x: 0.6, y: 0.5, w: 0.4, h: 0.5 },
    ],
  },
};

export const LAYOUT_IDS = Object.keys(LAYOUTS);

export function layoutById(id) {
  return LAYOUTS[id] || LAYOUTS.hero;
}

// Pixel rects for a layout at a concrete cover size.
export function panelRects(layoutId, width, height) {
  const layout = layoutById(layoutId);
  return layout.panels.map((p) => ({
    x: Math.round(p.x * width),
    y: Math.round(p.y * height),
    w: Math.round(p.w * width),
    h: Math.round(p.h * height),
  }));
}

// Which panel (index) contains a point given in cover pixels, or -1.
export function panelAt(layoutId, width, height, px, py) {
  const rects = panelRects(layoutId, width, height);
  for (let i = rects.length - 1; i >= 0; i -= 1) {
    const r = rects[i];
    if (px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h) return i;
  }
  return -1;
}

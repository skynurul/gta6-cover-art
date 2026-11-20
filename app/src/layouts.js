// Poster layouts for Vice Cover Studio, round 2.
//
// The layout language follows the top-50 covers of the bounty: slanted
// panels with thin gold borders, a big centre hero panel that pops out
// and overlaps its neighbours, and a cast of 5-6 panels so the cover
// reads as a movie poster, not a photo grid. Every layout is a list of
// panels in normalised coordinates (0..1 of the cover width and height),
// so the same layout works for the square, the portrait and the
// landscape export size.
//
// A panel may carry:
//   slant — how far the top edge shifts right, as a fraction of the
//           panel's own width (0 = straight). Neighbours slant opposite
//           ways so their shared edge is one clean diagonal.
//   hero  — drawn last, on top of its neighbours, with a drop shadow.
export const LAYOUTS = {
  cast: {
    id: 'cast',
    name: 'Poster Cast',
    blurb: 'Six slanted panels, one pop-out hero — the movie-poster cast.',
    panels: [
      { x: 0.0, y: 0.0, w: 0.31, h: 0.44, slant: 0.1 },
      { x: 0.29, y: 0.0, w: 0.4, h: 0.6, slant: 0, hero: true },
      { x: 0.69, y: 0.0, w: 0.31, h: 0.44, slant: -0.1 },
      { x: 0.0, y: 0.44, w: 0.31, h: 0.42, slant: 0.1 },
      { x: 0.31, y: 0.6, w: 0.38, h: 0.26, slant: 0 },
      { x: 0.69, y: 0.44, w: 0.31, h: 0.42, slant: -0.1 },
    ],
  },
  popout: {
    id: 'popout',
    name: 'Pop-Out Hero',
    blurb: 'One tall hero on the left, four cast panels on the right.',
    panels: [
      { x: 0.0, y: 0.0, w: 0.42, h: 0.86, slant: 0, hero: true },
      { x: 0.4, y: 0.0, w: 0.3, h: 0.43, slant: 0.08 },
      { x: 0.7, y: 0.0, w: 0.3, h: 0.43, slant: -0.08 },
      { x: 0.4, y: 0.43, w: 0.3, h: 0.43, slant: 0.08 },
      { x: 0.7, y: 0.43, w: 0.3, h: 0.43, slant: -0.08 },
    ],
  },
  slant: {
    id: 'slant',
    name: 'Slanted Cast',
    blurb: 'Slanted panels around a tall centre hero, like the sunset covers.',
    panels: [
      { x: 0.0, y: 0.0, w: 0.3, h: 0.52, slant: 0.12 },
      { x: 0.27, y: 0.0, w: 0.4, h: 0.8, slant: 0, hero: true },
      { x: 0.67, y: 0.0, w: 0.17, h: 0.28, slant: 0.1 },
      { x: 0.84, y: 0.0, w: 0.16, h: 0.28, slant: -0.1 },
      { x: 0.67, y: 0.28, w: 0.33, h: 0.3, slant: -0.1 },
      { x: 0.0, y: 0.52, w: 0.3, h: 0.48, slant: 0.12 },
    ],
  },
  hero: {
    id: 'hero',
    name: 'Hero Split',
    blurb: 'One big hero photo, two smaller panels below.',
    panels: [
      { x: 0.0, y: 0.0, w: 1.0, h: 0.62, slant: 0 },
      { x: 0.0, y: 0.62, w: 0.5, h: 0.38, slant: 0 },
      { x: 0.5, y: 0.62, w: 0.5, h: 0.38, slant: 0 },
    ],
  },
  strip: {
    id: 'strip',
    name: 'Triple Strip',
    blurb: 'Three tall panels side by side.',
    panels: [
      { x: 0.0, y: 0.0, w: 1 / 3, h: 1.0, slant: 0 },
      { x: 1 / 3, y: 0.0, w: 1 / 3, h: 1.0, slant: 0 },
      { x: 2 / 3, y: 0.0, w: 1 / 3, h: 1.0, slant: 0 },
    ],
  },
  duo: {
    id: 'duo',
    name: 'Neon Duo',
    blurb: 'One tall panel on the left, two stacked on the right.',
    panels: [
      { x: 0.0, y: 0.0, w: 0.6, h: 1.0, slant: 0 },
      { x: 0.6, y: 0.0, w: 0.4, h: 0.5, slant: 0 },
      { x: 0.6, y: 0.5, w: 0.4, h: 0.5, slant: 0 },
    ],
  },
};

export const LAYOUT_IDS = Object.keys(LAYOUTS);

export function layoutById(id) {
  return LAYOUTS[id] || LAYOUTS.cast;
}

// Draw order: panels in array order, except the hero, which is drawn
// last so it overlaps its neighbours.
export function drawOrder(layoutId) {
  const layout = layoutById(layoutId);
  const order = [];
  layout.panels.forEach((p, i) => {
    if (!p.hero) order.push(i);
  });
  layout.panels.forEach((p, i) => {
    if (p.hero) order.push(i);
  });
  return order;
}

// The four corners of one panel as a polygon (a parallelogram when the
// panel slants), in cover pixels. Order: top-left, top-right,
// bottom-right, bottom-left.
export function panelPoly(panel, width, height) {
  const s = (panel.slant || 0) * panel.w * width;
  const x0 = panel.x * width;
  const x1 = (panel.x + panel.w) * width;
  const y0 = panel.y * height;
  const y1 = (panel.y + panel.h) * height;
  return [
    [x0 + s, y0],
    [x1 + s, y0],
    [x1, y1],
    [x0, y1],
  ];
}

export function panelPolys(layoutId, width, height) {
  const layout = layoutById(layoutId);
  return layout.panels.map((p) => panelPoly(p, width, height));
}

// Pixel rects (bounding boxes) for a layout at a concrete cover size.
export function panelRects(layoutId, width, height) {
  const layout = layoutById(layoutId);
  return layout.panels.map((p) => {
    const poly = panelPoly(p, width, height);
    const xs = poly.map((pt) => pt[0]);
    const ys = poly.map((pt) => pt[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return {
      x: Math.round(x),
      y: Math.round(y),
      w: Math.round(Math.max(...xs) - x),
      h: Math.round(Math.max(...ys) - y),
    };
  });
}

function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Which panel (index) contains a point given in cover pixels, or -1.
// The topmost panel wins: the hero is drawn last, so it is tested first.
export function panelAt(layoutId, width, height, px, py) {
  const polys = panelPolys(layoutId, width, height);
  const order = drawOrder(layoutId);
  for (let k = order.length - 1; k >= 0; k -= 1) {
    const i = order[k];
    if (pointInPoly(px, py, polys[i])) return i;
  }
  return -1;
}

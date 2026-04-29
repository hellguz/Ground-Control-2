import type { BoulderShape, RouteWaypoint, Point } from './types';
import { GROUND_Y } from './constants';

// Fontainebleau boulders are rounded at top, with a lip/flange at the bottom
// They come in slab, wall, overhang, roof, and prow shapes

function fontBoulderPolygon(
  baseX: number,
  baseY: number,
  w: number,
  h: number,
  type: 'slab' | 'wall' | 'overhang' | 'roof' | 'prow'
): Point[] {
  // All shapes: bottom has a lip (wider), top is rounded
  // Defined relative to bottom-left corner, then shifted
  let pts: Point[] = [];

  if (type === 'slab') {
    // Leans back: top is offset to the right
    const lean = w * 0.35;
    pts = [
      { x: 0, y: 0 },                         // base left
      { x: w, y: 0 },                         // base right (lip)
      { x: w * 0.9, y: -h * 0.15 },           // lower right
      { x: w * 0.85 + lean, y: -h * 0.5 },    // mid right
      { x: w * 0.7 + lean, y: -h * 0.85 },    // upper right
      { x: w * 0.5 + lean, y: -h },           // top right
      { x: w * 0.25 + lean, y: -h },          // top left
      { x: w * 0.1 + lean, y: -h * 0.85 },   // upper left
      { x: w * 0.05, y: -h * 0.5 },           // mid left
      { x: 0, y: -h * 0.15 },                 // lower left
    ];
  } else if (type === 'wall') {
    // Near vertical, slight bulge at top
    pts = [
      { x: -w * 0.05, y: 0 },
      { x: w * 1.05, y: 0 },
      { x: w * 0.95, y: -h * 0.1 },
      { x: w, y: -h * 0.4 },
      { x: w * 0.95, y: -h * 0.75 },
      { x: w * 0.8, y: -h * 0.92 },
      { x: w * 0.5, y: -h },
      { x: w * 0.2, y: -h * 0.92 },
      { x: w * 0.05, y: -h * 0.75 },
      { x: 0, y: -h * 0.4 },
      { x: w * 0.05, y: -h * 0.1 },
    ];
  } else if (type === 'overhang') {
    // Bottom undercuts: top wider than base, classic Font overhang
    const jut = w * 0.4;
    pts = [
      { x: w * 0.1, y: 0 },
      { x: w * 0.9, y: 0 },
      { x: w * 0.95, y: -h * 0.12 },
      { x: w + jut, y: -h * 0.35 },           // juts out
      { x: w + jut * 0.8, y: -h * 0.6 },
      { x: w + jut * 0.5, y: -h * 0.85 },
      { x: w * 0.7 + jut * 0.3, y: -h },      // rounded top
      { x: w * 0.3, y: -h * 0.95 },
      { x: w * 0.1, y: -h * 0.75 },
      { x: -jut * 0.3, y: -h * 0.45 },        // slight undercut left
      { x: w * 0.05, y: -h * 0.12 },
    ];
  } else if (type === 'roof') {
    // Very overhung, almost horizontal ceiling section at mid-height
    const jut = w * 0.6;
    pts = [
      { x: 0, y: 0 },
      { x: w * 0.8, y: 0 },
      { x: w, y: -h * 0.08 },
      { x: w + jut, y: -h * 0.28 },          // roof juts far out
      { x: w + jut * 1.05, y: -h * 0.42 },   // roof tip
      { x: w + jut * 0.9, y: -h * 0.58 },
      { x: w + jut * 0.5, y: -h * 0.78 },
      { x: w * 0.6, y: -h * 0.92 },
      { x: w * 0.3, y: -h },
      { x: w * 0.1, y: -h * 0.85 },
      { x: w * 0.05, y: -h * 0.55 },
      { x: -w * 0.05, y: -h * 0.3 },
      { x: w * 0.02, y: -h * 0.08 },
    ];
  } else { // prow
    // Angular, pointed nose, characteristic Font arete
    pts = [
      { x: w * 0.1, y: 0 },
      { x: w * 0.9, y: 0 },
      { x: w * 0.95, y: -h * 0.1 },
      { x: w * 0.9, y: -h * 0.3 },
      { x: w + w * 0.15, y: -h * 0.5 },      // pointed nose
      { x: w * 0.85, y: -h * 0.7 },
      { x: w * 0.65, y: -h * 0.9 },
      { x: w * 0.5, y: -h },
      { x: w * 0.3, y: -h * 0.9 },
      { x: w * 0.1, y: -h * 0.65 },
      { x: -w * 0.05, y: -h * 0.5 },
      { x: w * 0.15, y: -h * 0.3 },
      { x: w * 0.1, y: -h * 0.1 },
    ];
  }

  // Offset to world coordinates
  return pts.map(p => ({ x: baseX + p.x, y: baseY + p.y }));
}

function generateRoute(
  bx: number,
  baseY: number,
  w: number,
  h: number,
  type: 'slab' | 'wall' | 'overhang' | 'roof' | 'prow'
): RouteWaypoint[] {
  const wps: RouteWaypoint[] = [];

  if (type === 'slab') {
    const lean = w * 0.35;
    // Route goes up the angled face
    wps.push({ x: bx + w * 0.3, y: baseY - 5,         moveType: 'start',      isCrux: false, fallChance: 0,    bodyLean: 0.5,  armAngle: -0.3, legSpread: 0.6 });
    wps.push({ x: bx + w * 0.4, y: baseY - h * 0.25,  moveType: 'slab_smear', isCrux: false, fallChance: 0.05, bodyLean: 0.7,  armAngle: -0.5, legSpread: 0.5 });
    wps.push({ x: bx + w * 0.5 + lean * 0.4, y: baseY - h * 0.55, moveType: 'slab_smear', isCrux: true,  fallChance: 0.18, bodyLean: 0.8,  armAngle: -0.7, legSpread: 0.4 });
    wps.push({ x: bx + w * 0.55 + lean * 0.75, y: baseY - h * 0.8, moveType: 'sloper', isCrux: true, fallChance: 0.22, bodyLean: 0.6,  armAngle: -1.0, legSpread: 0.5 });
    wps.push({ x: bx + w * 0.5 + lean, y: baseY - h,  moveType: 'mantle',     isCrux: true,  fallChance: 0.2,  bodyLean: -0.3, armAngle: -1.5, legSpread: 0.7 });
    wps.push({ x: bx + w * 0.4 + lean, y: baseY - h - 10, moveType: 'top_out', isCrux: false, fallChance: 0, bodyLean: -0.5, armAngle: 0, legSpread: 0.6 });
  } else if (type === 'wall') {
    wps.push({ x: bx + w * 0.45, y: baseY - 5,         moveType: 'start',       isCrux: false, fallChance: 0,    bodyLean: 0.1, armAngle: -0.2, legSpread: 0.7 });
    wps.push({ x: bx + w * 0.5, y: baseY - h * 0.2,    moveType: 'wall_crimp',  isCrux: false, fallChance: 0.04, bodyLean: 0.15,armAngle: -0.4, legSpread: 0.6 });
    wps.push({ x: bx + w * 0.55, y: baseY - h * 0.45,  moveType: 'wall_crimp',  isCrux: true,  fallChance: 0.15, bodyLean: 0.2, armAngle: -0.6, legSpread: 0.55 });
    wps.push({ x: bx + w * 0.6, y: baseY - h * 0.65,   moveType: 'sloper',      isCrux: true,  fallChance: 0.2,  bodyLean: 0.25,armAngle: -0.8, legSpread: 0.5 });
    wps.push({ x: bx + w * 0.55, y: baseY - h * 0.85,  moveType: 'mantle',      isCrux: true,  fallChance: 0.25, bodyLean: -0.2,armAngle: -1.4, legSpread: 0.65 });
    wps.push({ x: bx + w * 0.5, y: baseY - h - 8,      moveType: 'top_out',     isCrux: false, fallChance: 0,    bodyLean: -0.5,armAngle: 0,    legSpread: 0.6 });
  } else if (type === 'overhang') {
    const jut = w * 0.4;
    wps.push({ x: bx + w * 0.4, y: baseY - 5,              moveType: 'start',     isCrux: false, fallChance: 0,    bodyLean: -0.1,armAngle: -0.3, legSpread: 0.7 });
    wps.push({ x: bx + w * 0.8, y: baseY - h * 0.18,       moveType: 'compression',isCrux: false, fallChance: 0.05, bodyLean: -0.3,armAngle: -0.5, legSpread: 0.5 });
    wps.push({ x: bx + w + jut * 0.5, y: baseY - h * 0.4,  moveType: 'heel_hook', isCrux: true,  fallChance: 0.22, bodyLean: -0.5,armAngle: -0.9, legSpread: 0.3 });
    wps.push({ x: bx + w + jut * 0.7, y: baseY - h * 0.65, moveType: 'sloper',    isCrux: true,  fallChance: 0.28, bodyLean: -0.6,armAngle: -1.1, legSpread: 0.25 });
    wps.push({ x: bx + w * 0.7 + jut * 0.5, y: baseY - h * 0.9, moveType: 'dyno', isCrux: true, fallChance: 0.30, bodyLean: -0.4,armAngle: -1.5, legSpread: 0.4 });
    wps.push({ x: bx + w * 0.5, y: baseY - h - 5,           moveType: 'top_out',  isCrux: false, fallChance: 0,    bodyLean: -0.5,armAngle: 0,    legSpread: 0.6 });
  } else if (type === 'roof') {
    const jut = w * 0.6;
    wps.push({ x: bx + w * 0.3, y: baseY - 5,               moveType: 'start',      isCrux: false, fallChance: 0,    bodyLean: -0.1,armAngle: -0.2, legSpread: 0.7 });
    wps.push({ x: bx + w * 0.7, y: baseY - h * 0.15,        moveType: 'heel_hook',  isCrux: false, fallChance: 0.06, bodyLean: -0.5,armAngle: -0.5, legSpread: 0.4 });
    wps.push({ x: bx + w + jut * 0.5, y: baseY - h * 0.35,  moveType: 'compression',isCrux: true,  fallChance: 0.25, bodyLean: -0.9,armAngle: -1.0, legSpread: 0.2 });
    wps.push({ x: bx + w + jut * 0.85, y: baseY - h * 0.5,  moveType: 'dyno',       isCrux: true,  fallChance: 0.35, bodyLean: -1.0,armAngle: -1.5, legSpread: 0.15 });
    wps.push({ x: bx + w * 0.6 + jut * 0.5, y: baseY - h * 0.75, moveType: 'sloper', isCrux: true,  fallChance: 0.28, bodyLean: -0.6,armAngle: -1.2, legSpread: 0.3 });
    wps.push({ x: bx + w * 0.4, y: baseY - h - 5,            moveType: 'top_out',    isCrux: false, fallChance: 0,    bodyLean: -0.5,armAngle: 0,    legSpread: 0.6 });
  } else { // prow
    wps.push({ x: bx + w * 0.5, y: baseY - 5,               moveType: 'start',      isCrux: false, fallChance: 0,    bodyLean: 0,   armAngle: -0.2, legSpread: 0.7 });
    wps.push({ x: bx + w * 0.7, y: baseY - h * 0.2,         moveType: 'wall_crimp', isCrux: false, fallChance: 0.05, bodyLean: 0.1, armAngle: -0.4, legSpread: 0.6 });
    wps.push({ x: bx + w + w * 0.1, y: baseY - h * 0.45,    moveType: 'compression',isCrux: true,  fallChance: 0.20, bodyLean: 0.2, armAngle: -0.7, legSpread: 0.5 });
    wps.push({ x: bx + w * 0.8, y: baseY - h * 0.68,        moveType: 'sloper',     isCrux: true,  fallChance: 0.22, bodyLean: 0.1, armAngle: -1.0, legSpread: 0.45 });
    wps.push({ x: bx + w * 0.55, y: baseY - h * 0.88,       moveType: 'mantle',     isCrux: true,  fallChance: 0.20, bodyLean: -0.3,armAngle: -1.4, legSpread: 0.6 });
    wps.push({ x: bx + w * 0.45, y: baseY - h - 5,          moveType: 'top_out',    isCrux: false, fallChance: 0,    bodyLean: -0.5,armAngle: 0,    legSpread: 0.6 });
  }
  return wps;
}

let boulderIdCounter = 0;

export function createBoulder(
  baseX: number,
  type: 'slab' | 'wall' | 'overhang' | 'roof' | 'prow',
  width: number,
  height: number
): BoulderShape {
  const baseY = GROUND_Y;
  const polygon = fontBoulderPolygon(baseX, baseY, width, height, type);
  const routeWaypoints = generateRoute(baseX, baseY, width, height, type);

  const fallOffsets: Record<string, { x: number; y: number }> = {
    slab:     { x: 30, y: 0 },
    wall:     { x: 15, y: 0 },
    overhang: { x: 65, y: 0 },
    roof:     { x: 100, y: 0 },
    prow:     { x: 45, y: 0 },
  };

  return {
    id: boulderIdCounter++,
    baseX,
    baseY,
    width,
    height,
    type,
    polygon,
    routeWaypoints,
    climbStartX: routeWaypoints[0].x,
    fallOffset: fallOffsets[type],
  };
}

export function generateSceneBoulders(): BoulderShape[] {
  // Generate 5 boulders spread across the scene
  // Each with different shapes and sizes, Fontainebleau style
  const configs: Array<{
    x: number;
    type: 'slab' | 'wall' | 'overhang' | 'roof' | 'prow';
    w: number;
    h: number;
  }> = [
    { x: 40,  type: 'slab',     w: 120, h: 175 },
    { x: 230, type: 'wall',     w: 105, h: 195 },
    { x: 430, type: 'overhang', w: 115, h: 185 },
    { x: 680, type: 'roof',     w: 130, h: 170 },
    { x: 910, type: 'prow',     w: 110, h: 200 },
  ];

  return configs.map(c => createBoulder(c.x, c.type, c.w, c.h));
}

export function generateGroundRocks() {
  // Small rocks scattered on the ground between boulders
  const rocks = [
    { cx: 195, w: 28, h: 16 },
    { cx: 365, w: 22, h: 13 },
    { cx: 600, w: 32, h: 19 },
    { cx: 845, w: 25, h: 15 },
    { cx: 1060, w: 30, h: 17 },
    { cx: 130, w: 18, h: 10 },
    { cx: 510, w: 20, h: 12 },
    { cx: 760, w: 24, h: 14 },
    { cx: 1100, w: 22, h: 13 },
  ];

  return rocks.map(r => {
    const topY = GROUND_Y - r.h;
    const left = r.cx - r.w / 2;
    // Slightly irregular polygon for rock shape
    const polygon = [
      { x: left + r.w * 0.1,  y: GROUND_Y },
      { x: left + r.w * 0.9,  y: GROUND_Y },
      { x: left + r.w * 0.95, y: topY + r.h * 0.4 },
      { x: left + r.w * 0.8,  y: topY },
      { x: left + r.w * 0.4,  y: topY - r.h * 0.1 },
      { x: left + r.w * 0.15, y: topY + r.h * 0.1 },
      { x: left,               y: topY + r.h * 0.5 },
    ];
    return { x: left, topY, width: r.w, height: r.h, polygon };
  });
}

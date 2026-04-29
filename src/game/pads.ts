import type { CrashPad, GameState, GroundRock } from './types';
import { GRAVITY, GROUND_Y, PAD_SIZES } from './constants';

export function createPad(
  x: number,
  size: 'large' | 'medium' | 'small',
  assignedClimberId: number,
  nextId: number
): CrashPad {
  const { width, height, color } = PAD_SIZES[size];
  return {
    id: nextId,
    x,
    y: GROUND_Y - height,  // starts on ground
    width,
    height,
    size,
    state: 'settled',
    vx: 0,
    vy: 0,
    rotation: (Math.random() - 0.5) * 0.05, // tiny random tilt
    color,
    assignedClimberId,
    dragOffsetX: 0,
    dragOffsetY: 0,
  };
}

// Find the surface height (y) at a given x, considering ground and rocks
export function getSurfaceY(x: number, rocks: GroundRock[]): number {
  let surfaceY = GROUND_Y;
  for (const rock of rocks) {
    if (x >= rock.x && x <= rock.x + rock.width) {
      surfaceY = Math.min(surfaceY, rock.topY);
    }
  }
  return surfaceY;
}

// Get the surface y under the entire pad (leftmost point and rightmost point)
function getPadRestY(pad: CrashPad, rocks: GroundRock[]): number {
  const left = pad.x - pad.width / 2;
  const right = pad.x + pad.width / 2;
  const midSurface = getSurfaceY(pad.x, rocks);
  const leftSurface = getSurfaceY(left, rocks);
  const rightSurface = getSurfaceY(right, rocks);
  // Pad sits on highest surface point under it
  return Math.min(midSurface, leftSurface, rightSurface);
}

export function startDragging(pad: CrashPad, pointerX: number, pointerY: number) {
  pad.state = 'dragging';
  pad.dragOffsetX = pad.x - pointerX;
  pad.dragOffsetY = pad.y - pointerY;
  pad.vx = 0;
  pad.vy = 0;
  pad.rotation = 0; // snap to flat during drag
}

export function updateDragPosition(pad: CrashPad, pointerX: number, _pointerY: number) {
  // During drag: horizontal only (more realistic and game-friendly)
  // Center follows pointer x, y is held above ground
  pad.x = pointerX + pad.dragOffsetX;
  pad.y = GROUND_Y - pad.height - 60; // held above ground while dragging
  pad.rotation = 0;
}

export function stopDragging(pad: CrashPad) {
  pad.state = 'airborne';
  pad.vy = 2; // small downward velocity on release
}

export function updatePadPhysics(pad: CrashPad, rocks: GroundRock[], otherPads: CrashPad[]) {
  if (pad.state === 'dragging' || pad.state === 'settled') return;

  if (pad.state === 'airborne') {
    pad.vy += GRAVITY;
    pad.y += pad.vy;
    pad.x += pad.vx;
    pad.vx *= 0.92; // air friction
    
    // Pad-pad collisions (simplified: prevent overlap)
    for (const other of otherPads) {
      if (other.id === pad.id) continue;
      if (other.state !== 'settled' && other.state !== 'airborne') continue;

      const overlapX = Math.abs(pad.x - other.x) < (pad.width / 2 + other.width / 2);
      if (overlapX) {
        const padBottom = pad.y + pad.height;
        const otherTop = other.y;
        if (padBottom >= otherTop && pad.y < other.y + other.height) {
          pad.y = otherTop - pad.height;
          pad.vy *= -0.2; // small bounce
          if (Math.abs(pad.vy) < 0.5) {
            pad.vy = 0;
            pad.state = 'settled';
            return;
          }
        }
      }
    }

    // Ground/rock collision
    const surfaceY = getPadRestY(pad, rocks);
    const padBottom = pad.y + pad.height;

    if (padBottom >= surfaceY) {
      pad.y = surfaceY - pad.height;
      pad.vy *= -0.15; // mostly absorb, small bounce
      pad.vx *= 0.7;

      if (Math.abs(pad.vy) < 1.0 && Math.abs(pad.vx) < 0.3) {
        pad.vy = 0;
        pad.vx = 0;
        pad.state = 'settled';
        // Tilt based on terrain slope (simplified)
        pad.rotation = (Math.random() - 0.5) * 0.06;
      }
    }

    // Clamp to canvas bounds
    pad.x = Math.max(pad.width / 2, Math.min(1200 - pad.width / 2, pad.x));
  }
}

export function updateAllPads(state: GameState) {
  for (const pad of state.pads) {
    updatePadPhysics(pad, state.groundRocks, state.pads.filter(p => p.id !== pad.id));
  }
}

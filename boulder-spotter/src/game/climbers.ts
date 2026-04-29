import type { Climber, BoulderShape, GameState, Annotation } from './types';
import { GRAVITY, GROUND_Y, CLIMBER_COLORS } from './constants';

// Interpolate between two waypoints
function interpWaypoints(wp1: BoulderShape['routeWaypoints'][0], wp2: BoulderShape['routeWaypoints'][0], t: number) {
  return {
    x: wp1.x + (wp2.x - wp1.x) * t,
    y: wp1.y + (wp2.y - wp1.y) * t,
    bodyLean: wp1.bodyLean + (wp2.bodyLean - wp1.bodyLean) * t,
    armAngle: wp1.armAngle + (wp2.armAngle - wp1.armAngle) * t,
    legSpread: wp1.legSpread + (wp2.legSpread - wp1.legSpread) * t,
    moveType: t < 0.5 ? wp1.moveType : wp2.moveType,
    isCrux: wp1.isCrux || wp2.isCrux,
    fallChance: wp1.fallChance + (wp2.fallChance - wp1.fallChance) * t,
  };
}

let climberIdCounter = 0;

export function createClimber(boulder: BoulderShape, colorIndex: number): Climber {
  const wp0 = boulder.routeWaypoints[0];
  return {
    id: climberIdCounter++,
    boulderId: boulder.id,
    waypointIndex: 0,
    progress: 0,
    state: 'climbing',
    x: wp0.x,
    y: wp0.y,
    vx: 0,
    vy: 0,
    rotation: 0,
    rotVel: 0,
    assignedPadId: null,
    moveType: 'start',
    speed: 0.55 + Math.random() * 0.35, // varies per climber
    fallStartY: 0,
    landedAt: 0,
    color: CLIMBER_COLORS[colorIndex % CLIMBER_COLORS.length],
  };
}

function getFallTrajectory(boulder: BoulderShape, _climberX: number, _climberY: number) {
  // Returns initial vx, vy, rotVel based on boulder type and position
  const type = boulder.type;
  let vx = 0;
  let vy = -2 + Math.random() * 1; // slight upward then falls due to gravity
  let rotVel = 0;

  if (type === 'slab') {
    // Slide/tumble outward (away from rock)
    vx = 1.5 + Math.random() * 2.5;
    rotVel = 0.05 + Math.random() * 0.08;
  } else if (type === 'wall') {
    // Mostly straight back
    vx = -1 + Math.random() * 2;
    vy = -1;
    rotVel = (Math.random() - 0.5) * 0.1;
  } else if (type === 'overhang') {
    // Thrown outward and back
    vx = 3 + Math.random() * 4;
    vy = -0.5;
    rotVel = 0.08 + Math.random() * 0.1;
  } else if (type === 'roof') {
    // Dramatically thrown far out
    vx = 5 + Math.random() * 5;
    vy = 1;
    rotVel = 0.1 + Math.random() * 0.15;
  } else { // prow
    vx = 2 + Math.random() * 3;
    rotVel = 0.06 + Math.random() * 0.1;
  }

  // Randomize left/right slightly
  if (Math.random() < 0.2) vx *= -0.5;

  return { vx, vy, rotVel };
}

export function updateClimbers(
  state: GameState,
  dtMs: number,
  annotations: Annotation[]
): void {
  const dt = dtMs / 1000; // to seconds

  for (const climber of state.climbers) {
    if (climber.state === 'topped_out' || climber.state === 'landed_safe' || climber.state === 'landed_injured') {
      // Fading out, handled elsewhere
      continue;
    }

    if (climber.state === 'climbing') {
      const boulder = state.boulders.find(b => b.id === climber.boulderId);
      if (!boulder) continue;

      const wps = boulder.routeWaypoints;
      const wpIdx = climber.waypointIndex;

      if (wpIdx >= wps.length - 1) {
        // Reached top
        climber.state = 'topped_out';
        climber.landedAt = state.time;
        annotations.push({
          x: climber.x,
          y: climber.y - 30,
          text: 'Topped out! 🎉',
          duration: 2000,
          color: '#228833',
        });
        continue;
      }

      const wp1 = wps[wpIdx];
      const wp2 = wps[wpIdx + 1];
      const segLength = Math.hypot(wp2.x - wp1.x, wp2.y - wp1.y);

      // Advance progress
      climber.progress += (climber.speed * dt * 60) / Math.max(segLength, 1);

      if (climber.progress >= 1) {
        climber.waypointIndex++;
        climber.progress = 0;
        // Check for crux fall at waypoint transition
        const arrivedAt = wps[Math.min(wpIdx + 1, wps.length - 1)];
        if (arrivedAt.isCrux && Math.random() < arrivedAt.fallChance) {
          triggerFall(climber, boulder, state.time, annotations);
          continue;
        }
      }

      // Interpolate position
      const interp = interpWaypoints(wp1, wp2, climber.progress);
      climber.x = interp.x;
      climber.y = interp.y;
      climber.moveType = interp.moveType;

    } else if (climber.state === 'falling') {
      // Physics
      climber.vy += GRAVITY;
      climber.x += climber.vx;
      climber.y += climber.vy;
      climber.rotation += climber.rotVel;

      // Check if hit ground
      if (climber.y >= GROUND_Y - 5) {
        climber.y = GROUND_Y - 5;
        resolveLanding(climber, state, annotations);
      }
    }
  }
}

function triggerFall(climber: Climber, boulder: BoulderShape, time: number, annotations: Annotation[]) {
  const traj = getFallTrajectory(boulder, climber.x, climber.y);
  climber.state = 'falling';
  climber.vx = traj.vx;
  climber.vy = traj.vy;
  climber.rotVel = traj.rotVel;
  climber.fallStartY = climber.y;
  climber.landedAt = time;

  const moves: Record<string, string> = {
    heel_hook: 'Heel hook failed!',
    dyno: 'Dyno!',
    sloper: 'Sloper popped!',
    mantle: 'Mantle barn-door!',
    slab_smear: 'Foot slipped!',
    compression: 'Lost compression!',
    wall_crimp: 'Crimp failed!',
    top_out: 'Top-out wobble!',
    start: 'Starting move!',
  };

  annotations.push({
    x: climber.x,
    y: climber.y - 20,
    text: moves[climber.moveType] || 'FALLING!',
    duration: 1500,
    color: '#cc3300',
  });
}

function resolveLanding(climber: Climber, state: GameState, annotations: Annotation[]) {
  // Find assigned pad
  const pad = state.pads.find(p => p.id === climber.assignedPadId);

  let safeByPad = false;
  let badBounce = false;

  if (pad && pad.state === 'settled') {
    // Check if climber's x is within pad bounds
    const padLeft = pad.x - pad.width / 2;
    const padRight = pad.x + pad.width / 2;
    const hitPad = climber.x >= padLeft && climber.x <= padRight;

    if (hitPad) {
      safeByPad = true;
      // Check for bad bounce: does bounce trajectory hit a ground rock?
      const bounceX = climber.x + climber.vx * 8; // rough bounce landing
      const bounceHitsRock = state.groundRocks.some(r =>
        bounceX >= r.x && bounceX <= r.x + r.width
      );
      if (bounceHitsRock) {
        badBounce = true;
        safeByPad = false;
      }
    }
  }

  const fallHeight = climber.fallStartY;
  const groundLevel = GROUND_Y;
  const heightFallen = groundLevel - fallHeight; // positive = fell downward

  if (safeByPad) {
    climber.state = 'landed_safe';
    climber.landedAt = state.time;
    state.savedFalls++;
    state.score += Math.floor(10 + heightFallen * 0.2);
    annotations.push({
      x: climber.x,
      y: climber.y - 40,
      text: '✓ Nice catch! +' + Math.floor(10 + heightFallen * 0.2),
      duration: 2000,
      color: '#2266cc',
    });
    if (pad) {
      pad.assignedClimberId = null;
    }
  } else {
    climber.state = 'landed_injured';
    climber.landedAt = state.time;
    state.injuries++;
    const reason = badBounce ? 'Bounced into rock!' : pad ? 'Missed the pad!' : 'No pad!';
    annotations.push({
      x: climber.x,
      y: climber.y - 40,
      text: `✗ OUCH! ${reason}`,
      duration: 2500,
      color: '#cc2200',
    });
    if (pad) {
      pad.assignedClimberId = null;
    }
    if (state.injuries >= 5) {
      state.gameOver = true;
    }
  }
}

export function getClimberCurrentPose(climber: Climber, boulder: BoulderShape | undefined) {
  if (!boulder) return null;

  const wps = boulder.routeWaypoints;
  if (climber.waypointIndex >= wps.length - 1) return null;

  const wp1 = wps[climber.waypointIndex];
  const wp2 = wps[Math.min(climber.waypointIndex + 1, wps.length - 1)];
  return interpWaypoints(wp1, wp2, climber.progress);
}

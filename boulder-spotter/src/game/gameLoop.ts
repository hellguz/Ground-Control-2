import type { GameState, Annotation } from './types';
import { generateSceneBoulders, generateGroundRocks } from './boulders';
import { createClimber, updateClimbers } from './climbers';
import { createPad, updateAllPads } from './pads';
import { MAX_CLIMBERS, SPAWN_INTERVAL_MS } from './constants';

export function createInitialState(): GameState {
  const boulders = generateSceneBoulders();
  const groundRocks = generateGroundRocks();

  return {
    boulders,
    climbers: [],
    pads: [],
    groundRocks,
    annotations: [],
    score: 0,
    injuries: 0,
    savedFalls: 0,
    time: 0,
    lastSpawnTime: -SPAWN_INTERVAL_MS, // spawn immediately
    nextClimberId: 0,
    nextPadId: 0,
    gameOver: false,
  };
}

function getOccupiedBoulderIds(state: GameState): Set<number> {
  const occupied = new Set<number>();
  for (const climber of state.climbers) {
    if (climber.state === 'climbing' || climber.state === 'falling') {
      occupied.add(climber.boulderId);
    }
  }
  return occupied;
}

function getPadSizeForHeight(height: number): 'large' | 'medium' | 'small' {
  if (height > 185) return 'large';
  if (height > 160) return 'medium';
  return 'small';
}

export function spawnClimberIfNeeded(state: GameState) {
  if (state.gameOver) return;

  const activeClimbers = state.climbers.filter(
    c => c.state === 'climbing' || c.state === 'falling'
  ).length;

  if (activeClimbers >= MAX_CLIMBERS) return;
  if (state.time - state.lastSpawnTime < SPAWN_INTERVAL_MS) return;

  const occupied = getOccupiedBoulderIds(state);
  const available = state.boulders.filter(b => !occupied.has(b.id));
  if (available.length === 0) return;

  const boulder = available[Math.floor(Math.random() * available.length)];
  const colorIndex = state.nextClimberId % 5;
  const climber = createClimber(boulder, colorIndex);
  climber.id = state.nextClimberId++;

  // Create and assign pad
  const padSize = getPadSizeForHeight(boulder.height);
  // Pad spawns near the base of the boulder's route start
  const padX = boulder.routeWaypoints[0].x + boulder.width * 0.15;
  const pad = createPad(padX, padSize, climber.id, state.nextPadId++);
  pad.assignedClimberId = climber.id;
  climber.assignedPadId = pad.id;

  state.climbers.push(climber);
  state.pads.push(pad);
  state.lastSpawnTime = state.time;

  state.annotations.push({
    x: padX,
    y: 490,
    text: `🧗 New climber on ${boulder.type}!`,
    duration: 1800,
    color: '#2244aa',
  });
}

export function updateAnnotations(state: GameState, dtMs: number) {
  for (const ann of state.annotations) {
    ann.duration -= dtMs;
  }
  state.annotations = state.annotations.filter(a => a.duration > 0);
}

export function cleanupFinishedClimbers(state: GameState) {
  const toRemove = state.climbers.filter(c => {
    const done = c.state === 'topped_out' || c.state === 'landed_safe' || c.state === 'landed_injured';
    return done && (state.time - c.landedAt > 3000);
  });

  for (const climber of toRemove) {
    state.climbers = state.climbers.filter(c => c.id !== climber.id);
    if (climber.state === 'topped_out' || climber.state === 'landed_safe') {
      state.pads = state.pads.filter(p => p.assignedClimberId !== climber.id);
    }
    // For injured: keep pad but unassign
    const pad = state.pads.find(p => p.assignedClimberId === climber.id);
    if (pad) pad.assignedClimberId = null;
  }
}

export function updateGame(state: GameState, dtMs: number) {
  if (state.gameOver) return;

  state.time += dtMs;

  const annotations: Annotation[] = [];
  spawnClimberIfNeeded(state);
  updateClimbers(state, dtMs, annotations);
  for (const ann of annotations) state.annotations.push(ann);
  updateAllPads(state);
  updateAnnotations(state, dtMs);
  cleanupFinishedClimbers(state);
}

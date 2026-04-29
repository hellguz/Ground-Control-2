export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 620;
export const GROUND_Y = 540;  // y coordinate of ground surface
export const GRAVITY = 0.45;
export const MAX_CLIMBERS = 5;
export const SPAWN_INTERVAL_MS = 9000;  // new climber every 9 seconds
export const MAX_INJURIES = 5;          // game over after 5 injuries

export const PAD_SIZES = {
  large:  { width: 130, height: 22, color: '#4a90d9' },
  medium: { width: 90,  height: 18, color: '#e8a838' },
  small:  { width: 55,  height: 14, color: '#a8c840' },
} as const;

// How far horizontally from base climbers land based on boulder type
export const FALL_OFFSETS = {
  slab:     { x: 40,  randomness: 20 },  // slightly forward/out
  wall:     { x: 20,  randomness: 30 },  // mostly straight down
  overhang: { x: 70,  randomness: 40 },  // thrown outward
  roof:     { x: 110, randomness: 50 },  // very far out
  prow:     { x: 50,  randomness: 35 },
};

// Climber dimensions (stick figure, centered at hip)
export const CLIMBER = {
  headRadius: 9,
  torsoLen: 20,
  armLen: 16,
  legLen: 20,
  speed: 0.6, // progress units per second on route
};

export const BOULDER_COLORS = {
  fill: '#c4b49a',        // warm sandstone
  fillLight: '#d4c4aa',   // lighter face
  stroke: '#2a1a0a',
  shadowFill: '#a09080',
};

export const CLIMBER_COLORS = [
  '#1a1a1a', '#2244aa', '#aa2222', '#228833', '#884400',
];

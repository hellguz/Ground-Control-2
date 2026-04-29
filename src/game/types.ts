export type BoulderType = 'slab' | 'wall' | 'overhang' | 'roof' | 'prow';
export type MoveType = 'start' | 'slab_smear' | 'wall_crimp' | 'sloper' | 'heel_hook' | 'dyno' | 'mantle' | 'top_out' | 'compression';
export type ClimberState = 'climbing' | 'falling' | 'landed_safe' | 'landed_injured' | 'topped_out';
export type PadSize = 'large' | 'medium' | 'small';
export type PadState = 'idle' | 'dragging' | 'airborne' | 'settled';

export interface Point {
  x: number;
  y: number;
}

export interface BoulderShape {
  id: number;
  baseX: number;    // left base x
  baseY: number;    // base y (ground level)
  width: number;
  height: number;
  type: BoulderType;
  polygon: Point[]; // world coordinates
  routeWaypoints: RouteWaypoint[]; // route from bottom to top
  climbStartX: number;  // x where climber starts (base of route)
  fallOffset: Point;    // how far out climber falls (depends on type)
}

export interface RouteWaypoint {
  x: number; // world x
  y: number; // world y
  moveType: MoveType;
  isCrux: boolean;
  fallChance: number; // 0-1 probability of falling here
  bodyLean: number;   // -1 lean away, 0 upright, 1 lean into rock
  armAngle: number;   // angle of reaching arm in radians
  legSpread: number;  // how spread apart legs are
}

export interface Climber {
  id: number;
  boulderId: number;
  waypointIndex: number;    // current waypoint
  progress: number;         // 0-1 between current and next waypoint
  state: ClimberState;
  x: number;                // hip x (center of mass)
  y: number;                // hip y (center of mass)
  vx: number;               // velocity when falling
  vy: number;
  rotation: number;         // body rotation during fall
  rotVel: number;
  assignedPadId: number | null;
  moveType: MoveType;
  speed: number;            // how fast they climb (px/frame along route)
  fallStartY: number;       // y when they started falling
  landedAt: number;         // timestamp
  color: string;            // unique per climber (XKCD style variation)
}

export interface CrashPad {
  id: number;
  x: number;          // center x
  y: number;          // top y
  width: number;
  height: number;
  size: PadSize;
  state: PadState;
  vx: number;
  vy: number;
  rotation: number;   // tilt angle (radians), small
  color: string;
  assignedClimberId: number | null;
  dragOffsetX: number;
  dragOffsetY: number;
}

export interface GroundRock {
  x: number;
  topY: number;
  width: number;
  height: number;
  polygon: Point[];
}

export interface Annotation {
  x: number;
  y: number;
  text: string;
  duration: number; // ms remaining
  color: string;
}

export interface GameState {
  boulders: BoulderShape[];
  climbers: Climber[];
  pads: CrashPad[];
  groundRocks: GroundRock[];
  annotations: Annotation[];
  score: number;
  injuries: number;
  savedFalls: number;
  time: number;
  lastSpawnTime: number;
  nextClimberId: number;
  nextPadId: number;
  gameOver: boolean;
}

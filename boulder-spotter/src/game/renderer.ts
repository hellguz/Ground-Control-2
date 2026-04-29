import type { GameState, BoulderShape, Climber, CrashPad, GroundRock, Annotation, Point } from './types';
import { GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';
import { getClimberCurrentPose } from './climbers';

// ─── Drawing primitives ────────────────────────────────────────────────────

function wobblyLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, wobble = 1.5) {
  const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * wobble;
  const my = (y1 + y2) / 2 + (Math.random() - 0.5) * wobble;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(mx, my, x2, y2);
  ctx.stroke();
}

function drawWobblyPolygon(ctx: CanvasRenderingContext2D, pts: Point[], wobble = 1.5) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const mx = (prev.x + curr.x) / 2 + (Math.random() - 0.5) * wobble;
    const my = (prev.y + curr.y) / 2 + (Math.random() - 0.5) * wobble;
    ctx.quadraticCurveTo(mx, my, curr.x, curr.y);
  }
  ctx.closePath();
}

// ─── Background & sky ─────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D) {
  // Off-white XKCD parchment
  ctx.fillStyle = '#f5f0e8';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Subtle hand-drawn hatching on sky area
  ctx.strokeStyle = '#e8e0d0';
  ctx.lineWidth = 0.5;
  for (let y = 20; y < GROUND_Y - 80; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y + (Math.random() - 0.5) * 4);
    ctx.lineTo(CANVAS_WIDTH, y + (Math.random() - 0.5) * 4);
    ctx.stroke();
  }
}

// ─── Ground ──────────────────────────────────────────────────────────────

function drawGround(ctx: CanvasRenderingContext2D) {
  // Sandy ground - fill below ground line
  const sandGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_HEIGHT);
  sandGrad.addColorStop(0, '#d4c4a0');
  sandGrad.addColorStop(0.3, '#c8b890');
  sandGrad.addColorStop(1, '#b8a880');
  ctx.fillStyle = sandGrad;
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

  // Ground line (wobbly)
  ctx.strokeStyle = '#4a3820';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  for (let x = 0; x < CANVAS_WIDTH; x += 40) {
    const y = GROUND_Y + (Math.random() - 0.5) * 3;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
  ctx.stroke();

  // Sand texture - random dots
  ctx.fillStyle = '#b8a878';
  for (let i = 0; i < 200; i++) {
    const sx = Math.random() * CANVAS_WIDTH;
    const sy = GROUND_Y + 5 + Math.random() * (CANVAS_HEIGHT - GROUND_Y - 10);
    const r = 0.5 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Ground rocks ─────────────────────────────────────────────────────────

function drawGroundRocks(ctx: CanvasRenderingContext2D, rocks: GroundRock[]) {
  for (const rock of rocks) {
    ctx.fillStyle = '#9a8870';
    drawWobblyPolygon(ctx, rock.polygon, 0.8);
    ctx.fill();

    ctx.strokeStyle = '#4a3820';
    ctx.lineWidth = 1.5;
    drawWobblyPolygon(ctx, rock.polygon, 0.8);
    ctx.stroke();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(rock.x + rock.width * 0.4, rock.topY + rock.height * 0.3, rock.width * 0.25, rock.height * 0.2, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Boulders ────────────────────────────────────────────────────────────

function drawBoulder(ctx: CanvasRenderingContext2D, boulder: BoulderShape) {
  const pts = boulder.polygon;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(
    boulder.baseX + boulder.width * 0.5,
    GROUND_Y + 6,
    boulder.width * 0.55,
    10,
    0, 0, Math.PI * 2
  );
  ctx.fill();

  // Main fill - sandstone gradient
  const grad = ctx.createLinearGradient(
    boulder.baseX, boulder.baseY - boulder.height,
    boulder.baseX + boulder.width, boulder.baseY
  );
  grad.addColorStop(0, '#d0c0a8');
  grad.addColorStop(0.4, '#c4b49a');
  grad.addColorStop(1, '#a89880');

  drawWobblyPolygon(ctx, pts, 0.5);
  ctx.fillStyle = grad;
  ctx.fill();

  // Rock face texture - horizontal stratification lines
  ctx.strokeStyle = 'rgba(80,60,40,0.2)';
  ctx.lineWidth = 0.8;
  const numLines = Math.floor(boulder.height / 25);
  for (let i = 1; i < numLines; i++) {
    const lineY = boulder.baseY - (boulder.height * i / numLines);
    // Find approximate left/right bounds at this y
    const leftX = boulder.baseX + boulder.width * 0.05 + (Math.random() - 0.5) * 5;
    const rightX = boulder.baseX + boulder.width * 0.85 + (Math.random() - 0.5) * 5;
    if (lineY > boulder.baseY - boulder.height && lineY < boulder.baseY) {
      ctx.beginPath();
      ctx.moveTo(leftX, lineY);
      ctx.lineTo(rightX + (Math.random() - 0.5) * 15, lineY + (Math.random() - 0.5) * 3);
      ctx.stroke();
    }
  }

  // Outline - XKCD style thick border
  ctx.strokeStyle = '#2a1a0a';
  ctx.lineWidth = 2.8;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // Draw twice for XKCD double-line effect
  drawWobblyPolygon(ctx, pts, 0.3);
  ctx.stroke();

  // Boulder type label (small, XKCD style)
  ctx.fillStyle = 'rgba(40,20,0,0.5)';
  ctx.font = '10px xkcd, Patrick Hand, cursive';
  ctx.textAlign = 'center';
  const labelX = boulder.baseX + boulder.width * 0.5;
  const labelY = boulder.baseY - boulder.height - 12;
  ctx.fillText(boulder.type.toUpperCase(), labelX, labelY);
}

// ─── Stick figure climber ─────────────────────────────────────────────────

function drawStickFigure(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rotation: number,
  moveType: string,
  bodyLean: number,
  armAngle: number,
  legSpread: number,
  color: string,
  state: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  const headR = 8;
  const torsoLen = 18;
  const armLen = 15;
  const legLen = 19;

  // Body lean (positive = lean into rock/forward)
  const leanAngle = bodyLean * 0.35;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Head (at 0,0 = hip position; head is up)
  const headX = Math.sin(leanAngle) * torsoLen;
  const headY = -Math.cos(leanAngle) * torsoLen;

  // Neck/torso from hip (0,0) to head
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(headX, headY);
  ctx.stroke();

  // Head circle
  ctx.beginPath();
  ctx.arc(headX, headY - headR * 0.5, headR, 0, Math.PI * 2);
  ctx.fillStyle = '#f5f0e8';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.stroke();

  // Face (XKCD minimal: two dots for eyes)
  ctx.fillStyle = color;
  const eyeOffX = headX + Math.sin(leanAngle) * 3;
  const eyeOffY = headY - headR * 0.5 - 1;
  ctx.beginPath();
  ctx.arc(eyeOffX - 2.5, eyeOffY, 1.2, 0, Math.PI * 2);
  ctx.arc(eyeOffX + 2.5, eyeOffY, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Determine arm positions based on move type
  let leftArmAngle = armAngle - 0.3;
  let rightArmAngle = armAngle + 0.5;

  if (moveType === 'dyno') {
    leftArmAngle = -2.2;
    rightArmAngle = -2.0;
  } else if (moveType === 'mantle' || moveType === 'top_out') {
    leftArmAngle = -Math.PI / 2 + 0.3;
    rightArmAngle = -Math.PI / 2 - 0.3;
  } else if (moveType === 'heel_hook') {
    leftArmAngle = -1.8;
    rightArmAngle = -1.2;
  } else if (moveType === 'compression') {
    leftArmAngle = -1.5;
    rightArmAngle = -0.8;
  }

  const shoulderX = headX * 0.6;
  const shoulderY = headY * 0.6;

  // Left arm
  const lax = shoulderX + Math.cos(leftArmAngle) * armLen;
  const lay = shoulderY + Math.sin(leftArmAngle) * armLen;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  wobblyLine(ctx, shoulderX, shoulderY, lax, lay, 0.8);

  // Right arm
  const rax = shoulderX + Math.cos(rightArmAngle) * armLen;
  const ray = shoulderY + Math.sin(rightArmAngle) * armLen;
  wobblyLine(ctx, shoulderX, shoulderY, rax, ray, 0.8);

  // Leg positions based on move
  const spread = legSpread * 0.6;
  let leftLegAngle = Math.PI / 2 + spread;
  let rightLegAngle = Math.PI / 2 - spread;

  if (moveType === 'heel_hook') {
    leftLegAngle = -0.5; // leg goes up for heel hook
    rightLegAngle = Math.PI / 2;
  } else if (moveType === 'slab_smear') {
    leftLegAngle = Math.PI / 2 + spread * 0.5;
    rightLegAngle = Math.PI / 2 - spread * 0.5;
  } else if (moveType === 'dyno') {
    leftLegAngle = Math.PI / 2 + spread * 1.2;
    rightLegAngle = Math.PI / 2 - spread * 1.2;
  }

  // Left leg
  const llx = Math.cos(leftLegAngle) * legLen;
  const lly = Math.sin(leftLegAngle) * legLen;
  ctx.lineWidth = 2.2;
  wobblyLine(ctx, 0, 0, llx, lly, 0.8);

  // Right leg
  const rlx = Math.cos(rightLegAngle) * legLen;
  const rly = Math.sin(rightLegAngle) * legLen;
  wobblyLine(ctx, 0, 0, rlx, rly, 0.8);

  // Injury X eyes if injured
  if (state === 'landed_injured') {
    ctx.strokeStyle = '#cc2200';
    ctx.lineWidth = 2;
    const ex = eyeOffX;
    const ey = eyeOffY;
    ctx.beginPath();
    ctx.moveTo(ex - 4, ey - 3); ctx.lineTo(ex - 1, ey);
    ctx.moveTo(ex - 1, ey - 3); ctx.lineTo(ex - 4, ey);
    ctx.moveTo(ex + 1, ey - 3); ctx.lineTo(ex + 4, ey);
    ctx.moveTo(ex + 4, ey - 3); ctx.lineTo(ex + 1, ey);
    ctx.stroke();
  }

  ctx.restore();
}

// ─── Crash pad ───────────────────────────────────────────────────────────

function drawCrashPad(ctx: CanvasRenderingContext2D, pad: CrashPad) {
  ctx.save();
  ctx.translate(pad.x, pad.y + pad.height / 2);
  ctx.rotate(pad.rotation);

  const w = pad.width;
  const h = pad.height;
  const r = 4; // corner radius

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(2, h / 2 + 4, w * 0.45, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pad body
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, r);
  ctx.fillStyle = pad.state === 'dragging' ? lightenColor(pad.color, 40) : pad.color;
  ctx.fill();

  // Pad highlight (lighter stripe on top)
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 2, -h / 2 + 2, w - 4, h / 3, [r, r, 0, 0]);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fill();

  // Pad outline - XKCD style
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, r);
  ctx.stroke();

  // Fold line in middle (crash pads fold in half)
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.lineTo(0, h / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Label
  ctx.fillStyle = '#1a1a1a';
  ctx.font = `bold ${Math.max(9, h - 6)}px xkcd, Patrick Hand, cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = pad.size === 'large' ? 'PAD' : pad.size === 'medium' ? 'pad' : 'p';
  ctx.fillText(label, 0, 1);

  // Dragging indicator
  if (pad.state === 'dragging') {
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.roundRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, r + 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

// ─── Annotations ─────────────────────────────────────────────────────────

function drawAnnotations(ctx: CanvasRenderingContext2D, annotations: Annotation[]) {
  for (const ann of annotations) {
    const alpha = Math.min(1, ann.duration / 500);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '13px xkcd, Patrick Hand, cursive';
    ctx.fillStyle = ann.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Text background
    const metrics = ctx.measureText(ann.text);
    ctx.fillStyle = 'rgba(245,240,232,0.85)';
    ctx.fillRect(ann.x - metrics.width / 2 - 4, ann.y - 16, metrics.width + 8, 18);

    ctx.fillStyle = ann.color;
    ctx.fillText(ann.text, ann.x, ann.y);
    ctx.restore();
  }
}

// ─── HUD ─────────────────────────────────────────────────────────────────

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState) {
  const { score, injuries, savedFalls } = state;
  const maxInjuries = 5;

  // HUD panel top-right
  const hudX = CANVAS_WIDTH - 220;
  const hudY = 10;
  const hudW = 210;
  const hudH = 80;

  ctx.fillStyle = 'rgba(245,240,232,0.9)';
  ctx.strokeStyle = '#2a1a0a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(hudX, hudY, hudW, hudH, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 14px xkcd, Patrick Hand, cursive';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.fillText(`Score: ${score}`, hudX + 10, hudY + 8);
  ctx.fillText(`Saved: ${savedFalls}`, hudX + 10, hudY + 28);

  // Injury hearts
  ctx.fillText('Injuries: ', hudX + 10, hudY + 50);
  for (let i = 0; i < maxInjuries; i++) {
    const hx = hudX + 90 + i * 22;
    const hy = hudY + 48;
    ctx.font = '18px Arial';
    ctx.fillText(i < injuries ? '💀' : '❤️', hx, hy);
  }
  ctx.font = '14px xkcd, Patrick Hand, cursive';
}

// ─── Move type label near climber ────────────────────────────────────────

function drawClimberLabel(ctx: CanvasRenderingContext2D, climber: Climber) {
  if (climber.state !== 'climbing') return;
  const labels: Record<string, string> = {
    start: 'start',
    slab_smear: 'smear!',
    wall_crimp: 'crimp',
    sloper: 'sloper...',
    heel_hook: 'heel hook!',
    dyno: 'DYNO!',
    mantle: 'mantle!',
    top_out: 'top out!',
    compression: 'compress',
  };
  const txt = labels[climber.moveType] || '';
  if (!txt) return;

  ctx.fillStyle = 'rgba(40,20,0,0.6)';
  ctx.font = '10px xkcd, Patrick Hand, cursive';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(txt, climber.x, climber.y - 28);
}

// ─── Instructions ────────────────────────────────────────────────────────

function drawInstructions(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(245,240,232,0.9)';
  ctx.strokeStyle = '#2a1a0a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(10, 10, 230, 58, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1a1a1a';
  ctx.font = '12px xkcd, Patrick Hand, cursive';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('🎯 Drag crash pads under climbers', 16, 16);
  ctx.fillText('📦 Each climber gets 1 pad', 16, 34);
  ctx.fillText('⚠️ 5 injuries = game over', 16, 52);
}

// ─── Main render function ────────────────────────────────────────────────

// Pre-computed random seeds for static elements (avoid jitter)
const staticSeed = { init: false, groundWobble: [] as number[] };

function initStatic() {
  if (staticSeed.init) return;
  staticSeed.init = true;
  for (let i = 0; i < 100; i++) {
    staticSeed.groundWobble.push(Math.random());
  }
}

export function renderFrame(ctx: CanvasRenderingContext2D, state: GameState) {
  initStatic();

  // Save RNG state (we use Math.random for wobble effects)
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawBackground(ctx);
  drawGround(ctx);

  // Boulders
  for (const boulder of state.boulders) {
    drawBoulder(ctx, boulder);
  }

  // Ground rocks
  drawGroundRocks(ctx, state.groundRocks);

  // Crash pads (draw settled ones first, then airborne, then dragging on top)
  const sortedPads = [...state.pads].sort((a, b) => {
    const order = { settled: 0, airborne: 1, dragging: 2, idle: 0 };
    return (order[a.state] ?? 0) - (order[b.state] ?? 0);
  });
  for (const pad of sortedPads) {
    drawCrashPad(ctx, pad);
  }

  // Climbers
  for (const climber of state.climbers) {
    const boulder = state.boulders.find(b => b.id === climber.boulderId);
    const pose = boulder ? getClimberCurrentPose(climber, boulder) : null;

    let bodyLean = pose?.bodyLean ?? 0;
    let armAngle = pose?.armAngle ?? -0.5;
    let legSpread = pose?.legSpread ?? 0.6;
    let moveType = climber.moveType;

    if (climber.state === 'falling') {
      bodyLean = -0.5;
      armAngle = Math.PI / 4;
      legSpread = 1.0;
      moveType = 'dyno'; // spread arms/legs during fall
    } else if (climber.state === 'topped_out') {
      bodyLean = -0.5;
      armAngle = -2.5;
      moveType = 'top_out';
    }

    if (climber.state !== 'landed_safe' && climber.state !== 'landed_injured') {
      drawStickFigure(
        ctx, climber.x, climber.y,
        climber.rotation,
        moveType, bodyLean, armAngle, legSpread,
        climber.color, climber.state
      );
      drawClimberLabel(ctx, climber);
    } else {
      // Draw briefly after landing
      const age = state.time - climber.landedAt;
      if (age < 2000) {
        const alpha = 1 - age / 2000;
        ctx.save();
        ctx.globalAlpha = alpha;
        drawStickFigure(
          ctx, climber.x, climber.y,
          climber.rotation,
          moveType, 0.2, 0, 1.0,
          climber.state === 'landed_injured' ? '#cc2200' : climber.color,
          climber.state
        );
        ctx.restore();
      }
    }
  }

  // Annotations
  drawAnnotations(ctx, state.annotations);

  // HUD
  drawHUD(ctx, state);
  drawInstructions(ctx);
}

export function renderGameOver(ctx: CanvasRenderingContext2D, state: GameState) {
  // Dim
  ctx.fillStyle = 'rgba(245,240,232,0.88)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Panel
  const pw = 400, ph = 200;
  const px = (CANVAS_WIDTH - pw) / 2;
  const py = (CANVAS_HEIGHT - ph) / 2;

  ctx.fillStyle = '#f5f0e8';
  ctx.strokeStyle = '#2a1a0a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#cc2200';
  ctx.font = 'bold 36px xkcd, Patrick Hand, cursive';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, py + 50);

  ctx.fillStyle = '#1a1a1a';
  ctx.font = '18px xkcd, Patrick Hand, cursive';
  ctx.fillText(`5 climbers got hurt!`, CANVAS_WIDTH / 2, py + 95);
  ctx.fillText(`Score: ${state.score}  |  Saved: ${state.savedFalls}`, CANVAS_WIDTH / 2, py + 125);

  ctx.font = '14px xkcd, Patrick Hand, cursive';
  ctx.fillStyle = '#4a90d9';
  ctx.fillText('Tap / click to restart', CANVAS_WIDTH / 2, py + 165);
}

export function renderTitleScreen(ctx: CanvasRenderingContext2D) {
  // Background
  ctx.fillStyle = '#f5f0e8';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Rough ground line
  ctx.strokeStyle = '#4a3820';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  for (let x = 0; x < CANVAS_WIDTH; x += 50) {
    ctx.lineTo(x, GROUND_Y + (Math.random() - 0.5) * 4);
  }
  ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
  ctx.stroke();

  // Sand fill
  ctx.fillStyle = '#d4c4a0';
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

  // A small boulder silhouette on the right
  ctx.fillStyle = '#c4b49a';
  ctx.strokeStyle = '#2a1a0a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(850, GROUND_Y);
  ctx.bezierCurveTo(840, GROUND_Y - 80, 870, GROUND_Y - 200, 920, GROUND_Y - 220);
  ctx.bezierCurveTo(960, GROUND_Y - 230, 1000, GROUND_Y - 180, 1010, GROUND_Y - 90);
  ctx.lineTo(1020, GROUND_Y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Tiny stick figure on boulder
  const fx = 940, fy = GROUND_Y - 225;
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(fx, fy - 9, 8, 0, Math.PI * 2); ctx.fillStyle = '#f5f0e8'; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 18); ctx.stroke(); // torso
  ctx.beginPath(); ctx.moveTo(fx - 12, fy - 6); ctx.lineTo(fx, fy - 14); ctx.lineTo(fx + 14, fy - 8); ctx.stroke(); // arms up (celebrating)
  ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx - 8, fy + 18); ctx.moveTo(fx, fy); ctx.lineTo(fx + 8, fy + 18); ctx.stroke();

  // Main title
  ctx.fillStyle = '#2a1a0a';
  ctx.font = 'bold 58px xkcd, Patrick Hand, cursive';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Boulder Spotter', CANVAS_WIDTH / 2, 140);

  // Subtitle
  ctx.font = '22px xkcd, Patrick Hand, cursive';
  ctx.fillStyle = '#5a3a1a';
  ctx.fillText('Place crash pads. Save climbers. Don\'t let them get hurt.', CANVAS_WIDTH / 2, 200);

  // Instructions box
  ctx.fillStyle = 'rgba(245,240,232,0.95)';
  ctx.strokeStyle = '#2a1a0a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(CANVAS_WIDTH / 2 - 280, 260, 560, 190, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1a1a1a';
  ctx.font = '16px xkcd, Patrick Hand, cursive';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const lines = [
    '🧗 Climbers tackle Fontainebleau sandstone boulders',
    '📦 Each climber gets a crash pad — drag it under them',
    '⚡ Overhangs throw climbers far out — plan ahead!',
    '🏔  Slabs: falls go forward. Overhangs: falls arc outward',
    '🪨 Avoid bouncing into ground rocks',
    '💀 5 injuries = game over',
  ];
  lines.forEach((line, i) => {
    ctx.fillText(line, CANVAS_WIDTH / 2 - 260, 275 + i * 27);
  });

  // Start button
  const bx = CANVAS_WIDTH / 2, by = 490;
  ctx.fillStyle = '#4a90d9';
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(bx - 130, by - 28, 260, 56, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px xkcd, Patrick Hand, cursive';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TAP TO START SPOTTING', bx, by);

  // Attribution
  ctx.fillStyle = '#8a6a4a';
  ctx.font = '11px xkcd, Patrick Hand, cursive';
  ctx.fillText('Fontainebleau style | XKCD aesthetic', CANVAS_WIDTH / 2, 560);
}

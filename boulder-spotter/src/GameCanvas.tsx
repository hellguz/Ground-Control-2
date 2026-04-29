import { useRef, useEffect, useCallback, useState } from 'react';
import type { GameState, CrashPad } from './game/types';
import { createInitialState, updateGame } from './game/gameLoop';
import { renderFrame, renderGameOver, renderTitleScreen } from './game/renderer';
import { startDragging, updateDragPosition, stopDragging } from './game/pads';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './game/constants';

function findPadAtPoint(state: GameState, x: number, y: number): CrashPad | null {
  const pads = [...state.pads].reverse();
  for (const pad of pads) {
    const halfW = pad.width / 2 + 12;
    const halfH = pad.height + 14;
    const dx = Math.abs(x - pad.x);
    const dy = Math.abs(y - (pad.y + pad.height / 2));
    if (dx < halfW && dy < halfH) return pad;
  }
  return null;
}

type Screen = 'title' | 'game' | 'gameover';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const dragPadIdRef = useRef<number | null>(null);
  const [screen, setScreen] = useState<Screen>('title');
  const screenRef = useRef<Screen>('title');

  const toCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (CANVAS_WIDTH / rect.width),
      y: (clientY - rect.top) * (CANVAS_HEIGHT / rect.height),
    };
  }, []);

  const handlePointerDown = useCallback((clientX: number, clientY: number) => {
    const { x, y } = toCanvasCoords(clientX, clientY);

    if (screenRef.current === 'title') {
      screenRef.current = 'game';
      setScreen('game');
      lastTimeRef.current = performance.now();
      return;
    }

    if (screenRef.current === 'gameover') {
      stateRef.current = createInitialState();
      screenRef.current = 'title';
      setScreen('title');
      return;
    }

    // Game screen: drag pad
    const pad = findPadAtPoint(stateRef.current, x, y);
    if (pad) {
      dragPadIdRef.current = pad.id;
      startDragging(pad, x, y);
    }
  }, [toCanvasCoords]);

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (dragPadIdRef.current === null) return;
    const { x, y } = toCanvasCoords(clientX, clientY);
    const pad = stateRef.current.pads.find(p => p.id === dragPadIdRef.current);
    if (pad) updateDragPosition(pad, x, y);
  }, [toCanvasCoords]);

  const handlePointerUp = useCallback(() => {
    if (dragPadIdRef.current === null) return;
    const pad = stateRef.current.pads.find(p => p.id === dragPadIdRef.current);
    if (pad) stopDragging(pad);
    dragPadIdRef.current = null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    function loop(timestamp: number) {
      if (!running || !ctx) return;

      const currentScreen = screenRef.current;

      if (currentScreen === 'title') {
        renderTitleScreen(ctx);
      } else if (currentScreen === 'game') {
        const dt = Math.min(timestamp - lastTimeRef.current, 50);
        lastTimeRef.current = timestamp;
        const state = stateRef.current;
        updateGame(state, dt);
        renderFrame(ctx, state);
        if (state.gameOver) {
          renderGameOver(ctx, state);
          screenRef.current = 'gameover';
          setScreen('gameover');
        }
      } else if (currentScreen === 'gameover') {
        renderFrame(ctx, stateRef.current);
        renderGameOver(ctx, stateRef.current);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    }

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(animFrameRef.current); };
  }, []);

  const isDragging = dragPadIdRef.current !== null;

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#1a1008', overflow: 'hidden',
      touchAction: 'none', userSelect: 'none',
    }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          maxWidth: '100vw', maxHeight: '100vh',
          objectFit: 'contain', display: 'block',
          cursor: screen === 'game' ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        }}
        onMouseDown={e => { e.preventDefault(); handlePointerDown(e.clientX, e.clientY); }}
        onMouseMove={e => handlePointerMove(e.clientX, e.clientY)}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={e => { e.preventDefault(); const t = e.touches[0]; handlePointerDown(t.clientX, t.clientY); }}
        onTouchMove={e => { e.preventDefault(); const t = e.touches[0]; handlePointerMove(t.clientX, t.clientY); }}
        onTouchEnd={e => { e.preventDefault(); handlePointerUp(); }}
      />
    </div>
  );
}

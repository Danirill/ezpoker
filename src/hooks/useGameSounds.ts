import { useEffect, useRef } from 'react';
import type { GamePhase, GameState, PlayerAction } from '../game/types';
import {
  playCheckSound,
  playChipSound,
  playDealSound,
  playFoldSound,
  playWinSound,
  playYourTurnSound,
} from '../audio/sounds';

interface SoundSnapshot {
  handNumber: number;
  communityCount: number;
  phase: GamePhase;
  activePlayerId: string | null;
  actions: Record<string, PlayerAction | null>;
}

function snapshot(state: GameState): SoundSnapshot {
  const actions: Record<string, PlayerAction | null> = {};
  for (const player of state.players) {
    actions[player.id] = player.lastAction;
  }

  return {
    handNumber: state.handNumber,
    communityCount: state.communityCards.length,
    phase: state.phase,
    activePlayerId: state.players[state.activePlayerIndex]?.id ?? null,
    actions,
  };
}

export function useGameSounds(state: GameState, soundEnabled: boolean): void {
  const prevRef = useRef<SoundSnapshot | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    const current = snapshot(state);
    prevRef.current = current;

    if (!soundEnabled || !prev) return;

    if (state.handNumber > prev.handNumber && state.phase === 'preflop') {
      playDealSound();
    }

    if (state.communityCards.length > prev.communityCount) {
      playDealSound();
    }

    if (state.phase === 'hand-over' && prev.phase !== 'hand-over') {
      playWinSound();
    }

    for (const player of state.players) {
      const previousAction = prev.actions[player.id];
      if (!player.lastAction || player.lastAction === previousAction) continue;

      switch (player.lastAction) {
        case 'fold':
          playFoldSound();
          break;
        case 'check':
          playCheckSound();
          break;
        case 'call':
        case 'raise':
        case 'all-in':
          playChipSound();
          break;
      }
    }

    const active = state.players[state.activePlayerIndex];
    const isPlayablePhase =
      state.phase !== 'waiting' && state.phase !== 'hand-over' && state.phase !== 'showdown';

    if (
      active?.isHuman &&
      active.status === 'active' &&
      isPlayablePhase &&
      active.id !== prev.activePlayerId
    ) {
      playYourTurnSound();
    }
  }, [state, soundEnabled]);
}

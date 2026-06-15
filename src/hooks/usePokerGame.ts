import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActionRequest, GameState } from '../game/types';
import { decideBotAction } from '../game/bot';
import { ACTION_DELAY_MS, DEFAULT_PLAYER_COUNT } from '../game/constants';
import {
  applyAction,
  canStartHand,
  createInitialState,
  startNewHand,
  syncStalledHand,
} from '../game/pokerEngine';

export function usePokerGame() {
  const [playerCount, setPlayerCount] = useState(DEFAULT_PLAYER_COUNT);
  const [state, setState] = useState<GameState>(() => createInitialState(DEFAULT_PLAYER_COUNT));
  const [animatingPot, setAnimatingPot] = useState(false);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPotRef = useRef(0);

  const triggerPotAnimation = useCallback(() => {
    setAnimatingPot(true);
    setTimeout(() => setAnimatingPot(false), 600);
  }, []);

  useEffect(() => {
    if (state.pot > prevPotRef.current) {
      triggerPotAnimation();
    }
    prevPotRef.current = state.pot;
  }, [state.pot, triggerPotAnimation]);

  const dispatch = useCallback((playerId: string, request: ActionRequest) => {
    setState((prev) => applyAction(prev, playerId, request));
  }, []);

  const updatePlayerCount = useCallback((count: number) => {
    setPlayerCount(count);
    setState((prev) => (prev.phase === 'waiting' ? createInitialState(count) : prev));
  }, []);

  const handleNewHand = useCallback(() => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    setState((prev) => {
      if (!canStartHand(prev)) return prev;
      if (prev.phase === 'waiting') {
        return startNewHand(createInitialState(playerCount));
      }
      return startNewHand(prev);
    });
  }, [playerCount]);

  useEffect(() => {
    setState((prev) => syncStalledHand(prev));
  }, [state.phase, state.communityCards.length, state.players.map((p) => p.status).join(',')]);

  useEffect(() => {
    if (botTimerRef.current) {
      clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }

    const phase = state.phase;
    if (phase === 'waiting' || phase === 'hand-over' || phase === 'showdown') return;

    const current = state.players[state.activePlayerIndex];
    if (!current || current.isHuman || current.status !== 'active') return;

    botTimerRef.current = setTimeout(() => {
      const action = decideBotAction(state, current);
      setState((prev) => applyAction(prev, current.id, action));
    }, ACTION_DELAY_MS);

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [state]);

  const activePlayer = state.players[state.activePlayerIndex];
  const isHumanTurn =
    activePlayer?.isHuman &&
    activePlayer.status === 'active' &&
    state.phase !== 'waiting' &&
    state.phase !== 'hand-over' &&
    state.phase !== 'showdown';

  return {
    state,
    playerCount,
    setPlayerCount: updatePlayerCount,
    dispatch,
    handleNewHand,
    isHumanTurn,
    animatingPot,
    canStartHand: canStartHand(state),
  };
}

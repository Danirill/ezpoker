import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActionRequest, BotStrategy, GameConfig, GameState } from '../game/types';
import { decideBotAction } from '../game/bot';
import {
  ACTION_DELAY_MS,
  BIG_BLIND,
  DEFAULT_PLAYER_COUNT,
  MAX_BIG_BLIND,
  MAX_STARTING_CHIPS,
  MIN_SMALL_BLIND,
  MIN_STARTING_CHIPS,
  SMALL_BLIND,
  STARTING_CHIPS,
} from '../game/constants';
import {
  applyAction,
  canStartHand,
  createInitialState,
  startNewHand,
  syncStalledHand,
} from '../game/pokerEngine';

export function usePokerGame() {
  const [gameConfig, setGameConfig] = useState<GameConfig>({
    startingChips: STARTING_CHIPS,
    smallBlind: SMALL_BLIND,
    bigBlind: BIG_BLIND,
  });
  const [playerCount, setPlayerCount] = useState(DEFAULT_PLAYER_COUNT);
  const [state, setState] = useState<GameState>(() => createInitialState(DEFAULT_PLAYER_COUNT, gameConfig));
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
    setState((prev) => (prev.phase === 'waiting' ? createInitialState(count, gameConfig) : prev));
  }, [gameConfig]);

  const updateGameConfig = useCallback((nextConfig: Partial<GameConfig>) => {
    setGameConfig((prevConfig) => {
      const startingChips = Math.min(
        MAX_STARTING_CHIPS,
        Math.max(
          MIN_STARTING_CHIPS,
          Math.floor(nextConfig.startingChips ?? prevConfig.startingChips),
        ),
      );
      const smallBlind = Math.max(
        MIN_SMALL_BLIND,
        Math.floor(nextConfig.smallBlind ?? prevConfig.smallBlind),
      );
      const requestedBigBlind = Math.floor(nextConfig.bigBlind ?? prevConfig.bigBlind);
      const bigBlind = Math.min(
        MAX_BIG_BLIND,
        Math.max(smallBlind + 1, requestedBigBlind),
      );

      const normalized: GameConfig = {
        startingChips,
        smallBlind,
        bigBlind,
      };

      setState((prev) => (prev.phase === 'waiting'
        ? createInitialState(playerCount, normalized)
        : prev));

      return normalized;
    });
  }, [playerCount]);

  const updateBotStrategy = useCallback((botId: string, strategy: BotStrategy | 'random') => {
    setState((prev) => {
      if (prev.phase !== 'waiting') return prev;
      return {
        ...prev,
        players: prev.players.map((p) => (
          p.id === botId && !p.isHuman
            ? {
                ...p,
                botStrategy: strategy === 'random' ? (p.botStrategyPreset ?? p.botStrategy) : strategy,
                botStrategyMode: strategy === 'random' ? 'random' : 'manual',
              }
            : p
        )),
      };
    });
  }, []);

  const handleNewHand = useCallback(() => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    setState((prev) => {
      if (!canStartHand(prev)) return prev;
      if (prev.phase === 'waiting') {
        return startNewHand(createInitialState(playerCount, gameConfig));
      }
      return startNewHand(prev);
    });
  }, [gameConfig, playerCount]);

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
    gameConfig,
    playerCount,
    setPlayerCount: updatePlayerCount,
    setGameConfig: updateGameConfig,
    setBotStrategy: updateBotStrategy,
    dispatch,
    handleNewHand,
    isHumanTurn,
    animatingPot,
    canStartHand: canStartHand(state),
  };
}

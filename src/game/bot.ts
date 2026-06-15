import type { ActionRequest, GameState, Player, PlayerAction } from './types';
import { getHandStrength } from './handEvaluator';
import { BIG_BLIND } from './constants';

export function decideBotAction(state: GameState, player: Player): ActionRequest {
  const strength = getHandStrength(player.holeCards, state.communityCards);
  const toCall = state.currentBet - player.currentBet;
  const canCheck = toCall === 0;
  const maxRaise = player.chips;
  const minRaiseTotal = state.currentBet + state.minRaise;
  const potOdds = toCall / (state.pot + toCall + 1);

  const roll = Math.random();

  if (strength < 0.2 && toCall > 0) {
    if (toCall > player.chips * 0.15 || roll < 0.75) {
      return { action: 'fold' };
    }
  }

  if (strength < 0.35 && toCall > BIG_BLIND * 3 && roll < 0.5) {
    return { action: 'fold' };
  }

  if (strength >= 0.75 && maxRaise >= state.minRaise) {
    const raiseAmount = Math.min(
      player.chips,
      Math.max(
        minRaiseTotal - player.currentBet,
        Math.floor(state.pot * (0.5 + strength * 0.5)),
      ),
    );
    if (raiseAmount > 0 && roll < 0.65) {
      return { action: 'raise', amount: player.currentBet + raiseAmount };
    }
  }

  if (strength >= 0.55 && maxRaise >= state.minRaise && roll < 0.35) {
    const raiseAmount = Math.min(
      player.chips,
      Math.max(minRaiseTotal - player.currentBet, BIG_BLIND * 2),
    );
    if (raiseAmount > 0) {
      return { action: 'raise', amount: player.currentBet + raiseAmount };
    }
  }

  if (canCheck) {
    if (strength > 0.45 && roll < 0.25 && maxRaise >= state.minRaise) {
      return { action: 'raise', amount: player.currentBet + BIG_BLIND * 2 };
    }
    return { action: 'check' };
  }

  if (toCall >= player.chips) {
    return strength >= 0.3 || potOdds < strength ? { action: 'all-in' } : { action: 'fold' };
  }

  if (strength >= potOdds + 0.1 || strength > 0.5) {
    return { action: 'call' };
  }

  if (roll < 0.2 && toCall <= BIG_BLIND * 2) {
    return { action: 'call' };
  }

  return { action: 'fold' };
}

export function getAvailableActions(state: GameState, player: Player): PlayerAction[] {
  if (player.status !== 'active') return [];

  const toCall = state.currentBet - player.currentBet;
  const actions: PlayerAction[] = ['fold'];

  if (toCall === 0) {
    actions.push('check');
  } else if (toCall >= player.chips) {
    actions.push('all-in');
  } else {
    actions.push('call');
  }

  const raiseNeeded = state.currentBet + state.minRaise - player.currentBet;
  if (player.chips > toCall && raiseNeeded <= player.chips) {
    actions.push('raise');
  }

  if (player.chips > 0 && toCall >= player.chips) {
    if (!actions.includes('all-in')) actions.push('all-in');
  }

  return actions;
}

export function getCallAmount(state: GameState, player: Player): number {
  return Math.min(state.currentBet - player.currentBet, player.chips);
}

export function getMinRaiseTotal(state: GameState): number {
  return state.currentBet + state.minRaise;
}

export function getMaxRaiseTotal(_state: GameState, player: Player): number {
  return player.currentBet + player.chips;
}

function roundNice(value: number): number {
  if (value <= 0) return 0;
  if (value < 30) return Math.round(value / 5) * 5;
  if (value < 100) return Math.round(value / 10) * 10;
  if (value < 500) return Math.round(value / 25) * 25;
  return Math.round(value / 50) * 50;
}

export function getPotSizedRaise(state: GameState, player: Player): number {
  const callAmount = state.currentBet - player.currentBet;
  return state.pot + state.currentBet + callAmount;
}

export function clampRaiseTotal(amount: number, state: GameState, player: Player): number {
  const min = getMinRaiseTotal(state);
  const max = getMaxRaiseTotal(state, player);
  return Math.min(max, Math.max(min, Math.round(amount)));
}

export function getRaiseCheckpoints(state: GameState, player: Player): number[] {
  const min = getMinRaiseTotal(state);
  const max = getMaxRaiseTotal(state, player);
  if (min >= max) return [max];

  const pot = getPotSizedRaise(state, player);
  const raw = [
    min,
    pot * 0.5,
    pot * 0.67,
    pot,
    pot * 1.5,
    pot * 2,
    max * 0.5,
    max * 0.75,
    max,
  ];

  const values = [...new Set(
    raw.map(roundNice).filter((v) => v >= min && v <= max),
  )].sort((a, b) => a - b);

  if (!values.includes(min)) values.unshift(min);
  if (!values.includes(max)) values.push(max);

  return values;
}

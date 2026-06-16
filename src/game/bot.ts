import type { ActionRequest, BotStrategy, GameState, Player, PlayerAction } from './types';
import { getHandStrength } from './handEvaluator';

interface StrategyProfile {
  weakFoldStrength: number;
  weakFoldRoll: number;
  pressureCallBlinds: number;
  pressureFoldRoll: number;
  premiumRaiseStrength: number;
  premiumRaiseRoll: number;
  valueRaiseStrength: number;
  valueRaiseRoll: number;
  checkRaiseStrength: number;
  checkRaiseRoll: number;
  lightCallRoll: number;
  lightCallBlinds: number;
  raiseBaseMultiplier: number;
  raisePotMultiplier: number;
}

const STRATEGY_PROFILES: Record<BotStrategy, StrategyProfile> = {
  balanced: {
    weakFoldStrength: 0.2,
    weakFoldRoll: 0.75,
    pressureCallBlinds: 3,
    pressureFoldRoll: 0.5,
    premiumRaiseStrength: 0.75,
    premiumRaiseRoll: 0.65,
    valueRaiseStrength: 0.55,
    valueRaiseRoll: 0.35,
    checkRaiseStrength: 0.45,
    checkRaiseRoll: 0.25,
    lightCallRoll: 0.2,
    lightCallBlinds: 2,
    raiseBaseMultiplier: 2,
    raisePotMultiplier: 0.5,
  },
  tight: {
    weakFoldStrength: 0.26,
    weakFoldRoll: 0.86,
    pressureCallBlinds: 2,
    pressureFoldRoll: 0.72,
    premiumRaiseStrength: 0.82,
    premiumRaiseRoll: 0.48,
    valueRaiseStrength: 0.65,
    valueRaiseRoll: 0.2,
    checkRaiseStrength: 0.62,
    checkRaiseRoll: 0.1,
    lightCallRoll: 0.07,
    lightCallBlinds: 1.2,
    raiseBaseMultiplier: 2.4,
    raisePotMultiplier: 0.45,
  },
  loose: {
    weakFoldStrength: 0.16,
    weakFoldRoll: 0.55,
    pressureCallBlinds: 4.2,
    pressureFoldRoll: 0.35,
    premiumRaiseStrength: 0.7,
    premiumRaiseRoll: 0.72,
    valueRaiseStrength: 0.48,
    valueRaiseRoll: 0.42,
    checkRaiseStrength: 0.36,
    checkRaiseRoll: 0.34,
    lightCallRoll: 0.34,
    lightCallBlinds: 3,
    raiseBaseMultiplier: 1.8,
    raisePotMultiplier: 0.55,
  },
  aggressive: {
    weakFoldStrength: 0.18,
    weakFoldRoll: 0.63,
    pressureCallBlinds: 3.4,
    pressureFoldRoll: 0.4,
    premiumRaiseStrength: 0.68,
    premiumRaiseRoll: 0.82,
    valueRaiseStrength: 0.5,
    valueRaiseRoll: 0.56,
    checkRaiseStrength: 0.38,
    checkRaiseRoll: 0.42,
    lightCallRoll: 0.24,
    lightCallBlinds: 2.5,
    raiseBaseMultiplier: 2.8,
    raisePotMultiplier: 0.68,
  },
};

const BOT_STRATEGIES: BotStrategy[] = ['balanced', 'tight', 'loose', 'aggressive'];

function pickProfile(player: Player): StrategyProfile {
  return STRATEGY_PROFILES[player.botStrategy ?? 'balanced'];
}

function randomStrategy(): BotStrategy {
  return BOT_STRATEGIES[Math.floor(Math.random() * BOT_STRATEGIES.length)];
}

export function assignRandomBotStrategies(botCount: number): BotStrategy[] {
  const assigned: BotStrategy[] = [];
  for (let i = 0; i < botCount; i++) {
    if (i < BOT_STRATEGIES.length) {
      assigned.push(BOT_STRATEGIES[i]);
    } else {
      assigned.push(randomStrategy());
    }
  }

  for (let i = assigned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [assigned[i], assigned[j]] = [assigned[j], assigned[i]];
  }
  return assigned;
}

export function decideBotAction(state: GameState, player: Player): ActionRequest {
  const profile = pickProfile(player);
  const bigBlind = state.config.bigBlind;
  const strength = getHandStrength(player.holeCards, state.communityCards);
  const toCall = state.currentBet - player.currentBet;
  const canCheck = toCall === 0;
  const maxRaise = player.chips;
  const minRaiseTotal = state.currentBet + state.minRaise;
  const potOdds = toCall / (state.pot + toCall + 1);

  const roll = Math.random();

  if (strength < profile.weakFoldStrength && toCall > 0) {
    if (toCall > player.chips * 0.15 || roll < profile.weakFoldRoll) {
      return { action: 'fold' };
    }
  }

  if (strength < 0.35 && toCall > bigBlind * profile.pressureCallBlinds && roll < profile.pressureFoldRoll) {
    return { action: 'fold' };
  }

  if (strength >= profile.premiumRaiseStrength && maxRaise >= state.minRaise) {
    const raiseAmount = Math.min(
      player.chips,
      Math.max(
        minRaiseTotal - player.currentBet,
        Math.floor(state.pot * (profile.raisePotMultiplier + strength * 0.5)),
      ),
    );
    if (raiseAmount > 0 && roll < profile.premiumRaiseRoll) {
      return { action: 'raise', amount: player.currentBet + raiseAmount };
    }
  }

  if (strength >= profile.valueRaiseStrength && maxRaise >= state.minRaise && roll < profile.valueRaiseRoll) {
    const raiseAmount = Math.min(
      player.chips,
      Math.max(minRaiseTotal - player.currentBet, Math.floor(bigBlind * profile.raiseBaseMultiplier)),
    );
    if (raiseAmount > 0) {
      return { action: 'raise', amount: player.currentBet + raiseAmount };
    }
  }

  if (canCheck) {
    if (strength > profile.checkRaiseStrength && roll < profile.checkRaiseRoll && maxRaise >= state.minRaise) {
      return { action: 'raise', amount: player.currentBet + Math.floor(bigBlind * profile.raiseBaseMultiplier) };
    }
    return { action: 'check' };
  }

  if (toCall >= player.chips) {
    return strength >= 0.3 || potOdds < strength ? { action: 'all-in' } : { action: 'fold' };
  }

  if (strength >= potOdds + 0.1 || strength > 0.5) {
    return { action: 'call' };
  }

  if (roll < profile.lightCallRoll && toCall <= bigBlind * profile.lightCallBlinds) {
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

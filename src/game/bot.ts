import type { ActionRequest, BotStrategy, BotTraits, GameState, Player, PlayerAction } from './types';
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
  bluffRaiseRoll: number;
  bluffMinStrength: number;
  bluffMaxStrength: number;
  bluffMaxCallBlinds: number;
  defendVsRaiseRoll: number;
  defendVsRaiseBlinds: number;
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
    bluffRaiseRoll: 0.12,
    bluffMinStrength: 0.2,
    bluffMaxStrength: 0.45,
    bluffMaxCallBlinds: 1.6,
    defendVsRaiseRoll: 0.32,
    defendVsRaiseBlinds: 2.2,
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
    bluffRaiseRoll: 0.05,
    bluffMinStrength: 0.24,
    bluffMaxStrength: 0.42,
    bluffMaxCallBlinds: 1.2,
    defendVsRaiseRoll: 0.16,
    defendVsRaiseBlinds: 1.5,
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
    bluffRaiseRoll: 0.18,
    bluffMinStrength: 0.18,
    bluffMaxStrength: 0.5,
    bluffMaxCallBlinds: 2.1,
    defendVsRaiseRoll: 0.4,
    defendVsRaiseBlinds: 3,
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
    bluffRaiseRoll: 0.24,
    bluffMinStrength: 0.2,
    bluffMaxStrength: 0.52,
    bluffMaxCallBlinds: 2.4,
    defendVsRaiseRoll: 0.46,
    defendVsRaiseBlinds: 3.4,
  },
};

const BOT_STRATEGIES: BotStrategy[] = ['balanced', 'tight', 'loose', 'aggressive'];

function pickProfile(player: Player): StrategyProfile {
  return STRATEGY_PROFILES[player.botStrategy ?? 'balanced'];
}

function resolveTraits(player: Player): BotTraits {
  return player.botTraits ?? { aggression: 0.5, bluff: 0.5, curiosity: 0.5 };
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

export function createRandomBotTraits(): BotTraits {
  return {
    aggression: Math.random(),
    bluff: Math.random(),
    curiosity: Math.random(),
  };
}

function chooseRaiseTotal(
  state: GameState,
  player: Player,
  bigBlind: number,
  profile: StrategyProfile,
  power = 1,
): number {
  const minRaiseTotal = state.currentBet + state.minRaise;
  const minAdditional = minRaiseTotal - player.currentBet;
  const maxAdditional = player.chips;
  const base = Math.floor(bigBlind * profile.raiseBaseMultiplier * power);
  const potDriven = Math.floor(state.pot * profile.raisePotMultiplier * power);
  const additional = Math.min(maxAdditional, Math.max(minAdditional, base, potDriven));
  return player.currentBet + additional;
}

export function decideBotAction(state: GameState, player: Player): ActionRequest {
  const profile = pickProfile(player);
  const traits = resolveTraits(player);
  const bigBlind = state.config.bigBlind;
  const strength = getHandStrength(player.holeCards, state.communityCards);
  const toCall = state.currentBet - player.currentBet;
  const canCheck = toCall === 0;
  const maxRaise = player.chips;
  const potOdds = toCall / (state.pot + toCall + 1);
  const toCallInBb = toCall / Math.max(1, bigBlind);
  const aggressionBoost = 0.8 + traits.aggression * 0.55;
  const bluffBoost = 0.7 + traits.bluff * 0.75;
  const curiosityBoost = 0.75 + traits.curiosity * 0.65;

  const roll = Math.random();

  if (strength < profile.weakFoldStrength && toCall > 0) {
    const foldRoll = Math.min(0.95, profile.weakFoldRoll / curiosityBoost);
    if (toCall > player.chips * 0.15 || roll < foldRoll) {
      return { action: 'fold' };
    }
  }

  if (
    strength < 0.35 &&
    toCall > bigBlind * profile.pressureCallBlinds &&
    roll < profile.pressureFoldRoll / curiosityBoost
  ) {
    return { action: 'fold' };
  }

  const canRaise = maxRaise >= state.minRaise;

  const canBluffRaise =
    canRaise &&
    state.phase !== 'preflop' &&
    toCallInBb <= profile.bluffMaxCallBlinds * curiosityBoost &&
    strength >= profile.bluffMinStrength &&
    strength <= profile.bluffMaxStrength;

  if (canBluffRaise && roll < profile.bluffRaiseRoll * bluffBoost) {
    const target = chooseRaiseTotal(state, player, bigBlind, profile, 0.9 + traits.bluff * 0.4);
    return { action: 'raise', amount: target };
  }

  if (strength >= profile.premiumRaiseStrength && canRaise) {
    if (roll < profile.premiumRaiseRoll * aggressionBoost) {
      return {
        action: 'raise',
        amount: chooseRaiseTotal(state, player, bigBlind, profile, 1 + strength * 0.35),
      };
    }
  }

  if (strength >= profile.valueRaiseStrength && canRaise && roll < profile.valueRaiseRoll * aggressionBoost) {
    return {
      action: 'raise',
      amount: chooseRaiseTotal(state, player, bigBlind, profile, 0.9 + strength * 0.2),
    };
  }

  if (canCheck) {
    if (strength > profile.checkRaiseStrength && roll < profile.checkRaiseRoll * aggressionBoost && canRaise) {
      return { action: 'raise', amount: chooseRaiseTotal(state, player, bigBlind, profile, 0.8) };
    }
    return { action: 'check' };
  }

  if (toCall >= player.chips) {
    return strength >= 0.3 || potOdds < strength ? { action: 'all-in' } : { action: 'fold' };
  }

  if (strength >= potOdds + 0.1 || strength > 0.5) {
    return { action: 'call' };
  }

  if (
    toCallInBb <= profile.defendVsRaiseBlinds * curiosityBoost &&
    roll < profile.defendVsRaiseRoll * curiosityBoost
  ) {
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

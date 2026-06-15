import type { ActionRequest, GamePhase, GameState, Player, PlayerAction } from './types';
import { createDeck, drawCards, shuffleDeck } from './deck';
import { compareHands, evaluateHand, formatHandDescription } from './handEvaluator';
import {
  BIG_BLIND,
  BOT_NAMES,
  DEFAULT_PLAYER_COUNT,
  HUMAN_NAME,
  MAX_PLAYER_COUNT,
  MIN_PLAYER_COUNT,
  SMALL_BLIND,
  STARTING_CHIPS,
} from './constants';

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function activePlayers(state: GameState): Player[] {
  return state.players.filter((p) => p.status === 'active' || p.status === 'all-in');
}

function playersInHand(state: GameState): Player[] {
  return state.players.filter((p) => p.status !== 'out' && p.status !== 'folded');
}

function nextActiveIndex(state: GameState, from: number): number {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    const p = state.players[idx];
    if (p.status === 'active') return idx;
  }
  return from;
}

function resetBets(state: GameState): void {
  for (const p of state.players) {
    p.currentBet = 0;
  }
  state.currentBet = 0;
  state.minRaise = BIG_BLIND;
}

function postBlind(state: GameState, player: Player, amount: number): void {
  const pay = Math.min(amount, player.chips);
  player.chips -= pay;
  player.currentBet = pay;
  state.pot += pay;
  if (player.chips === 0) player.status = 'all-in';
}

function collectBets(state: GameState): void {
  for (const p of state.players) {
    p.currentBet = 0;
  }
  state.currentBet = 0;
}

function getFirstToAct(state: GameState): number {
  let idx = state.firstToActIndex;
  const start = idx;
  let safety = 0;
  while (state.players[idx].status !== 'active' && safety < state.players.length) {
    idx = nextActiveIndex(state, idx);
    if (idx === start) break;
    safety++;
  }
  return idx;
}

function playersWhoCanAct(state: GameState): Player[] {
  return state.players.filter((p) => p.status === 'active');
}

function bettingComplete(state: GameState): boolean {
  const contenders = state.players.filter(
    (p) => p.status === 'active' || p.status === 'all-in',
  );

  if (contenders.length <= 1) return true;

  const active = contenders.filter((p) => p.status === 'active');
  if (active.length === 0) return true;
  if (active.length === 1) return active[0].currentBet === state.currentBet;

  const allMatched = active.every((p) => p.currentBet === state.currentBet);
  if (!allMatched) return false;

  const lastRaiser = state.lastAggressorIndex;
  if (lastRaiser >= 0) {
    const raiser = state.players[lastRaiser];
    if (raiser && (raiser.status === 'active' || raiser.status === 'all-in')) {
      return state.activePlayerIndex === lastRaiser;
    }
  }

  const nextIdx = nextActiveIndex(state, state.activePlayerIndex);
  return nextIdx === getFirstToAct(state);
}

function advancePhase(state: GameState): void {
  collectBets(state);

  const stillActive = activePlayers(state);
  if (stillActive.length <= 1) {
    runoutAndShowdown(state);
    return;
  }

  const phases: GamePhase[] = ['preflop', 'flop', 'turn', 'river', 'showdown'];
  const idx = phases.indexOf(state.phase);
  const next = phases[idx + 1];

  if (next === 'flop') {
    const { drawn, remaining } = drawCards(state.deck, 3);
    state.communityCards = drawn;
    state.deck = remaining;
    state.phase = 'flop';
    state.message = 'Флоп';
  } else if (next === 'turn') {
    const { drawn, remaining } = drawCards(state.deck, 1);
    state.communityCards.push(...drawn);
    state.deck = remaining;
    state.phase = 'turn';
    state.message = 'Тёрн';
  } else if (next === 'river') {
    const { drawn, remaining } = drawCards(state.deck, 1);
    state.communityCards.push(...drawn);
    state.deck = remaining;
    state.phase = 'river';
    state.message = 'Ривер';
  } else {
    resolveShowdown(state);
    return;
  }

  resetBets(state);
  state.lastAggressorIndex = -1;

  if (playersWhoCanAct(state).length === 0) {
    runoutAndShowdown(state);
    return;
  }

  state.activePlayerIndex = nextActiveIndex(state, state.dealerIndex);
  state.firstToActIndex = state.activePlayerIndex;
  skipFoldedPlayers(state);
}

function skipFoldedPlayers(state: GameState): void {
  const start = state.activePlayerIndex;
  let safety = 0;
  while (safety < state.players.length) {
    const p = state.players[state.activePlayerIndex];
    if (p.status === 'active') break;
    state.activePlayerIndex = nextActiveIndex(state, state.activePlayerIndex);
    if (state.activePlayerIndex === start) break;
    safety++;
  }
}

function runoutAndShowdown(state: GameState): void {
  while (state.communityCards.length < 5 && state.deck.length > 0) {
    const { drawn, remaining } = drawCards(state.deck, 1);
    state.communityCards.push(...drawn);
    state.deck = remaining;
  }
  state.phase = 'showdown';
  resolveShowdown(state);
}

function resolveShowdown(state: GameState): void {
  state.phase = 'showdown';
  const contenders = playersInHand(state).filter((p) => p.status !== 'folded');

  if (contenders.length === 1) {
    const winner = contenders[0];
    winner.chips += state.pot;
    state.winners = [{ playerId: winner.id, amount: state.pot, handName: 'Без вскрытия' }];
    state.message = `${winner.name} забирает банк ${state.pot}`;
    state.pot = 0;
    state.phase = 'hand-over';
    return;
  }

  const results = contenders.map((p) => ({
    player: p,
    hand: evaluateHand([...p.holeCards, ...state.communityCards]),
  }));

  results.sort((a, b) => compareHands(b.hand, a.hand));
  const best = results[0].hand;
  const winners = results.filter((r) => compareHands(r.hand, best) === 0);

  const share = Math.floor(state.pot / winners.length);
  const remainder = state.pot - share * winners.length;

  state.winners = winners.map((w, i) => {
    const amount = share + (i === 0 ? remainder : 0);
    w.player.chips += amount;
    return { playerId: w.player.id, amount, handName: formatHandDescription(w.hand) };
  });

  const names = state.winners.map((w) => {
    const p = state.players.find((pl) => pl.id === w.playerId)!;
    return `${p.name} (${w.handName})`;
  });

  state.message = `Победитель: ${names.join(', ')} — ${share * winners.length + remainder} фишек`;
  state.pot = 0;
  state.phase = 'hand-over';
}

function moveToNextPlayer(state: GameState): void {
  state.activePlayerIndex = nextActiveIndex(state, state.activePlayerIndex);
  skipFoldedPlayers(state);
}

function applyBet(state: GameState, player: Player, targetTotal: number, action: PlayerAction): void {
  const additional = Math.min(targetTotal - player.currentBet, player.chips);
  player.chips -= additional;
  player.currentBet += additional;
  state.pot += additional;
  player.lastAction = action;

  if (player.chips === 0) {
    player.status = 'all-in';
  }

  if (player.currentBet > state.currentBet) {
    const raiseSize = player.currentBet - state.currentBet;
    state.minRaise = Math.max(state.minRaise, raiseSize);
    state.currentBet = player.currentBet;
    state.lastAggressorIndex = state.players.findIndex((p) => p.id === player.id);
  }
}

export function createInitialState(playerCount = DEFAULT_PLAYER_COUNT): GameState {
  const totalPlayers = Math.min(MAX_PLAYER_COUNT, Math.max(MIN_PLAYER_COUNT, playerCount));
  const players: Player[] = [];

  players.push({
    id: 'human',
    name: HUMAN_NAME,
    isHuman: true,
    chips: STARTING_CHIPS,
    holeCards: [],
    currentBet: 0,
    status: 'active',
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
    lastAction: null,
    seatIndex: 0,
  });

  for (let i = 0; i < totalPlayers - 1; i++) {
    players.push({
      id: `bot-${i}`,
      name: BOT_NAMES[i % BOT_NAMES.length],
      isHuman: false,
      chips: STARTING_CHIPS,
      holeCards: [],
      currentBet: 0,
      status: 'active',
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
      lastAction: null,
      seatIndex: i + 1,
    });
  }

  return {
    players,
    communityCards: [],
    deck: [],
    pot: 0,
    sidePots: [],
    currentBet: 0,
    minRaise: BIG_BLIND,
    phase: 'waiting',
    activePlayerIndex: 0,
    dealerIndex: players.length - 1,
    handNumber: 0,
    message: 'Нажмите «Новая раздача», чтобы начать',
    winners: [],
    lastAggressorIndex: -1,
    firstToActIndex: 0,
  };
}

export function startNewHand(state: GameState): GameState {
  const next = cloneState(state);
  next.handNumber += 1;
  next.communityCards = [];
  next.pot = 0;
  next.winners = [];
  next.currentBet = 0;
  next.minRaise = BIG_BLIND;
  next.lastAggressorIndex = -1;
  next.phase = 'preflop';

  next.players = next.players.map((p) => ({
    ...p,
    holeCards: [],
    currentBet: 0,
    lastAction: null,
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
    status: p.chips > 0 ? 'active' : 'out',
  }));

  const eligible = next.players.filter((p) => p.chips > 0);
  if (eligible.length < 2) {
    next.phase = 'waiting';
    next.message = 'Игра окончена — недостаточно игроков с фишками';
    return next;
  }

  next.dealerIndex = (next.dealerIndex + 1) % next.players.length;
  while (next.players[next.dealerIndex].chips === 0) {
    next.dealerIndex = (next.dealerIndex + 1) % next.players.length;
  }

  const sbIndex = nextActiveIndex(next, next.dealerIndex);
  const bbIndex = nextActiveIndex(next, sbIndex);

  next.players[next.dealerIndex].isDealer = true;
  next.players[sbIndex].isSmallBlind = true;
  next.players[bbIndex].isBigBlind = true;

  let deck = shuffleDeck(createDeck());
  for (const p of next.players) {
    if (p.status === 'active') {
      const result = drawCards(deck, 2);
      p.holeCards = result.drawn;
      deck = result.remaining;
    }
  }
  next.deck = deck;

  postBlind(next, next.players[sbIndex], SMALL_BLIND);
  postBlind(next, next.players[bbIndex], BIG_BLIND);
  next.currentBet = BIG_BLIND;

  next.activePlayerIndex = nextActiveIndex(next, bbIndex);
  next.firstToActIndex = next.activePlayerIndex;
  next.message = `Раздача #${next.handNumber}`;

  return next;
}

export function applyAction(state: GameState, playerId: string, request: ActionRequest): GameState {
  const next = cloneState(state);
  if (next.phase === 'waiting' || next.phase === 'hand-over' || next.phase === 'showdown') {
    return next;
  }

  const player = next.players.find((p) => p.id === playerId);
  if (!player || player.status !== 'active') return next;
  if (next.players[next.activePlayerIndex].id !== playerId) return next;

  const toCall = next.currentBet - player.currentBet;

  switch (request.action) {
    case 'fold':
      player.status = 'folded';
      player.lastAction = 'fold';
      break;

    case 'check':
      if (toCall > 0) return state;
      player.lastAction = 'check';
      break;

    case 'call': {
      const pay = Math.min(toCall, player.chips);
      applyBet(next, player, player.currentBet + pay, pay >= player.chips ? 'all-in' : 'call');
      break;
    }

    case 'raise':
    case 'all-in': {
      const target =
        request.action === 'all-in'
          ? player.currentBet + player.chips
          : (request.amount ?? next.currentBet + next.minRaise);

      if (target <= player.currentBet) return state;
      if (target < next.currentBet + next.minRaise && target < player.currentBet + player.chips) {
        return state;
      }

      applyBet(next, player, target, request.action === 'all-in' ? 'all-in' : 'raise');
      break;
    }
  }

  const remaining = activePlayers(next);
  if (remaining.length === 1) {
    runoutAndShowdown(next);
    return next;
  }

  if (bettingComplete(next)) {
    if (next.phase === 'river') {
      resolveShowdown(next);
    } else {
      advancePhase(next);
    }
    return next;
  }

  moveToNextPlayer(next);
  const current = next.players[next.activePlayerIndex];
  next.message = current.isHuman ? 'Ваша очередь' : `Ход: ${current.name}`;

  return next;
}

export function getPhaseLabel(phase: GamePhase): string {
  const labels: Record<GamePhase, string> = {
    waiting: 'Ожидание',
    preflop: 'Префлоп',
    flop: 'Флоп',
    turn: 'Тёрн',
    river: 'Ривер',
    showdown: 'Вскрытие',
    'hand-over': 'Конец раздачи',
  };
  return labels[phase];
}

export function canStartHand(state: GameState): boolean {
  return (
    (state.phase === 'waiting' || state.phase === 'hand-over') &&
    state.players.filter((p) => p.chips > 0).length >= 2
  );
}

export function syncStalledHand(state: GameState): GameState {
  if (
    state.phase === 'waiting' ||
    state.phase === 'hand-over' ||
    state.phase === 'showdown'
  ) {
    return state;
  }

  if (playersWhoCanAct(state).length > 0) {
    return state;
  }

  if (activePlayers(state).length < 2) {
    return state;
  }

  const next = cloneState(state);
  runoutAndShowdown(next);
  return next;
}

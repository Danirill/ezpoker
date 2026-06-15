import type { Card, HandResult, Rank } from './types';
import { RANK_LABELS } from './types';

const HAND_NAMES = [
  'Старшая карта',
  'Пара',
  'Две пары',
  'Тройка',
  'Стрит',
  'Флеш',
  'Фул-хаус',
  'Каре',
  'Стрит-флеш',
  'Роял-флеш',
];

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map((c) => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function isStraight(ranks: number[]): number | null {
  const unique = [...new Set(ranks)].sort((a, b) => b - a);
  if (unique.length < 5) return null;

  for (let i = 0; i <= unique.length - 5; i++) {
    const slice = unique.slice(i, i + 5);
    if (slice[0] - slice[4] === 4) return slice[0];
  }

  if (unique.includes(14) && unique.includes(5) && unique.includes(4) && unique.includes(3) && unique.includes(2)) {
    return 5;
  }

  return null;
}

function evaluateFive(cards: Card[]): HandResult {
  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);
  const straightHigh = isStraight(ranks);

  const counts = new Map<number, number>();
  for (const r of ranks) {
    counts.set(r, (counts.get(r) ?? 0) + 1);
  }

  const groups = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  if (isFlush && straightHigh) {
    const rank = straightHigh === 14 ? 9 : 8;
    return { rank, name: rank === 9 ? HAND_NAMES[9] : HAND_NAMES[8], values: [straightHigh] };
  }

  if (groups[0][1] === 4) {
    const kicker = groups.find((g) => g[1] === 1)![0];
    return { rank: 7, name: HAND_NAMES[7], values: [groups[0][0], kicker] };
  }

  if (groups[0][1] === 3 && groups[1][1] === 2) {
    return { rank: 6, name: HAND_NAMES[6], values: [groups[0][0], groups[1][0]] };
  }

  if (isFlush) {
    return { rank: 5, name: HAND_NAMES[5], values: ranks };
  }

  if (straightHigh) {
    return { rank: 4, name: HAND_NAMES[4], values: [straightHigh] };
  }

  if (groups[0][1] === 3) {
    const kickers = groups.filter((g) => g[1] === 1).map((g) => g[0]);
    return { rank: 3, name: HAND_NAMES[3], values: [groups[0][0], ...kickers] };
  }

  if (groups[0][1] === 2 && groups[1][1] === 2) {
    const kicker = groups.find((g) => g[1] === 1)![0];
    const pairs = [groups[0][0], groups[1][0]].sort((a, b) => b - a);
    return { rank: 2, name: HAND_NAMES[2], values: [...pairs, kicker] };
  }

  if (groups[0][1] === 2) {
    const kickers = groups.filter((g) => g[1] === 1).map((g) => g[0]);
    return { rank: 1, name: HAND_NAMES[1], values: [groups[0][0], ...kickers] };
  }

  return { rank: 0, name: HAND_NAMES[0], values: ranks };
}

export function evaluateHand(cards: Card[]): HandResult {
  if (cards.length < 5) {
    const ranks = cards.map((c) => c.rank).sort((a, b) => b - a);
    return { rank: 0, name: HAND_NAMES[0], values: ranks };
  }

  const combos = combinations(cards, 5);
  let best: HandResult | null = null;

  for (const combo of combos) {
    const result = evaluateFive(combo);
    if (!best || compareHands(result, best) > 0) {
      best = result;
    }
  }

  return best!;
}

export function compareHands(a: HandResult, b: HandResult): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.max(a.values.length, b.values.length); i++) {
    const diff = (a.values[i] ?? 0) - (b.values[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function rankLabel(value: number): string {
  return RANK_LABELS[value as Rank] ?? String(value);
}

export function formatHandDescription(hand: HandResult): string {
  switch (hand.rank) {
    case 9:
    case 8:
    case 6:
    case 5:
    case 4:
      return hand.name;
    case 7:
      return `Каре ${rankLabel(hand.values[0])}`;
    case 3:
      return `Тройка ${rankLabel(hand.values[0])}`;
    case 2:
      return `Две пары: ${rankLabel(hand.values[0])} и ${rankLabel(hand.values[1])}`;
    case 1:
      return `Пара ${rankLabel(hand.values[0])}, кикер ${rankLabel(hand.values[1])}`;
    default:
      return `Старшая карта, ${rankLabel(hand.values[0])}`;
  }
}

export function getBestHandName(holeCards: Card[], communityCards: Card[]): string {
  const all = [...holeCards, ...communityCards];
  if (all.length < 5) return '—';
  return evaluateHand(all).name;
}

export function getHandStrength(holeCards: Card[], communityCards: Card[]): number {
  const all = [...holeCards, ...communityCards];
  if (all.length < 2) return 0;

  if (all.length >= 5) {
    const result = evaluateHand(all);
    const base = result.rank / 9;
    const kickerBonus = (result.values[0] ?? 0) / 140;
    return Math.min(1, base + kickerBonus * 0.1);
  }

  const [a, b] = holeCards;
  const high = Math.max(a.rank, b.rank);
  const low = Math.min(a.rank, b.rank);
  const isPair = a.rank === b.rank;
  const isSuited = a.suit === b.suit;
  const gap = high - low;

  let score = (high / 14) * 0.4 + (low / 14) * 0.2;
  if (isPair) score += 0.35;
  if (isSuited) score += 0.08;
  if (gap <= 2) score += 0.05;
  if (high >= 13) score += 0.05;

  return Math.min(1, score);
}

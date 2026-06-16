import { createDeck } from './deck';
import { compareHands, evaluateHand } from './handEvaluator';
import type { Card } from './types';

export interface HandOddsResult {
  simulations: number;
  byRank: Record<number, number>;
}

export interface EquityOddsResult {
  simulations: number;
  opponents: number;
  win: number;
  tie: number;
  lose: number;
}

function sameCard(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

export function estimateHandOdds(
  holeCards: Card[],
  communityCards: Card[],
  simulations = 3000,
): HandOddsResult | null {
  if (holeCards.length < 2) return null;

  const known = [...holeCards, ...communityCards];
  const missingBoardCards = Math.max(0, 5 - communityCards.length);

  const remainingDeck = createDeck().filter((card) => !known.some((k) => sameCard(k, card)));
  if (remainingDeck.length < missingBoardCards) return null;

  const byRank: Record<number, number> = {};
  const rounds = Math.max(200, simulations);

  for (let i = 0; i < rounds; i++) {
    const pool = [...remainingDeck];

    for (let j = 0; j < missingBoardCards; j++) {
      const rand = j + Math.floor(Math.random() * (pool.length - j));
      [pool[j], pool[rand]] = [pool[rand], pool[j]];
    }

    const drawn = pool.slice(0, missingBoardCards);
    const result = evaluateHand([...holeCards, ...communityCards, ...drawn]);
    byRank[result.rank] = (byRank[result.rank] ?? 0) + 1;
  }

  return { simulations: rounds, byRank };
}

export function estimateEquityOdds(
  holeCards: Card[],
  communityCards: Card[],
  opponents: number,
  simulations = 3000,
): EquityOddsResult | null {
  if (holeCards.length < 2) return null;
  const oppCount = Math.max(1, Math.floor(opponents));
  const missingBoardCards = Math.max(0, 5 - communityCards.length);
  const cardsNeeded = missingBoardCards + oppCount * 2;

  const known = [...holeCards, ...communityCards];
  const remainingDeck = createDeck().filter((card) => !known.some((k) => sameCard(k, card)));
  if (remainingDeck.length < cardsNeeded) return null;

  let win = 0;
  let tie = 0;
  let lose = 0;
  const rounds = Math.max(200, simulations);

  for (let i = 0; i < rounds; i++) {
    const pool = [...remainingDeck];

    for (let j = 0; j < cardsNeeded; j++) {
      const rand = j + Math.floor(Math.random() * (pool.length - j));
      [pool[j], pool[rand]] = [pool[rand], pool[j]];
    }

    const drawn = pool.slice(0, cardsNeeded);
    const board = [...communityCards, ...drawn.slice(0, missingBoardCards)];
    const heroHand = evaluateHand([...holeCards, ...board]);

    let outcome: 'win' | 'tie' | 'lose' = 'win';
    let idx = missingBoardCards;
    for (let o = 0; o < oppCount; o++) {
      const oppCards = [drawn[idx], drawn[idx + 1]];
      idx += 2;
      const oppHand = evaluateHand([...oppCards, ...board]);
      const cmp = compareHands(heroHand, oppHand);
      if (cmp < 0) {
        outcome = 'lose';
        break;
      }
      if (cmp === 0) {
        outcome = outcome === 'lose' ? 'lose' : 'tie';
      }
    }

    if (outcome === 'win') win++;
    else if (outcome === 'tie') tie++;
    else lose++;
  }

  return { simulations: rounds, opponents: oppCount, win, tie, lose };
}

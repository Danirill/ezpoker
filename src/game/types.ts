export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

export type GamePhase =
  | 'waiting'
  | 'preflop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown'
  | 'hand-over';

export type PlayerStatus = 'active' | 'folded' | 'all-in' | 'out';
export type BotStrategy = 'balanced' | 'tight' | 'loose' | 'aggressive';
export interface BotTraits {
  aggression: number;
  bluff: number;
  curiosity: number;
}

export interface Player {
  id: string;
  name: string;
  isHuman: boolean;
  chips: number;
  holeCards: Card[];
  currentBet: number;
  status: PlayerStatus;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  lastAction: PlayerAction | null;
  seatIndex: number;
  botStrategy?: BotStrategy;
  botTraits?: BotTraits;
}

export interface Pot {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface GameConfig {
  startingChips: number;
  smallBlind: number;
  bigBlind: number;
}

export interface GameState {
  config: GameConfig;
  players: Player[];
  communityCards: Card[];
  deck: Card[];
  pot: number;
  sidePots: Pot[];
  currentBet: number;
  minRaise: number;
  phase: GamePhase;
  activePlayerIndex: number;
  dealerIndex: number;
  handNumber: number;
  message: string;
  winners: { playerId: string; amount: number; handName: string }[];
  lastAggressorIndex: number;
  firstToActIndex: number;
}

export interface ActionRequest {
  action: PlayerAction;
  amount?: number;
}

export interface HandResult {
  rank: number;
  name: string;
  values: number[];
}

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const RANK_LABELS: Record<Rank, string> = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

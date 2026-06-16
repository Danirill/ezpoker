import type { BotStrategy, GamePhase, Player, PlayerAction } from './game/types';

export type Locale = 'ru' | 'en';

const BOT_NAMES_RU = ['Алекс', 'Мария', 'Иван', 'София', 'Дмитрий', 'Олег', 'Катя', 'Пётр', 'Анна', 'Макс'];
const BOT_NAMES_EN = ['Alex', 'Maria', 'Ivan', 'Sophia', 'Dmitry', 'Oleg', 'Katya', 'Petr', 'Anna', 'Max'];

const ACTION_LABELS: Record<Locale, Record<PlayerAction, string>> = {
  ru: { fold: 'Фолд', check: 'Чек', call: 'Колл', raise: 'Рейз', 'all-in': 'Олл-ин' },
  en: { fold: 'Fold', check: 'Check', call: 'Call', raise: 'Raise', 'all-in': 'All-in' },
};

const PHASE_LABELS: Record<Locale, Record<GamePhase, string>> = {
  ru: {
    waiting: 'Ожидание',
    preflop: 'Префлоп',
    flop: 'Флоп',
    turn: 'Тёрн',
    river: 'Ривер',
    showdown: 'Вскрытие',
    'hand-over': 'Конец раздачи',
  },
  en: {
    waiting: 'Waiting',
    preflop: 'Preflop',
    flop: 'Flop',
    turn: 'Turn',
    river: 'River',
    showdown: 'Showdown',
    'hand-over': 'Hand over',
  },
};

const HAND_NAME_REPLACEMENTS_EN: Record<string, string> = {
  'Роял-флеш': 'Royal flush',
  'Стрит-флеш': 'Straight flush',
  Каре: 'Four of a kind',
  'Фул-хаус': 'Full house',
  Флеш: 'Flush',
  Стрит: 'Straight',
  Тройка: 'Three of a kind',
  'Две пары': 'Two pair',
  Пара: 'Pair',
  'Старшая карта': 'High card',
  'Без вскрытия': 'Without showdown',
};

export function translateAction(action: PlayerAction, locale: Locale): string {
  return ACTION_LABELS[locale][action];
}

export function translatePhase(phase: GamePhase, locale: Locale): string {
  return PHASE_LABELS[locale][phase];
}

const HAND_RANK_LABELS: Record<Locale, Record<number, string>> = {
  ru: {
    9: 'Роял-флеш',
    8: 'Стрит-флеш',
    7: 'Каре',
    6: 'Фул-хаус',
    5: 'Флеш',
    4: 'Стрит',
    3: 'Тройка',
    2: 'Две пары',
    1: 'Пара',
    0: 'Старшая карта',
  },
  en: {
    9: 'Royal flush',
    8: 'Straight flush',
    7: 'Four of a kind',
    6: 'Full house',
    5: 'Flush',
    4: 'Straight',
    3: 'Three of a kind',
    2: 'Two pair',
    1: 'Pair',
    0: 'High card',
  },
};

export function translateHandRank(rank: number, locale: Locale): string {
  return HAND_RANK_LABELS[locale][rank] ?? String(rank);
}

const BOT_STRATEGY_LABELS: Record<Locale, Record<BotStrategy, string>> = {
  ru: {
    balanced: 'Сбалансированный',
    tight: 'Тайтовый',
    loose: 'Лузовый',
    aggressive: 'Агрессивный',
  },
  en: {
    balanced: 'Balanced',
    tight: 'Tight',
    loose: 'Loose',
    aggressive: 'Aggressive',
  },
};

export function translateBotStrategy(strategy: BotStrategy, locale: Locale): string {
  return BOT_STRATEGY_LABELS[locale][strategy];
}

export function getDisplayName(player: Player, locale: Locale): string {
  if (locale === 'ru') return player.name;
  if (player.isHuman) return 'You';
  if (player.id.startsWith('bot-')) {
    const idx = Number.parseInt(player.id.replace('bot-', ''), 10);
    if (!Number.isNaN(idx)) return BOT_NAMES_EN[idx % BOT_NAMES_EN.length];
  }
  return player.name;
}

function replaceAllSafe(source: string, from: string, to: string): string {
  if (!from) return source;
  return source.split(from).join(to);
}

export function localizeMessage(message: string, locale: Locale, players: Player[]): string {
  if (locale === 'ru') return message;

  let next = message;
  next = replaceAllSafe(next, 'Нажмите «Новая раздача», чтобы начать', 'Press "Start game" to start');
  next = replaceAllSafe(next, 'Игра окончена — недостаточно игроков с фишками', 'Game over — not enough players with chips');
  next = replaceAllSafe(next, 'Раздача #', 'Hand #');
  next = replaceAllSafe(next, 'Ваша очередь', 'Your turn');
  next = replaceAllSafe(next, 'Ход: ', 'Turn: ');
  next = replaceAllSafe(next, 'забирает банк', 'wins the pot');
  next = replaceAllSafe(next, 'Победитель:', 'Winner:');
  next = replaceAllSafe(next, 'фишек', 'chips');
  next = replaceAllSafe(next, 'Флоп', 'Flop');
  next = replaceAllSafe(next, 'Тёрн', 'Turn');
  next = replaceAllSafe(next, 'Ривер', 'River');

  for (const [ru, en] of Object.entries(HAND_NAME_REPLACEMENTS_EN)) {
    next = replaceAllSafe(next, ru, en);
  }

  for (const p of players) {
    next = replaceAllSafe(next, p.name, getDisplayName(p, 'en'));
  }

  for (let i = 0; i < BOT_NAMES_RU.length; i++) {
    next = replaceAllSafe(next, BOT_NAMES_RU[i], BOT_NAMES_EN[i]);
  }
  next = replaceAllSafe(next, 'Вы', 'You');

  return next;
}

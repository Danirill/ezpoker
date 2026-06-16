import { useEffect, useMemo, useState } from 'react';
import type { BotStrategy, GameConfig, GameState } from '../game/types';
import {
  getDisplayName,
  translateAction,
  translateBotStrategy,
  translatePhase,
  type Locale,
} from '../i18n';
import {
  MAX_BIG_BLIND,
  MAX_PLAYER_COUNT,
  MAX_STARTING_CHIPS,
  MIN_PLAYER_COUNT,
  MIN_SMALL_BLIND,
  MIN_STARTING_CHIPS,
} from '../game/constants';
import {
  clampRaiseTotal,
  getAvailableActions,
  getCallAmount,
  getMaxRaiseTotal,
  getMinRaiseTotal,
  getRaiseCheckpoints,
} from '../game/bot';
import './ActionPanel.css';

interface ActionPanelProps {
  state: GameState;
  gameConfig: GameConfig;
  playerCount: number;
  localizedMessage: string;
  onPlayerCountChange: (count: number) => void;
  onGameConfigChange: (config: Partial<GameConfig>) => void;
  onBotStrategyChange: (botId: string, strategy: BotStrategy | 'random') => void;
  isHumanTurn: boolean;
  locale: Locale;
  onAction: (action: 'fold' | 'check' | 'call' | 'raise' | 'all-in', amount?: number) => void;
  onNewHand: () => void;
  canStartHand: boolean;
}

function closestCheckpointIndex(amount: number, checkpoints: number[]): number {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < checkpoints.length; i++) {
    const distance = Math.abs(checkpoints[i] - amount);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}

export function ActionPanel({
  state,
  gameConfig,
  playerCount,
  localizedMessage,
  onPlayerCountChange,
  onGameConfigChange,
  onBotStrategyChange,
  isHumanTurn,
  locale,
  onAction,
  onNewHand,
  canStartHand,
}: ActionPanelProps) {
  const human = state.players.find((p) => p.isHuman)!;
  const actions = isHumanTurn ? getAvailableActions(state, human) : [];
  const callAmount = getCallAmount(state, human);
  const minRaise = getMinRaiseTotal(state);
  const maxRaise = getMaxRaiseTotal(state, human);
  const checkpoints = useMemo(
    () => getRaiseCheckpoints(state, human),
    [state, human, minRaise, maxRaise],
  );
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const [raiseInput, setRaiseInput] = useState(String(minRaise));
  const isRu = locale === 'ru';
  const bots = state.players.filter((p) => !p.isHuman);
  const strategyOptions: Array<BotStrategy | 'random'> = ['random', 'balanced', 'tight', 'loose', 'aggressive'];
  const [preset, setPreset] = useState('random-mix');

  const applyBotPreset = (presetId: string) => {
    const cycleApply = (order: BotStrategy[]) => {
      bots.forEach((bot, idx) => onBotStrategyChange(bot.id, order[idx % order.length]));
    };

    if (presetId === 'random-mix') {
      bots.forEach((bot) => onBotStrategyChange(bot.id, 'random'));
      return;
    }
    if (presetId === 'casual') {
      cycleApply(['balanced', 'loose', 'balanced', 'tight']);
      return;
    }
    if (presetId === 'nit-fest') {
      cycleApply(['tight', 'tight', 'balanced']);
      return;
    }
    if (presetId === 'aggro') {
      cycleApply(['aggressive', 'loose', 'aggressive', 'balanced']);
      return;
    }
    if (presetId === 'lag-vs-tag') {
      cycleApply(['aggressive', 'loose', 'tight', 'balanced']);
      return;
    }
    if (presetId === 'chaos') {
      cycleApply(['aggressive', 'loose', 'balanced', 'tight', 'aggressive']);
    }
  };

  useEffect(() => {
    setRaiseAmount(minRaise);
    setRaiseInput(String(minRaise));
  }, [checkpoints, state.activePlayerIndex, state.phase, minRaise]);

  const sliderIndex = closestCheckpointIndex(raiseAmount, checkpoints);
  const highlightedIndex = checkpoints.indexOf(raiseAmount);
  const showRaiseSlider = actions.includes('raise') && checkpoints.length > 1;

  const applyRaiseAmount = (amount: number) => {
    const clamped = clampRaiseTotal(amount, state, human);
    setRaiseAmount(clamped);
    setRaiseInput(String(clamped));
  };

  const handleRaiseInputChange = (value: string) => {
    setRaiseInput(value);
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      setRaiseAmount(clampRaiseTotal(parsed, state, human));
    }
  };

  const handleRaiseInputBlur = () => {
    const parsed = Number.parseInt(raiseInput, 10);
    applyRaiseAmount(Number.isNaN(parsed) ? minRaise : parsed);
  };

  return (
    <div className={`action-panel ${state.phase === 'waiting' ? 'action-panel--waiting' : ''}`}>
      <div className="action-panel__status">
        <span className="action-panel__message">{localizedMessage}</span>
        {state.phase !== 'waiting' && (
          <span className="action-panel__phase">
            {state.handNumber > 0 && `#${state.handNumber} · `}
            {translatePhase(state.phase, locale)}
          </span>
        )}
      </div>

      {state.phase === 'waiting' && (
        <div className="action-panel__setup-layout">
          <div className="action-panel__setup">
          <label className="action-panel__setup-field">
            <span className="action-panel__setup-label">{isRu ? 'Игроков за столом' : 'Players at table'}</span>
            <div className="action-panel__setup-controls">
              <button
                type="button"
                className="action-panel__setup-step"
                onClick={() => onPlayerCountChange(Math.max(MIN_PLAYER_COUNT, playerCount - 1))}
                disabled={playerCount <= MIN_PLAYER_COUNT}
                aria-label={isRu ? 'Меньше игроков' : 'Less players'}
              >
                −
              </button>
              <input
                type="number"
                className="action-panel__setup-input"
                min={MIN_PLAYER_COUNT}
                max={MAX_PLAYER_COUNT}
                value={playerCount}
                onChange={(e) => {
                  const parsed = Number.parseInt(e.target.value, 10);
                  if (!Number.isNaN(parsed)) {
                    onPlayerCountChange(Math.min(MAX_PLAYER_COUNT, Math.max(MIN_PLAYER_COUNT, parsed)));
                  }
                }}
              />
              <button
                type="button"
                className="action-panel__setup-step"
                onClick={() => onPlayerCountChange(Math.min(MAX_PLAYER_COUNT, playerCount + 1))}
                disabled={playerCount >= MAX_PLAYER_COUNT}
                aria-label={isRu ? 'Больше игроков' : 'More players'}
              >
                +
              </button>
            </div>
          </label>
          <span className="action-panel__setup-hint">
            {isRu ? `Вы + ${playerCount - 1} соперник(ов)` : `You + ${playerCount - 1} opponent(s)`}
          </span>

          <label className="action-panel__setup-field">
            <span className="action-panel__setup-label">{isRu ? 'Стартовый стек' : 'Starting stack'}</span>
            <div className="action-panel__setup-controls">
              <button
                type="button"
                className="action-panel__setup-step"
                onClick={() => onGameConfigChange({ startingChips: Math.max(MIN_STARTING_CHIPS, gameConfig.startingChips - 100) })}
                disabled={gameConfig.startingChips <= MIN_STARTING_CHIPS}
                aria-label={isRu ? 'Меньше стартовый стек' : 'Lower starting stack'}
              >
                −
              </button>
              <input
                type="number"
                className="action-panel__setup-input action-panel__setup-input--wide"
                min={MIN_STARTING_CHIPS}
                max={MAX_STARTING_CHIPS}
                value={gameConfig.startingChips}
                onChange={(e) => {
                  const parsed = Number.parseInt(e.target.value, 10);
                  if (!Number.isNaN(parsed)) {
                    onGameConfigChange({ startingChips: parsed });
                  }
                }}
              />
              <button
                type="button"
                className="action-panel__setup-step"
                onClick={() => onGameConfigChange({ startingChips: Math.min(MAX_STARTING_CHIPS, gameConfig.startingChips + 100) })}
                disabled={gameConfig.startingChips >= MAX_STARTING_CHIPS}
                aria-label={isRu ? 'Больше стартовый стек' : 'Higher starting stack'}
              >
                +
              </button>
            </div>
          </label>

          <div className="action-panel__setup-row">
            <label className="action-panel__setup-field">
              <span className="action-panel__setup-label">SB</span>
              <div className="action-panel__setup-controls">
                <button
                  type="button"
                  className="action-panel__setup-step"
                  onClick={() => onGameConfigChange({ smallBlind: Math.max(MIN_SMALL_BLIND, gameConfig.smallBlind - 1) })}
                  disabled={gameConfig.smallBlind <= MIN_SMALL_BLIND}
                  aria-label={isRu ? 'Меньше малый блайнд' : 'Lower small blind'}
                >
                  −
                </button>
                <input
                  type="number"
                  className="action-panel__setup-input"
                  min={MIN_SMALL_BLIND}
                  max={MAX_BIG_BLIND - 1}
                  value={gameConfig.smallBlind}
                  onChange={(e) => {
                    const parsed = Number.parseInt(e.target.value, 10);
                    if (!Number.isNaN(parsed)) {
                      onGameConfigChange({ smallBlind: parsed });
                    }
                  }}
                />
                <button
                  type="button"
                  className="action-panel__setup-step"
                  onClick={() => onGameConfigChange({ smallBlind: gameConfig.smallBlind + 1 })}
                  aria-label={isRu ? 'Больше малый блайнд' : 'Higher small blind'}
                >
                  +
                </button>
              </div>
            </label>

            <label className="action-panel__setup-field">
              <span className="action-panel__setup-label">BB</span>
              <div className="action-panel__setup-controls">
                <button
                  type="button"
                  className="action-panel__setup-step"
                  onClick={() => onGameConfigChange({ bigBlind: Math.max(gameConfig.smallBlind + 1, gameConfig.bigBlind - 1) })}
                  disabled={gameConfig.bigBlind <= gameConfig.smallBlind + 1}
                  aria-label={isRu ? 'Меньше большой блайнд' : 'Lower big blind'}
                >
                  −
                </button>
                <input
                  type="number"
                  className="action-panel__setup-input"
                  min={gameConfig.smallBlind + 1}
                  max={MAX_BIG_BLIND}
                  value={gameConfig.bigBlind}
                  onChange={(e) => {
                    const parsed = Number.parseInt(e.target.value, 10);
                    if (!Number.isNaN(parsed)) {
                      onGameConfigChange({ bigBlind: parsed });
                    }
                  }}
                />
                <button
                  type="button"
                  className="action-panel__setup-step"
                  onClick={() => onGameConfigChange({ bigBlind: Math.min(MAX_BIG_BLIND, gameConfig.bigBlind + 1) })}
                  disabled={gameConfig.bigBlind >= MAX_BIG_BLIND}
                  aria-label={isRu ? 'Больше большой блайнд' : 'Higher big blind'}
                >
                  +
                </button>
              </div>
            </label>
          </div>

          </div>

          <div className="action-panel__bot-strategies">
            <div className="action-panel__bot-head">
              <span className="action-panel__setup-label">
                {isRu ? 'Стиль игры ботов' : 'Bot play style'}
              </span>
              <div className="action-panel__bot-preset">
                <select
                  className="action-panel__bot-select"
                  value={preset}
                  onChange={(e) => setPreset(e.target.value)}
                >
                  <option value="random-mix">{isRu ? 'Случайный микс' : 'Random mix'}</option>
                  <option value="casual">{isRu ? 'Казуальный' : 'Casual table'}</option>
                  <option value="nit-fest">{isRu ? 'Нит-фест' : 'Nit-fest'}</option>
                  <option value="aggro">{isRu ? 'Агро-стол' : 'Aggro table'}</option>
                  <option value="lag-vs-tag">{isRu ? 'ЛАГ vs ТАГ' : 'LAG vs TAG'}</option>
                  <option value="chaos">{isRu ? 'Хаос' : 'Chaos'}</option>
                </select>
                <button
                  type="button"
                  className="action-panel__btn action-panel__btn--apply"
                  onClick={() => applyBotPreset(preset)}
                >
                  {isRu ? 'Применить' : 'Apply'}
                </button>
              </div>
            </div>
            <div className="action-panel__bot-list">
              {bots.map((bot) => (
                <label key={bot.id} className="action-panel__bot-item">
                  <span className="action-panel__bot-name">{getDisplayName(bot, locale)}</span>
                  <select
                    className="action-panel__bot-select"
                    value={bot.botStrategyMode === 'manual' ? (bot.botStrategy ?? 'balanced') : 'random'}
                    onChange={(e) => onBotStrategyChange(bot.id, e.target.value as BotStrategy | 'random')}
                  >
                    {strategyOptions.map((strategy) => (
                      <option key={strategy} value={strategy}>
                        {strategy === 'random'
                          ? (isRu ? 'Случайный' : 'Random')
                          : translateBotStrategy(strategy, locale)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <span className="action-panel__setup-hint">
              {isRu ? 'По умолчанию стили назначаются случайно.' : 'By default styles are assigned randomly.'}
            </span>
          </div>
        </div>
      )}

      {canStartHand && !isHumanTurn && (
        <button type="button" className="action-panel__btn action-panel__btn--primary" onClick={onNewHand}>
          {state.phase === 'waiting'
            ? isRu ? 'Начать игру' : 'Start game'
            : isRu ? 'Новая раздача' : 'New hand'}
        </button>
      )}

      {isHumanTurn && (
        <div className="action-panel__controls">
          {actions.map((action) => {
            if (action === 'raise') return null;

            let label = translateAction(action, locale);
            if (action === 'call' && callAmount > 0) {
              label = isRu ? `Колл ${callAmount}` : `Call ${callAmount}`;
            }

            return (
              <button
                key={action}
                type="button"
                className={`action-panel__btn action-panel__btn--${action}`}
                onClick={() => onAction(action)}
              >
                {label}
              </button>
            );
          })}

          {actions.includes('raise') && (
            <div className="action-panel__raise">
              {showRaiseSlider && (
                <div className="action-panel__slider-wrap">
                  <input
                    type="range"
                    min={0}
                    max={checkpoints.length - 1}
                    step={1}
                    value={sliderIndex}
                    onChange={(e) => applyRaiseAmount(checkpoints[Number(e.target.value)] ?? minRaise)}
                    className="action-panel__slider"
                  />
                  <div className="action-panel__slider-ticks">
                    {checkpoints.map((amount, i) => (
                      <button
                        key={amount}
                        type="button"
                        className={`action-panel__slider-tick ${i === highlightedIndex ? 'action-panel__slider-tick--active' : ''}`}
                        style={{ left: `${(i / (checkpoints.length - 1)) * 100}%` }}
                        onClick={() => applyRaiseAmount(amount)}
                        title={isRu ? `Рейз до ${amount}` : `Raise to ${amount}`}
                      >
                        <span className="action-panel__slider-tick-mark" />
                        <span className="action-panel__slider-tick-label">{amount}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="action-panel__raise-row">
                <label className="action-panel__raise-input-wrap">
                  <span className="action-panel__raise-input-label">
                    {isRu ? 'До' : 'To'}
                  </span>
                  <input
                    type="number"
                    className="action-panel__raise-input"
                    min={minRaise}
                    max={maxRaise}
                    value={raiseInput}
                    onChange={(e) => handleRaiseInputChange(e.target.value)}
                    onBlur={handleRaiseInputBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRaiseInputBlur();
                        e.currentTarget.blur();
                      }
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="action-panel__btn action-panel__btn--raise"
                  onClick={() => onAction('raise', raiseAmount)}
                >
                  {isRu ? 'Рейз' : 'Raise'} {raiseAmount}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

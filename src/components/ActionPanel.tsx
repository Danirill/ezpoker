import { useEffect, useMemo, useState } from 'react';
import type { GameState } from '../game/types';
import { MAX_PLAYER_COUNT, MIN_PLAYER_COUNT } from '../game/constants';
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
  playerCount: number;
  onPlayerCountChange: (count: number) => void;
  isHumanTurn: boolean;
  onAction: (action: 'fold' | 'check' | 'call' | 'raise' | 'all-in', amount?: number) => void;
  onNewHand: () => void;
  canStartHand: boolean;
}

const ACTION_TEXT: Record<string, string> = {
  fold: 'Фолд',
  check: 'Чек',
  call: 'Колл',
  raise: 'Рейз',
  'all-in': 'Олл-ин',
};

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
  playerCount,
  onPlayerCountChange,
  isHumanTurn,
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
    <div className="action-panel">
      <div className="action-panel__status">
        <span className="action-panel__message">{state.message}</span>
        {state.phase !== 'waiting' && (
          <span className="action-panel__phase">
            {state.handNumber > 0 && `#${state.handNumber} · `}
            {state.phase === 'preflop' && 'Префлоп'}
            {state.phase === 'flop' && 'Флоп'}
            {state.phase === 'turn' && 'Тёрн'}
            {state.phase === 'river' && 'Ривер'}
            {state.phase === 'showdown' && 'Вскрытие'}
            {state.phase === 'hand-over' && 'Конец раздачи'}
          </span>
        )}
      </div>

      {state.phase === 'waiting' && (
        <div className="action-panel__setup">
          <label className="action-panel__setup-field">
            <span className="action-panel__setup-label">Игроков за столом</span>
            <div className="action-panel__setup-controls">
              <button
                type="button"
                className="action-panel__setup-step"
                onClick={() => onPlayerCountChange(Math.max(MIN_PLAYER_COUNT, playerCount - 1))}
                disabled={playerCount <= MIN_PLAYER_COUNT}
                aria-label="Меньше игроков"
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
                aria-label="Больше игроков"
              >
                +
              </button>
            </div>
          </label>
          <span className="action-panel__setup-hint">Вы + {playerCount - 1} соперник(ов)</span>
        </div>
      )}

      {canStartHand && !isHumanTurn && (
        <button type="button" className="action-panel__btn action-panel__btn--primary" onClick={onNewHand}>
          {state.phase === 'waiting' ? 'Начать игру' : 'Новая раздача'}
        </button>
      )}

      {isHumanTurn && (
        <div className="action-panel__controls">
          {actions.map((action) => {
            if (action === 'raise') return null;

            let label = ACTION_TEXT[action];
            if (action === 'call' && callAmount > 0) {
              label = `Колл ${callAmount}`;
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
                        title={`Рейз до ${amount}`}
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
                  <span className="action-panel__raise-input-label">До</span>
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
                  Рейз {raiseAmount}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

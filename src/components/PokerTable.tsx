import { useEffect, useMemo, useState } from 'react';
import type { GameConfig, GameState } from '../game/types';
import { estimateEquityOdds, estimateHandOdds } from '../game/odds';
import { getSeatPositions } from '../game/seatPositions';
import {
  getDisplayName,
  localizeMessage,
  translateHandRank,
  translatePhase,
  type Locale,
} from '../i18n';
import { ActionPanel } from './ActionPanel';
import { CommunityCards } from './CommunityCards';
import { Chips } from './Chips';
import { PlayerSeat } from './PlayerSeat';
import './PokerTable.css';

interface PokerTableProps {
  state: GameState;
  locale: Locale;
  onLocaleToggle: () => void;
  gameConfig: GameConfig;
  playerCount: number;
  onPlayerCountChange: (count: number) => void;
  onGameConfigChange: (config: Partial<GameConfig>) => void;
  isHumanTurn: boolean;
  animatingPot: boolean;
  canStartHand: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onAction: (action: 'fold' | 'check' | 'call' | 'raise' | 'all-in', amount?: number) => void;
  onNewHand: () => void;
}

export function PokerTable({
  state,
  locale,
  onLocaleToggle,
  gameConfig,
  playerCount,
  onPlayerCountChange,
  onGameConfigChange,
  isHumanTurn,
  animatingPot,
  canStartHand,
  soundEnabled,
  onToggleSound,
  onAction,
  onNewHand,
}: PokerTableProps) {
  const [showHandHelp, setShowHandHelp] = useState(false);
  const [showOdds, setShowOdds] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'combo' | 'equity'>('combo');
  const [equityOpponents, setEquityOpponents] = useState(3);
  const [isOddsLoading, setIsOddsLoading] = useState(false);
  const [oddsResult, setOddsResult] = useState<ReturnType<typeof estimateHandOdds>>(null);
  const [equityResult, setEquityResult] = useState<ReturnType<typeof estimateEquityOdds>>(null);
  const winnerIds = new Set(state.winners.map((w) => w.playerId));
  const seatPositions = getSeatPositions(state.players.length);
  const crowdedTable = state.players.length >= 6;
  const isRu = locale === 'ru';
  const human = state.players.find((p) => p.isHuman);
  const canAnalyze = Boolean(
    human && human.holeCards.length >= 2 && state.phase !== 'waiting' && state.phase !== 'hand-over',
  );

  useEffect(() => {
    if (!showOdds || !canAnalyze || !human) {
      setOddsResult(null);
      setEquityResult(null);
      return;
    }

    let cancelled = false;
    setIsOddsLoading(true);

    const timer = setTimeout(() => {
      const hand = estimateHandOdds(human.holeCards, state.communityCards, 3000);
      const equity = estimateEquityOdds(human.holeCards, state.communityCards, equityOpponents, 2500);
      if (!cancelled) {
        setOddsResult(hand);
        setEquityResult(equity);
        setIsOddsLoading(false);
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canAnalyze, equityOpponents, human, showOdds, state.communityCards]);

  const oddsRows = useMemo(() => {
    if (!oddsResult) return [];
    const list: { rank: number; probability: number }[] = [];
    for (let rank = 9; rank >= 0; rank--) {
      const count = oddsResult.byRank[rank] ?? 0;
      const probability = (count / oddsResult.simulations) * 100;
      list.push({ rank, probability });
    }
    return list;
  }, [oddsResult]);

  return (
    <div
      className={`poker-app ${state.phase === 'waiting' ? 'poker-app--waiting' : ''} ${crowdedTable ? 'poker-app--crowded' : ''}`}
    >
      <header className="poker-header">
        <span className="poker-header__signature">made by Danirill</span>
        <h1 className="poker-header__title">EZ Poker</h1>
        <span className="poker-header__subtitle">
          {isRu ? 'Texas Hold\'em · игроков: ' : 'Texas Hold\'em · players: '}
          {state.players.length}
        </span>
        <div className="poker-header__actions">
          <button
            type="button"
            className="poker-header__lang"
            onClick={onLocaleToggle}
            aria-label={isRu ? 'Switch to English' : 'Переключить на русский'}
            title={isRu ? 'English' : 'Русский'}
          >
            {isRu ? 'RU' : 'EN'}
          </button>
          <button
            type="button"
            className="poker-header__help"
            onClick={() => setShowHandHelp(true)}
            aria-label={isRu ? 'Подсказка по комбинациям' : 'Hand ranking help'}
            title={isRu ? 'Комбинации' : 'Hand ranks'}
          >
            ?
          </button>
          <button
            type="button"
            className={`poker-header__sound ${soundEnabled ? 'poker-header__sound--on' : ''}`}
            onClick={onToggleSound}
            aria-label={
              soundEnabled
                ? isRu ? 'Выключить звук' : 'Mute sound'
                : isRu ? 'Включить звук' : 'Unmute sound'
            }
            title={
              soundEnabled
                ? isRu ? 'Выключить звук' : 'Mute'
                : isRu ? 'Включить звук' : 'Unmute'
            }
          >
            <svg className="poker-header__sound-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.74 2.5-2.26 2.5-4.02z" />
              {!soundEnabled && (
                <path d="M4 4l16 16" className="poker-header__sound-off" fill="none" />
              )}
            </svg>
          </button>
        </div>
      </header>

      <div className="poker-table-wrapper">
        <div className="poker-table">
          <div className="poker-table__felt">
            <div className="poker-table__center">
              <div className="poker-table__pot">
                <Chips
                  amount={state.pot}
                  label={isRu ? 'Банк' : 'Pot'}
                  size="lg"
                  animate={animatingPot}
                />
              </div>
              <CommunityCards cards={state.communityCards} />
              <div className="poker-table__phase">{translatePhase(state.phase, locale)}</div>
            </div>
          </div>

          <div className="poker-table__rail" />

          {state.players.map((player, i) => (
            <PlayerSeat
              key={player.id}
              player={{ ...player, name: getDisplayName(player, locale) }}
              isActive={state.players[state.activePlayerIndex]?.id === player.id}
              isWinner={winnerIds.has(player.id)}
              showCards={player.isHuman}
              phase={state.phase}
              position={seatPositions[i] ?? seatPositions[0]}
              locale={locale}
            />
          ))}
        </div>
      </div>

      <ActionPanel
        state={state}
        locale={locale}
        localizedMessage={localizeMessage(state.message, locale, state.players)}
        gameConfig={gameConfig}
        playerCount={playerCount}
        onPlayerCountChange={onPlayerCountChange}
        onGameConfigChange={onGameConfigChange}
        isHumanTurn={isHumanTurn}
        onAction={onAction}
        onNewHand={onNewHand}
        canStartHand={canStartHand}
      />

      {showHandHelp && (
        <div
          className="hand-help"
          role="dialog"
          aria-modal="true"
          aria-label={isRu ? 'Подсказка по комбинациям' : 'Hand ranking help'}
          onClick={() => setShowHandHelp(false)}
        >
          <div className="hand-help__card" onClick={(e) => e.stopPropagation()}>
            <div className="hand-help__head">
              <h3 className="hand-help__title">
                {isRu ? 'Комбинации (сильнее сверху)' : 'Hand ranks (strongest on top)'}
              </h3>
              <button
                type="button"
                className="hand-help__close"
                onClick={() => setShowHandHelp(false)}
                aria-label={isRu ? 'Закрыть подсказку' : 'Close help'}
              >
                ×
              </button>
            </div>
            <ol className="hand-help__list">
              {isRu ? (
                <>
                  <li><strong>Роял-флеш</strong> — A K Q J 10 одной масти</li>
                  <li><strong>Стрит-флеш</strong> — пять подряд одной масти</li>
                  <li><strong>Каре</strong> — четыре карты одного ранга</li>
                  <li><strong>Фул-хаус</strong> — тройка + пара</li>
                  <li><strong>Флеш</strong> — пять карт одной масти</li>
                  <li><strong>Стрит</strong> — пять карт подряд</li>
                  <li><strong>Тройка</strong> — три карты одного ранга</li>
                  <li><strong>Две пары</strong> — две разные пары</li>
                  <li><strong>Пара</strong> — две карты одного ранга</li>
                  <li><strong>Старшая карта</strong> — если ничего не собрано</li>
                </>
              ) : (
                <>
                  <li><strong>Royal flush</strong> — A K Q J 10 of one suit</li>
                  <li><strong>Straight flush</strong> — five cards in a row of one suit</li>
                  <li><strong>Four of a kind</strong> — four cards of same rank</li>
                  <li><strong>Full house</strong> — three of a kind + a pair</li>
                  <li><strong>Flush</strong> — five cards of the same suit</li>
                  <li><strong>Straight</strong> — five cards in sequence</li>
                  <li><strong>Three of a kind</strong> — three cards of same rank</li>
                  <li><strong>Two pair</strong> — two different pairs</li>
                  <li><strong>One pair</strong> — two cards of same rank</li>
                  <li><strong>High card</strong> — when nothing else hits</li>
                </>
              )}
            </ol>
          </div>
        </div>
      )}

      <button
        type="button"
        className="odds-toggle"
        onClick={() => setShowOdds((prev) => !prev)}
        aria-label={isRu ? 'Показать анализ комбинаций' : 'Show hand odds analysis'}
      >
        {isRu ? 'Шансы' : 'Odds'}
      </button>

      {showOdds && (
        <div className="odds-panel" role="dialog" aria-label={isRu ? 'Анализ комбинаций' : 'Hand odds analysis'}>
          <div className="odds-panel__head">
            <strong>{isRu ? 'Анализ комбинаций' : 'Hand analysis'}</strong>
            <button
              type="button"
              className="odds-panel__close"
              onClick={() => setShowOdds(false)}
              aria-label={isRu ? 'Закрыть анализ' : 'Close analysis'}
            >
              ×
            </button>
          </div>

          <div className="odds-panel__tabs">
            <button
              type="button"
              className={`odds-panel__tab ${analysisMode === 'combo' ? 'odds-panel__tab--active' : ''}`}
              onClick={() => setAnalysisMode('combo')}
            >
              {isRu ? 'Комбинации' : 'Combinations'}
            </button>
            <button
              type="button"
              className={`odds-panel__tab ${analysisMode === 'equity' ? 'odds-panel__tab--active' : ''}`}
              onClick={() => setAnalysisMode('equity')}
            >
              {isRu ? 'Победа vs N' : 'Win vs N'}
            </button>
          </div>

          {!canAnalyze && (
            <p className="odds-panel__note">
              {isRu
                ? 'Начните раздачу: нужны ваши 2 карты и открытые карты стола.'
                : 'Start a hand first: you need your 2 cards and the board cards.'}
            </p>
          )}

          {canAnalyze && isOddsLoading && (
            <p className="odds-panel__note">{isRu ? 'Считаем вероятности...' : 'Calculating odds...'}</p>
          )}

          {canAnalyze && !isOddsLoading && analysisMode === 'combo' && oddsResult && (
            <>
              <p className="odds-panel__subnote">
                {isRu
                  ? `Monte Carlo: ${oddsResult.simulations} симуляций до ривера`
                  : `Monte Carlo: ${oddsResult.simulations} river simulations`}
              </p>
              <div className="odds-panel__list">
                {oddsRows.map((row) => (
                  <div key={row.rank} className="odds-panel__row">
                    <span>{translateHandRank(row.rank, locale)}</span>
                    <span>{row.probability.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {canAnalyze && !isOddsLoading && analysisMode === 'equity' && (
            <>
              <div className="odds-panel__opp">
                <span>{isRu ? 'Соперников' : 'Opponents'}</span>
                <div className="odds-panel__opp-controls">
                  <button
                    type="button"
                    onClick={() => setEquityOpponents((v) => Math.max(1, v - 1))}
                    aria-label={isRu ? 'Меньше соперников' : 'Less opponents'}
                  >
                    −
                  </button>
                  <span>{equityOpponents}</span>
                  <button
                    type="button"
                    onClick={() => setEquityOpponents((v) => Math.min(8, v + 1))}
                    aria-label={isRu ? 'Больше соперников' : 'More opponents'}
                  >
                    +
                  </button>
                </div>
              </div>
              {equityResult && (
                <div className="odds-panel__list">
                  <div className="odds-panel__row">
                    <span>{isRu ? 'Победа' : 'Win'}</span>
                    <span>{((equityResult.win / equityResult.simulations) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="odds-panel__row">
                    <span>{isRu ? 'Делёжка банка' : 'Tie'}</span>
                    <span>{((equityResult.tie / equityResult.simulations) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="odds-panel__row">
                    <span>{isRu ? 'Поражение' : 'Lose'}</span>
                    <span>{((equityResult.lose / equityResult.simulations) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

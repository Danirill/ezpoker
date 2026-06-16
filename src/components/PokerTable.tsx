import type { GameConfig, GameState } from '../game/types';
import { getPhaseLabel } from '../game/pokerEngine';
import { getSeatPositions } from '../game/seatPositions';
import { ActionPanel } from './ActionPanel';
import { CommunityCards } from './CommunityCards';
import { Chips } from './Chips';
import { PlayerSeat } from './PlayerSeat';
import './PokerTable.css';

interface PokerTableProps {
  state: GameState;
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
  const winnerIds = new Set(state.winners.map((w) => w.playerId));
  const seatPositions = getSeatPositions(state.players.length);
  const crowdedTable = state.players.length >= 6;

  return (
    <div
      className={`poker-app ${state.phase === 'waiting' ? 'poker-app--waiting' : ''} ${crowdedTable ? 'poker-app--crowded' : ''}`}
    >
      <header className="poker-header">
        <h1 className="poker-header__title">EZ Poker</h1>
        <span className="poker-header__subtitle">Texas Hold&apos;em · {state.players.length} игроков</span>
        <button
          type="button"
          className={`poker-header__sound ${soundEnabled ? 'poker-header__sound--on' : ''}`}
          onClick={onToggleSound}
          aria-label={soundEnabled ? 'Выключить звук' : 'Включить звук'}
          title={soundEnabled ? 'Выключить звук' : 'Включить звук'}
        >
          <svg className="poker-header__sound-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.74 2.5-2.26 2.5-4.02z" />
            {!soundEnabled && (
              <path d="M4 4l16 16" className="poker-header__sound-off" fill="none" />
            )}
          </svg>
        </button>
      </header>

      <div className="poker-table-wrapper">
        <div className="poker-table">
          <div className="poker-table__felt">
            <div className="poker-table__center">
              <div className="poker-table__pot">
                <Chips amount={state.pot} label="Банк" size="lg" animate={animatingPot} />
              </div>
              <CommunityCards cards={state.communityCards} />
              <div className="poker-table__phase">{getPhaseLabel(state.phase)}</div>
            </div>
          </div>

          <div className="poker-table__rail" />

          {state.players.map((player, i) => (
            <PlayerSeat
              key={player.id}
              player={player}
              isActive={state.players[state.activePlayerIndex]?.id === player.id}
              isWinner={winnerIds.has(player.id)}
              showCards={player.isHuman}
              phase={state.phase}
              position={seatPositions[i] ?? seatPositions[0]}
            />
          ))}
        </div>
      </div>

      <ActionPanel
        state={state}
        gameConfig={gameConfig}
        playerCount={playerCount}
        onPlayerCountChange={onPlayerCountChange}
        onGameConfigChange={onGameConfigChange}
        isHumanTurn={isHumanTurn}
        onAction={onAction}
        onNewHand={onNewHand}
        canStartHand={canStartHand}
      />
    </div>
  );
}

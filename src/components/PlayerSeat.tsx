import type { GamePhase, Player } from '../game/types';
import { translateAction, type Locale } from '../i18n';
import { Card } from './Card';
import { Chips } from './Chips';
import './PlayerSeat.css';

interface PlayerSeatProps {
  player: Player;
  isActive: boolean;
  isWinner: boolean;
  showCards: boolean;
  phase: GamePhase;
  position: { top: string; left: string };
  locale: Locale;
}

export function PlayerSeat({ player, isActive, isWinner, showCards, phase, position, locale }: PlayerSeatProps) {
  const inHand = phase !== 'waiting';
  const reveal = showCards || phase === 'showdown' || phase === 'hand-over';
  const folded = player.status === 'folded';
  const dimFolded = folded && !reveal;

  return (
    <div
      className={`player-seat ${isActive ? 'player-seat--active' : ''} ${isWinner ? 'player-seat--winner' : ''} ${dimFolded ? 'player-seat--folded' : ''} ${player.isHuman ? 'player-seat--human' : ''}`}
      style={{ top: position.top, left: position.left }}
    >
      <div className="player-seat__info">
        <span className="player-seat__name">{player.name}</span>
        <span className="player-seat__chips">{player.chips}</span>
        {player.isDealer && <span className="player-seat__badge player-seat__badge--dealer">D</span>}
        {player.isSmallBlind && <span className="player-seat__badge">SB</span>}
        {player.isBigBlind && <span className="player-seat__badge">BB</span>}
      </div>

      {player.lastAction && (
        <div className="player-seat__action">{translateAction(player.lastAction, locale)}</div>
      )}

      <div className="player-seat__cards">
        {inHand && player.holeCards.length > 0 ? (
          player.holeCards.map((card, i) => (
            <Card
              key={card.id}
              card={card}
              faceDown={!reveal && !player.isHuman}
              delay={i * 120}
              small={!player.isHuman}
              highlight={isWinner}
            />
          ))
        ) : (
          <>
            <div className="player-seat__card-placeholder" />
            <div className="player-seat__card-placeholder" />
          </>
        )}
      </div>

      {player.currentBet > 0 && (
        <div className="player-seat__bet">
          <Chips amount={player.currentBet} size="sm" />
        </div>
      )}
    </div>
  );
}

import type { Card as CardType } from '../game/types';
import { RANK_LABELS, SUIT_SYMBOLS } from '../game/types';
import './Card.css';

interface CardProps {
  card?: CardType;
  faceDown?: boolean;
  delay?: number;
  small?: boolean;
  highlight?: boolean;
}

export function Card({ card, faceDown = false, delay = 0, small = false, highlight = false }: CardProps) {
  const isRed = card && (card.suit === 'hearts' || card.suit === 'diamonds');

  return (
    <div
      className={`playing-card ${small ? 'playing-card--small' : ''} ${highlight ? 'playing-card--highlight' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`playing-card__inner ${!faceDown ? 'playing-card__inner--flipped' : ''}`}>
        <div className="playing-card__face playing-card__back">
          <div className="playing-card__back-pattern" />
        </div>
        <div className={`playing-card__face playing-card__front ${isRed ? 'playing-card__front--red' : ''}`}>
          {card && (
            <>
              <span className="playing-card__corner playing-card__corner--tl">
                <span className="playing-card__rank">{RANK_LABELS[card.rank]}</span>
                <span className="playing-card__suit">{SUIT_SYMBOLS[card.suit]}</span>
              </span>
              <span className="playing-card__center-suit">{SUIT_SYMBOLS[card.suit]}</span>
              <span className="playing-card__corner playing-card__corner--br">
                <span className="playing-card__rank">{RANK_LABELS[card.rank]}</span>
                <span className="playing-card__suit">{SUIT_SYMBOLS[card.suit]}</span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

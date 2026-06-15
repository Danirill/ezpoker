import type { Card as CardType } from '../game/types';
import { Card } from './Card';
import './CommunityCards.css';

interface CommunityCardsProps {
  cards: CardType[];
}

export function CommunityCards({ cards }: CommunityCardsProps) {
  const slots = 5;

  return (
    <div className="community-cards">
      {Array.from({ length: slots }).map((_, i) => {
        const card = cards[i];
        return (
          <div key={i} className="community-cards__slot">
            {card ? (
              <Card card={card} delay={i * 150} />
            ) : (
              <div className="community-cards__empty" />
            )}
          </div>
        );
      })}
    </div>
  );
}

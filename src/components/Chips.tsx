import type { CSSProperties } from 'react';
import './Chips.css';

interface ChipsProps {
  amount: number;
  label?: string;
  animate?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Chips({ amount, label, animate = false, size = 'md' }: ChipsProps) {
  if (amount <= 0 && !label) return null;

  const stackHeight = Math.min(5, Math.max(1, Math.ceil(amount / 500)));

  return (
    <div className={`chips-stack chips-stack--${size} ${animate ? 'chips-stack--animate' : ''}`}>
      {label && <span className="chips-stack__label">{label}</span>}
      <div className="chips-stack__pile">
        {Array.from({ length: stackHeight }).map((_, i) => (
          <div
            key={i}
            className="chip"
            style={{ '--chip-offset': `${i * 3}px` } as CSSProperties}
          />
        ))}
      </div>
      {amount > 0 && <span className="chips-stack__amount">{amount}</span>}
    </div>
  );
}

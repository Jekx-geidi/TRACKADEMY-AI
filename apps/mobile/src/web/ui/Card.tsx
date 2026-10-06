import type { CSSProperties, ReactNode } from 'react';

/** White rounded card with a soft shadow. */
export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  );
}

/** Dark gradient card used for the one most important thing on a screen. */
export function HeroCard({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`hero ${className}`} style={style}>
      {children}
    </div>
  );
}

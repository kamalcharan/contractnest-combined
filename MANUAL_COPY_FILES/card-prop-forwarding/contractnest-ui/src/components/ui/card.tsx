// src/components/ui/card.tsx
// Cards forward ALL standard element props (style, onClick, id, hover
// handlers, aria-*, …) to the underlying element. Historically they accepted
// only className/children and silently dropped everything else — 60+ call
// sites across the app passed style objects that never applied
// (card-prop-forwarding batch, 2026-07-22, makes them live).
import React from 'react';

type DivCardProps = React.HTMLAttributes<HTMLDivElement>;
type HeadingCardProps = React.HTMLAttributes<HTMLHeadingElement>;

export function Card({ className = '', children, ...props }: DivCardProps) {
  return (
    <div className={`rounded-lg border bg-card shadow-sm ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }: DivCardProps) {
  return (
    <div className={`p-6 pb-3 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }: HeadingCardProps) {
  return (
    <h3 className={`text-lg font-semibold ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className = '', children, ...props }: DivCardProps) {
  return (
    <div className={`p-6 pt-2 ${className}`} {...props}>
      {children}
    </div>
  );
}

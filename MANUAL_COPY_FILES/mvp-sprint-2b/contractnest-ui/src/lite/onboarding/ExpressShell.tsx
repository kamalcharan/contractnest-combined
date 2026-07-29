// src/lite/onboarding/ExpressShell.tsx
//
// Frame shared by the express onboarding screens: brand, progress rail and a
// consistent card. Deliberately plain — the point of this path is that there is
// almost nothing on it.

import React from 'react';
import { EXPRESS_STEPS, type ExpressStepId } from './expressFlow';
import './express.css';

interface ExpressShellProps {
  current: ExpressStepId;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const ExpressShell: React.FC<ExpressShellProps> = ({
  current,
  title,
  subtitle,
  children,
  footer,
}) => {
  const currentIndex = EXPRESS_STEPS.findIndex((s) => s.id === current);

  return (
    <div className="cnx-root">
      <div className="cnx-wrap">
        <div className="cnx-brand">
          Contract<span>Nest</span>
        </div>

        <ol className="cnx-rail" aria-label="Setup progress">
          {EXPRESS_STEPS.map((step, i) => {
            const state = i < currentIndex ? 'done' : i === currentIndex ? 'now' : 'next';
            return (
              <li key={step.id} className={`cnx-railitem cnx-${state}`}>
                <span className="cnx-dot" aria-hidden="true">
                  {i < currentIndex ? '✓' : i + 1}
                </span>
                <span className="cnx-raillabel">{step.label}</span>
              </li>
            );
          })}
        </ol>

        <div className="cnx-card">
          <h1 className="cnx-title">{title}</h1>
          {subtitle && <p className="cnx-sub">{subtitle}</p>}
          {children}
        </div>

        {footer && <div className="cnx-foot">{footer}</div>}
      </div>
    </div>
  );
};

export default ExpressShell;

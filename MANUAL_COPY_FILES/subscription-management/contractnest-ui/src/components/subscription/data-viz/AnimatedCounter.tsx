// src/components/subscription/data-viz/AnimatedCounter.tsx
// Animated number counter with easing

import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  highlightColor?: string;
}

// Easing function for smooth animation
const easeOutExpo = (t: number): number => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1500,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
  highlightColor
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const animationFrame = useRef<number | null>(null);
  const previousValue = useRef(0);

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const diff = endValue - startValue;

    const animate = (timestamp: number) => {
      if (!startTime.current) {
        startTime.current = timestamp;
      }

      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);

      const currentValue = startValue + diff * easedProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate);
      } else {
        previousValue.current = value;
      }
    };

    startTime.current = null;
    animationFrame.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [value, duration]);

  const formattedValue = decimals > 0
    ? displayValue.toFixed(decimals)
    : Math.round(displayValue).toLocaleString();

  return (
    <span
      className={`tabular-nums font-bold ${className}`}
      style={{ color: highlightColor || colors.utility.primaryText }}
    >
      {prefix}{formattedValue}{suffix}
    </span>
  );
};

export default AnimatedCounter;

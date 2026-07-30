// src/lite/landing/TradePicker.tsx

import React from 'react';
import { TRADES, TRADE_ORDER, type TradeKey } from './previewData';

interface TradePickerProps {
  value: TradeKey;
  onChange: (key: TradeKey) => void;
}

export const TradePicker: React.FC<TradePickerProps> = ({ value, onChange }) => (
  <div className="cn-picker" id="cn-picker">
    <div className="cn-picklabel">Choose your line of work</div>
    <div className="cn-chips" role="group" aria-label="Line of work">
      {TRADE_ORDER.map((key) => (
        <button
          key={key}
          type="button"
          className="cn-chip"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
        >
          {TRADES[key].label}
        </button>
      ))}
    </div>
  </div>
);

export default TradePicker;

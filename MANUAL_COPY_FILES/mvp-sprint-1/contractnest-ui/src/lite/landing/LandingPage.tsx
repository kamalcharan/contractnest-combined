// src/lite/landing/LandingPage.tsx
//
// The public landing page. Replaces src/pages/public/LandingPage.tsx as the
// unauthenticated root, mounted from App.tsx's SmartHomePage.
//
// Single conversion goal throughout: every CTA leads to "see my workspace".
// The trade the visitor picks is carried into signup so onboarding never asks
// for it again — that is one whole step off the 15 minutes.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import HeroDemo from './HeroDemo';
import TradePicker from './TradePicker';
import WorkspaceSlab from './WorkspaceSlab';
import {
  ClockSection,
  FaqSection,
  FinalSection,
  LandingNav,
  PortalSection,
  ProofSection,
  ValueSection,
} from './sections';
import { TRADES, TRADE_HANDOFF_KEY, type TradeKey } from './previewData';
import './landing.css';

export const LiteLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [trade, setTrade] = useState<TradeKey>('amc');
  const [buildLabel, setBuildLabel] = useState('Built in 0.4s');
  const [dimmed, setDimmed] = useState(false);
  const dimTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (dimTimer.current) window.clearTimeout(dimTimer.current);
    },
    []
  );

  const handleTrade = useCallback(
    (key: TradeKey) => {
      if (key === trade) return;
      setDimmed(true);
      if (dimTimer.current) window.clearTimeout(dimTimer.current);
      dimTimer.current = window.setTimeout(() => {
        setTrade(key);
        setBuildLabel(`Built in ${(0.3 + (TRADES[key].blocks % 7) / 10).toFixed(1)}s`);
        setDimmed(false);
      }, 160);
    },
    [trade]
  );

  // Carry the trade into signup. Persisted rather than passed in state so it
  // survives the visitor bouncing to another page before they commit.
  const startSignup = useCallback(() => {
    try {
      window.localStorage.setItem(TRADE_HANDOFF_KEY, TRADES[trade].seedIntent);
    } catch {
      // Private mode / storage disabled — onboarding just asks for the trade.
    }
    navigate('/signup');
  }, [navigate, trade]);

  const scrollToPicker = useCallback(() => {
    document.getElementById('cn-picker')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, []);

  return (
    <div className="cn-landing">
      <Helmet>
        <title>ContractNest — service contracts that run themselves</title>
        <meta
          name="description"
          content="Every visit scheduled, every invoice raised, every renewal chased — generated the moment you write the contract. Pick your trade and see your workspace before you sign up."
        />
      </Helmet>

      <LandingNav onStart={scrollToPicker} onSignIn={() => navigate('/login')} />

      <header className="cn-hero">
        <div className="cn-wrap">
          <div className="cn-herogrid">
            <div className="cn-hl">
              <div className="cn-kicker">
                <i aria-hidden="true" />
                Live with a 39-chapter member organisation
              </div>
              <h1 className="cn-head">
                Your service contracts, <em>running themselves</em>.
              </h1>
              <p className="cn-dek">
                Every visit scheduled, every invoice raised, every renewal chased — generated the
                moment you write the contract.{' '}
                <b>Pick your trade below and watch your workspace build itself.</b> No signup, no
                card, no call.
              </p>
              <div className="cn-heroacts">
                <button type="button" className="cn-btn cn-btn-cta cn-lg" onClick={scrollToPicker}>
                  See my workspace →
                </button>
              </div>
              <div className="cn-microproof">
                <span>
                  <b>15 minutes</b> to your first live contract
                </span>
                <span>
                  <b>Free</b> under 10 contracts
                </span>
                <span>
                  Works on <b>WhatsApp</b>, no app to install
                </span>
              </div>
            </div>

            <HeroDemo />
          </div>

          <TradePicker value={trade} onChange={handleTrade} />

          <div className={`cn-slabwrap${dimmed ? ' dim' : ''}`}>
            <WorkspaceSlab
              trade={TRADES[trade]}
              buildLabel={buildLabel}
              onStart={startSignup}
            />
          </div>
        </div>
      </header>

      <ClockSection />
      <ValueSection />
      <PortalSection />
      <ProofSection />
      <FaqSection />
      <FinalSection onStart={startSignup} />
    </div>
  );
};

export default LiteLandingPage;

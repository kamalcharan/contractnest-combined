// src/lite/landing/HeroDemo.tsx
//
// The hero's right column: a three-scene loop showing what the product does in
// three minutes — write the contract, share the CNAK, client accepts.
//
// SWAP SLOT: when a real screen recording exists, replace the contents of
// <div className="cn-demostage"> with a muted autoplay <video> and keep the
// frame, clock chip, dots and caption. Nothing else needs to change.

import React, { useEffect, useRef, useState } from 'react';

type Scene = 1 | 2 | 3;

const CAPTIONS: Record<Scene, string> = {
  1: 'Writing the contract…',
  2: 'Sharing the key on WhatsApp…',
  3: 'Signed — the year is scheduled',
};

// Scene boundaries in ms from the start of a cycle.
const T = {
  blocksIn: 500,
  blockStagger: 420,
  totalCount: 1750,
  scene2: 4200,
  key: 4600,
  bubble: 5300,
  sent: 6300,
  scene3: 8400,
  tap: 9100,
  accepted: 9500,
  generated: 9900,
  loop: 14200,
} as const;

const fmtClock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

export const HeroDemo: React.FC = () => {
  const [scene, setScene] = useState<Scene>(1);
  const [blocksIn, setBlocksIn] = useState(0);
  const [total, setTotal] = useState(0);
  const [keyIn, setKeyIn] = useState(false);
  const [bubbleIn, setBubbleIn] = useState(false);
  const [sentIn, setSentIn] = useState(false);
  const [tapped, setTapped] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [generated, setGenerated] = useState(0);
  const [clock, setClock] = useState(0);

  const timers = useRef<number[]>([]);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [started, setStarted] = useState(false);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const at = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // Ease the clock toward a target so it reads like elapsed time, not a counter.
  const clockTo = (target: number, ms: number) => {
    const startedAt = performance.now();
    const from = clockRef.current;
    const tick = () => {
      const p = Math.min(1, (performance.now() - startedAt) / ms);
      const value = from + (target - from) * p;
      clockRef.current = value;
      setClock(value);
      if (p < 1) timers.current.push(window.setTimeout(tick, 60));
    };
    tick();
  };
  const clockRef = useRef(0);

  const reset = () => {
    clearTimers();
    clockRef.current = 0;
    setScene(1);
    setBlocksIn(0);
    setTotal(0);
    setKeyIn(false);
    setBubbleIn(false);
    setSentIn(false);
    setTapped(false);
    setAccepted(false);
    setGenerated(0);
    setClock(0);
  };

  const showFinalState = () => {
    clearTimers();
    setScene(3);
    setAccepted(true);
    setTapped(true);
    setGenerated(3);
    clockRef.current = 180;
    setClock(180);
  };

  const run = () => {
    reset();
    if (prefersReducedMotion()) {
      showFinalState();
      return;
    }

    // 1 · write
    [0, 1, 2].forEach((i) => at(T.blocksIn + i * T.blockStagger, () => setBlocksIn(i + 1)));
    at(560, () => clockTo(64, 1600));
    at(T.totalCount, () => {
      const target = 148000;
      const steps = 16;
      for (let i = 1; i <= steps; i += 1) {
        at(i * 45, () => setTotal(Math.round((target * i) / steps)));
      }
    });

    // 2 · send
    at(T.scene2, () => {
      setScene(2);
      clockTo(128, 1500);
    });
    at(T.key, () => setKeyIn(true));
    at(T.bubble, () => setBubbleIn(true));
    at(T.sent, () => setSentIn(true));

    // 3 · accepted
    at(T.scene3, () => {
      setScene(3);
      clockTo(180, 1400);
    });
    at(T.tap, () => setTapped(true));
    at(T.accepted, () => setAccepted(true));
    [0, 1, 2].forEach((i) => at(T.generated + i * 260, () => setGenerated(i + 1)));

    at(T.loop, run);
  };

  // Start only once the demo is actually on screen, so a visitor never arrives
  // to find it already half-finished.
  useEffect(() => {
    const node = rootRef.current;
    if (!node || started) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      setStarted(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [started]);

  useEffect(() => {
    if (started) run();
    return clearTimers;
    // run() is stable for our purposes — it only closes over setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  return (
    <div className="cn-demo" ref={rootRef} aria-label="How a contract goes out in three minutes">
      <div className="cn-demohead">
        <span className="cn-dt">Contract → signed</span>
        <span className="cn-clock">{fmtClock(clock)}</span>
      </div>

      <div className="cn-demostage">
        {/* 1 · write */}
        <section className={`cn-scene${scene === 1 ? ' on' : ''}`} aria-hidden={scene !== 1}>
          <div className="cn-scenelab">1 · Write it — five fields</div>
          <div className="cn-fld">
            <div className="cn-fl">Client</div>
            <div className="cn-fv">
              Orion Towers Pvt Ltd<span className="cn-caret" />
            </div>
          </div>
          <div className="cn-blks">
            {[
              ['Preventive maintenance · 12/yr', '₹28,000'],
              ['Breakdown response 24×7', '₹9,000'],
              ['Condenser deep clean · half-yearly', '₹2,800'],
            ].map(([name, price], i) => (
              <div key={name} className={`cn-bk${blocksIn > i ? ' in' : ''}`}>
                <span>{name}</span>
                <b>{price}</b>
              </div>
            ))}
          </div>
          <div className="cn-totrow">
            <span className="cn-tl">1-year term · quarterly billing</span>
            <span className="cn-tv">₹{total.toLocaleString('en-IN')}</span>
          </div>
        </section>

        {/* 2 · send */}
        <section className={`cn-scene${scene === 2 ? ' on' : ''}`} aria-hidden={scene !== 2}>
          <div className="cn-scenelab">2 · Send it — one key, no login for them</div>
          <div className="cn-keybox">
            <div className={`cn-kk${keyIn ? ' in' : ''}`}>CNAK-6QW4RT</div>
            <div className="cn-ks">
              secret code <b>8127</b>
            </div>
          </div>
          <div className={`cn-wabub${bubbleIn ? ' in' : ''}`}>
            <div className="cn-wf">WhatsApp → Ramesh Kumar</div>
            Here&apos;s the Lift AMC contract for Orion Towers — 12 visits a year, ₹37,000
            quarterly.
            <br />
            <span className="cn-walink">contractnest.in/c/6QW4RT</span>
          </div>
          <div className={`cn-sentmark${sentIn ? ' in' : ''}`}>
            <i aria-hidden="true">✓</i>Delivered · seen 2 minutes later
          </div>
        </section>

        {/* 3 · accepted */}
        <section className={`cn-scene${scene === 3 ? ' on' : ''}`} aria-hidden={scene !== 3}>
          <div className="cn-scenelab">3 · They accept — from their phone</div>
          <div className="cn-cliview">
            <div className="cn-ch">
              <b>Annual AMC — Orion Towers</b>
              <span>Apr 2026 – Mar 2027 · ₹1,48,000 / yr</span>
            </div>
            <div className="cn-cb">
              {!accepted && (
                <div className={`cn-acceptbtn${tapped ? ' tapped' : ''}`}>Accept contract</div>
              )}
              {accepted && <div className="cn-accepted">✓ Accepted by Ramesh Kumar</div>}
            </div>
          </div>
          <div className="cn-genrow">
            {[
              ['24', 'visits scheduled'],
              ['4', 'invoices queued'],
              ['1', 'renewal watched'],
            ].map(([v, l], i) => (
              <div key={l} className={`cn-gen${generated > i ? ' in' : ''}`}>
                <div className="cn-gv">{v}</div>
                <div className="cn-gl">{l}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="cn-demofoot">
        <span className="cn-dots" aria-hidden="true">
          {([1, 2, 3] as Scene[]).map((s) => (
            <i key={s} className={scene === s ? 'on' : undefined} />
          ))}
        </span>
        <span className="cn-dl">{CAPTIONS[scene]}</span>
        <button type="button" className="cn-replay" onClick={run}>
          Replay
        </button>
      </div>
    </div>
  );
};

export default HeroDemo;

// src/lite/landing/sections.tsx
//
// The static sections below the hero. Kept in one file because each is small
// and they are only ever composed together by LandingPage.
//
// PROOF POLICY: this page carries no customer names, logos or testimonials.
// The previous landing's testimonial and social-proof content was placeholder
// and has been removed. Only claims we can support appear here. Anything added
// later needs written permission from the customer being named.

import React from 'react';

/* ── nav ── */
export const LandingNav: React.FC<{ onStart: () => void; onSignIn: () => void }> = ({
  onStart,
  onSignIn,
}) => (
  <nav className="cn-nav">
    <div className="cn-wrap cn-navinner">
      <div className="cn-brand">
        Contract<span>Nest</span>
      </div>
      <div className="cn-links">
        <a href="#how">How it works</a>
        <a href="#portal">Your client&apos;s view</a>
        <a href="#proof">Proof</a>
        <a href="#faq">Questions</a>
      </div>
      <div className="cn-sp" />
      <button type="button" className="cn-btn cn-btn-plain" onClick={onSignIn}>
        Sign in
      </button>
      <button type="button" className="cn-btn cn-btn-cta" onClick={onStart}>
        Build my workspace
      </button>
    </div>
  </nav>
);

/* ── 15 minutes ── */
const CLOCK_STEPS = [
  ['00:00 — 04:00', 'Tell us your trade', 'Two taps. We build your catalog with real services and market-reference prices.'],
  ['04:00 — 10:00', 'Paste your client list', 'Straight out of Excel or Tally. Rows are read, checked and confirmed on one screen.'],
  ['10:00 — 13:00', 'Write one contract', 'Five fields. Visits and invoices for the whole year generate themselves.'],
  ['13:00 — 15:00', 'Send it', "Your client opens it on WhatsApp and accepts from their phone. You're live."],
];

export const ClockSection: React.FC = () => (
  <section id="how" className="cn-section">
    <div className="cn-wrap">
      <div className="cn-sechead">
        <div className="cn-eyebrow">Signup to sent</div>
        <h2>Fifteen minutes. Then a real client has a real contract.</h2>
        <p className="cn-lede">
          Most software makes you build the product before it works for you. Yours arrives
          furnished — you spend the time on your customers instead.
        </p>
      </div>
      <div className="cn-clockstrip">
        {CLOCK_STEPS.map(([time, title, detail], i) => (
          <div className={`cn-ct${i === CLOCK_STEPS.length - 1 ? ' fin' : ''}`} key={title}>
            <div className="cn-tm">{time}</div>
            <div className="cn-tt">{title}</div>
            <div className="cn-td">{detail}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ── value ── */
const VALUES = [
  ['0', 'Missed renewals', "Contracts don't lapse quietly any more. Every renewal date is watched and chased before it costs you the account."],
  ['1 tap', 'Proof of service', 'Each visit closes with a photo and a note. When an invoice is questioned, the logbook answers it — not your memory.'],
  ['Auto', 'Collections', 'Invoices raise themselves from billing events. Reminders go out on WhatsApp. Payments land by UPI or Razorpay.'],
];

export const ValueSection: React.FC = () => (
  <section className="cn-section cn-section-tight">
    <div className="cn-wrap">
      <div className="cn-vgrid">
        {VALUES.map(([num, title, body]) => (
          <div className="cn-vcard" key={title}>
            <div className="cn-vnum">{num}</div>
            <h3>{title}</h3>
            <p>{body}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ── client portal ── */
export const PortalSection: React.FC = () => (
  <section id="portal" className="cn-section">
    <div className="cn-wrap cn-split">
      <div>
        <div className="cn-eyebrow">Your client&apos;s view</div>
        <h2>The best thing you&apos;ll ever send a customer.</h2>
        <p className="cn-lede">
          One link, no app, no login. They see every visit you&apos;ve completed, what&apos;s
          next, and what&apos;s due — so they stop calling you for statements.
        </p>
        <ul className="cn-checks">
          <li>
            <span className="cn-tick" aria-hidden="true">✓</span>
            <span>
              <b>Accepts the contract from their phone.</b> Name, one code, done — recorded and
              verifiable by both sides.
            </span>
          </li>
          <li>
            <span className="cn-tick" aria-hidden="true">✓</span>
            <span>
              <b>Watches your SLA being met.</b> Every completed visit with its proof, in date
              order.
            </span>
          </li>
          <li>
            <span className="cn-tick" aria-hidden="true">✓</span>
            <span>
              <b>Pays without being chased.</b> UPI or a payment link, straight from the same
              page.
            </span>
          </li>
        </ul>
      </div>
      <div>
        <div className="cn-phone">
          <div className="cn-ph">
            <div className="cn-pt">Your AMC with CoolAir Services</div>
            <div className="cn-ps">Apr 2026 – Mar 2027 · ₹1,48,000 / yr</div>
          </div>
          <div className="cn-pb">
            {[
              ['JUL 18', 'Visit #3 — Compressor check', '6 of 6 checkpoints passed', 'done', 'good'],
              ['AUG 12', 'Visit #4 — Refrigerant check', 'technician assigned', 'next', 'accent'],
              ['OCT 01', 'Invoice Q3 — ₹43,660', 'one tap to approve', 'due', 'ember'],
            ].map(([date, name, sub, tag, tone]) => (
              <div className="cn-pline" key={name}>
                <span className="cn-pd">{date}</span>
                <span>
                  <span className="cn-pn">{name}</span>
                  <span className="cn-pss">{sub}</span>
                </span>
                <span className={`cn-ptag cn-ptag-${tone}`}>{tag}</span>
              </div>
            ))}
            <div className="cn-pfoot">
              Runs on <b>ContractNest</b> — manage your own vendors free
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* ── proof ──
   Only supportable claims. No customer names, logos or testimonials. */
const PROOF = [
  ['39', 'chapters of one member organisation running live'],
  ['4', 'trades supported from day one — AMC, pest, housekeeping, manufacturing'],
  ['15 min', "from signup to a contract in your client's hands"],
  ['₹0', 'until you pass 10 contracts'],
];

export const ProofSection: React.FC = () => (
  <section id="proof" className="cn-proofband">
    <div className="cn-wrap">
      <div className="cn-proofgrid">
        {PROOF.map(([n, l]) => (
          <div className="cn-pf" key={l}>
            <div className="cn-pfn">{n}</div>
            <div className="cn-pfl">{l}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ── faq ── */
const FAQS: Array<[string, string]> = [
  [
    'Do I have to change how I invoice?',
    'No. Keep billing from Tally or through your CA exactly as you do today. ContractNest tracks the schedule, the proof of service and what has been collected against it — it does not replace your books.',
  ],
  [
    "My equipment list isn't standard. Will the catalog fit?",
    'The seeded catalog is a starting point, never a cage. Every block, price and cadence is editable, and you can type your own from scratch. Nothing blocks you if your trade is not in our list.',
  ],
  [
    'How do my clients pay?',
    'Either way you already work. Show your UPI QR and bank details and confirm the reference when it arrives, or connect your own Razorpay account for a payment link that confirms itself. Money goes directly to you — it never passes through us.',
  ],
  [
    'Do my customers need to install anything?',
    'No. They get a link on WhatsApp that opens in any browser — no app, no login, no password. It works on an entry-level Android over mobile data.',
  ],
  [
    'What happens to my data if I leave?',
    'Export your contracts, clients and payment history at any time. No lock-in, no exit fee, and cancelling takes one click.',
  ],
];

export const FaqSection: React.FC = () => (
  <section id="faq" className="cn-section">
    <div className="cn-wrap">
      <div className="cn-sechead">
        <div className="cn-eyebrow">Before you ask</div>
        <h2>The questions everyone asks first.</h2>
      </div>
      <div className="cn-faq">
        {FAQS.map(([q, a], i) => (
          <details key={q} open={i === 0}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);

/* ── final cta + footer ── */
export const FinalSection: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <section className="cn-section cn-section-tight">
    <div className="cn-wrap">
      <div className="cn-final">
        <h2>Build your workspace before you decide.</h2>
        <p>
          Pick your trade, watch it fill with your services and prices, and only sign up if it
          looks like your business.
        </p>
        <button type="button" className="cn-btn cn-btn-cta cn-lg" onClick={onStart}>
          See my workspace →
        </button>
        <div className="cn-fine">No card. No sales call. Free under 10 contracts.</div>
      </div>
      <footer className="cn-footer">
        <span>© 2026 ContractNest · Vikuna Technologies</span>
        <span className="cn-sp" />
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </footer>
    </div>
  </section>
);

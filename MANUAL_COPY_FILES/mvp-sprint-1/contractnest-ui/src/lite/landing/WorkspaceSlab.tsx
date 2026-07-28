// src/lite/landing/WorkspaceSlab.tsx
//
// The live preview under the trade picker: the visitor's workspace, seeded and
// priced, before they have signed up for anything. This is the page's central
// proof — value before identity.

import React from 'react';
import { FY_MONTHS, type TradePreview } from './previewData';

interface WorkspaceSlabProps {
  trade: TradePreview;
  /** Bumped on each trade change so the slab can flash a "rebuilt" state. */
  buildLabel: string;
  onStart: () => void;
}

export const WorkspaceSlab: React.FC<WorkspaceSlabProps> = ({ trade, buildLabel, onStart }) => {
  // Monthly billers get a marker every month; quarterly every third.
  const billEvery = trade.invoices >= 12 ? 1 : 3;

  return (
    <div className="cn-slab">
      <div className="cn-slabbar">
        <span className="cn-dotsbar" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="cn-url">contractnest.app / your-workspace</span>
        <span className="cn-badge">{buildLabel}</span>
      </div>

      <div className="cn-slabgrid">
        <div className="cn-pane">
          <div className="cn-paneh">
            <span className="cn-live" aria-hidden="true" />
            Your catalog — already priced
          </div>
          <div className="cn-bignum">
            {trade.blocks} <small>blocks</small>
          </div>
          <div className="cn-subnum">{trade.blocksSub}</div>
          {trade.lines.map((line) => (
            <div className="cn-catrow" key={line.name}>
              <span>
                <span className="cn-cn">{line.name}</span>
                <div className="cn-cm">{line.meta}</div>
              </span>
              <span className="cn-cp">{line.price}</span>
            </div>
          ))}
        </div>

        <div className="cn-pane">
          <div className="cn-paneh">
            <span className="cn-live" aria-hidden="true" />
            A contract like yours
          </div>
          <div className="cn-ccard">
            <div className="cn-ct">{trade.contractTitle}</div>
            <div className="cn-cs">{trade.contractSub}</div>
            <div className="cn-yr" aria-hidden="true">
              {FY_MONTHS.map((m, i) => (
                <div className="cn-yrm" key={m}>
                  <div className="cn-yn">{m}</div>
                  <div className="cn-yrd">
                    {Array.from({ length: trade.visitsPerMonth }, (_, v) => (
                      <i className="v" key={`v${v}`} />
                    ))}
                    {i % billEvery === 0 && <i className="b" />}
                  </div>
                </div>
              ))}
            </div>
            <div className="cn-lgd">
              <span>
                <i className="v" />
                service visit
              </span>
              <span>
                <i className="b" />
                invoice raised
              </span>
            </div>
          </div>

          <div className="cn-catrow">
            <span>
              <span className="cn-cn">{trade.visits} visits</span>
              <span className="cn-cm"> scheduled automatically</span>
            </span>
            <span>
              <span className="cn-cn">{trade.invoices} invoices</span>
              <span className="cn-cm"> raise themselves</span>
            </span>
          </div>
          <div className="cn-catrow">
            <span>
              <span className="cn-cn">Renewal watched</span>
              <div className="cn-cm">chased before it lapses, not after</div>
            </span>
            <span className="cn-cp">{trade.renewsOn}</span>
          </div>
          <div className="cn-catrow cn-last">
            <span>
              <span className="cn-cn">Client portal</span>
              <div className="cn-cm">no login — they see visits &amp; dues</div>
            </span>
            <span className="cn-cp cn-included">included</span>
          </div>
        </div>
      </div>

      <div className="cn-slabfoot">
        <div className="cn-sft">
          That&apos;s <b>your</b> workspace — seeded, priced and scheduled. Nothing typed yet.
        </div>
        <button type="button" className="cn-btn cn-btn-cta" onClick={onStart}>
          Start free with this setup →
        </button>
      </div>
    </div>
  );
};

export default WorkspaceSlab;

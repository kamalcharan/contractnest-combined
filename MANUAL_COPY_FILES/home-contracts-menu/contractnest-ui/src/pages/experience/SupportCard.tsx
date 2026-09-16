import React from 'react';
import { ArrowUpRight, Mail, MessageCircle } from 'lucide-react';

// Support destinations (owner, 2026-09-16). One place to change them.
const SUPPORT_WHATSAPP_NUMBER = '919949701175'; // wa.me format: country code, no '+'
const SUPPORT_EMAIL = 'support@vikuna.io';
const WHATSAPP_PRESET_TEXT = 'Hi, I need help with ContractNest.';

/**
 * "Speak to an expert" — a direction widget, not a form. Both actions open
 * the user's own app (WhatsApp / mail client), so there is nothing to load,
 * fail, or double-submit here. External links open in a new tab so an
 * unsaved workspace is never navigated away.
 */
export default function SupportCard() {
  return (
    <section className="xp-panel xp-foundation xp-support" aria-labelledby="support-heading">
      <p className="xp-eyebrow">NEED A HAND?</p>
      <h2 id="support-heading">Speak to an expert</h2>
      <p className="xp-muted">Questions about your plan, contracts, or anything unclear — reach us directly.</p>
      <a
        className="xp-foundation-link"
        href={`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_PRESET_TEXT)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="xp-small-icon xp-chip xp-chip-success"><MessageCircle size={18} /></span>
        <span><strong>WhatsApp us</strong><small>Fastest — usually same day</small></span>
        <ArrowUpRight size={16} />
      </a>
      <a className="xp-foundation-link" href={`mailto:${SUPPORT_EMAIL}`}>
        <span className="xp-small-icon xp-chip xp-chip-info"><Mail size={18} /></span>
        <span><strong>Email support</strong><small>{SUPPORT_EMAIL}</small></span>
        <ArrowUpRight size={16} />
      </a>
    </section>
  );
}

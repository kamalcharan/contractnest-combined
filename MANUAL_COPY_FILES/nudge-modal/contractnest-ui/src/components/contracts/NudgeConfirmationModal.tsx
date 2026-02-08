// src/components/contracts/NudgeConfirmationModal.tsx
// Nudge confirmation screen before sending contract sign-off notifications
// Shows sequence flow + WhatsApp preview (matching actual template) + CNAK info
// Channel resolution happens on Edge via t_contact_channels (buyer_id lookup)

import React from 'react';
import {
  CheckCircle2,
  MessageSquare,
  Mail,
  AlertTriangle,
  Loader2,
  Send,
  Smartphone,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { Contract } from '@/types/contracts';

// ─── Types ───────────────────────────────────────────────────

interface NudgeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  contract: Contract;
  senderName: string;
  isSending: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '\u20B9',
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
};

function formatValue(value?: number, currency?: string): string {
  if (!value) return '';
  const sym = CURRENCY_SYMBOLS[currency || 'INR'] || currency || '';
  return `${sym}${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

// ─── Component ───────────────────────────────────────────────

const NudgeConfirmationModal: React.FC<NudgeConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  contract,
  senderName,
  isSending,
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const brandColor = colors.brand.primary;

  const buyerName = contract.buyer_name || contract.buyer_company || 'Buyer';
  const contractTitle = contract.title || 'Untitled Contract';
  const contractNumber = contract.contract_number || '';
  const contractValue = formatValue(contract.total_value, contract.currency);
  const cnak = contract.global_access_id || '—';
  const hasBuyerId = !!contract.buyer_id;
  const sentDate = contract.sent_at ? formatDate(contract.sent_at) : null;

  // Colors derived from theme
  const cardBg = isDarkMode ? colors.utility.primaryBackground : '#FFFFFF';
  const panelBg = isDarkMode ? '#0F172A' : '#F8FAFC';
  const borderColor = isDarkMode ? '#334155' : '#E2E8F0';
  const dimText = colors.utility.secondaryText;
  const primaryText = colors.utility.primaryText;
  const whatsappGreen = '#25D366';
  const bubbleBg = isDarkMode ? '#DCF8C6' : '#E7FFDB';

  // Sequence steps
  const steps = [
    {
      completed: !!sentDate,
      active: false,
      time: sentDate ? `Completed \u00B7 ${sentDate}` : 'Pending',
      desc: 'Contract Sent',
      channel: 'System Action',
      channelDot: undefined as string | undefined,
    },
    {
      completed: false,
      active: true,
      time: 'Immediate Action',
      desc: 'Friendly Sign-off Reminder',
      channel: 'WhatsApp + Email',
      channelDot: whatsappGreen,
    },
    {
      completed: false,
      active: false,
      time: 'T+48 Hours',
      desc: 'Formal Email Follow-up',
      channel: 'Accounts Email',
      channelDot: undefined as string | undefined,
    },
    {
      completed: false,
      active: false,
      time: 'T+72 Hours',
      desc: 'Seller Intervention',
      channel: 'Human Handover',
      channelDot: undefined as string | undefined,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          style={{ width: '700px', maxWidth: '95vw' }}
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            }}
          >
            {/* ── HEADER ─────────────────────────────────────── */}
            <div
              className="px-6 py-5"
              style={{
                borderBottom: `1px solid ${borderColor}`,
                background: isDarkMode
                  ? `${brandColor}08`
                  : `${brandColor}05`,
              }}
            >
              <span
                className="text-[10px] uppercase font-extrabold tracking-widest"
                style={{ color: brandColor }}
              >
                Sequence Strategy: Contract Sign-off
              </span>
              <div className="text-base font-bold mt-1.5" style={{ color: primaryText }}>
                Sign-off Nudge for {contractNumber} ({buyerName})
              </div>
            </div>

            {/* ── BODY: 2-col grid ───────────────────────────── */}
            <div className="grid grid-cols-[1.2fr_1fr]" style={{ minHeight: '320px' }}>

              {/* ── LEFT: Sequence Flow ──────────────────────── */}
              <div className="p-6" style={{ borderRight: `1px solid ${borderColor}` }}>
                {steps.map((step, i) => {
                  const isLast = i === steps.length - 1;
                  const dotColor = step.active
                    ? brandColor
                    : step.completed
                    ? '#10B981'
                    : isDarkMode ? '#475569' : '#CBD5E1';

                  return (
                    <div
                      key={i}
                      className="relative"
                      style={{
                        paddingLeft: '30px',
                        marginBottom: isLast ? 0 : '24px',
                        borderLeft: isLast
                          ? 'none'
                          : step.active
                          ? `2px solid ${brandColor}`
                          : `2px dashed ${isDarkMode ? '#334155' : '#E2E8F0'}`,
                      }}
                    >
                      {/* Dot */}
                      <span
                        className="absolute rounded-full"
                        style={{
                          left: '-7px',
                          top: '0px',
                          width: '12px',
                          height: '12px',
                          backgroundColor: dotColor,
                          boxShadow: step.active ? `0 0 10px ${brandColor}` : 'none',
                        }}
                      />
                      <span className="text-[10px]" style={{ color: dimText }}>
                        {step.time}
                      </span>
                      <div className="text-[13px] font-semibold mt-0.5" style={{ color: primaryText }}>
                        {step.desc}
                      </div>
                      <div
                        className="text-[11px] flex items-center gap-1.5 mt-0.5"
                        style={{ color: dimText }}
                      >
                        {step.channelDot && (
                          <span style={{ color: step.channelDot, fontSize: '14px', lineHeight: 1 }}>
                            &#9679;
                          </span>
                        )}
                        {step.channel}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── RIGHT: WhatsApp Preview ──────────────────── */}
              <div className="p-5" style={{ backgroundColor: panelBg }}>
                <span
                  className="text-[10px] uppercase font-bold tracking-widest block mb-3"
                  style={{ color: dimText }}
                >
                  WhatsApp Preview
                </span>

                {/* Phone mockup */}
                <div
                  className="rounded-2xl p-3 flex flex-col"
                  style={{
                    backgroundColor: '#FFFFFF',
                    height: '260px',
                    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)',
                  }}
                >
                  <div className="text-[10px] text-center mb-2" style={{ color: '#999' }}>
                    Today, {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </div>

                  {/* Message bubble — matches actual contract_signoff WhatsApp template */}
                  <div
                    className="relative self-start rounded-lg px-3 py-2.5 text-[12px] leading-relaxed"
                    style={{
                      backgroundColor: bubbleBg,
                      maxWidth: '92%',
                      color: '#1A1A1A',
                    }}
                  >
                    {/* Tail */}
                    <span
                      className="absolute"
                      style={{
                        left: '-8px',
                        top: '10px',
                        width: 0,
                        height: 0,
                        borderTop: '8px solid transparent',
                        borderBottom: '8px solid transparent',
                        borderRight: `8px solid ${bubbleBg}`,
                      }}
                    />

                    Hi <b>{buyerName}</b>, <b>{senderName}</b> has shared
                    {' '}&quot;<b>{contractTitle}</b>&quot; ({contractNumber})
                    {contractValue && (
                      <>{' '}worth <b>{contractValue}</b></>
                    )}{' '}
                    for your review.
                    <br /><br />
                    <span style={{ fontSize: '11px', color: '#6B7280' }}>
                      Ref: {cnak}
                    </span>
                    <br /><br />
                    <span style={{ color: brandColor, fontWeight: 700, fontSize: '11px' }}>
                      [Review Contract]
                    </span>
                  </div>
                </div>

                {/* Channel indicators — resolved from contact channels by Edge */}
                <div className="mt-3 flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: whatsappGreen }}>
                    <MessageSquare className="h-3 w-3" /> WhatsApp
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: dimText }}>
                    <Mail className="h-3 w-3" /> Email
                  </span>
                  <span className="text-[10px]" style={{ color: dimText }}>
                    (via contact channels)
                  </span>
                </div>
              </div>
            </div>

            {/* ── FOOTER ─────────────────────────────────────── */}
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{
                backgroundColor: panelBg,
                borderTop: `1px solid ${borderColor}`,
              }}
            >
              <div className="flex items-center gap-4">
                <span className="text-[11px]" style={{ color: dimText }}>
                  CNAK: <b style={{ color: primaryText, letterSpacing: '0.5px' }}>{cnak}</b>
                </span>
                <span className="text-[11px]" style={{ color: dimText }}>
                  Buyer: <b style={{ color: primaryText }}>{buyerName}</b>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  disabled={isSending}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'transparent',
                    border: `1px solid ${borderColor}`,
                    color: primaryText,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isSending || !hasBuyerId}
                  className="px-5 py-2 text-sm font-bold rounded-lg text-white flex items-center gap-2 transition-all disabled:opacity-50"
                  style={{ backgroundColor: brandColor }}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Nudge
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

export default NudgeConfirmationModal;

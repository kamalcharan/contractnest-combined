// src/components/subscription/modals/AdminActionDialog.tsx
// Admin Action Dialog - Replaces browser confirm/alert with styled dialog
// Features: Lottie animations, progress indicator, engaging processing phase

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  Trash2,
  X,
  CheckCircle2,
  Eraser,
  Database,
  XCircle,
  Shield,
  Building2
} from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { TenantListItem } from '../../../types/tenantManagement';
import Lottie from 'lottie-react';

// ============================================================================
// TYPES
// ============================================================================

export type AdminActionType = 'reset-test-data' | 'reset-all-data' | 'close-account';
type DialogPhase = 'confirm' | 'processing' | 'success' | 'error';

export interface AdminActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  action: AdminActionType | null;
  tenant: TenantListItem | null;
  onExecute: (tenant: TenantListItem) => Promise<any>;
  onComplete?: () => void;
}

// ============================================================================
// ACTION CONFIGURATIONS
// ============================================================================

const getActionConfig = (action: AdminActionType | null) => {
  switch (action) {
    case 'reset-test-data':
      return {
        title: 'Reset Test Data',
        description: 'This will delete all records where is_live = false. Live/production data will NOT be affected.',
        confirmText: 'Reset Test Data',
        icon: Eraser,
        color: '#F59E0B',
        bgColor: 'rgba(245, 158, 11, 0.1)',
        borderColor: 'rgba(245, 158, 11, 0.2)',
        colorRgba: [0.96, 0.62, 0.04, 1] as number[],
        requiresCodeConfirm: false,
        processingMessages: [
          'Preparing test data cleanup...',
          'Scanning test records across tables...',
          'Removing test contacts & channels...',
          'Cleaning up test contracts...',
          'Removing test catalog entries...',
          'Verifying data integrity...',
          'Finalizing cleanup...'
        ],
        successTitle: 'Test Data Reset Complete',
        minProcessingTime: 6000
      };
    case 'reset-all-data':
      return {
        title: 'Reset All Data',
        description: 'This will delete ALL tenant data across every table. The account will remain open but completely empty. This cannot be undone.',
        confirmText: 'Reset All Data',
        icon: Database,
        color: '#EF4444',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.2)',
        colorRgba: [0.94, 0.27, 0.27, 1] as number[],
        requiresCodeConfirm: true,
        processingMessages: [
          'Preparing full data reset...',
          'Removing contacts and relationships...',
          'Deleting contracts and documents...',
          'Clearing catalog and services...',
          'Removing files and storage data...',
          'Cleaning up user invitations...',
          'Removing configuration data...',
          'Verifying data integrity...',
          'Almost done...'
        ],
        successTitle: 'All Data Reset Complete',
        minProcessingTime: 8000
      };
    case 'close-account':
      return {
        title: 'Close Account',
        description: 'This will delete ALL tenant data AND permanently close this account. All users will lose access immediately. This cannot be undone.',
        confirmText: 'Close Account Permanently',
        icon: XCircle,
        color: '#DC2626',
        bgColor: 'rgba(220, 38, 38, 0.1)',
        borderColor: 'rgba(220, 38, 38, 0.2)',
        colorRgba: [0.86, 0.15, 0.15, 1] as number[],
        requiresCodeConfirm: true,
        processingMessages: [
          'Preparing account closure...',
          'Removing all tenant data...',
          'Clearing user associations...',
          'Cancelling active subscriptions...',
          'Archiving account records...',
          'Removing integrations...',
          'Closing account...',
          'Finalizing...'
        ],
        successTitle: 'Account Closed',
        minProcessingTime: 8000
      };
    default:
      return null;
  }
};

// ============================================================================
// LOTTIE ANIMATION DATA
// ============================================================================

// Processing animation: dual rotating arcs + pulsing center
const getProcessingAnimation = (colorRgba: number[]) => ({
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 90,
  w: 200,
  h: 200,
  nm: "Processing",
  ddd: 0,
  assets: [],
  layers: [
    // Layer 1: Outer rotating arc
    {
      ddd: 0, ind: 1, ty: 4, nm: "Outer Arc", sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 1, k: [{ t: 0, s: [0], e: [360] }, { t: 90, s: [360] }] },
        p: { a: 0, k: [100, 100] },
        a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [100, 100] }
      },
      shapes: [{
        ty: "gr",
        it: [
          { ty: "el", d: 1, s: { a: 0, k: [72, 72] }, p: { a: 0, k: [0, 0] }, nm: "Ring" },
          { ty: "tm", s: { a: 0, k: 0 }, e: { a: 0, k: 65 }, o: { a: 0, k: 0 }, nm: "Trim" },
          { ty: "st", c: { a: 0, k: colorRgba }, o: { a: 0, k: 100 }, w: { a: 0, k: 6 }, lc: 2, lj: 2, nm: "Stroke" },
          { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
        ],
        nm: "Outer"
      }]
    },
    // Layer 2: Inner counter-rotating arc
    {
      ddd: 0, ind: 2, ty: 4, nm: "Inner Arc", sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [50], e: [90] }, { t: 45, s: [90], e: [50] }, { t: 90, s: [50] }] },
        r: { a: 1, k: [{ t: 0, s: [0], e: [-270] }, { t: 90, s: [-270] }] },
        p: { a: 0, k: [100, 100] },
        a: { a: 0, k: [0, 0] },
        s: { a: 1, k: [{ t: 0, s: [85, 85], e: [100, 100] }, { t: 45, s: [100, 100], e: [85, 85] }, { t: 90, s: [85, 85] }] }
      },
      shapes: [{
        ty: "gr",
        it: [
          { ty: "el", d: 1, s: { a: 0, k: [44, 44] }, p: { a: 0, k: [0, 0] }, nm: "Inner Ring" },
          { ty: "tm", s: { a: 0, k: 10 }, e: { a: 0, k: 55 }, o: { a: 0, k: 0 }, nm: "Trim" },
          { ty: "st", c: { a: 0, k: colorRgba }, o: { a: 0, k: 70 }, w: { a: 0, k: 4 }, lc: 2, lj: 2, nm: "Stroke" },
          { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
        ],
        nm: "Inner"
      }]
    },
    // Layer 3: Pulsing center dot
    {
      ddd: 0, ind: 3, ty: 4, nm: "Center Dot", sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [60], e: [100] }, { t: 45, s: [100], e: [60] }, { t: 90, s: [60] }] },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 100] },
        a: { a: 0, k: [0, 0] },
        s: { a: 1, k: [{ t: 0, s: [80, 80], e: [120, 120] }, { t: 45, s: [120, 120], e: [80, 80] }, { t: 90, s: [80, 80] }] }
      },
      shapes: [{
        ty: "gr",
        it: [
          { ty: "el", d: 1, s: { a: 0, k: [14, 14] }, p: { a: 0, k: [0, 0] }, nm: "Dot" },
          { ty: "fl", c: { a: 0, k: colorRgba }, o: { a: 0, k: 100 }, nm: "Fill" },
          { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
        ],
        nm: "Dot"
      }]
    },
    // Layer 4: Orbiting dot 1
    {
      ddd: 0, ind: 4, ty: 4, nm: "Orbit 1", sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [100], e: [30] }, { t: 60, s: [30], e: [100] }, { t: 90, s: [100] }] },
        r: { a: 1, k: [{ t: 0, s: [0], e: [360] }, { t: 90, s: [360] }] },
        p: { a: 0, k: [100, 100] },
        a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [100, 100] }
      },
      shapes: [{
        ty: "gr",
        it: [
          { ty: "el", d: 1, s: { a: 0, k: [7, 7] }, p: { a: 0, k: [50, 0] }, nm: "Orb" },
          { ty: "fl", c: { a: 0, k: colorRgba }, o: { a: 0, k: 60 }, nm: "Fill" },
          { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
        ],
        nm: "Orbit"
      }]
    },
    // Layer 5: Orbiting dot 2 (offset)
    {
      ddd: 0, ind: 5, ty: 4, nm: "Orbit 2", sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [30], e: [100] }, { t: 45, s: [100], e: [30] }, { t: 90, s: [30] }] },
        r: { a: 1, k: [{ t: 0, s: [180], e: [540] }, { t: 90, s: [540] }] },
        p: { a: 0, k: [100, 100] },
        a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [100, 100] }
      },
      shapes: [{
        ty: "gr",
        it: [
          { ty: "el", d: 1, s: { a: 0, k: [5, 5] }, p: { a: 0, k: [42, 0] }, nm: "Orb" },
          { ty: "fl", c: { a: 0, k: colorRgba }, o: { a: 0, k: 40 }, nm: "Fill" },
          { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
        ],
        nm: "Orbit2"
      }]
    }
  ]
});

// Success animation: growing green circle + checkmark
const successAnimation = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 75,
  w: 200,
  h: 200,
  nm: "Success",
  ddd: 0,
  assets: [],
  layers: [
    // Layer 1: Circle background - scales up with bounce
    {
      ddd: 0, ind: 1, ty: 4, nm: "Circle BG", sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 100] },
        a: { a: 0, k: [0, 0] },
        s: { a: 1, k: [
          { t: 0, s: [0, 0], e: [115, 115] },
          { t: 12, s: [115, 115], e: [95, 95] },
          { t: 18, s: [95, 95], e: [105, 105] },
          { t: 22, s: [105, 105], e: [100, 100] },
          { t: 25, s: [100, 100] }
        ]}
      },
      shapes: [{
        ty: "gr",
        it: [
          { ty: "el", d: 1, s: { a: 0, k: [80, 80] }, p: { a: 0, k: [0, 0] }, nm: "Circ" },
          { ty: "fl", c: { a: 0, k: [0.06, 0.72, 0.51, 1] }, o: { a: 0, k: 15 }, nm: "BG Fill" },
          { ty: "st", c: { a: 0, k: [0.06, 0.72, 0.51, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 5 }, lc: 2, lj: 2, nm: "Border" },
          { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
        ],
        nm: "Circle"
      }]
    },
    // Layer 2: Checkmark short arm
    {
      ddd: 0, ind: 2, ty: 4, nm: "Check Short", sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 18, s: [0] }, { t: 28, s: [100] }] },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 100] },
        a: { a: 0, k: [0, 0] },
        s: { a: 1, k: [
          { t: 18, s: [0, 0], e: [115, 115] },
          { t: 28, s: [115, 115], e: [100, 100] },
          { t: 32, s: [100, 100] }
        ]}
      },
      shapes: [{
        ty: "gr",
        it: [
          { ty: "rc", d: 1, s: { a: 0, k: [5, 18] }, p: { a: 0, k: [-7, 6] }, r: { a: 0, k: 1 }, nm: "Short" },
          { ty: "fl", c: { a: 0, k: [0.06, 0.72, 0.51, 1] }, o: { a: 0, k: 100 }, nm: "Fill" },
          { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: -40 }, o: { a: 0, k: 100 } }
        ],
        nm: "ShortArm"
      }]
    },
    // Layer 3: Checkmark long arm
    {
      ddd: 0, ind: 3, ty: 4, nm: "Check Long", sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 18, s: [0] }, { t: 28, s: [100] }] },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 100] },
        a: { a: 0, k: [0, 0] },
        s: { a: 1, k: [
          { t: 18, s: [0, 0], e: [115, 115] },
          { t: 28, s: [115, 115], e: [100, 100] },
          { t: 32, s: [100, 100] }
        ]}
      },
      shapes: [{
        ty: "gr",
        it: [
          { ty: "rc", d: 1, s: { a: 0, k: [5, 28] }, p: { a: 0, k: [8, -5] }, r: { a: 0, k: 1 }, nm: "Long" },
          { ty: "fl", c: { a: 0, k: [0.06, 0.72, 0.51, 1] }, o: { a: 0, k: 100 }, nm: "Fill" },
          { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 35 }, o: { a: 0, k: 100 } }
        ],
        nm: "LongArm"
      }]
    },
    // Layer 4-7: Sparkle dots bursting outward
    ...[0, 90, 180, 270].map((angle, i) => ({
      ddd: 0, ind: 4 + i, ty: 4, nm: `Sparkle ${i + 1}`, sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 20, s: [0] }, { t: 28, s: [100] }, { t: 50, s: [0] }] },
        r: { a: 0, k: angle },
        p: { a: 0, k: [100, 100] },
        a: { a: 0, k: [0, 0] },
        s: { a: 0, k: [100, 100] }
      },
      shapes: [{
        ty: "gr",
        it: [
          { ty: "el", d: 1, s: { a: 0, k: [6, 6] }, p: { a: 1, k: [{ t: 20, s: [0, -40], e: [0, -58] }, { t: 50, s: [0, -58] }] }, nm: "Dot" },
          { ty: "fl", c: { a: 0, k: [0.06, 0.72, 0.51, 1] }, o: { a: 0, k: 80 }, nm: "Fill" },
          { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
        ],
        nm: `Sparkle${i}`
      }]
    }))
  ]
};

// ============================================================================
// COMPONENT
// ============================================================================

export const AdminActionDialog: React.FC<AdminActionDialogProps> = ({
  isOpen,
  onClose,
  action,
  tenant,
  onExecute,
  onComplete
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [phase, setPhase] = useState<DialogPhase>('confirm');
  const [confirmCode, setConfirmCode] = useState('');
  const [currentMessage, setCurrentMessage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const messageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const config = getActionConfig(action);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setPhase('confirm');
      setConfirmCode('');
      setCurrentMessage(0);
      setProgress(0);
      setResult(null);
      setErrorMsg('');
    }
    return () => {
      if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isOpen, action]);

  // Cycle processing messages
  useEffect(() => {
    if (phase === 'processing' && config) {
      const msgCount = config.processingMessages.length;
      const interval = config.minProcessingTime / msgCount;

      messageIntervalRef.current = setInterval(() => {
        setCurrentMessage(prev => {
          if (prev < msgCount - 1) return prev + 1;
          return prev;
        });
      }, interval);

      return () => {
        if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
      };
    }
  }, [phase, config]);

  // Animate progress bar
  useEffect(() => {
    if (phase === 'processing' && config) {
      const totalDuration = config.minProcessingTime;
      const step = 50; // update every 50ms
      const increment = (100 / (totalDuration / step));

      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          const next = prev + increment;
          if (next >= 100) {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            return 100;
          }
          return next;
        });
      }, step);

      return () => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      };
    }
  }, [phase, config]);

  // Handle confirm and execute
  const handleExecute = useCallback(async () => {
    if (!tenant || !config) return;

    setPhase('processing');
    setCurrentMessage(0);
    setProgress(0);

    const startTime = Date.now();

    try {
      const apiResult = await onExecute(tenant);
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, config.minProcessingTime - elapsed);

      // Wait remaining time so user sees the full animation
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }

      setProgress(100);
      setResult(apiResult);

      // Brief pause before showing success
      await new Promise(resolve => setTimeout(resolve, 400));
      setPhase('success');
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 2000 - elapsed);
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }

      setErrorMsg(error?.response?.data?.error?.message || error?.message || 'Operation failed. Please try again.');
      setPhase('error');
    }
  }, [tenant, config, onExecute]);

  // Handle close (only allow in confirm/success/error phases)
  const handleClose = () => {
    if (phase === 'processing') return;
    if (phase === 'success' && onComplete) {
      onComplete();
    }
    onClose();
  };

  if (!isOpen || !config || !tenant) return null;

  const ActionIcon = config.icon;
  const isCodeValid = !config.requiresCodeConfirm || confirmCode === tenant.workspace_code;

  // Processing animation data (memoize based on action)
  const processingAnim = getProcessingAnimation(config.colorRgba);

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 transition-opacity"
        style={{
          backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)'
        }}
        onClick={handleClose}
      />

      {/* Dialog Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl transform transition-all"
          style={{
            backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
            backdropFilter: 'blur(20px)'
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* ============================================ */}
          {/* PHASE: CONFIRM                               */}
          {/* ============================================ */}
          {phase === 'confirm' && (
            <>
              {/* Header */}
              <div
                className="px-6 py-5"
                style={{
                  background: config.bgColor,
                  borderBottom: `1px solid ${config.borderColor}`
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${config.color}20` }}
                    >
                      <ActionIcon size={22} style={{ color: config.color }} />
                    </div>
                    <h3 className="text-lg font-bold" style={{ color: config.color }}>
                      {config.title}
                    </h3>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-1.5 rounded-lg transition-all hover:scale-110"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-5">
                {/* Tenant Info */}
                <div
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: `${colors.brand.primary}15` }}
                  >
                    <Building2 size={20} style={{ color: colors.brand.primary }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: colors.utility.primaryText }}>
                      {tenant.name}
                    </p>
                    <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
                      {tenant.workspace_code}
                    </p>
                  </div>
                </div>

                {/* Warning Description */}
                <div
                  className="p-4 rounded-xl flex items-start gap-3"
                  style={{
                    background: `${config.color}08`,
                    border: `1px solid ${config.color}20`
                  }}
                >
                  <Shield size={20} style={{ color: config.color }} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm" style={{ color: colors.utility.primaryText }}>
                      {config.description}
                    </p>
                    {(action === 'reset-all-data' || action === 'close-account') && (
                      <ul className="text-xs mt-2 space-y-1" style={{ color: colors.utility.secondaryText }}>
                        <li>• All contacts, contracts, and files will be removed</li>
                        <li>• All team member invitations will be cleared</li>
                        {action === 'close-account' && <li>• All users will lose access immediately</li>}
                        {action === 'close-account' && <li>• Account status will be set to CLOSED</li>}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Code Confirmation (for destructive actions) */}
                {config.requiresCodeConfirm && (
                  <div className="space-y-2">
                    <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                      Type <span className="font-mono font-bold" style={{ color: config.color }}>{tenant.workspace_code}</span> to confirm:
                    </p>
                    <input
                      type="text"
                      value={confirmCode}
                      onChange={e => setConfirmCode(e.target.value)}
                      placeholder={tenant.workspace_code}
                      className="w-full px-4 py-2.5 rounded-xl text-sm font-mono outline-none transition-all"
                      style={{
                        background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                        border: `2px solid ${confirmCode === tenant.workspace_code ? config.color : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)')}`,
                        color: colors.utility.primaryText
                      }}
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div
                className="px-6 py-4 flex items-center justify-end gap-3"
                style={{
                  borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`
                }}
              >
                <button
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
                  style={{
                    background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    color: colors.utility.primaryText
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecute}
                  disabled={!isCodeValid}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{
                    background: isCodeValid ? config.color : `${config.color}60`
                  }}
                >
                  {config.confirmText}
                </button>
              </div>
            </>
          )}

          {/* ============================================ */}
          {/* PHASE: PROCESSING                            */}
          {/* ============================================ */}
          {phase === 'processing' && (
            <div className="px-6 py-10 flex flex-col items-center text-center">
              {/* Lottie Animation */}
              <div className="mb-6">
                <Lottie
                  animationData={processingAnim}
                  loop={true}
                  style={{
                    width: 140,
                    height: 140,
                    filter: isDarkMode ? 'brightness(1.2)' : 'none'
                  }}
                />
              </div>

              {/* Title */}
              <h3
                className="text-lg font-bold mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                {config.title} in Progress
              </h3>

              {/* Tenant Name */}
              <p
                className="text-sm mb-6"
                style={{ color: colors.utility.secondaryText }}
              >
                {tenant.name} ({tenant.workspace_code})
              </p>

              {/* Cycling Message */}
              <div
                className="h-6 flex items-center justify-center mb-5 transition-opacity duration-300"
                key={currentMessage}
              >
                <p
                  className="text-sm font-medium animate-pulse"
                  style={{ color: config.color }}
                >
                  {config.processingMessages[currentMessage]}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-xs">
                <div
                  className="w-full h-2 rounded-full overflow-hidden"
                  style={{
                    background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
                  }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-200 ease-linear"
                    style={{
                      width: `${progress}%`,
                      background: `linear-gradient(to right, ${config.color}80, ${config.color})`
                    }}
                  />
                </div>
                <p
                  className="text-xs mt-2"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {Math.round(progress)}% complete
                </p>
              </div>

              {/* Do not close warning */}
              <p
                className="text-xs mt-6"
                style={{ color: colors.utility.secondaryText, opacity: 0.7 }}
              >
                Please do not close this dialog
              </p>
            </div>
          )}

          {/* ============================================ */}
          {/* PHASE: SUCCESS                               */}
          {/* ============================================ */}
          {phase === 'success' && (
            <div className="px-6 py-10 flex flex-col items-center text-center">
              {/* Success Lottie */}
              <div className="mb-4">
                <Lottie
                  animationData={successAnimation}
                  loop={false}
                  style={{
                    width: 120,
                    height: 120,
                    filter: isDarkMode ? 'brightness(1.2)' : 'none'
                  }}
                />
              </div>

              {/* Title */}
              <h3
                className="text-lg font-bold mb-2"
                style={{ color: '#10B981' }}
              >
                {config.successTitle}
              </h3>

              {/* Tenant */}
              <p
                className="text-sm mb-5"
                style={{ color: colors.utility.secondaryText }}
              >
                {tenant.name} ({tenant.workspace_code})
              </p>

              {/* Result Summary */}
              {result && (
                <div
                  className="w-full max-w-sm p-4 rounded-xl mb-6 text-left"
                  style={{
                    background: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)',
                    border: `1px solid ${isDarkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)'}`
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 size={16} style={{ color: '#10B981' }} />
                    <p className="text-sm font-semibold" style={{ color: '#10B981' }}>
                      Operation Summary
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {result.total_deleted !== undefined && (
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: colors.utility.secondaryText }}>Records deleted</span>
                        <span className="font-semibold" style={{ color: colors.utility.primaryText }}>
                          {result.total_deleted?.toLocaleString?.() || result.total_deleted}
                        </span>
                      </div>
                    )}
                    {result.tenant_status && (
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: colors.utility.secondaryText }}>Account status</span>
                        <span
                          className="font-semibold capitalize"
                          style={{ color: result.tenant_status === 'closed' ? '#EF4444' : '#10B981' }}
                        >
                          {result.tenant_status}
                        </span>
                      </div>
                    )}
                    {result.details && typeof result.details === 'object' && (
                      Object.entries(result.details).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-sm">
                          <span style={{ color: colors.utility.secondaryText }}>
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                          <span className="font-medium" style={{ color: colors.utility.primaryText }}>
                            {String(value)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Done Button */}
              <button
                onClick={handleClose}
                className="px-8 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                style={{ background: '#10B981' }}
              >
                Done
              </button>
            </div>
          )}

          {/* ============================================ */}
          {/* PHASE: ERROR                                 */}
          {/* ============================================ */}
          {phase === 'error' && (
            <div className="px-6 py-10 flex flex-col items-center text-center">
              {/* Error Icon */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: 'rgba(239, 68, 68, 0.1)' }}
              >
                <AlertTriangle size={32} style={{ color: '#EF4444' }} />
              </div>

              {/* Title */}
              <h3
                className="text-lg font-bold mb-2"
                style={{ color: '#EF4444' }}
              >
                Operation Failed
              </h3>

              {/* Error Message */}
              <p
                className="text-sm mb-6 max-w-xs"
                style={{ color: colors.utility.secondaryText }}
              >
                {errorMsg}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
                  style={{
                    background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    color: colors.utility.primaryText
                  }}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setPhase('confirm');
                    setConfirmCode('');
                    setErrorMsg('');
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                  style={{ background: config.color }}
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminActionDialog;

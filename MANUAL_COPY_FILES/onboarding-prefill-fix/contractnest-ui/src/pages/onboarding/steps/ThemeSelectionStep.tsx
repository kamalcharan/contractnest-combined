// src/pages/onboarding/steps/ThemeSelectionStep.tsx
// Screen 4 — Theme Selection.
// Inside OnboardingLayout (progress header visible). Own floating action island.
// Shows all 12 workspace themes as static preview cards (VaNi stays active as page chrome).
// On Continue: applies chosen theme + saves preference + navigates to /onboarding/industry-selection.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { themes } from '@/utils/theme';
import { vaniToast } from '@/components/common/toast';
import { Loader2, Sun, Moon } from 'lucide-react';

const ThemeSelectionStep: React.FC = () => {
  const navigate = useNavigate();
  const { setTheme, currentTheme, currentThemeId, isDarkMode, toggleDarkMode } = useTheme();
  const { user, updateUserPreferences } = useAuth();
  const colors = currentTheme.colors; // VaNi colors while on this screen

  const [selectedId, setSelectedId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [vaniVisible, setVaniVisible] = useState(false);

  // All 12 user-facing themes — exclude 'vani' which is onboarding-only
  const pickableThemes = Object.values(themes).filter(t => t.id !== 'vani');

  useEffect(() => {
    // currentThemeId comes from ThemeContext (localStorage) — the user's actual saved theme.
    // Read it BEFORE setTheme('vani') overwrites localStorage with 'vani'.
    // This is more reliable than user?.preferred_theme which may not be loaded yet.
    const savedId = currentThemeId !== 'vani' ? currentThemeId : null;
    if (savedId && pickableThemes.find(t => t.id === savedId)) {
      setSelectedId(savedId);
      setVaniVisible(true);
    }
    setTheme('vani');
  }, []);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setTimeout(() => setVaniVisible(true), 80);
  };

  const handleContinue = async () => {
    if (!selectedId || isSaving) return;
    setIsSaving(true);
    try {
      // Apply the chosen theme immediately
      setTheme(selectedId);

      // Persist to user preferences
      if (updateUserPreferences) {
        await updateUserPreferences({ preferred_theme: selectedId, is_dark_mode: isDarkMode });
      }

      vaniToast.success('Theme saved');
      navigate('/onboarding/industry-selection');
    } catch (err: any) {
      vaniToast.error('Failed to save theme — please try again');
    } finally {
      setIsSaving(false);
    }
  };

  // ── sub-components ──

  const VaniBubble = ({ msg }: { msg: string }) => (
    <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
      <div
        style={{
          width: 36, height: 36, flexShrink: 0,
          background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.alternate})`,
          borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 14, color: '#fff',
          boxShadow: `0 3px 8px ${colors.brand.primary}40`,
          marginTop: 2,
        }}
      >
        V
      </div>
      <div
        style={{
          background: colors.utility.secondaryBackground,
          border: `1px solid ${colors.utility.primaryText}14`,
          borderRadius: '3px 14px 14px 14px',
          padding: '14px 18px',
          boxShadow: `0 2px 12px ${colors.utility.primaryText}08`,
          fontSize: 14,
          color: colors.utility.secondaryText,
          lineHeight: 1.6,
          maxWidth: 520,
        }}
        dangerouslySetInnerHTML={{ __html: msg }}
      />
    </div>
  );

  const ThemeCard = ({ theme }: { theme: typeof pickableThemes[0] }) => {
    const isSelected = selectedId === theme.id;
    const tc = theme.colors; // theme preview colors (light mode)

    return (
      <div
        onClick={() => handleSelect(theme.id)}
        style={{
          background: colors.utility.secondaryBackground,
          border: `2px solid ${isSelected ? colors.brand.primary : `${colors.utility.primaryText}18`}`,
          borderRadius: 14,
          padding: '16px',
          cursor: 'pointer',
          transition: 'all .2s cubic-bezier(.22,1,.36,1)',
          position: 'relative',
          boxShadow: isSelected
            ? `0 0 0 3px ${colors.brand.primary}14, 0 4px 20px ${colors.utility.primaryText}08`
            : 'none',
          backgroundColor: isSelected
            ? `${colors.brand.primary}06`
            : colors.utility.secondaryBackground,
        }}
        onMouseEnter={e => {
          if (!isSelected) {
            (e.currentTarget as HTMLDivElement).style.borderColor = `${colors.brand.primary}50`;
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 16px ${colors.utility.primaryText}0a`;
          }
        }}
        onMouseLeave={e => {
          if (!isSelected) {
            (e.currentTarget as HTMLDivElement).style.borderColor = `${colors.utility.primaryText}18`;
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
          }
        }}
      >
        {/* Check mark */}
        <div
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 20, height: 20, borderRadius: '50%',
            background: colors.brand.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: '#fff',
            opacity: isSelected ? 1 : 0,
            transform: isSelected ? 'scale(1)' : 'scale(.5)',
            transition: 'all .25s cubic-bezier(.34,1.56,.64,1)',
          }}
        >
          ✓
        </div>

        {/* Mini mockup preview */}
        <div
          style={{
            height: 56,
            borderRadius: 8,
            overflow: 'hidden',
            display: 'flex',
            marginBottom: 12,
            border: `1px solid ${colors.utility.primaryText}10`,
          }}
        >
          {/* Sidebar strip */}
          <div
            style={{
              width: 16,
              background: tc.brand.primary,
              flexShrink: 0,
            }}
          />
          {/* Content area */}
          <div
            style={{
              flex: 1,
              background: tc.utility.primaryBackground,
              padding: '6px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {/* Mock header bar */}
            <div
              style={{
                height: 7,
                borderRadius: 3,
                background: tc.utility.secondaryBackground,
                border: `1px solid ${tc.utility.primaryText}12`,
              }}
            />
            {/* Mock content lines */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <div
                style={{
                  height: 6,
                  borderRadius: 2,
                  background: tc.brand.primary,
                  width: '30%',
                }}
              />
              <div
                style={{
                  height: 5,
                  borderRadius: 2,
                  background: `${tc.utility.primaryText}18`,
                  flex: 1,
                }}
              />
            </div>
            <div
              style={{
                height: 5,
                borderRadius: 2,
                background: `${tc.utility.primaryText}12`,
                width: '70%',
              }}
            />
          </div>
        </div>

        {/* Color dots */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 8, alignItems: 'center' }}>
          <div
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: tc.brand.primary,
              boxShadow: `0 0 0 1px ${tc.brand.primary}50`,
            }}
          />
          <div
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: tc.brand.secondary,
              opacity: 0.8,
            }}
          />
          <div
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: tc.utility.primaryBackground,
              border: `1px solid ${colors.utility.primaryText}20`,
            }}
          />
        </div>

        {/* Theme name */}
        <div
          style={{
            fontSize: 12, fontWeight: 700,
            color: isSelected ? colors.brand.primary : colors.utility.primaryText,
            letterSpacing: '-0.2px',
            transition: 'color .2s',
          }}
        >
          {theme.name}
        </div>
      </div>
    );
  };

  const selectedTheme = pickableThemes.find(t => t.id === selectedId);

  return (
    <>
      {/* Page */}
      <div
        style={{
          flex: 1,
          backgroundColor: colors.utility.primaryBackground,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '48px 24px 140px',
          fontFamily: "'Outfit', sans-serif",
          minHeight: '100%',
        }}
      >
        <div style={{ width: '100%', maxWidth: 720 }}>

          {/* Eyebrow */}
          <div
            style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: 1, color: colors.brand.primary,
              fontFamily: "'IBM Plex Mono', monospace", marginBottom: 10,
            }}
          >
            Step 4 of 9
          </div>

          <h2
            style={{
              fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px',
              color: colors.utility.primaryText, marginBottom: 6,
            }}
          >
            Choose your workspace theme
          </h2>
          <p
            style={{
              fontSize: 14, color: colors.utility.secondaryText,
              marginBottom: 32, lineHeight: 1.55,
            }}
          >
            Every screen, every contract, every dashboard will reflect this. You can change it anytime from settings.
          </p>

          {/* VaNi intro bubble */}
          <VaniBubble
            msg={`Pick what feels right for <strong>${user?.first_name || 'your'}</strong> team. Each theme is optimised for readability — light or dark, bold or minimal.`}
          />

          {/* Dark mode toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.primaryText}14`,
              borderRadius: 12,
              padding: '12px 18px',
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {isDarkMode
                ? <Moon size={16} style={{ color: colors.brand.primary }} />
                : <Sun size={16} style={{ color: colors.brand.primary }} />
              }
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.utility.primaryText }}>
                  {isDarkMode ? 'Dark mode' : 'Light mode'}
                </div>
                <div style={{ fontSize: 11, color: colors.utility.secondaryText }}>
                  {isDarkMode ? 'Easy on the eyes in low light' : 'Best for well-lit environments'}
                </div>
              </div>
            </div>
            {/* Toggle */}
            <button
              type="button"
              onClick={toggleDarkMode}
              style={{
                width: 44, height: 24, borderRadius: 100,
                background: isDarkMode ? colors.brand.primary : `${colors.utility.primaryText}25`,
                border: 'none', cursor: 'pointer',
                position: 'relative', transition: 'background .2s',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 3, left: isDarkMode ? 23 : 3,
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#fff',
                  transition: 'left .2s cubic-bezier(.34,1.56,.64,1)',
                  boxShadow: '0 1px 3px rgba(0,0,0,.25)',
                }}
              />
            </button>
          </div>

          {/* Theme grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
              marginBottom: 20,
            }}
          >
            {pickableThemes.map(t => (
              <ThemeCard key={t.id} theme={t} />
            ))}
          </div>

          {/* VaNi reaction bubble */}
          {selectedTheme && (
            <div
              style={{
                marginTop: 4,
                opacity: vaniVisible ? 1 : 0,
                transform: vaniVisible ? 'translateY(0)' : 'translateY(8px)',
                transition: 'all .4s cubic-bezier(.22,1,.36,1)',
              }}
            >
              <VaniBubble
                msg={`<strong>${selectedTheme.name}</strong> selected. Looks great — this will be applied to every screen of your workspace once you continue.`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Floating action island */}
      <div
        style={{
          position: 'fixed',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          background: `${colors.accent.accent1}f0`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          padding: '10px 10px 10px 24px',
          borderRadius: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 20px 50px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.06)',
          zIndex: 200,
          whiteSpace: 'nowrap',
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.65)' }}>
          {selectedTheme
            ? `Selected: ${selectedTheme.name}`
            : 'Choose a theme'}
        </span>

        <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.12)' }} />

        {/* Back */}
        <button
          type="button"
          onClick={() => navigate('/onboarding/persona-selection')}
          style={{
            padding: '10px 20px', borderRadius: 100, border: 'none',
            background: 'rgba(255,255,255,.08)',
            color: 'rgba(255,255,255,.6)',
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: 'pointer', transition: 'all .2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.14)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,.85)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.08)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,.6)';
          }}
        >
          ← Back
        </button>

        {/* Continue */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedId || isSaving}
          style={{
            padding: '10px 24px', borderRadius: 100, border: 'none',
            background: !selectedId
              ? 'rgba(255,255,255,.15)'
              : colors.utility.secondaryBackground,
            color: !selectedId
              ? 'rgba(255,255,255,.3)'
              : colors.utility.primaryText,
            fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700,
            cursor: !selectedId || isSaving ? 'not-allowed' : 'pointer',
            transition: 'all .2s',
            opacity: isSaving ? 0.7 : 1,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          onMouseEnter={e => {
            if (selectedId && !isSaving) {
              (e.currentTarget as HTMLButtonElement).style.background = '#f0ece6';
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
            }
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = selectedId
              ? colors.utility.secondaryBackground : 'rgba(255,255,255,.15)';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          {isSaving && (
            <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
          )}
          Continue →
        </button>
      </div>
    </>
  );
};

export default ThemeSelectionStep;

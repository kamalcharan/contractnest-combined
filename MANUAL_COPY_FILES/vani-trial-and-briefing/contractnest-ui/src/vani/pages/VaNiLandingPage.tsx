import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useVaniEntitlement, useStartVaniTrial } from "@/hooks/queries/useVaniDeskQueries";

// ═══════════════════════════════════════════════════════
//  VaNi Landing Page — Coming Soon
// ═══════════════════════════════════════════════════════

const FEATURES = [
  {
    icon: "🔮",
    title: "Predictive Contract Health",
    desc: "Don't just see what happened — know what's coming. VaNi forecasts health trajectory 14 days ahead, identifies risk factors before they become breaches, and tells you exactly what to fix.",
    stat: "14-day",
    statLabel: "Forecast Window",
    color: "#8b5cf6",
  },
  {
    icon: "⚡",
    title: "Autonomous Task Management",
    desc: "VaNi monitors task progress, detects stalls, nudges team members, and auto-assigns based on skill match and capacity. You approve — VaNi executes.",
    stat: "87%",
    statLabel: "Skill Matching",
    color: "#f59e0b",
  },
  {
    icon: "💬",
    title: "Smart Communication",
    desc: "Weekly buyer updates, payment reminders, evidence follow-ups — all drafted by VaNi, sent on optimal schedules. Your clients feel attended to, without your team lifting a finger.",
    stat: "92%",
    statLabel: "On-time Payment Rate",
    color: "#10b981",
  },
  {
    icon: "💎",
    title: "Revenue Intelligence",
    desc: "VaNi spots cross-sell opportunities by analyzing client profiles against your portfolio. It detects renewal windows, coverage gaps, and upsell moments before you even think about them.",
    stat: "2.3×",
    statLabel: "Renewal Rate Lift",
    color: "#ef4444",
  },
  {
    icon: "🧠",
    title: "Portfolio-Wide Learning",
    desc: "Every contract teaches VaNi something. After 50 contracts, it knows your best practices. After 500, it knows your industry. Insights compound — your 100th contract is managed better than your 10th.",
    stat: "148+",
    statLabel: "Patterns Detected",
    color: "#3b82f6",
  },
  {
    icon: "🛡️",
    title: "Human-in-the-Loop Always",
    desc: "VaNi never acts without permission on critical decisions. Every automation has an approval gate. Full activity logs. Complete transparency. You're the pilot — VaNi is your co-pilot.",
    stat: "100%",
    statLabel: "Audit Trail Coverage",
    color: "#0f172a",
  },
];

const USECASES = [
  { industry: "Healthcare", icon: "🏥", example: "AMC contracts for medical equipment — VaNi schedules preventive maintenance, tracks vendor SLAs, auto-generates compliance reports, and alerts before warranty expiry." },
  { industry: "IT Services", icon: "💻", example: "Digital transformation engagements — VaNi monitors milestone delivery, predicts scope creep, manages payment milestones, and surfaces resource bottlenecks." },
  { industry: "Facility Management", icon: "🏢", example: "Multi-site maintenance contracts — VaNi coordinates vendor assignments across locations, tracks evidence submissions, and optimizes service schedules." },
  { industry: "Wellness & Coaching", icon: "🧘", example: "Care programs with multiple sessions — VaNi tracks session completions, sends client reminders, manages package billing, and identifies clients at risk of drop-off." },
];

const LAYERS = [
  { phase: "Observe", icon: "👁️", color: "#8b5cf6", items: ["Continuous health monitoring across 6 pillars", "Pattern detection across your entire contract portfolio", "Risk factor identification with impact scoring", "14-day predictive health trajectory"] },
  { phase: "Act", icon: "⚡", color: "#f59e0b", items: ["Auto-draft communications & reminders", "Smart task assignment by skill + capacity", "Invoice generation at optimal timing", "Evidence & SLA monitoring with auto-escalation"] },
  { phase: "Learn", icon: "🧠", color: "#10b981", items: ["Cross-contract pattern analysis", "Client behavior profiling for better service", "Industry benchmarking from anonymized data", "Continuous improvement of predictions & actions"] },
];

function AnimatedCounter({ target, suffix = "", prefix = "", duration = 2000 }: { target: string; suffix?: string; prefix?: string; duration?: number }) {
  const [count, setCount] = useState<string | number>(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const num = parseFloat(target);
    if (isNaN(num)) { setCount(target); return; }
    const steps = 40;
    const increment = num / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= num) { setCount(num); clearInterval(timer); }
      else setCount(Math.round(current * 10) / 10);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [started, target, duration]);

  return <span ref={ref}>{prefix}{typeof count === "number" ? (Number.isInteger(parseFloat(target)) ? Math.round(count as number) : (count as number).toFixed(1)) : count}{suffix}</span>;
}

export default function VaNiLandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const navigate = useNavigate();

  // ── 1-week trial (real entitlement over /api/vani) ──
  const entitlementQuery = useVaniEntitlement();
  const startTrial = useStartVaniTrial();
  const ent = entitlementQuery.data;
  const subscribed = ent?.status === "active";
  const trialActive = ent?.trial_active === true;
  const trialUsed = ent?.has_subscription === true && !trialActive && !subscribed;
  const trialDaysLeft = trialActive && ent?.trial_ends
    ? Math.max(0, Math.ceil((new Date(ent.trial_ends).getTime() - Date.now()) / 86_400_000))
    : 0;

  const handleTrialClick = async () => {
    if (trialActive || subscribed) {
      navigate("/vani/briefing");
      return;
    }
    if (trialUsed || startTrial.isPending || entitlementQuery.isLoading) return;
    try {
      const data = await startTrial.mutateAsync();
      if (data?.started_now || data?.trial_active) navigate("/vani/briefing");
    } catch {
      // error toast raised by the mutation hook
    }
  };

  const trialCtaLabel = entitlementQuery.isLoading
    ? "Checking your access…"
    : startTrial.isPending
      ? "Starting your trial…"
      : subscribed
        ? "Open your Briefing →"
        : trialActive
          ? `Open your Briefing → · ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left`
          : trialUsed
            ? "Trial ended — write to connect@vikuna.io"
            : "Start your 1-week free trial";
  const trialCtaDisabled = entitlementQuery.isLoading || startTrial.isPending || trialUsed;

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa", fontFamily: "'Outfit', sans-serif", overflowX: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spinSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .vani-fade-up { animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .vani-hover-lift { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease; }
        .vani-hover-lift:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(139, 92, 246, 0.15); }
      `}</style>

      {/* ═══ AMBIENT BACKGROUND ═══ */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "60%", height: "60%", background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)", animation: "float 8s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "-20%", right: "-10%", width: "50%", height: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)", animation: "float 10s ease-in-out infinite 2s" }} />
        <div style={{ position: "absolute", top: "40%", right: "20%", width: "30%", height: "30%", background: "radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)", animation: "float 12s ease-in-out infinite 4s" }} />
      </div>

      {/* ═══ HERO ═══ */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 40px 100px", textAlign: "center" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {/* Coming Soon badge */}
          <div className="vani-fade-up" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 20px", borderRadius: 40, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", marginBottom: 32, animationDelay: "0.1s" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8b5cf6", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 13, color: "#a78bfa", fontWeight: 500 }}>
              {trialActive ? `Trial active · ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left` : subscribed ? "Active" : trialUsed ? "Trial ended" : "1-week free trial"}
            </span>
            <span style={{ fontSize: 13, color: "#6d28d9" }}>·</span>
            <span style={{ fontFamily: "'Noto Sans Devanagari', sans-serif", fontSize: 14, color: "#c4b5fd" }}>वाणी</span>
          </div>

          <h1 className="vani-fade-up" style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.05, letterSpacing: -3, margin: "0 0 24px", animationDelay: "0.2s" }}>
            <span style={{ color: "#fafafa" }}>Your contracts,</span><br />
            <span style={{ background: "linear-gradient(135deg, #8b5cf6, #a78bfa, #c4b5fd, #f59e0b)", backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent", backgroundSize: "200% 200%", animation: "gradientShift 4s ease infinite" }}>
              managed by intelligence.
            </span>
          </h1>

          <p className="vani-fade-up" style={{ fontSize: 20, color: "#a1a1aa", lineHeight: 1.7, maxWidth: 650, margin: "0 auto 40px", fontWeight: 400, animationDelay: "0.3s" }}>
            VaNi is an AI agent that observes your contract portfolio, acts on routine decisions, and learns patterns that make every contract healthier than the last. Not a replacement — a <strong style={{ color: "#e4e4e7" }}>force multiplier</strong>.
          </p>

          <div className="vani-fade-up" style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", animationDelay: "0.4s" }}>
            <button onClick={handleTrialClick} disabled={trialCtaDisabled}
              style={{ padding: "14px 36px", borderRadius: 14, border: "none", background: trialUsed ? "rgba(139,92,246,0.25)" : "linear-gradient(135deg, #10b981, #059669)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: trialCtaDisabled ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: trialUsed ? "none" : "0 8px 30px rgba(16,185,129,0.3)", opacity: entitlementQuery.isLoading || startTrial.isPending ? 0.7 : 1, fontFamily: "inherit" }}
            >
              {(entitlementQuery.isLoading || startTrial.isPending) && (
                <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", animation: "spinSlow 0.8s linear infinite" }} />
              )}
              {trialCtaLabel}
            </button>
            <a href="#how" style={{ padding: "14px 36px", borderRadius: 14, background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", color: "#fff", fontSize: 16, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 8px 30px rgba(139,92,246,0.3)", transition: "transform 0.2s, box-shadow 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(139,92,246,0.4)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(139,92,246,0.3)"; }}
            >
              See How It Works <span style={{ fontSize: 20 }}>→</span>
            </a>
          </div>

          {/* Subtitle */}
          <div className="vani-fade-up" style={{ marginTop: 20, fontSize: 14, color: "#8b5cf6", fontWeight: 600, animationDelay: "0.45s" }}>
            Virtual Assistant with Natural Interaction
          </div>

          {/* Trust line */}
          <div className="vani-fade-up" style={{ marginTop: 32, fontSize: 12, color: "#52525b", animationDelay: "0.5s" }}>
            Built on <strong style={{ color: "#71717a" }}>ContractNest</strong> · Powered by <strong style={{ color: "#71717a" }}>Vikuna Technologies</strong>
          </div>
        </div>
      </section>

      {/* ═══ THE SHIFT ═══ */}
      <section style={{ position: "relative", zIndex: 1, padding: "60px 40px 80px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 1fr", gap: 0, alignItems: "stretch" }}>
            {/* Before */}
            <div style={{ padding: 32, borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>Without VaNi</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fafafa", marginBottom: 20 }}>You check dashboards.<br/>You chase updates.<br/>You react to problems.</div>
              {["Manual health monitoring — see issues after they happen", "Team members forget tasks — you follow up constantly", "Invoices delayed — cash flow suffers silently", "Renewal opportunities missed — revenue walks away", "Every contract feels like starting from scratch"].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                  <span style={{ color: "#ef4444", fontSize: 14, marginTop: 2 }}>✗</span>
                  <span style={{ fontSize: 13, color: "#71717a", lineHeight: 1.5 }}>{t}</span>
                </div>
              ))}
            </div>
            {/* Arrow */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 0 30px rgba(139,92,246,0.3)" }}>→</div>
            </div>
            {/* After */}
            <div style={{ padding: 32, borderRadius: 20, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>With VaNi</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fafafa", marginBottom: 20 }}>VaNi watches everything.<br/>VaNi handles routine.<br/>You make decisions.</div>
              {["Predictive health — know risks 14 days before they hit", "Auto-nudges and smart assignments — your team stays on track", "Invoices timed for optimal payment — cash flow optimized", "Cross-sell detected automatically — revenue grows itself", "Every contract benefits from all contracts before it"].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                  <span style={{ color: "#10b981", fontSize: 14, marginTop: 2 }}>✓</span>
                  <span style={{ fontSize: 13, color: "#d4d4d8", lineHeight: 1.5 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ THREE LAYERS ═══ */}
      <section id="how" style={{ position: "relative", zIndex: 1, padding: "80px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: 3, marginBottom: 12 }}>How VaNi Works</div>
            <h2 style={{ fontSize: 44, fontWeight: 900, letterSpacing: -1.5, margin: 0 }}>Three layers of intelligence</h2>
            <p style={{ fontSize: 16, color: "#71717a", marginTop: 12, maxWidth: 550, margin: "12px auto 0" }}>Each layer feeds the next. Observations power actions. Actions generate data. Data deepens learning.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            {LAYERS.map((layer, i) => (
              <div key={i} className="vani-hover-lift" style={{ padding: 32, borderRadius: 20, background: "rgba(255,255,255,0.03)", border: `1px solid ${layer.color}20`, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: `${layer.color}08` }} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <span style={{ fontSize: 32 }}>{layer.icon}</span>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: layer.color, textTransform: "uppercase", letterSpacing: 2 }}>Layer {i + 1}</div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: "#fafafa", letterSpacing: -0.5 }}>{layer.phase}</div>
                    </div>
                  </div>
                  {layer.items.map((item, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: layer.color, marginTop: 7, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, color: "#a1a1aa", lineHeight: 1.6 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* Connecting arrow */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 24, color: "#3f3f46" }}>
            <div style={{ height: 1, width: 80, background: "linear-gradient(90deg, transparent, #8b5cf630)" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#8b5cf6" }}>Continuous feedback loop</span>
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: "1px solid #8b5cf640", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 10, animation: "spinSlow 4s linear infinite" }}>↻</span>
            </div>
            <div style={{ height: 1, width: 80, background: "linear-gradient(90deg, #8b5cf630, transparent)" }} />
          </div>
        </div>
      </section>

      {/* ═══ FEATURES GRID ═══ */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: 3, marginBottom: 12 }}>Capabilities</div>
            <h2 style={{ fontSize: 44, fontWeight: 900, letterSpacing: -1.5, margin: 0 }}>What VaNi does for you</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="vani-hover-lift" style={{ padding: 28, borderRadius: 20, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", cursor: "default" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <span style={{ fontSize: 32 }}>{f.icon}</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: f.color }}><AnimatedCounter target={f.stat} /></div>
                    <div style={{ fontSize: 10, color: "#52525b", fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>{f.statLabel}</div>
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#fafafa", marginBottom: 8, letterSpacing: -0.3 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "#71717a", lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ USE CASES ═══ */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: 3, marginBottom: 12 }}>Industry Agnostic</div>
            <h2 style={{ fontSize: 44, fontWeight: 900, letterSpacing: -1.5, margin: 0 }}>Wherever there are service contracts</h2>
            <p style={{ fontSize: 16, color: "#71717a", marginTop: 12 }}>VaNi adapts to any industry because contracts share the same DNA — commitments, tasks, evidence, payments.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {USECASES.map((uc, i) => (
              <div key={i} style={{ padding: 28, borderRadius: 20, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>{uc.icon}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#fafafa" }}>{uc.industry}</span>
                </div>
                <p style={{ fontSize: 14, color: "#a1a1aa", lineHeight: 1.7, margin: 0 }}>{uc.example}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ THE PHILOSOPHY ═══ */}
      <section style={{ position: "relative", zIndex: 1, padding: "80px 40px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 60, marginBottom: 24 }}>🤝</div>
          <h2 style={{ fontSize: 40, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.2 }}>
            Force multiplier.<br />
            <span style={{ color: "#71717a" }}>Never a replacement.</span>
          </h2>
          <p style={{ fontSize: 18, color: "#a1a1aa", lineHeight: 1.8, marginTop: 20, maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
            VaNi is built on a simple belief: your team's expertise is irreplaceable. What <em>is</em> replaceable is the tedious monitoring, the repetitive follow-ups, the things that drain energy without adding insight. VaNi handles the mechanical so your team can focus on the meaningful.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginTop: 48 }}>
            {[
              { num: "10×", label: "Contracts managed per person", color: "#8b5cf6" },
              { num: "0", label: "Decisions made without your approval", color: "#10b981" },
              { num: "∞", label: "Patterns learned over time", color: "#f59e0b" },
            ].map((s, i) => (
              <div key={i} style={{ padding: "24px 16px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 36, fontWeight: 700, color: s.color }}>{s.num}</div>
                <div style={{ fontSize: 12, color: "#71717a", marginTop: 4, lineHeight: 1.4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ COMING SOON CTA ═══ */}
      <section style={{ position: "relative", zIndex: 1, padding: "100px 40px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ textAlign: "center", padding: 60, borderRadius: 28, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)" }} />
            <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: 56, marginBottom: 20 }}>🚀</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: 3, marginBottom: 12 }}>{trialActive || subscribed ? "VaNi is with you" : "1-week free trial"}</div>
              <h2 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1, margin: "0 0 12px" }}>{trialActive || subscribed ? "VaNi is reporting for work" : "Meet your virtual employee"}</h2>
              <p style={{ fontSize: 16, color: "#a1a1aa", lineHeight: 1.7, maxWidth: 420, margin: "0 auto 28px" }}>
                {trialActive || subscribed
                  ? "Your daily Briefing shows what VaNi handled automatically and what needs your decision."
                  : "Try VaNi free for one week — see your daily Briefing of what it handles automatically and what needs your eye."}
              </p>
              <button onClick={handleTrialClick} disabled={trialCtaDisabled}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 14, border: "none", background: trialUsed ? "rgba(139,92,246,0.25)" : "linear-gradient(135deg, #10b981, #059669)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: trialCtaDisabled ? "default" : "pointer", boxShadow: trialUsed ? "none" : "0 8px 30px rgba(16,185,129,0.3)", opacity: entitlementQuery.isLoading || startTrial.isPending ? 0.7 : 1, fontFamily: "inherit" }}
              >
                {(entitlementQuery.isLoading || startTrial.isPending) && (
                  <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", animation: "spinSlow 0.8s linear infinite" }} />
                )}
                {trialCtaLabel}
              </button>
              <div style={{ marginTop: 24, fontSize: 12, color: "#52525b" }}>
                In the meantime, explore <strong style={{ color: "#71717a" }}>ContractNest</strong> to manage your contracts today.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ position: "relative", zIndex: 1, borderTop: "1px solid rgba(255,255,255,0.06)", padding: "48px 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>V</div>
              <span style={{ fontSize: 14, fontWeight: 700 }}>VaNi</span>
              <span style={{ fontFamily: "'Noto Sans Devanagari', sans-serif", fontSize: 13, color: "#52525b" }}>वाणी</span>
            </div>
            <div style={{ fontSize: 12, color: "#3f3f46" }}>Virtual Assistant with Natural Interaction</div>
            <div style={{ fontSize: 11, color: "#27272a", marginTop: 4 }}>© 2026 Vikuna Technologies LLP. All rights reserved.</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#52525b", marginBottom: 4 }}>A product of</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#71717a" }}>Vikuna Technologies</div>
            <div style={{ fontSize: 11, color: "#3f3f46", marginTop: 2 }}>Hyderabad, India · connect@vikuna.io</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

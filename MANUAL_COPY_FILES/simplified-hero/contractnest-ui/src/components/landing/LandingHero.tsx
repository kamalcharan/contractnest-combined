// src/components/landing/LandingHero.tsx - Enhanced with Animated Background
import React from 'react';
import {
  Rocket,
  Play,
  Building2,
  Wrench,
  Hospital,
  Factory,
  Building,
  ClipboardList,
  Briefcase,
  Monitor,
  ShieldCheck,
  BarChart3,
  Sparkles,
  ArrowRight,
  FileText,
  Handshake,
  Calendar,
  Receipt,
  RefreshCw,
  CheckCircle
} from 'lucide-react';

interface HeroProps {
  onPlaygroundClick?: () => void;
  onBuyerExplore?: () => void;
  onSellerExplore?: () => void;
  className?: string;
}

// Persona data
const buyerPersonas = [
  { icon: Hospital, label: 'Hospitals', color: 'text-red-500' },
  { icon: Factory, label: 'Manufacturing', color: 'text-orange-500' },
  { icon: Building, label: 'Facilities', color: 'text-blue-500' },
  { icon: ClipboardList, label: 'Procurement', color: 'text-green-500' },
  { icon: Briefcase, label: 'Enterprise', color: 'text-purple-500' },
];

const sellerPersonas = [
  { icon: Wrench, label: 'AMC', color: 'text-orange-500' },
  { icon: Monitor, label: 'IT Services', color: 'text-blue-500' },
  { icon: Sparkles, label: 'Facility', color: 'text-cyan-500' },
  { icon: ShieldCheck, label: 'Security', color: 'text-green-500' },
  { icon: BarChart3, label: 'Consulting', color: 'text-purple-500' },
];

// Floating background icons
const floatingIcons = [
  { Icon: FileText, top: '8%', left: '5%', delay: '0s', duration: '20s' },
  { Icon: Handshake, top: '15%', right: '8%', delay: '2s', duration: '18s' },
  { Icon: Calendar, top: '60%', left: '3%', delay: '4s', duration: '22s' },
  { Icon: Receipt, top: '70%', right: '5%', delay: '1s', duration: '19s' },
  { Icon: RefreshCw, top: '35%', left: '8%', delay: '3s', duration: '21s' },
  { Icon: CheckCircle, top: '25%', right: '12%', delay: '5s', duration: '17s' },
  { Icon: FileText, bottom: '15%', left: '12%', delay: '2.5s', duration: '23s' },
  { Icon: Handshake, bottom: '25%', right: '10%', delay: '1.5s', duration: '20s' },
];

// Geometric shapes
const geometricShapes = [
  { type: 'circle', top: '20%', left: '15%', size: 'w-3 h-3', delay: '0s', duration: '15s' },
  { type: 'circle', top: '45%', right: '18%', size: 'w-2 h-2', delay: '2s', duration: '18s' },
  { type: 'circle', bottom: '30%', left: '20%', size: 'w-4 h-4', delay: '4s', duration: '20s' },
  { type: 'triangle', top: '30%', right: '25%', size: 'w-4 h-4', delay: '1s', duration: '16s' },
  { type: 'triangle', bottom: '20%', left: '25%', size: 'w-3 h-3', delay: '3s', duration: '19s' },
  { type: 'square', top: '55%', left: '10%', size: 'w-2 h-2', delay: '2.5s', duration: '17s' },
  { type: 'square', top: '10%', right: '20%', size: 'w-3 h-3', delay: '0.5s', duration: '21s' },
];

const LandingHero: React.FC<HeroProps> = ({
  onPlaygroundClick,
  onBuyerExplore,
  onSellerExplore,
  className = ''
}) => {
  const handlePlaygroundClick = () => {
    if (onPlaygroundClick) {
      onPlaygroundClick();
    } else {
      const playgroundSection = document.getElementById('playground');
      if (playgroundSection) {
        playgroundSection.scrollIntoView({ behavior: 'smooth' });
      }
    }

    if (typeof gtag !== 'undefined') {
      gtag('event', 'playground_cta_click', {
        event_category: 'engagement',
        event_label: 'hero_playground_button',
        value: 1
      });
    }
  };

  const handleExploreClick = (persona: 'buyer' | 'seller') => {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'persona_explore_click', {
        event_category: 'engagement',
        event_label: `${persona}_explore`,
        value: 1
      });
    }

    if (persona === 'buyer' && onBuyerExplore) {
      onBuyerExplore();
    } else if (persona === 'seller' && onSellerExplore) {
      onSellerExplore();
    } else {
      const playgroundSection = document.getElementById('playground');
      if (playgroundSection) {
        playgroundSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section className={`relative overflow-hidden min-h-[calc(100vh-80px)] flex items-center ${className}`}>
      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-10px) rotate(2deg); }
          50% { transform: translateY(-5px) rotate(-1deg); }
          75% { transform: translateY(-15px) rotate(1deg); }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-8px) translateX(5px); }
          66% { transform: translateY(-4px) translateX(-3px); }
        }
        @keyframes pulse-subtle {
          0%, 100% { opacity: 0.08; }
          50% { opacity: 0.15; }
        }
        .animate-float {
          animation: float var(--duration, 20s) ease-in-out infinite;
          animation-delay: var(--delay, 0s);
        }
        .animate-float-slow {
          animation: floatSlow var(--duration, 15s) ease-in-out infinite;
          animation-delay: var(--delay, 0s);
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 4s ease-in-out infinite;
        }
      `}</style>

      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-red-50/30" />

      {/* Soft color blobs */}
      <div className="absolute top-10 left-5 w-64 h-64 bg-red-100/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-5 w-72 h-72 bg-blue-100/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-50/20 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Icons */}
      {floatingIcons.map((item, index) => (
        <div
          key={`icon-${index}`}
          className="absolute pointer-events-none animate-float"
          style={{
            top: item.top,
            left: item.left,
            right: item.right,
            bottom: item.bottom,
            '--delay': item.delay,
            '--duration': item.duration,
          } as React.CSSProperties}
        >
          <item.Icon className="w-6 h-6 text-slate-300/50" strokeWidth={1} />
        </div>
      ))}

      {/* Geometric Shapes */}
      {geometricShapes.map((shape, index) => (
        <div
          key={`shape-${index}`}
          className={`absolute pointer-events-none animate-float-slow ${shape.size}`}
          style={{
            top: shape.top,
            left: shape.left,
            right: shape.right,
            bottom: shape.bottom,
            '--delay': shape.delay,
            '--duration': shape.duration,
          } as React.CSSProperties}
        >
          {shape.type === 'circle' && (
            <div className="w-full h-full rounded-full bg-slate-300/20 animate-pulse-subtle" />
          )}
          {shape.type === 'triangle' && (
            <div
              className="w-0 h-0 animate-pulse-subtle"
              style={{
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderBottom: '10px solid rgba(148, 163, 184, 0.15)',
              }}
            />
          )}
          {shape.type === 'square' && (
            <div className="w-full h-full bg-slate-300/15 rotate-45 animate-pulse-subtle" />
          )}
        </div>
      ))}

      {/* Content */}
      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">

        {/* Hero Text Content */}
        <div className="text-center max-w-4xl mx-auto mb-6 md:mb-8">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 mb-4 shadow-sm backdrop-blur-sm">
            <Rocket className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs font-semibold text-red-600">Launching Soon</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-3">
            Where Service Contracts
            <span className="text-red-500"> Just Work.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-sm sm:text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto mb-5">
            Whether you're tracking 50 vendors or chasing 50 renewals—
            <span className="text-slate-800 font-medium"> one platform to manage it all.</span>
          </p>

          {/* CTA Button */}
          <div className="flex flex-col items-center gap-1.5 mb-6">
            <button
              onClick={handlePlaygroundClick}
              className="group inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white text-sm md:text-base font-semibold rounded-xl shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transition-all duration-300 transform hover:-translate-y-0.5"
            >
              <Play className="w-4 h-4 fill-current" />
              Try the Playground
            </button>

            {/* Trust Line */}
            <p className="text-xs text-slate-400">
              No signup required • 60 seconds
            </p>
          </div>
        </div>

        {/* Persona Cards - BIGGER */}
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">

            {/* Buyer Card */}
            <div
              onClick={() => handleExploreClick('buyer')}
              className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-5 md:p-6 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-slate-900">I Manage Vendors</h3>
                    <p className="text-xs md:text-sm text-slate-500">Track contracts & compliance</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-blue-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>

              {/* Persona Icons */}
              <div className="flex items-center justify-between">
                {buyerPersonas.map((persona, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                      <persona.icon className={`w-4 h-4 md:w-5 md:h-5 ${persona.color}`} />
                    </div>
                    <span className="text-[10px] md:text-xs text-slate-400 mt-1.5 font-medium">{persona.label}</span>
                  </div>
                ))}
              </div>

              {/* Hover gradient */}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Seller Card */}
            <div
              onClick={() => handleExploreClick('seller')}
              className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-5 md:p-6 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:border-orange-200 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-slate-900">I Provide Services</h3>
                    <p className="text-xs md:text-sm text-slate-500">Win contracts & automate billing</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-orange-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
              </div>

              {/* Persona Icons */}
              <div className="flex items-center justify-between">
                {sellerPersonas.map((persona, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                      <persona.icon className={`w-4 h-4 md:w-5 md:h-5 ${persona.color}`} />
                    </div>
                    <span className="text-[10px] md:text-xs text-slate-400 mt-1.5 font-medium">{persona.label}</span>
                  </div>
                ))}
              </div>

              {/* Hover gradient */}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default LandingHero;

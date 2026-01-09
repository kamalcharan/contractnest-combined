// src/components/landing/LandingHero.tsx - Compact Version (Above the Fold)
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
  ArrowRight
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
  { icon: Factory, label: 'Mfg', color: 'text-orange-500' },
  { icon: Building, label: 'Facilities', color: 'text-blue-500' },
  { icon: ClipboardList, label: 'Procurement', color: 'text-green-500' },
  { icon: Briefcase, label: 'Enterprise', color: 'text-purple-500' },
];

const sellerPersonas = [
  { icon: Wrench, label: 'AMC', color: 'text-orange-500' },
  { icon: Monitor, label: 'IT', color: 'text-blue-500' },
  { icon: Sparkles, label: 'Facility', color: 'text-cyan-500' },
  { icon: ShieldCheck, label: 'Security', color: 'text-green-500' },
  { icon: BarChart3, label: 'Consulting', color: 'text-purple-500' },
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
    <section className={`relative overflow-hidden ${className}`}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-red-50/30" />

      {/* Decorative elements */}
      <div className="absolute top-10 left-5 w-64 h-64 bg-red-100/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-5 w-72 h-72 bg-blue-100/20 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 lg:py-14">

        {/* Hero Text Content */}
        <div className="text-center max-w-4xl mx-auto mb-6 md:mb-8">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 mb-4 shadow-sm">
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

        {/* Persona Cards - Compact Inline */}
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">

            {/* Buyer Card */}
            <div
              onClick={() => handleExploreClick('buyer')}
              className="group relative bg-white rounded-xl p-4 shadow-md shadow-slate-200/50 border border-slate-100 hover:shadow-lg hover:border-blue-200 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">I Manage Vendors</h3>
                    <p className="text-[11px] text-slate-500">Track contracts & compliance</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>

              {/* Persona Icons - Compact Row */}
              <div className="flex items-center justify-between">
                {buyerPersonas.map((persona, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-md bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                      <persona.icon className={`w-3.5 h-3.5 ${persona.color}`} />
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1">{persona.label}</span>
                  </div>
                ))}
              </div>

              {/* Hover gradient */}
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Seller Card */}
            <div
              onClick={() => handleExploreClick('seller')}
              className="group relative bg-white rounded-xl p-4 shadow-md shadow-slate-200/50 border border-slate-100 hover:shadow-lg hover:border-orange-200 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                    <Wrench className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">I Provide Services</h3>
                    <p className="text-[11px] text-slate-500">Win contracts & automate billing</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-orange-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
              </div>

              {/* Persona Icons - Compact Row */}
              <div className="flex items-center justify-between">
                {sellerPersonas.map((persona, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-md bg-slate-50 flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                      <persona.icon className={`w-3.5 h-3.5 ${persona.color}`} />
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1">{persona.label}</span>
                  </div>
                ))}
              </div>

              {/* Hover gradient */}
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default LandingHero;

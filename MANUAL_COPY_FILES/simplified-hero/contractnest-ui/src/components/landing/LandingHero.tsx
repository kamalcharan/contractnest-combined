// src/components/landing/LandingHero.tsx - Simplified Version with Persona Cards
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
  { icon: Factory, label: 'Manufacturing', color: 'text-orange-500' },
  { icon: Building, label: 'Facilities', color: 'text-blue-500' },
  { icon: ClipboardList, label: 'Procurement', color: 'text-green-500' },
  { icon: Briefcase, label: 'Enterprise', color: 'text-purple-500' },
];

const sellerPersonas = [
  { icon: Wrench, label: 'AMC Vendors', color: 'text-orange-500' },
  { icon: Monitor, label: 'IT Services', color: 'text-blue-500' },
  { icon: Sparkles, label: 'Facility Mgmt', color: 'text-cyan-500' },
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
      // Default: scroll to playground section
      const playgroundSection = document.getElementById('playground');
      if (playgroundSection) {
        playgroundSection.scrollIntoView({ behavior: 'smooth' });
      }
    }

    // Track CTA click
    if (typeof gtag !== 'undefined') {
      gtag('event', 'playground_cta_click', {
        event_category: 'engagement',
        event_label: 'hero_playground_button',
        value: 1
      });
    }
  };

  const handleExploreClick = (persona: 'buyer' | 'seller') => {
    // Track persona selection
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
      // Default: scroll to playground
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
      <div className="absolute top-20 left-10 w-72 h-72 bg-red-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-40 right-10 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-28">

        {/* Hero Text Content */}
        <div className="text-center max-w-4xl mx-auto mb-16 md:mb-20">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 mb-8 shadow-sm">
            <Rocket className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-red-600">Launching Soon</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-6">
            Where Service Contracts
            <span className="block text-red-500 mt-2">Just Work.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl md:text-2xl text-slate-600 leading-relaxed max-w-3xl mx-auto mb-10">
            Whether you're tracking 50 vendors or chasing 50 renewals—
            <span className="text-slate-800 font-medium"> one platform to manage it all.</span>
          </p>

          {/* CTA Button */}
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handlePlaygroundClick}
              className="group inline-flex items-center gap-3 px-8 py-4 bg-red-500 hover:bg-red-600 text-white text-lg font-semibold rounded-xl shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transition-all duration-300 transform hover:-translate-y-0.5"
            >
              <Play className="w-5 h-5 fill-current" />
              Try the Playground
            </button>

            {/* Trust Line */}
            <p className="text-sm text-slate-500">
              No signup required • Takes 60 seconds
            </p>
          </div>
        </div>

        {/* Persona Cards */}
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">

            {/* Buyer Card */}
            <div className="group relative bg-white rounded-2xl p-6 lg:p-8 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300">
              {/* Card Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">I Manage Vendors</h3>
                </div>
              </div>

              {/* Description */}
              <p className="text-slate-600 mb-6">
                Track contracts, vendors & compliance in one place
              </p>

              {/* Persona Icons */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                {buyerPersonas.map((persona, index) => (
                  <div key={index} className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                      <persona.icon className={`w-5 h-5 ${persona.color}`} />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">{persona.label}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => handleExploreClick('buyer')}
                className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors"
              >
                Explore
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Decorative gradient */}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Seller Card */}
            <div className="group relative bg-white rounded-2xl p-6 lg:p-8 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:border-orange-100 transition-all duration-300">
              {/* Card Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">I Provide Services</h3>
                </div>
              </div>

              {/* Description */}
              <p className="text-slate-600 mb-6">
                Win contracts, automate renewals & invoicing
              </p>

              {/* Persona Icons */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                {sellerPersonas.map((persona, index) => (
                  <div key={index} className="flex flex-col items-center gap-1.5">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                      <persona.icon className={`w-5 h-5 ${persona.color}`} />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">{persona.label}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => handleExploreClick('seller')}
                className="inline-flex items-center gap-2 text-orange-600 font-semibold hover:text-orange-700 transition-colors"
              >
                Explore
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Decorative gradient */}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default LandingHero;

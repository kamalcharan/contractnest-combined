// src/components/playground/PlaygroundWelcome.tsx
import React from 'react';
import { Wrench, ShoppingCart, ArrowRight, Sparkles, Building2, Play } from 'lucide-react';
import { PersonaType } from './types';

interface PlaygroundWelcomeProps {
  onSelectPersona: (persona: PersonaType) => void;
}

const PlaygroundWelcome: React.FC<PlaygroundWelcomeProps> = ({ onSelectPersona }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Interactive Demo
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
            Experience ContractNest
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
            See how easy it is to create and manage service contracts.
            No signup required - try it now!
          </p>
        </div>

        {/* Industry Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-3 px-5 py-3 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-left">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Demo Industry</p>
              <p className="font-semibold text-slate-900">Equipment AMC</p>
            </div>
          </div>
        </div>

        {/* Persona Selection Cards */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
          {/* Seller Card */}
          <button
            onClick={() => onSelectPersona('seller')}
            className="group relative bg-white rounded-2xl p-6 sm:p-8 border-2 border-slate-200 hover:border-indigo-500 hover:shadow-xl transition-all duration-300 text-left"
          >
            <div className="absolute top-4 right-4 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight className="w-4 h-4 text-indigo-600" />
            </div>

            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Wrench className="w-7 h-7 text-white" />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
              I'm a Seller
            </h3>
            <p className="text-slate-600 mb-4">
              Create service contracts with drag-and-drop blocks.
              Build quotes and send to customers instantly.
            </p>

            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                Build Contracts
              </span>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                Send Quotes
              </span>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                Track Status
              </span>
            </div>

            <div className="mt-6 flex items-center gap-2 text-indigo-600 font-medium group-hover:gap-3 transition-all">
              <Play className="w-4 h-4" />
              Start as Seller
            </div>
          </button>

          {/* Buyer Card */}
          <button
            onClick={() => onSelectPersona('buyer')}
            className="group relative bg-white rounded-2xl p-6 sm:p-8 border-2 border-slate-200 hover:border-orange-500 hover:shadow-xl transition-all duration-300 text-left"
          >
            <div className="absolute top-4 right-4 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight className="w-4 h-4 text-orange-600" />
            </div>

            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-7 h-7 text-white" />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
              I'm a Buyer
            </h3>
            <p className="text-slate-600 mb-4">
              Create RFPs, compare vendor quotes side-by-side,
              and accept the best offer with one click.
            </p>

            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium">
                Create RFP
              </span>
              <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium">
                Compare Quotes
              </span>
              <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium">
                Accept Vendor
              </span>
            </div>

            <div className="mt-6 flex items-center gap-2 text-orange-600 font-medium group-hover:gap-3 transition-all">
              <Play className="w-4 h-4" />
              Start as Buyer
            </div>
          </button>
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-slate-500">
          This is an interactive demo. No real contracts will be created.
        </p>
      </div>
    </div>
  );
};

export default PlaygroundWelcome;

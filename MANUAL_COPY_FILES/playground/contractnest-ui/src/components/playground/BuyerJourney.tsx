// src/components/playground/BuyerJourney.tsx
import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Send,
  Check,
  Star,
  Clock,
  Shield,
  Zap,
  ChevronDown,
  Plus,
  X,
  Building2,
  MapPin,
  IndianRupee,
  Calendar,
  FileText,
  Users,
  Loader2,
} from 'lucide-react';
import { PlaygroundLead, RFPData, VendorQuote } from './types';
import { EQUIPMENT_AMC_VENDORS, EQUIPMENT_AMC_RFP_TEMPLATE, VENDOR_COLORS } from './data/dummyVendors';

interface BuyerJourneyProps {
  lead: PlaygroundLead;
  onBack: () => void;
  onAcceptVendor: (vendor: VendorQuote, rfpData: RFPData) => void;
}

type BuyerStep = 'rfp' | 'matching' | 'compare' | 'accepted';

const BuyerJourney: React.FC<BuyerJourneyProps> = ({ lead, onBack, onAcceptVendor }) => {
  const [step, setStep] = useState<BuyerStep>('rfp');
  const [rfpData, setRfpData] = useState<RFPData>({
    serviceType: 'Equipment Annual Maintenance Contract',
    equipmentType: '',
    quantity: 1,
    location: '',
    budget: '',
    timeline: '',
    requirements: [],
  });
  const [selectedVendor, setSelectedVendor] = useState<VendorQuote | null>(null);
  const [isMatching, setIsMatching] = useState(false);

  const handleRFPSubmit = async () => {
    setIsMatching(true);
    // Simulate API call for matching vendors
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsMatching(false);
    setStep('matching');

    // Auto-advance to compare after showing matching animation
    setTimeout(() => setStep('compare'), 1500);
  };

  const handleAcceptVendor = () => {
    if (selectedVendor) {
      onAcceptVendor(selectedVendor, rfpData);
    }
  };

  const toggleRequirement = (req: string) => {
    setRfpData((prev) => ({
      ...prev,
      requirements: prev.requirements.includes(req)
        ? prev.requirements.filter((r) => r !== req)
        : [...prev.requirements, req],
    }));
  };

  const canSubmitRFP = rfpData.equipmentType && rfpData.location && rfpData.budget && rfpData.timeline;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="font-bold text-slate-900">
                {step === 'rfp' && 'Create RFP'}
                {step === 'matching' && 'Finding Vendors'}
                {step === 'compare' && 'Compare Quotes'}
              </h1>
              <p className="text-xs text-slate-500">Equipment AMC</p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="hidden sm:flex items-center gap-2">
            {['rfp', 'matching', 'compare'].map((s, i) => (
              <React.Fragment key={s}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? 'bg-orange-500 text-white'
                      : ['rfp', 'matching', 'compare'].indexOf(step) > i
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {['rfp', 'matching', 'compare'].indexOf(step) > i ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < 2 && (
                  <div
                    className={`w-8 h-0.5 ${
                      ['rfp', 'matching', 'compare'].indexOf(step) > i
                        ? 'bg-green-500'
                        : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto p-4">
        {/* Step 1: RFP Creation */}
        {step === 'rfp' && (
          <div className="grid md:grid-cols-3 gap-4">
            {/* RFP Form */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  Describe Your Requirements
                </h3>

                <div className="space-y-4">
                  {/* Equipment Type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Equipment Type *
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select
                        value={rfpData.equipmentType}
                        onChange={(e) => setRfpData({ ...rfpData, equipmentType: e.target.value })}
                        className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none bg-white"
                      >
                        <option value="">Select equipment type</option>
                        {EQUIPMENT_AMC_RFP_TEMPLATE.equipmentTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Number of Units
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={rfpData.quantity}
                      onChange={(e) => setRfpData({ ...rfpData, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Service Location *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        value={rfpData.location}
                        onChange={(e) => setRfpData({ ...rfpData, location: e.target.value })}
                        placeholder="e.g., Jubilee Hills, Hyderabad"
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  {/* Budget */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Annual Budget Range *
                    </label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select
                        value={rfpData.budget}
                        onChange={(e) => setRfpData({ ...rfpData, budget: e.target.value })}
                        className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none bg-white"
                      >
                        <option value="">Select budget range</option>
                        {EQUIPMENT_AMC_RFP_TEMPLATE.budgetRanges.map((range) => (
                          <option key={range} value={range}>
                            {range}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Timeline */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Required Timeline *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <select
                        value={rfpData.timeline}
                        onChange={(e) => setRfpData({ ...rfpData, timeline: e.target.value })}
                        className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none bg-white"
                      >
                        <option value="">When do you need this?</option>
                        {EQUIPMENT_AMC_RFP_TEMPLATE.timelineOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirements Checklist */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Check className="w-5 h-5 text-orange-500" />
                  Key Requirements
                </h3>
                <p className="text-sm text-slate-500 mb-4">Select all that apply</p>

                <div className="grid sm:grid-cols-2 gap-2">
                  {EQUIPMENT_AMC_RFP_TEMPLATE.commonRequirements.map((req) => (
                    <button
                      key={req}
                      onClick={() => toggleRequirement(req)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        rfpData.requirements.includes(req)
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center ${
                            rfpData.requirements.includes(req)
                              ? 'bg-orange-500'
                              : 'border-2 border-slate-300'
                          }`}
                        >
                          {rfpData.requirements.includes(req) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="text-sm text-slate-700">{req}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleRFPSubmit}
                disabled={!canSubmitRFP || isMatching}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold transition-all ${
                  canSubmitRFP && !isMatching
                    ? 'bg-orange-500 text-white hover:bg-orange-600 active:scale-[0.99]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isMatching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Finding Vendors...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send to Verified Vendors
                  </>
                )}
              </button>
            </div>

            {/* Preview Sidebar */}
            <div className="hidden md:block">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sticky top-20">
                <h3 className="font-semibold text-slate-900 mb-3">RFP Preview</h3>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white mb-4">
                  <p className="text-xs text-orange-200 uppercase tracking-wide mb-1">Request For Proposal</p>
                  <p className="font-bold">{rfpData.serviceType}</p>
                  <p className="text-sm text-orange-200 mt-1">From: {lead.name}</p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Equipment</span>
                    <span className="text-slate-900 font-medium">
                      {rfpData.equipmentType || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Quantity</span>
                    <span className="text-slate-900 font-medium">{rfpData.quantity} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Location</span>
                    <span className="text-slate-900 font-medium">
                      {rfpData.location || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Budget</span>
                    <span className="text-slate-900 font-medium">
                      {rfpData.budget || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Timeline</span>
                    <span className="text-slate-900 font-medium">
                      {rfpData.timeline || '-'}
                    </span>
                  </div>

                  {rfpData.requirements.length > 0 && (
                    <div className="pt-3 border-t border-slate-200">
                      <p className="text-slate-500 mb-2">Requirements ({rfpData.requirements.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {rfpData.requirements.map((req) => (
                          <span
                            key={req}
                            className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs"
                          >
                            {req.split(' ').slice(0, 2).join(' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Matching Animation */}
        {step === 'matching' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center animate-pulse">
                <Users className="w-12 h-12 text-orange-500" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                <span className="text-white font-bold text-sm">3</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-6">Finding Matching Vendors</h2>
            <p className="text-slate-500 mt-2">We found 3 verified vendors for your requirements</p>
            <div className="flex items-center gap-2 mt-4">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Step 3: Compare Quotes */}
        {step === 'compare' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Compare Vendor Quotes</h2>
              <p className="text-slate-500 mt-1">
                3 vendors responded to your RFP. Select the best fit for your needs.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {EQUIPMENT_AMC_VENDORS.map((vendor) => {
                const colors = VENDOR_COLORS[vendor.id];
                const isSelected = selectedVendor?.id === vendor.id;

                return (
                  <div
                    key={vendor.id}
                    onClick={() => setSelectedVendor(vendor)}
                    className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                      isSelected ? 'border-orange-500 ring-2 ring-orange-200' : 'border-slate-200'
                    }`}
                  >
                    {/* Highlight Badge */}
                    {vendor.highlight && (
                      <div
                        className="px-3 py-1.5 text-xs font-semibold text-center"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {vendor.highlight}
                      </div>
                    )}

                    <div className="p-5">
                      {/* Vendor Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: colors.bg }}
                        >
                          {vendor.vendorLogo}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{vendor.vendorName}</h3>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-sm text-slate-600">{vendor.rating}</span>
                          </div>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mb-4">
                        <p className="text-xs text-slate-500 mb-1">Annual Quote</p>
                        <p className="text-2xl font-bold text-slate-900">
                          ₹{vendor.price.toLocaleString('en-IN')}
                        </p>
                      </div>

                      {/* Response Time */}
                      <div className="flex items-center gap-2 mb-4 text-sm">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">Response: {vendor.responseTime}</span>
                      </div>

                      {/* Features */}
                      <div className="space-y-2">
                        {vendor.features.slice(0, 4).map((feature, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-slate-600">{feature}</span>
                          </div>
                        ))}
                        {vendor.features.length > 4 && (
                          <p className="text-xs text-slate-400 pl-6">
                            +{vendor.features.length - 4} more features
                          </p>
                        )}
                      </div>

                      {/* Select Indicator */}
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <div
                          className={`w-full py-2 rounded-lg text-center text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-orange-500 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Click to Select'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Accept Button */}
            <button
              onClick={handleAcceptVendor}
              disabled={!selectedVendor}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold transition-all ${
                selectedVendor
                  ? 'bg-orange-500 text-white hover:bg-orange-600 active:scale-[0.99]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Check className="w-5 h-5" />
              Accept {selectedVendor?.vendorName || 'Vendor'}'s Quote
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerJourney;

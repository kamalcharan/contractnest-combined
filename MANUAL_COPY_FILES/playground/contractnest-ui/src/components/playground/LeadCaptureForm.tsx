// src/components/playground/LeadCaptureForm.tsx
import React, { useState } from 'react';
import { User, Mail, Phone, ArrowRight, ArrowLeft, Loader2, Wrench, ShoppingCart } from 'lucide-react';
import { PersonaType, PlaygroundLead } from './types';
import { supabase } from '../../utils/supabase';

interface LeadCaptureFormProps {
  persona: PersonaType;
  onBack: () => void;
  onSubmit: (lead: PlaygroundLead) => void;
}

const LeadCaptureForm: React.FC<LeadCaptureFormProps> = ({ persona, onBack, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[+]?[\d\s-]{10,}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const leadData: PlaygroundLead = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        industry: 'equipment_amc',
        persona,
        completed_demo: false,
      };

      // Save to Supabase directly
      const { data, error } = await supabase
        .from('leads_contractnest')
        .insert([leadData])
        .select()
        .single();

      if (error) {
        console.error('Error saving lead:', error);
        // Continue anyway - don't block the demo if DB fails
      }

      // Pass the lead data (with ID if saved) to parent
      onSubmit(data || leadData);
    } catch (err) {
      console.error('Error:', err);
      // Continue anyway
      onSubmit({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        industry: 'equipment_amc',
        persona,
        completed_demo: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSeller = persona === 'seller';
  const accentColor = isSeller ? 'indigo' : 'orange';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to selection
        </button>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className={`p-6 ${isSeller ? 'bg-gradient-to-r from-indigo-500 to-indigo-600' : 'bg-gradient-to-r from-orange-500 to-orange-600'}`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                {isSeller ? (
                  <Wrench className="w-6 h-6 text-white" />
                ) : (
                  <ShoppingCart className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {isSeller ? 'Seller Demo' : 'Buyer Demo'}
                </h2>
                <p className="text-white/80 text-sm">
                  Equipment AMC Industry
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <p className="text-slate-600 text-sm mb-4">
              Enter your details to start the interactive demo.
              We'll save your progress.
            </p>

            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`block w-full pl-10 pr-4 py-3 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.name
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : `border-slate-300 focus:ring-${accentColor}-500 focus:border-${accentColor}-500`
                  }`}
                  placeholder="John Doe"
                />
              </div>
              {errors.name && (
                <p className="mt-1.5 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`block w-full pl-10 pr-4 py-3 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.email
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'
                  }`}
                  placeholder="john@company.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`block w-full pl-10 pr-4 py-3 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.phone
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'
                  }`}
                  placeholder="+91 98765 43210"
                />
              </div>
              {errors.phone && (
                <p className="mt-1.5 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-white font-semibold transition-all ${
                isSubmitting
                  ? 'bg-slate-400 cursor-not-allowed'
                  : isSeller
                  ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'
                  : 'bg-orange-600 hover:bg-orange-700 active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Starting Demo...
                </>
              ) : (
                <>
                  Start Demo
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <p className="text-xs text-slate-500 text-center">
              By continuing, you agree to receive updates about ContractNest.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LeadCaptureForm;

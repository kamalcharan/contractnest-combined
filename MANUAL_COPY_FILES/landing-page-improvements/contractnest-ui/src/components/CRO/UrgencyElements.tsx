// src/components/CRO/UrgencyElements.tsx
import React, { useState, useEffect } from 'react';
import {
  Clock,
  Users,
  Zap,
  AlertCircle,
  X,
  Calendar,
  TrendingUp,
  CheckCircle,
  Star,
  Timer,
  Bell,
  Sparkles,
  User,
  Building2,
  Phone,
  Loader2,
  Gift,
  Shield,
  ArrowRight,
  PartyPopper
} from 'lucide-react';
import { supabase } from '../../utils/supabase';

const UrgencyElements = ({ 
  variant = 'countdown', // 'countdown', 'limited-spots', 'exit-intent', 'scarcity-banner', 'demo-slots'
  className = '',
  onTrigger = null,
  autoShow = true
}) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 20,
    hours: 23,
    minutes: 45,
    seconds: 30
  });
  
  const [showElement, setShowElement] = useState(false);
  const [spotsRemaining, setSpotsRemaining] = useState(12);
  const [demoSlotsLeft, setDemoSlotsLeft] = useState(5);
  const [exitIntentShown, setExitIntentShown] = useState(false);
  const [mouseY, setMouseY] = useState(0);

  // Form state for stylish capture
  const [formData, setFormData] = useState({ name: '', mobile: '', company: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Countdown timer logic
  useEffect(() => {
    if (variant !== 'countdown') return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { days, hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        } else if (days > 0) {
          days--;
          hours = 23;
          minutes = 59;
          seconds = 59;
        }
        
        return { days, hours, minutes, seconds };
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [variant]);

  // Spots remaining simulation
  useEffect(() => {
    if (variant !== 'limited-spots') return;
    
    const spotsTimer = setInterval(() => {
      setSpotsRemaining(prev => {
        const newCount = prev - (Math.random() > 0.8 ? 1 : 0);
        return Math.max(newCount, 3); // Never go below 3
      });
    }, 45000); // Decrease every 45 seconds
    
    return () => clearInterval(spotsTimer);
  }, [variant]);

  // Demo slots simulation
  useEffect(() => {
    if (variant !== 'demo-slots') return;
    
    const slotsTimer = setInterval(() => {
      setDemoSlotsLeft(prev => {
        const newCount = prev - (Math.random() > 0.7 ? 1 : 0);
        return Math.max(newCount, 1); // Never go below 1
      });
    }, 60000); // Decrease every minute
    
    return () => clearInterval(slotsTimer);
  }, [variant]);

  // Exit intent detection
  useEffect(() => {
    if (variant !== 'exit-intent') return;
    
    const handleMouseMove = (e) => {
      setMouseY(e.clientY);
    };
    
    const handleMouseLeave = (e) => {
      if (e.clientY <= 0 && !exitIntentShown && mouseY > 50) {
        setShowElement(true);
        setExitIntentShown(true);
        
        if (onTrigger) {
          onTrigger('exit-intent-triggered');
        }
        
        // Track exit intent
        if (typeof gtag !== 'undefined') {
          gtag('event', 'exit_intent', {
            event_category: 'urgency',
            event_label: 'exit_intent_popup'
          });
        }
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [variant, exitIntentShown, mouseY, onTrigger]);

  // Auto-show logic for other variants
  useEffect(() => {
    if (!autoShow || variant === 'exit-intent') return;
    
    const showTimer = setTimeout(() => {
      setShowElement(true);
    }, variant === 'scarcity-banner' ? 2000 : 5000);
    
    return () => clearTimeout(showTimer);
  }, [autoShow, variant]);

  const handleClose = () => {
    setShowElement(false);
    
    if (typeof gtag !== 'undefined') {
      gtag('event', 'urgency_element_closed', {
        event_category: 'urgency',
        event_label: variant
      });
    }
  };

  const handleCTAClick = () => {
    if (onTrigger) {
      onTrigger('urgency-cta-clicked', { variant, spotsRemaining, demoSlotsLeft });
    }

    if (typeof gtag !== 'undefined') {
      gtag('event', 'urgency_cta_click', {
        event_category: 'conversion',
        event_label: variant,
        value: variant === 'exit-intent' ? 10 : 5
      });
    }
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.mobile.trim()) errors.mobile = 'Mobile is required';
    else if (!/^[0-9]{10}$/.test(formData.mobile.replace(/\s/g, ''))) errors.mobile = 'Enter valid 10-digit mobile';
    if (!formData.company.trim()) errors.company = 'Company is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      await supabase.from('leads_contractnest').insert([{
        name: formData.name.trim(),
        email: `${formData.mobile}@earlyaccess.contractnest.com`,
        phone: formData.mobile.trim(),
        industry: 'early_access',
        persona: 'founder',
        completed_demo: false,
        source: 'early_access_countdown'
      }]);

      // Track conversion
      if (typeof gtag !== 'undefined') {
        gtag('event', 'early_access_signup', {
          event_category: 'conversion',
          event_label: 'countdown_form',
          value: 1
        });
      }

      if (onTrigger) {
        onTrigger('early-access-claimed', formData);
      }

      setIsSuccess(true);
    } catch (err) {
      console.error('Error saving lead:', err);
    }

    setIsSubmitting(false);
  };

  // Countdown Timer Component with Stylish Capture Form
  const CountdownTimer = () => (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Background with animated gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-500 to-orange-500 opacity-95" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_50%)]" />

      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: '2s'
            }}
          />
        ))}
      </div>

      <div className="relative z-10 py-8 px-6 md:px-12">
        {!isSuccess ? (
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium mb-4 border border-white/30">
                <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                Founding Member Exclusive
              </div>

              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Lock In 50% Off Forever
              </h3>

              {/* Countdown */}
              <div className="flex justify-center items-center gap-3 md:gap-4 mb-4">
                {[
                  { value: timeLeft.days, label: 'DAYS' },
                  { value: timeLeft.hours, label: 'HRS' },
                  { value: timeLeft.minutes, label: 'MIN' },
                  { value: timeLeft.seconds, label: 'SEC' }
                ].map((item, i) => (
                  <div key={i} className="text-center">
                    <div className="bg-white/95 backdrop-blur text-red-600 font-bold text-xl md:text-3xl w-12 md:w-16 h-12 md:h-16 rounded-xl flex items-center justify-center shadow-lg border-2 border-white/50">
                      {item.value.toString().padStart(2, '0')}
                    </div>
                    <div className="text-[10px] md:text-xs text-white/80 mt-1 font-medium">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stylish Form Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/20 shadow-2xl max-w-2xl mx-auto">
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Mobile Input */}
                <div className="relative">
                  <div className={`flex rounded-xl overflow-hidden border-2 transition-all duration-300 ${focusedField === 'mobile' ? 'border-white shadow-lg shadow-white/20' : 'border-white/30'} ${formErrors.mobile ? 'border-red-300' : ''}`}>
                    <span className="flex items-center px-4 bg-white/20 text-white font-medium border-r border-white/20">
                      <Phone className="h-4 w-4 mr-2" />
                      +91
                    </span>
                    <input
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      onFocus={() => setFocusedField('mobile')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="98765 43210"
                      maxLength={10}
                      className="flex-1 px-4 py-3.5 bg-white/10 text-white placeholder-white/50 focus:outline-none text-lg"
                    />
                  </div>
                  {formErrors.mobile && <p className="text-red-200 text-xs mt-1 ml-1">{formErrors.mobile}</p>}
                </div>

                {/* Name & Company Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name Input */}
                  <div className="relative">
                    <div className={`flex items-center rounded-xl overflow-hidden border-2 transition-all duration-300 ${focusedField === 'name' ? 'border-white shadow-lg shadow-white/20' : 'border-white/30'} ${formErrors.name ? 'border-red-300' : ''}`}>
                      <span className="flex items-center px-4 bg-white/20 text-white">
                        <User className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Your Name"
                        className="flex-1 px-4 py-3.5 bg-white/10 text-white placeholder-white/50 focus:outline-none"
                      />
                    </div>
                    {formErrors.name && <p className="text-red-200 text-xs mt-1 ml-1">{formErrors.name}</p>}
                  </div>

                  {/* Company Input */}
                  <div className="relative">
                    <div className={`flex items-center rounded-xl overflow-hidden border-2 transition-all duration-300 ${focusedField === 'company' ? 'border-white shadow-lg shadow-white/20' : 'border-white/30'} ${formErrors.company ? 'border-red-300' : ''}`}>
                      <span className="flex items-center px-4 bg-white/20 text-white">
                        <Building2 className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        onFocus={() => setFocusedField('company')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Company Name"
                        className="flex-1 px-4 py-3.5 bg-white/10 text-white placeholder-white/50 focus:outline-none"
                      />
                    </div>
                    {formErrors.company && <p className="text-red-200 text-xs mt-1 ml-1">{formErrors.company}</p>}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full relative group overflow-hidden bg-white text-red-600 font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 hover:shadow-2xl hover:shadow-white/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-red-50 via-white to-red-50 opacity-0 group-hover:opacity-50 transition-opacity duration-300" />

                  <span className="relative flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Securing Your Spot...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        Claim My Founding Member Pricing
                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </button>
              </form>

              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6 mt-6 pt-6 border-t border-white/20">
                <div className="flex items-center text-white/90 text-sm">
                  <Gift className="h-4 w-4 mr-2 text-yellow-300" />
                  <span>50% off locked forever</span>
                </div>
                <div className="flex items-center text-white/90 text-sm">
                  <Shield className="h-4 w-4 mr-2 text-green-300" />
                  <span>Priority onboarding</span>
                </div>
                <div className="flex items-center text-white/90 text-sm">
                  <Star className="h-4 w-4 mr-2 text-yellow-300" />
                  <span>Founding member badge</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Success State */
          <div className="max-w-lg mx-auto text-center py-8">
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto animate-bounce">
                <PartyPopper className="h-12 w-12 text-white" />
              </div>
              {/* Confetti-like elements */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-3 h-3 rounded-full animate-ping"
                  style={{
                    backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1'][i % 4],
                    left: `${50 + 40 * Math.cos(i * 45 * Math.PI / 180)}%`,
                    top: `${50 + 40 * Math.sin(i * 45 * Math.PI / 180)}%`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '1.5s'
                  }}
                />
              ))}
            </div>

            <h3 className="text-3xl font-bold text-white mb-3">
              Welcome, {formData.name.split(' ')[0]}! 🎉
            </h3>
            <p className="text-white/90 text-lg mb-6">
              You've secured your founding member status!
            </p>

            <div className="bg-white/20 backdrop-blur rounded-xl p-6 border border-white/30">
              <h4 className="text-white font-semibold mb-4">What happens next?</h4>
              <div className="space-y-3 text-left">
                {[
                  'You\'ll receive a call within 24 hours',
                  'Personalized demo scheduled for your industry',
                  'Your 50% founding member discount is locked in'
                ].map((item, i) => (
                  <div key={i} className="flex items-center text-white/90">
                    <CheckCircle className="h-5 w-5 text-green-300 mr-3 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Limited Spots Component
  const LimitedSpots = () => (
    <div className={`bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg shadow-sm ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Users className="h-5 w-5 text-orange-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-orange-800">
            Limited Beta Access
          </h3>
          <div className="mt-2 text-sm text-orange-700">
            <p className="mb-2">
              Only <span className="font-bold text-lg">{spotsRemaining}</span> spots remaining in our early access program
            </p>
            
            {/* Progress bar */}
            <div className="w-full bg-orange-200 rounded-full h-2 mb-3">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${((20 - spotsRemaining) / 20) * 100}%` }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs">
                ⚡ 3 businesses joined in the last hour
              </span>
              <button
                onClick={handleCTAClick}
                className="bg-orange-500 text-white text-sm font-medium px-4 py-1 rounded hover:bg-orange-600 transition-colors"
              >
                Reserve My Spot
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Exit Intent Modal
  const ExitIntentModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>
        
        <div className="p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Wait! Don't Miss Out
            </h2>
            <p className="text-gray-600">
              Get your free consultation before you leave. See exactly how ContractNest can transform your service contracts.
            </p>
          </div>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center text-sm text-gray-700">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              Free 30-minute consultation
            </div>
            <div className="flex items-center text-sm text-gray-700">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              Personalized demo for your industry
            </div>
            <div className="flex items-center text-sm text-gray-700">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              No pressure, just insights
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleCTAClick}
              className="w-full bg-red-500 text-white font-semibold py-3 rounded-lg hover:bg-red-600 transition-colors"
            >
              Yes, Get My Free Consultation
            </button>
            <button
              onClick={handleClose}
              className="w-full text-gray-500 text-sm hover:text-gray-700 transition-colors"
            >
              No thanks, I'll figure it out myself
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Scarcity Banner
  const ScarcityBanner = () => (
    <div className={`bg-yellow-400 text-black py-2 px-4 ${className}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <Bell className="h-4 w-4 mr-2" />
          <span className="text-sm font-medium">
            🔥 High demand: 47 demos scheduled this week • Only {demoSlotsLeft} slots left today
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleCTAClick}
            className="bg-black text-yellow-400 text-sm font-medium px-4 py-1 rounded hover:bg-gray-800 transition-colors"
          >
            Book Now
          </button>
          <button
            onClick={handleClose}
            className="text-black hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // Demo Slots Component
  const DemoSlots = () => (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Calendar className="h-5 w-5 text-blue-500" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            Demo Availability Today
          </h3>
          
          <div className="flex items-center space-x-4 mb-3">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
              <span className="text-xs text-gray-600">Available</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
              <span className="text-xs text-gray-600">Booked</span>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-1 mb-3">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className={`h-6 rounded text-xs flex items-center justify-center ${
                  i < (12 - demoSlotsLeft) 
                    ? 'bg-red-200 text-red-800' 
                    : 'bg-green-200 text-green-800'
                }`}
              >
                {9 + i}:00
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              <span className="font-semibold">{demoSlotsLeft}</span> slots remaining
            </span>
            <button
              onClick={handleCTAClick}
              className="bg-blue-500 text-white text-sm font-medium px-4 py-1 rounded hover:bg-blue-600 transition-colors"
            >
              Book Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Floating Action Button
  const FloatingUrgency = () => (
    <div className="fixed bottom-6 left-6 z-50">
      <div className="bg-red-500 text-white p-4 rounded-full shadow-lg animate-pulse">
        <div className="flex items-center space-x-3">
          <Zap className="h-5 w-5" />
          <div className="text-sm">
            <div className="font-semibold">Early Access</div>
            <div className="text-xs opacity-90">{spotsRemaining} spots left</div>
          </div>
          <button
            onClick={handleCTAClick}
            className="bg-white text-red-500 text-xs font-medium px-3 py-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            Join Now
          </button>
        </div>
      </div>
    </div>
  );

  // Render based on variant
  switch (variant) {
    case 'countdown':
      return showElement || autoShow ? <CountdownTimer /> : null;
      
    case 'limited-spots':
      return showElement || autoShow ? <LimitedSpots /> : null;
      
    case 'exit-intent':
      return showElement ? <ExitIntentModal /> : null;
      
    case 'scarcity-banner':
      return showElement ? <ScarcityBanner /> : null;
      
    case 'demo-slots':
      return showElement || autoShow ? <DemoSlots /> : null;
      
    case 'floating':
      return showElement || autoShow ? <FloatingUrgency /> : null;
      
    default:
      return null;
  }
};

// Multi-variant urgency component
export const UrgencyStack = ({ 
  variants = ['scarcity-banner', 'limited-spots'],
  onTrigger = null,
  className = ''
}) => {
  const [activeVariants, setActiveVariants] = useState([]);
  
  useEffect(() => {
    // Stagger the appearance of different urgency elements
    variants.forEach((variant, index) => {
      setTimeout(() => {
        setActiveVariants(prev => [...prev, variant]);
      }, index * 3000);
    });
  }, [variants]);
  
  return (
    <div className={`space-y-4 ${className}`}>
      {activeVariants.map((variant, index) => (
        <UrgencyElements
          key={`${variant}-${index}`}
          variant={variant}
          onTrigger={onTrigger}
          autoShow={true}
        />
      ))}
    </div>
  );
};

export default UrgencyElements;
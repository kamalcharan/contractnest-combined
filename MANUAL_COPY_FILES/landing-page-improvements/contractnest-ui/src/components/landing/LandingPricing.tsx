// src/components/landing/LandingPricing.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle,
  X,
  Calculator,
  Users,
  Building,
  Zap,
  Clock,
  Timer,
  Flame,
  Star,
  ArrowRight,
  IndianRupee,
  TrendingUp,
  Shield,
  Phone,
  Mail,
  Award,
  Target,
  BarChart3,
  Globe,
  AlertCircle,
  Gift,
  Sparkles
} from 'lucide-react';

// Import existing components
import UrgencyElements from '../CRO/UrgencyElements';
import ValueCalculator from '../CRO/ValueCalculator';

// Types
interface PricingFeature {
  name: string;
  included: boolean;
  description?: string;
}

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: PricingFeature[];
  popular?: boolean;
  earlyAdopter?: boolean;
  originalPrice?: number;
  savings?: string;
}

interface PricingProps {
  onPlanSelect?: (planId: string) => void;
  onCalculatorOpen?: () => void;
  onContactSales?: () => void;
  className?: string;
}

// Mock Button component
const Button = ({ children, className = '', variant = 'primary', onClick, size = 'default', disabled = false, ...props }) => {
  const baseClass = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 focus:ring-gray-500',
    outline: 'border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white focus:ring-red-500',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
    success: 'bg-green-500 hover:bg-green-600 text-white focus:ring-green-500'
  };
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    default: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base'
  };
  
  return (
    <button 
      className={`${baseClass} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// Badge Component
const Badge = ({ children, className = '', variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    urgent: 'bg-red-50 text-red-700 border border-red-200',
    popular: 'bg-blue-500 text-white',
    early: 'bg-gradient-to-r from-orange-400 to-red-500 text-white animate-pulse'
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

// Pricing Card Component
const PricingCard = ({ 
  plan, 
  onSelect,
  isVisible,
  delay = 0 
}: { 
  plan: PricingPlan;
  onSelect: (planId: string) => void;
  isVisible: boolean;
  delay?: number;
}) => {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setShouldAnimate(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isVisible, delay]);

  const handleSelect = () => {
    onSelect(plan.id);
    
    // Track plan selection
    if (typeof gtag !== 'undefined') {
      gtag('event', 'pricing_plan_select', {
        event_category: 'conversion',
        event_label: plan.id,
        value: plan.price
      });
    }
  };

  const cardClasses = `bg-white rounded-2xl shadow-lg border-2 transition-all duration-500 hover:shadow-xl ${
    plan.popular ? 'border-blue-500 ring-4 ring-blue-100' : 
    plan.earlyAdopter ? 'border-red-500 ring-4 ring-red-100' : 'border-gray-200'
  } ${shouldAnimate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`;

  return (
    <div className={cardClasses}>
      {/* Card Header */}
      <div className="p-8 pb-4">
        {/* Badges */}
        <div className="flex items-center justify-between mb-4">
          <div className="space-x-2">
            {plan.popular && (
              <Badge variant="popular">
                <Star className="h-3 w-3 mr-1" />
                Most Popular
              </Badge>
            )}
            {plan.earlyAdopter && (
              <Badge variant="early">
                <Flame className="h-3 w-3 mr-1" />
                Early Adopter
              </Badge>
            )}
          </div>
          {plan.savings && (
            <div className="text-right">
              <div className="text-sm font-semibold text-green-600">{plan.savings} OFF</div>
            </div>
          )}
        </div>

        {/* Plan Name & Description */}
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
        <p className="text-gray-600 mb-6">{plan.description}</p>

        {/* Pricing */}
        <div className="flex items-baseline mb-6">
          {plan.originalPrice && plan.originalPrice > plan.price && (
            <div className="mr-3">
              <span className="text-lg text-gray-400 line-through">₹{plan.originalPrice}</span>
            </div>
          )}
          <div className="flex items-baseline">
            <span className="text-4xl font-bold text-gray-900">₹{plan.price}</span>
            <span className="text-gray-600 ml-1">{plan.period}</span>
          </div>
        </div>

        {/* Special Pricing Note */}
        {plan.earlyAdopter && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6">
            <div className="flex items-center text-orange-700">
              <Gift className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">
                Limited Time: 50% off regular pricing for early adopters
              </span>
            </div>
          </div>
        )}

        {/* CTA Button */}
        <Button 
          onClick={handleSelect} 
          className={`w-full ${plan.popular ? 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500' : ''}`}
          variant={plan.popular ? 'primary' : 'outline'}
          size="lg"
        >
          {plan.price === 0 ? 'Start Free Trial' : 'Get Started'}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>

      {/* Features List */}
      <div className="px-8 pb-8">
        <div className="space-y-3">
          {plan.features.map((feature, index) => (
            <div key={index} className="flex items-start">
              {feature.included ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              ) : (
                <X className="h-5 w-5 text-gray-300 mr-3 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <span className={`text-sm ${feature.included ? 'text-gray-900' : 'text-gray-400'}`}>
                  {feature.name}
                </span>
                {feature.description && (
                  <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ROI Calculator Component
const ROICalculator = ({ 
  isVisible,
  onCalculatorOpen 
}: { 
  isVisible: boolean;
  onCalculatorOpen?: () => void;
}) => {
  const [contractCount, setContractCount] = useState(25);
  const [avgValue, setAvgValue] = useState(500000);
  const [savings, setSavings] = useState({ monthly: 0, annual: 0, roi: 0 });

  useEffect(() => {
    // Simple ROI calculation
    const monthlyCost = Math.max(contractCount - 10, 0) * (150 / 3); // First 10 free, ₹150 per quarter
    const monthlySavings = contractCount * 0.15 * (avgValue / 12); // 15% efficiency gain
    const netMonthlySavings = monthlySavings - monthlyCost;
    const annualSavings = netMonthlySavings * 12;
    const roiPercentage = monthlyCost > 0 ? ((netMonthlySavings / monthlyCost) * 100) : 500;

    setSavings({
      monthly: Math.round(netMonthlySavings),
      annual: Math.round(annualSavings),
      roi: Math.round(roiPercentage)
    });
  }, [contractCount, avgValue]);

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    return `₹${amount.toLocaleString()}`;
  };

  return (
    <div className={`bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-8 border border-green-200 transition-all duration-500 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Calculate Your ROI
        </h3>
        <p className="text-gray-600">
          See how much ContractNest can save your business
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Active Contracts
            </label>
            <input
              type="range"
              min="5"
              max="100"
              value={contractCount}
              onChange={(e) => setContractCount(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5</span>
              <span className="font-semibold text-gray-700">{contractCount}</span>
              <span>100+</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Average Contract Value
            </label>
            <input
              type="range"
              min="100000"
              max="5000000"
              step="100000"
              value={avgValue}
              onChange={(e) => setAvgValue(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>₹1L</span>
              <span className="font-semibold text-gray-700">{formatCurrency(avgValue)}</span>
              <span>₹50L+</span>
            </div>
          </div>

          <Button 
            onClick={onCalculatorOpen}
            variant="outline" 
            className="w-full border-green-500 text-green-700 hover:bg-green-500 hover:text-white"
          >
            <Calculator className="mr-2 h-4 w-4" />
            Detailed ROI Analysis
          </Button>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h4 className="font-semibold text-gray-900 mb-4 text-center">
            Your Potential Savings
          </h4>
          
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {formatCurrency(savings.annual)}
              </div>
              <div className="text-sm text-gray-600">Annual Savings</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-xl font-bold text-blue-600 mb-1">
                  {formatCurrency(savings.monthly)}
                </div>
                <div className="text-xs text-gray-600">Monthly Savings</div>
              </div>
              <div>
                <div className="text-xl font-bold text-purple-600 mb-1">
                  {savings.roi > 1000 ? '1000+' : savings.roi}%
                </div>
                <div className="text-xs text-gray-600">ROI</div>
              </div>
            </div>
            
            <div className="text-xs text-gray-500 text-center pt-3 border-t">
              Based on 15% efficiency improvement and ₹150/contract/quarter pricing
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LandingPricing: React.FC<PricingProps> = ({ 
  onPlanSelect,
  onCalculatorOpen,
  onContactSales,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true); // Default to true to ensure content is visible
  const [showCalculator, setShowCalculator] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Environment URLs
const signupUrl = import.meta.env.VITE_SIGNUP_URL || 'https://contractnest-ui-production.up.railway.app/signup';

  // Pricing plans
  const pricingPlans: PricingPlan[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: 0,
      period: 'first 10 contracts',
      description: 'Perfect for small businesses getting started with service contract management',
      earlyAdopter: false,
      features: [
        { name: 'Up to 10 contracts', included: true, description: 'Completely free forever' },
        { name: 'Digital contract creation', included: true },
        { name: 'Basic SLA monitoring', included: true },
        { name: 'Email notifications', included: true },
        { name: 'Basic reporting', included: true },
        { name: 'Standard support', included: true },
        { name: 'Advanced analytics', included: false },
        { name: 'API integrations', included: false },
        { name: 'Custom workflows', included: false },
        { name: 'Priority support', included: false }
      ]
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 150,
      originalPrice: 300,
      period: 'per contract, per quarter',
      description: 'Full-featured solution for growing businesses with comprehensive contract management needs',
      popular: true,
      earlyAdopter: true,
      savings: '50%',
      features: [
        { name: 'Unlimited contracts', included: true, description: 'First 10 contracts free, then ₹150/quarter each' },
        { name: 'Digital contract creation', included: true },
        { name: 'Advanced SLA monitoring', included: true },
        { name: 'Automated compliance tracking', included: true },
        { name: 'Smart invoicing & payments', included: true },
        { name: 'Real-time collaboration', included: true },
        { name: 'Advanced analytics & reporting', included: true },
        { name: 'API integrations', included: true },
        { name: 'Custom workflows', included: true },
        { name: 'Priority support', included: true },
        { name: 'White-label options', included: false },
        { name: 'Dedicated account manager', included: false }
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 0,
      period: 'custom pricing',
      description: 'Tailored solution for large organizations with complex requirements and high-volume contract management',
      features: [
        { name: 'Volume-based pricing', included: true, description: 'Significant discounts for 500+ contracts' },
        { name: 'All Professional features', included: true },
        { name: 'White-label solutions', included: true },
        { name: 'Custom integrations', included: true },
        { name: 'Advanced security & compliance', included: true },
        { name: 'Dedicated account manager', included: true },
        { name: 'Custom training & onboarding', included: true },
        { name: 'SLA guarantees', included: true },
        { name: '24/7 phone support', included: true },
        { name: 'Custom feature development', included: true }
      ]
    }
  ];

  // Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Track pricing section view
          if (typeof gtag !== 'undefined') {
            gtag('event', 'pricing_section_view', {
              event_category: 'engagement',
              event_label: 'pricing_plans'
            });
          }
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handlePlanSelect = (planId: string) => {
    if (onPlanSelect) {
      onPlanSelect(planId);
    } else {
      // Default behavior - redirect to signup
      if (planId === 'enterprise') {
        if (onContactSales) {
          onContactSales();
        }
      } else {
        window.location.href = signupUrl;
      }
    }
  };

  const handleCalculatorOpen = () => {
    setShowCalculator(true);
    
    if (onCalculatorOpen) {
      onCalculatorOpen();
    }
    
    // Track calculator open
    if (typeof gtag !== 'undefined') {
      gtag('event', 'pricing_calculator_open', {
        event_category: 'engagement',
        event_label: 'roi_calculator'
      });
    }
  };

  const handleContactSales = () => {
    if (onContactSales) {
      onContactSales();
    }
    
    // Track contact sales
    if (typeof gtag !== 'undefined') {
      gtag('event', 'contact_sales_click', {
        event_category: 'conversion',
        event_label: 'enterprise_pricing'
      });
    }
  };

  return (
    <>
      <section ref={sectionRef} id="pricing" className={`py-20 bg-gray-50 px-4 sm:px-6 lg:px-8 ${className}`}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <IndianRupee className="h-4 w-4 mr-2" />
              Transparent Pricing
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Honest Pricing
            </h2>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
              Contract-centric pricing, not per-user. Pay only for what you use. 
              No hidden fees, no surprises.
            </p>

            {/* Urgency Element */}
            <div className="flex justify-center mb-8">
              <UrgencyElements 
                variant="countdown" 
                autoShow={true}
                onTrigger={(event, data) => {
                  console.log('Pricing urgency triggered:', event, data);
                }}
              />
            </div>
          </div>

          {/* Pricing Cards - Hidden for now */}
          {/*
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            {pricingPlans.map((plan, index) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                onSelect={handlePlanSelect}
                isVisible={isVisible}
                delay={index * 200}
              />
            ))}
          </div>
          */}

          {/* ROI Calculator - Hidden for now */}
          {/*
          <div className="mb-16">
            <ROICalculator
              isVisible={isVisible}
              onCalculatorOpen={handleCalculatorOpen}
            />
          </div>
          */}

          {/* Value Proposition */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 mb-16">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Why ContractNest Pricing Makes Sense
              </h3>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Our pricing model is designed to scale with your business and deliver value from day one
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Contract-Based Pricing</h4>
                <p className="text-sm text-gray-600">
                  Pay per contract, not per user. Scale your team without increasing costs.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">First 10 Contracts Free</h4>
                <p className="text-sm text-gray-600">
                  Get started immediately with no upfront costs. Perfect for testing the platform.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">100% OpEx Model</h4>
                <p className="text-sm text-gray-600">
                  No capital expenditure required. Everything is operational expense for easy budgeting.
                </p>
              </div>
            </div>
          </div>

          {/* Comparison Table - Hidden for now */}
          {/*
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-16">
            <div className="p-8 pb-4">
              <h3 className="text-2xl font-bold text-gray-900 text-center mb-6">
                Compare ContractNest vs Traditional Solutions
              </h3>
            </div>
            ...
          </div>
          */}

          {/* FAQ Section - Hidden for now */}
          {/*
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-200 mb-16">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Pricing Questions & Answers
              </h3>
            </div>
            ...
          </div>
          */}

          {/* Final CTA - Hidden for now */}
        </div>
      </section>

      {/* Calculator Modal */}
      {showCalculator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Detailed ROI Calculator</h2>
                <button
                  onClick={() => setShowCalculator(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span className="sr-only">Close</span>
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="p-6">
                <ValueCalculator />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LandingPricing;
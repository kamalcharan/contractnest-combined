// src/components/landing/DualPersonaTimeline.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Users,
  Building,
  FileText,
  Send,
  CheckCircle,
  Settings,
  Receipt,
  ArrowRight,
  ArrowDown,
  Clock,
  MessageSquare,
  Eye,
  Edit,
  Handshake,
  Truck,
  CreditCard,
  Star,
  Target,
  Zap,
  Shield,
  TrendingUp,
  Play,
  Pause
} from 'lucide-react';

// Types
interface TimelineStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  duration: string;
  painPoints?: string[];
  solutions?: string[];
  benefits?: string[];
}

interface PersonaJourney {
  persona: 'buyer' | 'seller';
  title: string;
  subtitle: string;
  color: string;
  steps: TimelineStep[];
}

interface IndustryJourney {
  industry: string;
  buyerContext: string;
  sellerContext: string;
  commonScenario: string;
}

interface DualPersonaTimelineProps {
  selectedIndustry?: string;
  onStepClick?: (persona: string, stepId: string) => void;
  className?: string;
}

// Mock Button component
const Button = ({ children, className = '', variant = 'primary', onClick, size = 'default', ...props }) => {
  const baseClass = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variants = {
    primary: 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 focus:ring-gray-500',
    outline: 'border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white focus:ring-red-500',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
      {...props}
    >
      {children}
    </button>
  );
};

// Timeline Step Component
const TimelineStepComponent = ({ 
  step, 
  persona,
  isActive,
  isCompleted,
  onClick,
  delay = 0,
  isVisible = false
}: { 
  step: TimelineStep;
  persona: 'buyer' | 'seller';
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
  delay?: number;
  isVisible?: boolean;
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

  const personaColors = {
    buyer: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      active: 'border-blue-500 shadow-blue-100',
      completed: 'bg-blue-100 border-blue-300'
    },
    seller: {
      bg: 'bg-green-50',
      border: 'border-green-200', 
      icon: 'text-green-600',
      active: 'border-green-500 shadow-green-100',
      completed: 'bg-green-100 border-green-300'
    }
  };

  const colors = personaColors[persona];
  const baseClasses = `${colors.bg} ${colors.border} border-2 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg`;
  const activeClasses = isActive ? `${colors.active} shadow-lg scale-105` : '';
  const completedClasses = isCompleted ? colors.completed : '';
  const animationClasses = shouldAnimate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4';

  return (
    <div 
      className={`${baseClasses} ${activeClasses} ${completedClasses} ${animationClasses} group`}
      onClick={onClick}
    >
      <div className="flex items-start space-x-4">
        <div className={`flex-shrink-0 w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center ${colors.icon} group-hover:scale-110 transition-transform`}>
          {step.icon}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900 group-hover:text-gray-700">
              {step.title}
            </h4>
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="h-3 w-3 mr-1" />
              {step.duration}
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-3 leading-relaxed">
            {step.description}
          </p>

          {/* Pain Points (Before ContractNest) */}
          {step.painPoints && step.painPoints.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-red-600 mb-1">Current Challenges:</div>
              <ul className="space-y-1">
                {step.painPoints.slice(0, 2).map((point, index) => (
                  <li key={index} className="flex items-center text-xs text-red-700">
                    <div className="w-1 h-1 bg-red-500 rounded-full mr-2"></div>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Solutions (With ContractNest) */}
          {step.solutions && step.solutions.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-green-600 mb-1">ContractNest Solution:</div>
              <ul className="space-y-1">
                {step.solutions.slice(0, 2).map((solution, index) => (
                  <li key={index} className="flex items-center text-xs text-green-700">
                    <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                    {solution}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Benefits */}
          {step.benefits && step.benefits.length > 0 && (
            <div className="bg-white bg-opacity-50 rounded-lg p-2">
              <div className="text-xs font-semibold text-gray-700 mb-1">Key Benefits:</div>
              <div className="flex flex-wrap gap-1">
                {step.benefits.slice(0, 3).map((benefit, index) => (
                  <span key={index} className="text-xs bg-white text-gray-700 px-2 py-1 rounded">
                    {benefit}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Connecting Line Component
const ConnectingLine = ({ 
  isVertical = true, 
  isActive = false,
  delay = 0,
  isVisible = false 
}: { 
  isVertical?: boolean;
  isActive?: boolean;
  delay?: number;
  isVisible?: boolean;
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

  const lineClasses = isVertical 
    ? `w-0.5 h-12 mx-auto ${isActive ? 'bg-gradient-to-b from-blue-500 to-green-500' : 'bg-gray-300'}`
    : `h-0.5 w-12 my-auto ${isActive ? 'bg-gradient-to-r from-blue-500 to-green-500' : 'bg-gray-300'}`;

  return (
    <div className={`flex ${isVertical ? 'justify-center' : 'items-center'} ${shouldAnimate ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`${lineClasses} transition-all duration-500`}>
        {isActive && (
          <div className={`${isVertical ? 'w-full h-2' : 'h-full w-2'} bg-white rounded-full animate-pulse`}></div>
        )}
      </div>
    </div>
  );
};

const DualPersonaTimeline: React.FC<DualPersonaTimelineProps> = ({ 
  selectedIndustry = 'healthcare',
  onStepClick,
  className = ''
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedPersona, setSelectedPersona] = useState<'buyer' | 'seller' | 'both'>('both');
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isVisible, setIsVisible] = useState(true); // Default to true to ensure content is visible
  const sectionRef = useRef<HTMLDivElement>(null);

  // Industry-specific contexts
  const industryContexts: Record<string, IndustryJourney> = {
    healthcare: {
      industry: 'Healthcare',
      buyerContext: 'Hospital/Clinic',
      sellerContext: 'Medical Equipment Service Provider',
      commonScenario: 'CT-Scan Annual Maintenance Contract'
    },
    manufacturing: {
      industry: 'Manufacturing',
      buyerContext: 'Production Facility',
      sellerContext: 'Industrial Service Provider',
      commonScenario: 'HVAC System Maintenance Contract'
    },
    consulting: {
      industry: 'Consulting',
      buyerContext: 'Client Organization',
      sellerContext: 'Consulting Firm',
      commonScenario: 'Digital Transformation Project'
    },
    pharma: {
      industry: 'Pharmaceutical',
      buyerContext: 'Drug Manufacturing Plant',
      sellerContext: 'Specialized Equipment Service Provider',
      commonScenario: 'Clean Room Maintenance Contract'
    }
  };

  // Define the dual journey
  const buyerJourney: PersonaJourney = {
    persona: 'buyer',
    title: 'Service Buyer Journey',
    subtitle: industryContexts[selectedIndustry]?.buyerContext || 'Service Recipient',
    color: 'blue',
    steps: [
      {
        id: 'identify-need',
        title: 'Identify Service Need',
        description: 'Recognize the need for external service support and define requirements',
        icon: <Target className="h-6 w-6" />,
        duration: '1-2 days',
        painPoints: ['Unclear service specifications', 'Budget uncertainty', 'Vendor research time'],
        solutions: ['Service requirement templates', 'Budget estimation tools', 'Vendor marketplace'],
        benefits: ['Clear requirements', 'Accurate budgets', 'Faster vendor selection']
      },
      {
        id: 'request-proposals',
        title: 'Request & Evaluate Proposals',
        description: 'Send RFPs to potential vendors and evaluate their proposals',
        icon: <Send className="h-6 w-6" />,
        duration: '3-5 days',
        painPoints: ['Manual RFP creation', 'Proposal comparison complexity', 'Communication gaps'],
        solutions: ['Automated RFP generation', 'Proposal comparison matrix', 'Integrated messaging'],
        benefits: ['Standardized RFPs', 'Easy comparisons', 'Transparent communication']
      },
      {
        id: 'negotiate-terms',
        title: 'Negotiate & Finalize Terms',
        description: 'Discuss terms, negotiate pricing, and finalize contract details',
        icon: <Handshake className="h-6 w-6" />,
        duration: '2-3 days',
        painPoints: ['Back-and-forth emails', 'Version control issues', 'Legal review delays'],
        solutions: ['Real-time negotiation workspace', 'Version tracking', 'Legal template library'],
        benefits: ['Faster negotiations', 'Clear audit trails', 'Reduced legal costs']
      },
      {
        id: 'contract-execution',
        title: 'Execute Contract',
        description: 'Sign the finalized contract and set up service delivery parameters',
        icon: <FileText className="h-6 w-6" />,
        duration: '1 day',
        painPoints: ['Paper-based signatures', 'Manual setup', 'Unclear service start dates'],
        solutions: ['Digital signatures', 'Automated setup workflows', 'Service scheduling'],
        benefits: ['Instant execution', 'Automatic setup', 'Clear timelines']
      },
      {
        id: 'monitor-service',
        title: 'Monitor Service Delivery',
        description: 'Track service performance, SLA compliance, and deliverable completion',
        icon: <Eye className="h-6 w-6" />,
        duration: 'Ongoing',
        painPoints: ['No visibility into service status', 'SLA breach surprises', 'Manual tracking'],
        solutions: ['Real-time service dashboards', 'Automated SLA monitoring', 'Performance alerts'],
        benefits: ['Full visibility', 'Proactive alerts', 'SLA compliance']
      },
      {
        id: 'approve-payment',
        title: 'Approve & Process Payment',
        description: 'Review completed milestones and approve payments to service provider',
        icon: <CreditCard className="h-6 w-6" />,
        duration: '1-2 days',
        painPoints: ['Manual milestone verification', 'Invoice disputes', 'Payment delays'],
        solutions: ['Milestone-based auto-invoicing', 'Integrated approval workflows', 'Payment automation'],
        benefits: ['Accurate invoices', 'Faster approvals', 'Timely payments']
      }
    ]
  };

  const sellerJourney: PersonaJourney = {
    persona: 'seller',
    title: 'Service Provider Journey',
    subtitle: industryContexts[selectedIndustry]?.sellerContext || 'Service Provider',
    color: 'green',
    steps: [
      {
        id: 'receive-request',
        title: 'Receive Service Request',
        description: 'Get notified of new service opportunities and review requirements',
        icon: <MessageSquare className="h-6 w-6" />,
        duration: '< 1 hour',
        painPoints: ['Missed opportunities', 'Unclear requirements', 'Response time pressure'],
        solutions: ['Instant notifications', 'Requirement clarification tools', 'Quick response templates'],
        benefits: ['Never miss leads', 'Clear understanding', 'Fast responses']
      },
      {
        id: 'create-proposal',
        title: 'Create & Submit Proposal',
        description: 'Develop competitive proposal with pricing, timeline, and service details',
        icon: <Edit className="h-6 w-6" />,
        duration: '2-4 hours',
        painPoints: ['Time-consuming proposal creation', 'Pricing calculation errors', 'Template inconsistencies'],
        solutions: ['Smart proposal builder', 'Dynamic pricing calculator', 'Professional templates'],
        benefits: ['Faster proposals', 'Accurate pricing', 'Professional presentation']
      },
      {
        id: 'negotiate-win',
        title: 'Negotiate & Win Contract',
        description: 'Engage in negotiations and secure the service contract',
        icon: <Handshake className="h-6 w-6" />,
        duration: '2-3 days',
        painPoints: ['Negotiation tracking difficulty', 'Scope creep risks', 'Win/loss uncertainty'],
        solutions: ['Negotiation timeline tracking', 'Scope protection tools', 'Win probability scoring'],
        benefits: ['Organized negotiations', 'Protected margins', 'Higher win rates']
      },
      {
        id: 'setup-delivery',
        title: 'Setup Service Delivery',
        description: 'Configure service parameters, assign team, and schedule initial delivery',
        icon: <Settings className="h-6 w-6" />,
        duration: '1-2 days',
        painPoints: ['Manual setup processes', 'Resource allocation challenges', 'Schedule conflicts'],
        solutions: ['Automated service setup', 'Resource management tools', 'Integrated scheduling'],
        benefits: ['Quick mobilization', 'Optimal resource use', 'Conflict-free scheduling']
      },
      {
        id: 'deliver-service',
        title: 'Deliver Service & Update Progress',
        description: 'Execute service delivery and provide real-time updates to the client',
        icon: <Truck className="h-6 w-6" />,
        duration: 'Ongoing',
        painPoints: ['Manual progress reporting', 'Client communication gaps', 'Quality assurance challenges'],
        solutions: ['Automated progress tracking', 'Client portal access', 'Quality checkpoints'],
        benefits: ['Transparent progress', 'Happy clients', 'Quality assurance']
      },
      {
        id: 'get-paid',
        title: 'Invoice & Get Paid',
        description: 'Generate invoices for completed milestones and receive timely payments',
        icon: <Receipt className="h-6 w-6" />,
        duration: '1-3 days',
        painPoints: ['Manual invoice creation', 'Payment delays', 'Billing disputes'],
        solutions: ['Auto-generated invoices', 'Payment tracking', 'Dispute resolution tools'],
        benefits: ['Accurate billing', 'Faster payments', 'Reduced disputes']
      }
    ]
  };

  // Auto-progression of timeline
  useEffect(() => {
    if (!isAutoPlaying) return;

    const timer = setInterval(() => {
      setActiveStep(prev => (prev + 1) % Math.max(buyerJourney.steps.length, sellerJourney.steps.length));
    }, 4000);

    return () => clearInterval(timer);
  }, [isAutoPlaying, buyerJourney.steps.length, sellerJourney.steps.length]);

  // Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Track timeline section view
          if (typeof gtag !== 'undefined') {
            gtag('event', 'dual_persona_timeline_view', {
              event_category: 'engagement',
              event_label: selectedIndustry
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
  }, [selectedIndustry]);

  const handleStepClick = (persona: 'buyer' | 'seller', stepIndex: number) => {
    setActiveStep(stepIndex);
    setIsAutoPlaying(false);
    
    if (onStepClick) {
      const journey = persona === 'buyer' ? buyerJourney : sellerJourney;
      onStepClick(persona, journey.steps[stepIndex].id);
    }

    // Track step interaction
    if (typeof gtag !== 'undefined') {
      gtag('event', 'timeline_step_click', {
        event_category: 'engagement',
        event_label: `${persona}_${stepIndex}`,
        value: stepIndex + 1
      });
    }
  };

  const handlePersonaToggle = (persona: 'buyer' | 'seller' | 'both') => {
    setSelectedPersona(persona);
    setIsAutoPlaying(false);
    
    // Track persona selection
    if (typeof gtag !== 'undefined') {
      gtag('event', 'persona_toggle', {
        event_category: 'interaction',
        event_label: persona
      });
    }
  };

  const maxSteps = Math.max(buyerJourney.steps.length, sellerJourney.steps.length);
  const currentIndustry = industryContexts[selectedIndustry] || industryContexts.healthcare;

  return (
    <section ref={sectionRef} className={`py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-blue-50 ${className}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Users className="h-4 w-4 mr-2" />
            Service Contract Lifecycle
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How Both Sides Win with ContractNest
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
            Follow the complete journey from service request to payment completion. 
            See how ContractNest transforms every step for both buyers and sellers.
          </p>

          {/* Industry Context */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 max-w-2xl mx-auto mb-8">
            <h3 className="font-semibold text-gray-900 mb-2">
              Example Scenario: {currentIndustry.commonScenario}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-blue-700 font-medium">Buyer:</span>
                <span className="text-gray-600">{currentIndustry.buyerContext}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-700 font-medium">Seller:</span>
                <span className="text-gray-600">{currentIndustry.sellerContext}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Persona Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200">
            <div className="flex space-x-2">
              <button
                onClick={() => handlePersonaToggle('buyer')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  selectedPersona === 'buyer' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <Building className="h-4 w-4" />
                <span>Buyer Journey</span>
              </button>
              <button
                onClick={() => handlePersonaToggle('both')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  selectedPersona === 'both' ? 'bg-purple-500 text-white' : 'text-gray-600 hover:text-purple-600'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Both Journeys</span>
              </button>
              <button
                onClick={() => handlePersonaToggle('seller')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  selectedPersona === 'seller' ? 'bg-green-500 text-white' : 'text-gray-600 hover:text-green-600'
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Seller Journey</span>
              </button>
            </div>
          </div>
        </div>

        {/* Timeline Visualization */}
        <div className="relative">
          {/* Timeline Steps */}
          <div className={`grid gap-8 ${
            selectedPersona === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-4xl mx-auto'
          }`}>
            {/* Buyer Journey */}
            {(selectedPersona === 'buyer' || selectedPersona === 'both') && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-blue-700 mb-2">{buyerJourney.title}</h3>
                  <p className="text-blue-600">{buyerJourney.subtitle}</p>
                </div>
                
                {buyerJourney.steps.map((step, index) => (
                  <div key={step.id}>
                    <TimelineStepComponent
                      step={step}
                      persona="buyer"
                      isActive={activeStep === index}
                      isCompleted={activeStep > index}
                      onClick={() => handleStepClick('buyer', index)}
                      delay={index * 200}
                      isVisible={isVisible}
                    />
                    {index < buyerJourney.steps.length - 1 && (
                      <ConnectingLine 
                        isActive={activeStep > index}
                        delay={(index + 1) * 200}
                        isVisible={isVisible}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Seller Journey */}
            {(selectedPersona === 'seller' || selectedPersona === 'both') && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-green-700 mb-2">{sellerJourney.title}</h3>
                  <p className="text-green-600">{sellerJourney.subtitle}</p>
                </div>
                
                {sellerJourney.steps.map((step, index) => (
                  <div key={step.id}>
                    <TimelineStepComponent
                      step={step}
                      persona="seller"
                      isActive={activeStep === index}
                      isCompleted={activeStep > index}
                      onClick={() => handleStepClick('seller', index)}
                      delay={index * 200 + (selectedPersona === 'both' ? 100 : 0)}
                      isVisible={isVisible}
                    />
                    {index < sellerJourney.steps.length - 1 && (
                      <ConnectingLine 
                        isActive={activeStep > index}
                        delay={(index + 1) * 200 + (selectedPersona === 'both' ? 100 : 0)}
                        isVisible={isVisible}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Timeline Controls */}
        <div className="flex justify-center items-center space-x-6 mt-12">
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            {isAutoPlaying ? (
              <>
                <Pause className="h-4 w-4" />
                <span className="text-sm">Pause</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span className="text-sm">Play</span>
              </>
            )}
          </button>

          <div className="flex space-x-2">
            {Array.from({ length: maxSteps }).map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setActiveStep(index);
                  setIsAutoPlaying(false);
                }}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === activeStep ? 'bg-purple-500' : 'bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          <div className="text-sm text-gray-500">
            Step {activeStep + 1} of {maxSteps}
          </div>
        </div>

        {/* Key Benefits Summary */}
        <div className="mt-16 bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Why Both Sides Love ContractNest
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">70% Faster Process</h4>
              <p className="text-sm text-gray-600">
                From initial request to final payment, every step is accelerated through automation
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">100% Transparency</h4>
              <p className="text-sm text-gray-600">
                Real-time visibility into every aspect of the service contract lifecycle
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Better Relationships</h4>
              <p className="text-sm text-gray-600">
                Improved communication and collaboration leads to stronger business partnerships
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Service Contract Journey?
          </h3>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join businesses who have already streamlined their service contract processes 
            and are seeing remarkable results from day one.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Button size="lg" className="text-lg px-8 py-4">
              Start Your Journey Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg">
              <Play className="mr-2 h-5 w-5" />
              Watch Interactive Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DualPersonaTimeline;
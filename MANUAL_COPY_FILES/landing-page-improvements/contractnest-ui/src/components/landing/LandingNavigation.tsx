// src/components/landing/LandingNavigation.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, 
  ChevronDown,
  Menu,
  X,
  Stethoscope,
  DollarSign,
  Factory,
  ShoppingBag,
  Cpu,
  GraduationCap,
  Landmark,
  Heart,
  Briefcase,
  Phone,
  Truck,
  Zap,
  Construction,
  UtensilsCrossed,
  Film,
  Wheat,
  Pill,
  Car,
  Plane,
  MoreHorizontal,
  Building
} from 'lucide-react';

// Types
interface Industry {
  id: string;
  name: string;
  description?: string;
  icon: string;
}

interface NavigationProps {
  onIndustrySelect?: (industryId: string) => void;
  onNavigate?: (path: string) => void;
  className?: string;
}

// Mock components
const Button = ({ children, className = '', variant = 'primary', onClick, ...props }) => {
  const baseClass = 'inline-flex items-center justify-center px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variants = {
    primary: 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 focus:ring-gray-500',
    outline: 'border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white focus:ring-red-500'
  };
  
  return (
    <button 
      className={`${baseClass} ${variants[variant]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

// Icon mapping for industries
const getIndustryIcon = (iconName: string) => {
  const iconMap = {
    'Stethoscope': <Stethoscope className="h-4 w-4" />,
    'DollarSign': <DollarSign className="h-4 w-4" />,
    'Factory': <Factory className="h-4 w-4" />,
    'ShoppingBag': <ShoppingBag className="h-4 w-4" />,
    'Cpu': <Cpu className="h-4 w-4" />,
    'GraduationCap': <GraduationCap className="h-4 w-4" />,
    'Landmark': <Landmark className="h-4 w-4" />,
    'Heart': <Heart className="h-4 w-4" />,
    'Briefcase': <Briefcase className="h-4 w-4" />,
    'Phone': <Phone className="h-4 w-4" />,
    'Truck': <Truck className="h-4 w-4" />,
    'Zap': <Zap className="h-4 w-4" />,
    'Construction': <Construction className="h-4 w-4" />,
    'UtensilsCrossed': <UtensilsCrossed className="h-4 w-4" />,
    'Film': <Film className="h-4 w-4" />,
    'Wheat': <Wheat className="h-4 w-4" />,
    'Pill': <Pill className="h-4 w-4" />,
    'Car': <Car className="h-4 w-4" />,
    'Plane': <Plane className="h-4 w-4" />,
    'MoreHorizontal': <MoreHorizontal className="h-4 w-4" />
  };
  return iconMap[iconName] || <Building className="h-4 w-4" />;
};

const LandingNavigation: React.FC<NavigationProps> = ({ 
  onIndustrySelect,
  onNavigate,
  className = ''
}) => {
  const [showIndustriesDropdown, setShowIndustriesDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Environment URLs
const signupUrl = import.meta.env.VITE_SIGNUP_URL || 'https://www.contractnest.com/register';
const loginUrl = import.meta.env.VITE_LOGIN_URL || 'https://www.contractnest.com/login';

  // Load industries (would be imported in real implementation)
  useEffect(() => {
    // Mock industries data - replace with actual import
    const mockIndustries: Industry[] = [
      { id: 'healthcare', name: 'Healthcare', description: 'Medical services, hospitals, clinics', icon: 'Stethoscope' },
      { id: 'financial_services', name: 'Financial Services', description: 'Banking, insurance, investments', icon: 'DollarSign' },
      { id: 'manufacturing', name: 'Manufacturing', description: 'Production of goods and industrial products', icon: 'Factory' },
      { id: 'retail', name: 'Retail', description: 'Sale of goods to consumers', icon: 'ShoppingBag' },
      { id: 'technology', name: 'Technology', description: 'Software, hardware, IT services', icon: 'Cpu' },
      { id: 'education', name: 'Education', description: 'Schools, universities, e-learning', icon: 'GraduationCap' },
      { id: 'government', name: 'Government', description: 'Public administration, governmental agencies', icon: 'Landmark' },
      { id: 'nonprofit', name: 'Non-profit', description: 'Charitable organizations and initiatives', icon: 'Heart' },
      { id: 'professional_services', name: 'Professional Services', description: 'Legal, accounting, consulting', icon: 'Briefcase' },
      { id: 'telecommunications', name: 'Telecommunications', description: 'Phone, internet, communication services', icon: 'Phone' }
    ];
    setIndustries(mockIndustries);
  }, []);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowIndustriesDropdown(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigation handlers
  const handleSignIn = () => {
    window.location.href = loginUrl;
  };

  const handleGetStarted = () => {
    window.location.href = signupUrl;
  };

  const handleIndustryClick = (industryId: string) => {
    setShowIndustriesDropdown(false);
    setShowMobileMenu(false);
    
    if (onIndustrySelect) {
      onIndustrySelect(industryId);
    } else if (onNavigate) {
      onNavigate(`/industry/${industryId}`);
    }
    
    // Track industry selection
    if (typeof gtag !== 'undefined') {
      gtag('event', 'industry_select', {
        event_category: 'navigation',
        event_label: industryId
      });
    }
  };

  const handleNavClick = (section: string) => {
    setShowMobileMenu(false);
    
    if (onNavigate) {
      onNavigate(`#${section}`);
    } else {
      // Scroll to section
      const element = document.getElementById(section);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    
    // Track navigation
    if (typeof gtag !== 'undefined') {
      gtag('event', 'nav_click', {
        event_category: 'navigation',
        event_label: section
      });
    }
  };

  const handleAllIndustriesClick = () => {
    setShowIndustriesDropdown(false);
    setShowMobileMenu(false);
    
    if (onNavigate) {
      onNavigate('/industries');
    }
  };

  return (
    <nav className={`bg-white border-b border-gray-200 sticky top-0 z-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => onNavigate?.('/')}>
              <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center mr-2">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">ContractNest</span>
            </div>
          </div>

          {/* Desktop Navigation - Hidden for now */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Menu items hidden - keeping space for future use */}
          </div>
          
          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="outline" onClick={handleSignIn}>
              Sign In
            </Button>
            <Button onClick={handleGetStarted}>
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="text-gray-700 hover:text-gray-900 p-2 transition-colors"
            >
              {showMobileMenu ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="md:hidden border-t border-gray-200" ref={mobileMenuRef}>
          <div className="px-4 py-4 space-y-4">
            {/* Mobile CTA Buttons Only */}
            <div className="space-y-3">
              <Button variant="outline" onClick={handleSignIn} className="w-full">
                Sign In
              </Button>
              <Button onClick={handleGetStarted} className="w-full">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default LandingNavigation;
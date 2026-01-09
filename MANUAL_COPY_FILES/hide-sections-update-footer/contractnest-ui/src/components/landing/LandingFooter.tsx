// src/components/landing/LandingFooter.tsx
import React, { useState } from 'react';
import { 
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  ExternalLink,
  Building,
  Users,
  FileText,
  Shield,
  Award,
  Globe,
  Linkedin,
  Twitter,
  Youtube,
  Facebook,
  Instagram,
  MessageSquare,
  BookOpen,
  Download,
  Calendar,
  Star,
  Heart,
  Send,
  AlertCircle
} from 'lucide-react';

// Types
interface FooterLink {
  name: string;
  href: string;
  external?: boolean;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

interface SocialLink {
  name: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

interface FooterProps {
  onIndustrySelect?: (industryId: string) => void;
  onNewsletterSignup?: (email: string) => void;
  className?: string;
}

// Mock Button and Input components
const Button = ({ children, className = '', variant = 'primary', onClick, size = 'default', disabled = false, ...props }) => {
  const baseClass = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
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
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ className = '', ...props }) => (
  <input 
    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors ${className}`}
    {...props}
  />
);

// Newsletter Signup Component
const NewsletterSignup = ({ onSignup }: { onSignup?: (email: string) => void }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      alert('Please enter your email address');
      return;
    }

    setIsSubmitting(true);

    try {
      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (onSignup) {
        onSignup(email);
      }
      
      // Track newsletter signup
      if (typeof gtag !== 'undefined') {
        gtag('event', 'newsletter_signup', {
          event_category: 'engagement',
          event_label: 'footer_newsletter',
          value: 1
        });
      }
      
      setIsSubscribed(true);
      setEmail('');
    } catch (error) {
      console.error('Newsletter signup error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubscribed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
        <h4 className="font-semibold text-green-800 mb-1">Successfully Subscribed!</h4>
        <p className="text-sm text-green-700">
          Thank you for joining our newsletter. You'll receive updates on new features and industry insights.
        </p>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="newsletter-email" className="block text-sm font-medium text-gray-700 mb-2">
            Stay updated with ContractNest
          </label>
          <div className="flex space-x-2">
            <Input
              id="newsletter-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
              required
            />
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-shrink-0"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Get industry insights, product updates, and exclusive early access to new features. 
          No spam, unsubscribe anytime.
        </p>
      </form>
    </div>
  );
};

// Company Stats Component
const CompanyStats = () => {
  const stats = [
    { icon: <Building className="h-5 w-5" />, value: '500+', label: 'Businesses Served' },
    { icon: <Users className="h-5 w-5" />, value: '₹50+ Cr', label: 'Contracts Managed' },
    { icon: <Award className="h-5 w-5" />, value: '4.9/5', label: 'Customer Rating' },
    { icon: <Globe className="h-5 w-5" />, value: '24/7', label: 'Support Available' }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div key={index} className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-3 text-red-600">
            {stat.icon}
          </div>
          <div className="text-xl font-bold text-gray-900 mb-1">{stat.value}</div>
          <div className="text-sm text-gray-600">{stat.label}</div>
        </div>
      ))}
    </div>
  );
};

const LandingFooter: React.FC<FooterProps> = ({ 
  onIndustrySelect,
  onNewsletterSignup,
  className = ''
}) => {
  // Footer sections
  const footerSections: FooterSection[] = [
    {
      title: 'Product',
      links: [
        { name: 'Features', href: '#features' },
        { name: 'Pricing', href: '#pricing' },
        { name: 'Integrations', href: '/integrations' },
        { name: 'API Documentation', href: '/docs/api', external: true },
        { name: 'Release Notes', href: '/changelog' },
        { name: 'Roadmap', href: '/roadmap' }
      ]
    },
    {
      title: 'Industries',
      links: [
        { name: 'Healthcare', href: '/industry/healthcare' },
        { name: 'Manufacturing', href: '/industry/manufacturing' },
        { name: 'Pharmaceutical', href: '/industry/pharma' },
        { name: 'Consulting Services', href: '/industry/consulting' },
        { name: 'Financial Services', href: '/industry/financial' },
        { name: 'View All Industries', href: '/industries' }
      ]
    },
    {
      title: 'Resources',
      links: [
        { name: 'Blog', href: '/blog' },
        { name: 'Case Studies', href: '/case-studies' },
        { name: 'Whitepapers', href: '/resources/whitepapers' },
        { name: 'ROI Calculator', href: '/roi-calculator' },
        { name: 'Best Practices Guide', href: '/resources/best-practices' },
        { name: 'Webinars', href: '/webinars' }
      ]
    },
    {
      title: 'Support',
      links: [
        { name: 'Help Center', href: '/help', external: true },
        { name: 'Contact Support', href: '/support' },
        { name: 'Schedule Demo', href: '/demo' },
        { name: 'Training Videos', href: '/training' },
        { name: 'Community Forum', href: '/community', external: true },
        { name: 'Status Page', href: 'https://status.contractnest.com', external: true }
      ]
    },
    {
      title: 'Company',
      links: [
        { name: 'About Us', href: '/about' },
        { name: 'Careers', href: '/careers' },
        { name: 'Press Kit', href: '/press' },
        { name: 'Partner Program', href: '/partners' },
        { name: 'Security', href: '/security' },
        { name: 'Contact Us', href: '/contact' }
      ]
    }
  ];

  // Social media links
  const socialLinks: SocialLink[] = [
    {
      name: 'LinkedIn',
      href: 'https://linkedin.com/company/contractnest',
      icon: <Linkedin className="h-5 w-5" />,
      color: 'hover:text-blue-600'
    },
    {
      name: 'Twitter',
      href: 'https://twitter.com/contractnest',
      icon: <Twitter className="h-5 w-5" />,
      color: 'hover:text-blue-400'
    },
    {
      name: 'YouTube',
      href: 'https://youtube.com/contractnest',
      icon: <Youtube className="h-5 w-5" />,
      color: 'hover:text-red-600'
    },
    {
      name: 'Facebook',
      href: 'https://facebook.com/contractnest',
      icon: <Facebook className="h-5 w-5" />,
      color: 'hover:text-blue-700'
    }
  ];

  // Handle link clicks
  const handleLinkClick = (href: string, external: boolean = false) => {
    // Track footer link clicks
    if (typeof gtag !== 'undefined') {
      gtag('event', 'footer_link_click', {
        event_category: 'navigation',
        event_label: href
      });
    }

    if (external || href.startsWith('http')) {
      window.open(href, '_blank', 'noopener,noreferrer');
    } else if (href.startsWith('#')) {
      // Smooth scroll to section
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Internal navigation
      if (href.includes('/industry/') && onIndustrySelect) {
        const industryId = href.split('/industry/')[1];
        onIndustrySelect(industryId);
      } else {
        // Default navigation behavior
        window.location.href = href;
      }
    }
  };

  const handleSocialClick = (platform: string, href: string) => {
    // Track social media clicks
    if (typeof gtag !== 'undefined') {
      gtag('event', 'social_media_click', {
        event_category: 'social',
        event_label: platform
      });
    }

    window.open(href, '_blank', 'noopener,noreferrer');
  };

  return (
    <footer className={`bg-white border-t border-gray-200 ${className}`}>
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Top Section - Company Info & Newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
          {/* Company Information */}
          <div className="lg:col-span-1">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-red-500 rounded flex items-center justify-center mr-3">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">ContractNest</h3>
                <p className="text-sm text-gray-600">Service Contract Management</p>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6 leading-relaxed">
              Transform service commitments into profitable relationships with automated 
              compliance tracking, collaborative workflows, and intelligent contract management.
            </p>

            {/* Contact Information */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-gray-600">
                <Mail className="h-4 w-4 mr-3 text-red-500" />
                <a href="mailto:info@vikuna.io" className="hover:text-red-600 transition-colors">
                  info@vikuna.io
                </a>
              </div>
              <div className="flex items-center text-gray-600">
                <Phone className="h-4 w-4 mr-3 text-red-500" />
                <a href="tel:+919949701175" className="hover:text-red-600 transition-colors">
                  +91-9949701175
                </a>
              </div>
              <div className="flex items-center text-gray-600">
                <MapPin className="h-4 w-4 mr-3 text-red-500" />
                <span>Hyderabad, Telangana, India</span>
              </div>
            </div>

            {/* Social Media Links */}
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <button
                  key={social.name}
                  onClick={() => handleSocialClick(social.name, social.href)}
                  className={`w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 transition-colors ${social.color} hover:bg-gray-200`}
                  title={social.name}
                >
                  {social.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Newsletter Signup */}
          <div className="lg:col-span-1">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Stay in the Loop
            </h4>
            <NewsletterSignup onSignup={onNewsletterSignup} />
            
            {/* Quick Links */}
            <div className="mt-8">
              <h5 className="font-medium text-gray-900 mb-4">Quick Actions</h5>
              <div className="space-y-2">
                <button
                  onClick={() => handleLinkClick('/demo')}
                  className="flex items-center text-sm text-gray-600 hover:text-red-600 transition-colors"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule a Demo
                </button>
                <button
                  onClick={() => handleLinkClick('/roi-calculator')}
                  className="flex items-center text-sm text-gray-600 hover:text-red-600 transition-colors"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Calculate ROI
                </button>
                <button
                  onClick={() => handleLinkClick('/resources/whitepapers')}
                  className="flex items-center text-sm text-gray-600 hover:text-red-600 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Resources
                </button>
              </div>
            </div>
          </div>

          {/* Company Stats - HIDDEN */}
          {/* <div className="lg:col-span-1">
            <h4 className="text-lg font-semibold text-gray-900 mb-6">
              Trusted by Businesses
            </h4>
            <CompanyStats />

            <div className="mt-8">
              <h5 className="font-medium text-gray-900 mb-4">Security & Compliance</h5>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-gray-700">SOC 2 Ready</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
                  <Heart className="h-4 w-4 text-red-600" />
                  <span className="text-xs font-medium text-gray-700">HIPAA Compliant</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-gray-700">99.9% Uptime</span>
                </div>
              </div>
            </div>
          </div> */}

          {/* START FREE CTA */}
          <div className="lg:col-span-1">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Get Started Today
            </h4>
            <p className="text-gray-600 mb-6">
              Start managing your service contracts efficiently. No credit card required.
            </p>
            <Button
              onClick={() => window.location.href = '/signup'}
              className="w-full"
              size="lg"
            >
              START FREE
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Footer Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-12">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="font-semibold text-gray-900 mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <button
                      onClick={() => handleLinkClick(link.href, link.external)}
                      className="flex items-center text-sm text-gray-600 hover:text-red-600 transition-colors group"
                    >
                      <span>{link.name}</span>
                      {link.external && (
                        <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Awards & Recognition - HIDDEN */}
        {/* <div className="bg-gray-50 rounded-2xl p-8 mb-12">
          <div className="text-center mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Recognition & Awards
            </h4>
            <p className="text-gray-600">
              Trusted by industry leaders and recognized by experts
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
              <h5 className="font-medium text-gray-900 mb-1">Rising Star 2024</h5>
              <p className="text-sm text-gray-600">Emerging SaaS Platform</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h5 className="font-medium text-gray-900 mb-1">Customer Choice</h5>
              <p className="text-sm text-gray-600">Contract Management 2024</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Award className="h-8 w-8 text-green-600" />
              </div>
              <h5 className="font-medium text-gray-900 mb-1">Innovation Leader</h5>
              <p className="text-sm text-gray-600">Service Automation</p>
            </div>
          </div>
        </div> */}
      </div>

      {/* Bottom Section */}
      <div className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <p>© 2024 ContractNest. All rights reserved.</p>
              <div className="hidden md:flex items-center space-x-1">
                <span>Made with</span>
                <Heart className="h-4 w-4 text-red-500" />
                <span>in India</span>
              </div>
            </div>

            {/* Legal Links */}
            <div className="flex items-center space-x-6 text-sm">
              <button
                onClick={() => handleLinkClick('/privacy')}
                className="text-gray-600 hover:text-red-600 transition-colors"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => handleLinkClick('/terms')}
                className="text-gray-600 hover:text-red-600 transition-colors"
              >
                Terms of Service
              </button>
              <button
                onClick={() => handleLinkClick('/cookies')}
                className="text-gray-600 hover:text-red-600 transition-colors"
              >
                Cookie Policy
              </button>
              <button
                onClick={() => handleLinkClick('/gdpr')}
                className="text-gray-600 hover:text-red-600 transition-colors"
              >
                GDPR
              </button>
            </div>
          </div>

          {/* Additional Legal Notice */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-start space-x-3 text-xs text-gray-500">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="leading-relaxed">
                <strong>Legal Disclaimer:</strong> ContractNest is a software platform designed to assist with contract management. 
                While we strive for accuracy and reliability, users are responsible for ensuring compliance with applicable laws and regulations. 
                ConsultatconfigCoreNest does not provide legal advice. For legal guidance, please consult with qualified legal professionals.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
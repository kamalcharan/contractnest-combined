// src/pages/public/LandingPage.tsx - Theme Integrated Version
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

// Import all landing page components
import LandingNavigation from '../../components/landing/LandingNavigation';
import LandingHero from '../../components/landing/LandingHero';
import TheProblem from '../../components/landing/TheProblem';
import LandingStats from '../../components/landing/LandingStats';
import LandingFeatures from '../../components/landing/LandingFeatures';
import LandingTestimonials from '../../components/landing/LandingTestimonials';
import LandingIndustries from '../../components/landing/LandingIndustries';
import DualPersonaTimeline from '../../components/landing/DualPersonaTimeline';
import LandingPricing from '../../components/landing/LandingPricing';
import LandingCTA from '../../components/landing/LandingCTA';
import LandingFooter from '../../components/landing/LandingFooter';

// Import existing CRO components
import ValueCalculator from '../../components/CRO/ValueCalculator';
import UrgencyElements from '../../components/CRO/UrgencyElements';

// Import industries constants
import { industries } from '../../utils/constants/industries';

// Types
interface LandingPageProps {
  selectedIndustry?: string;
}

interface FormSubmission {
  email: string;
  companyName: string;
  industry: string;
  source: string;
}

interface AnalyticsEvent {
  event: string;
  category: string;
  label?: string;
  value?: number;
}

const LandingPage: React.FC<LandingPageProps> = ({ 
  selectedIndustry = 'healthcare' 
}) => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  
  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  
  // State management
  const [showValueCalculator, setShowValueCalculator] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const [selectedIndustryState, setSelectedIndustryState] = useState(selectedIndustry);
  const [pageLoadTime] = useState(Date.now());

  // Environment URLs
 const signupUrl = import.meta.env.VITE_SIGNUP_URL || 'https://contractnest-ui-production.up.railway.app/signup';
const loginUrl = import.meta.env.VITE_LOGIN_URL || 'https://contractnest-ui-production.up.railway.app/login';

  // Page load analytics
  useEffect(() => {
    // Track page load
    if (typeof gtag !== 'undefined') {
      gtag('event', 'page_view', {
        event_category: 'landing_page',
        event_label: 'main_landing',
        value: 1
      });

      // Track page load time
      const loadTime = Date.now() - pageLoadTime;
      gtag('event', 'page_load_time', {
        event_category: 'performance',
        value: loadTime
      });
    }

    // Track scroll depth
    const handleScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      
      // Track milestone scroll depths
      const milestones = [25, 50, 75, 100];
      milestones.forEach(milestone => {
        if (scrollPercent >= milestone && !sessionStorage.getItem(`scroll_${milestone}`)) {
          sessionStorage.setItem(`scroll_${milestone}`, 'true');
          
          if (typeof gtag !== 'undefined') {
            gtag('event', 'scroll_depth', {
              event_category: 'engagement',
              event_label: `${milestone}_percent`,
              value: milestone
            });
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pageLoadTime]);

  // Form submission handler
  const handleFormSubmission = async (formData: FormSubmission) => {
    try {
      // Track form submission
      if (typeof gtag !== 'undefined') {
        gtag('event', 'form_submit', {
          event_category: 'conversion',
          event_label: formData.source,
          value: 10,
          custom_parameters: {
            industry: formData.industry,
            company: formData.companyName
          }
        });
      }

      // Mock API call - replace with actual endpoint
      console.log('Form submitted:', formData);
      
      // Redirect to signup with pre-filled data
      const searchParams = new URLSearchParams({
        email: formData.email,
        company: formData.companyName,
        industry: formData.industry,
        source: formData.source
      });
      
      window.location.href = `${signupUrl}?${searchParams.toString()}`;
      
    } catch (error) {
      console.error('Form submission error:', error);
      
      // Track error
      if (typeof gtag !== 'undefined') {
        gtag('event', 'form_error', {
          event_category: 'error',
          event_label: 'form_submission_failed'
        });
      }
      
      alert('Something went wrong. Please try again or contact support.');
    }
  };

  // Navigation handlers
  const handleIndustrySelect = (industryId: string) => {
    setSelectedIndustryState(industryId);
    
    // Track industry selection
    if (typeof gtag !== 'undefined') {
      gtag('event', 'industry_select', {
        event_category: 'navigation',
        event_label: industryId
      });
    }
    
    // Navigate to industry page or update state
    navigate(`/industry/${industryId}`);
  };

  const handleSignup = () => {
    // Track signup initiation
    if (typeof gtag !== 'undefined') {
      gtag('event', 'signup_initiated', {
        event_category: 'conversion',
        event_label: 'main_cta',
        value: 20
      });
    }
    
    window.location.href = signupUrl;
  };

  const handleLogin = () => {
    // Track login initiation
    if (typeof gtag !== 'undefined') {
      gtag('event', 'login_initiated', {
        event_category: 'conversion',
        event_label: 'navigation'
      });
    }
    
    window.location.href = loginUrl;
  };

  // Modal handlers
  const handleValueCalculatorOpen = () => {
    setShowValueCalculator(true);
    
    // Track calculator open
    if (typeof gtag !== 'undefined') {
      gtag('event', 'calculator_open', {
        event_category: 'engagement',
        event_label: 'value_calculator',
        value: 5
      });
    }
  };

  const handleValueCalculatorClose = () => {
    setShowValueCalculator(false);
  };

  const handleVideoPlay = (videoUrl: string) => {
    setCurrentVideoUrl(videoUrl);
    setShowVideoModal(true);
    
    // Track video play
    if (typeof gtag !== 'undefined') {
      gtag('event', 'video_play', {
        event_category: 'engagement',
        event_label: 'demo_video',
        value: 5
      });
    }
  };

  const handleVideoClose = () => {
    setShowVideoModal(false);
    setCurrentVideoUrl('');
  };

  // Demo and contact handlers
  const handleDemoRequest = () => {
    // Track demo request
    if (typeof gtag !== 'undefined') {
      gtag('event', 'demo_request', {
        event_category: 'conversion',
        event_label: 'book_demo',
        value: 15
      });
    }
    
    // Open calendar booking (replace with actual calendar link)
    window.open('https://calendly.com/contractnest-demo', '_blank');
  };

  const handleContactSales = () => {
    // Track contact sales
    if (typeof gtag !== 'undefined') {
      gtag('event', 'contact_sales', {
        event_category: 'conversion',
        event_label: 'enterprise_inquiry',
        value: 25
      });
    }
    
    // Open email client or contact form
    window.location.href = 'mailto:charan@contractnest.com?subject=ContractNest Enterprise Inquiry';
  };

  const handleResourceDownload = (resourceType: string) => {
    // Track resource download
    if (typeof gtag !== 'undefined') {
      gtag('event', 'resource_download', {
        event_category: 'engagement',
        event_label: resourceType,
        value: 3
      });
    }
    
    console.log(`Downloading ${resourceType}`);
    // Implement actual download logic
  };

  const handleNewsletterSignup = (email: string) => {
    // Track newsletter signup
    if (typeof gtag !== 'undefined') {
      gtag('event', 'newsletter_signup', {
        event_category: 'engagement',
        event_label: 'footer_newsletter',
        value: 2
      });
    }
    
    console.log('Newsletter signup:', email);
    // Implement actual newsletter subscription
  };

  // Timeline and persona handlers
  const handleTimelineStepClick = (persona: string, stepId: string) => {
    // Track timeline interaction
    if (typeof gtag !== 'undefined') {
      gtag('event', 'timeline_interaction', {
        event_category: 'engagement',
        event_label: `${persona}_${stepId}`,
        value: 2
      });
    }
  };

  // Plan selection handler
  const handlePlanSelect = (planId: string) => {
    // Track plan selection
    if (typeof gtag !== 'undefined') {
      gtag('event', 'plan_select', {
        event_category: 'conversion',
        event_label: planId,
        value: planId === 'enterprise' ? 50 : 30
      });
    }
    
    if (planId === 'enterprise') {
      handleContactSales();
    } else {
      handleSignup();
    }
  };

  // Case study handler
  const handleCaseStudyView = (caseStudyId: string) => {
    // Track case study view
    if (typeof gtag !== 'undefined') {
      gtag('event', 'case_study_view', {
        event_category: 'engagement',
        event_label: caseStudyId,
        value: 3
      });
    }
    
    navigate(`/case-studies/${caseStudyId}`);
  };

  // Structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://contractnest.com/#organization",
        "name": "ContractNest",
        "url": "https://contractnest.com",
        "logo": {
          "@type": "ImageObject",
          "@id": "https://contractnest.com/#logo",
          "url": "https://contractnest.com/images/logo.png",
          "width": 200,
          "height": 60
        },
        "description": "Service contract management platform for healthcare, manufacturing, pharmaceutical, and consulting businesses",
        "foundingDate": "2024",
        "founders": [
          {
            "@type": "Person",
            "name": "Charan Kamal B"
          }
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+91-9949701175",
          "contactType": "customer service",
          "email": "charan@contractnest.com"
        },
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Hyderabad",
          "addressRegion": "Telangana",
          "addressCountry": "IN"
        },
        "sameAs": [
          "https://linkedin.com/company/contractnest",
          "https://twitter.com/contractnest"
        ]
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://contractnest.com/#software",
        "name": "ContractNest Platform",
        "applicationCategory": "BusinessApplication",
        "applicationSubCategory": "Contract Management Software",
        "operatingSystem": "Web Browser",
        "description": "Digital platform for managing service contracts with automated compliance tracking and collaborative workflows",
        "offers": {
          "@type": "Offer",
          "price": "150",
          "priceCurrency": "INR",
          "billingPeriod": "P3M",
          "description": "Per contract pricing, billed quarterly. First 10 contracts free."
        },
        "featureList": [
          "Digital contract creation",
          "Automated compliance tracking", 
          "Smart invoicing",
          "Real-time collaboration",
          "SLA monitoring",
          "Payment integration",
          "Analytics and reporting",
          "Mobile accessibility"
        ],
        "screenshot": "https://contractnest.com/images/dashboard-screenshot.png",
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "reviewCount": "127",
          "bestRating": "5",
          "worstRating": "1"
        }
      },
      {
        "@type": "WebSite",
        "@id": "https://contractnest.com/#website",
        "url": "https://contractnest.com",
        "name": "ContractNest",
        "description": "Service Contract Management Platform - Turn Commitments Into Assets",
        "publisher": {
          "@id": "https://contractnest.com/#organization"
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://contractnest.com/search?q={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "FAQPage",
        "@id": "https://contractnest.com/#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is ContractNest?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "ContractNest is a digital platform that transforms service contracts into collaborative, automated agreements. It helps businesses manage compliance, automate invoicing, and improve service relationships across healthcare, manufacturing, pharmaceutical, and consulting industries."
            }
          },
          {
            "@type": "Question",
            "name": "How much does ContractNest cost?",
            "acceptedAnswer": {
              "@type": "Answer", 
              "text": "ContractNest costs ₹150 per contract per quarter. Your first 10 contracts are completely free. No per-user licensing fees, no setup costs, and you can cancel anytime."
            }
          },
          {
            "@type": "Question",
            "name": "Which industries use ContractNest?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "ContractNest is designed for healthcare facilities, manufacturing plants, pharmaceutical companies, and consulting firms that manage recurring service contracts and need automated compliance tracking."
            }
          },
          {
            "@type": "Question",
            "name": "How quickly can I get started?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "You can start using ContractNest in minutes, not months. Our platform is designed for immediate deployment with industry-specific templates and automated setup workflows."
            }
          }
        ]
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Service Contract Management Platform - Turn Commitments Into Assets | ContractNest</title>
        <meta name="description" content="Transform service agreements into automated, collaborative digital contracts. Manage compliance, automate invoicing, and scale your service relationships across healthcare, manufacturing, and consulting industries." />
        <meta name="keywords" content="service contract management, digital service agreements, automated contract compliance, healthcare contract management, manufacturing service contracts, consulting contract automation, SLA monitoring, contract collaboration, India" />
        
        {/* Open Graph */}
        <meta property="og:title" content="ContractNest - Service Contract Management Platform" />
        <meta property="og:description" content="Transform service commitments into profitable relationships with automated compliance and collaborative workflows. Join 500+ businesses already exploring ContractNest." />
        <meta property="og:image" content="https://contractnest.com/images/og-landing-page.jpg" />
        <meta property="og:url" content="https://contractnest.com" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="ContractNest" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="ContractNest - Service Contract Management Platform" />
        <meta name="twitter:description" content="Transform service commitments into profitable relationships with automated compliance and collaborative workflows." />
        <meta name="twitter:image" content="https://contractnest.com/images/twitter-card.jpg" />
        <meta name="twitter:site" content="@contractnest" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow" />
        <link rel="canonical" href="https://contractnest.com" />
        <meta name="author" content="ContractNest" />
        <meta name="geo.region" content="IN-TG" />
        <meta name="geo.placename" content="Hyderabad" />
        <meta name="geo.position" content="17.3850;78.4867" />
        <meta name="ICBM" content="17.3850, 78.4867" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>

        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="//calendly.com" />
        <link rel="dns-prefetch" href="//youtube.com" />
        
        {/* Favicon and app icons */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* Theme color for mobile browsers - Dynamic based on theme */}
        <meta name="theme-color" content={colors.brand.primary} />
        <meta name="msapplication-TileColor" content={colors.brand.primary} />
      </Helmet>

      <div 
        className="min-h-screen transition-colors"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        {/* Navigation */}
        <LandingNavigation
          onIndustrySelect={handleIndustrySelect}
          onNavigate={(path) => navigate(path)}
        />

        {/* Hero Section - Simplified */}
        <LandingHero
          onPlaygroundClick={() => {
            const playgroundSection = document.getElementById('playground');
            if (playgroundSection) {
              playgroundSection.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          onBuyerExplore={() => {
            const playgroundSection = document.getElementById('playground');
            if (playgroundSection) {
              playgroundSection.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          onSellerExplore={() => {
            const playgroundSection = document.getElementById('playground');
            if (playgroundSection) {
              playgroundSection.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        />

        {/* The Problem Section - Dual Persona */}
        <TheProblem
          onCtaClick={() => {
            const playgroundSection = document.getElementById('playground');
            if (playgroundSection) {
              playgroundSection.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        />

        {/* Problem Statistics - Can be removed if TheProblem covers it */}
        {/* <LandingStats
          onCalculatorOpen={handleValueCalculatorOpen}
        /> */}

        {/* Solution Features */}
        <LandingFeatures
          onDemoRequest={handleDemoRequest}
        />

        {/* Customer Testimonials */}
        <LandingTestimonials
          onVideoPlay={handleVideoPlay}
          onCaseStudyView={handleCaseStudyView}
        />

        {/* Industry Showcase */}
        <LandingIndustries
          onIndustrySelect={handleIndustrySelect}
          onViewAll={() => navigate('/industries')}
        />

        {/* Dual Persona Timeline - NEW! */}
        <DualPersonaTimeline
          selectedIndustry={selectedIndustryState}
          onStepClick={handleTimelineStepClick}
        />

        {/* Pricing with Urgency */}
        <LandingPricing
          onPlanSelect={handlePlanSelect}
          onCalculatorOpen={handleValueCalculatorOpen}
          onContactSales={handleContactSales}
        />

        {/* Final CTA */}
        <LandingCTA
          onSignup={handleSignup}
          onDemo={handleDemoRequest}
          onContact={handleContactSales}
          onVideoPlay={handleVideoPlay}
          onDownload={handleResourceDownload}
        />

        {/* Footer */}
        <LandingFooter
          onIndustrySelect={handleIndustrySelect}
          onNewsletterSignup={handleNewsletterSignup}
        />
      </div>

      {/* Value Calculator Modal - Theme Aware */}
      {showValueCalculator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div 
              className="rounded-2xl shadow-2xl transition-colors"
              style={{ backgroundColor: colors.utility.secondaryBackground }}
            >
              {/* Modal Header */}
              <div 
                className="flex items-center justify-between p-6 border-b transition-colors"
                style={{ borderColor: colors.utility.primaryText + '20' }}
              >
                <h2 
                  className="text-2xl font-bold transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  ROI Calculator
                </h2>
                <button
                  onClick={handleValueCalculatorClose}
                  className="p-2 rounded-lg hover:opacity-80 transition-colors"
                  style={{
                    color: colors.utility.secondaryText,
                    backgroundColor: colors.utility.primaryBackground
                  }}
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
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

      {/* Video Modal - Theme Aware */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full aspect-video">
            <button
              onClick={handleVideoClose}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <span className="sr-only">Close video</span>
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div 
              className="w-full h-full rounded-lg flex items-center justify-center"
              style={{ backgroundColor: colors.utility.secondaryBackground }}
            >
              <div 
                className="text-center"
                style={{ color: colors.utility.primaryText }}
              >
                <div className="text-6xl mb-4">🎬</div>
                <h3 className="text-xl font-semibold mb-2">Demo Video</h3>
                <p 
                  style={{ color: colors.utility.secondaryText }}
                >
                  Video player would be integrated here
                </p>
                <p 
                  className="text-sm mt-2"
                  style={{ color: colors.utility.secondaryText }}
                >
                  URL: {currentVideoUrl}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exit Intent Urgency */}
      <UrgencyElements 
        variant="exit-intent" 
        autoShow={false}
        onTrigger={(event, data) => {
          console.log('Exit intent triggered:', event, data);
          // Could show special offer or redirect to signup
        }}
      />

      {/* Performance and Analytics Scripts */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Page load performance tracking
            window.addEventListener('load', function() {
              if ('PerformanceObserver' in window) {
                const observer = new PerformanceObserver((list) => {
                  const entries = list.getEntries();
                  entries.forEach((entry) => {
                    if (entry.entryType === 'largest-contentful-paint') {
                      gtag && gtag('event', 'lcp', {
                        event_category: 'performance',
                        value: Math.round(entry.startTime)
                      });
                    }
                    if (entry.entryType === 'first-input') {
                      gtag && gtag('event', 'fid', {
                        event_category: 'performance',
                        value: Math.round(entry.processingStart - entry.startTime)
                      });
                    }
                  });
                });
                observer.observe({entryTypes: ['largest-contentful-paint', 'first-input']});
              }
            });
            
            // Track user engagement time
            let startTime = Date.now();
            window.addEventListener('beforeunload', function() {
              const engagementTime = Date.now() - startTime;
              gtag && gtag('event', 'engagement_time', {
                event_category: 'engagement',
                value: Math.round(engagementTime / 1000)
              });
            });
            
            // Track CTA button visibility
            const observeElements = document.querySelectorAll('[data-track-visibility]');
            if ('IntersectionObserver' in window && observeElements.length > 0) {
              const visibilityObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                  if (entry.isIntersecting) {
                    const element = entry.target;
                    const trackingLabel = element.getAttribute('data-track-visibility');
                    gtag && gtag('event', 'element_visible', {
                      event_category: 'visibility',
                      event_label: trackingLabel
                    });
                    visibilityObserver.unobserve(element);
                  }
                });
              }, { rootMargin: '0px 0px -50px 0px' });
              
              observeElements.forEach(el => visibilityObserver.observe(el));
            }
          `
        }}
      />
    </>
  );
};

export default LandingPage;
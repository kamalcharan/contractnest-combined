// src/vani/pages/channels/WebsiteIntegrationPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import {
  Globe,
  Code,
  Zap,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Rocket,
  Shield,
  Users,
  DollarSign,
  Sparkles,
  Lock,
  BookOpen,
  Play,
  Package
} from 'lucide-react';
import toast from 'react-hot-toast';

const WebsiteIntegrationPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    website: '',
    platform: 'react',
    useCase: 'contract_extension'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const platforms = [
    { id: 'react', name: 'React', icon: '⚛️', description: 'Modern React components' },
    { id: 'javascript', name: 'JavaScript', icon: '📜', description: 'Vanilla JavaScript integration' },
    { id: 'php', name: 'PHP', icon: '🐘', description: 'PHP server-side integration' },
    { id: 'wix', name: 'WIX', icon: '🎨', description: 'WIX website builder' }
  ];

  const useCases = [
    { id: 'contract_extension', name: 'Contract Extension Portal', description: 'Let customers extend contracts directly' },
    { id: 'service_booking', name: 'Service Booking', description: 'Enable online service bookings' },
    { id: 'customer_portal', name: 'Customer Portal', description: 'Full customer dashboard integration' },
    { id: 'payment_gateway', name: 'Payment Collection', description: 'Collect payments online' }
  ];

  const features = [
    {
      icon: Code,
      title: 'Multi-Platform SDK',
      description: 'Integrate seamlessly with React, JavaScript, PHP, and WIX',
      color: colors.brand.primary
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Optimized widget loads in under 2 seconds',
      color: colors.semantic.success
    },
    {
      icon: Shield,
      title: 'Secure & Compliant',
      description: 'Bank-grade encryption and GDPR compliant',
      color: colors.semantic.warning
    },
    {
      icon: Package,
      title: 'White-Label Ready',
      description: 'Fully customizable to match your brand',
      color: colors.brand.secondary
    },
    {
      icon: TrendingUp,
      title: 'Real-Time Analytics',
      description: 'Track widget performance and conversions',
      color: colors.brand.primary
    },
    {
      icon: Users,
      title: 'Customer Experience',
      description: 'Seamless experience for your customers',
      color: colors.semantic.success
    }
  ];

  const benefits = [
    {
      stat: '85%',
      label: 'Conversion Increase',
      description: 'Tenants see 85% higher contract renewals with embedded widgets'
    },
    {
      stat: '50%',
      label: 'Time Saved',
      description: 'Reduce manual contract processing time by half'
    },
    {
      stat: '24/7',
      label: 'Always Available',
      description: 'Customers can extend contracts anytime, anywhere'
    },
    {
      stat: '< 5min',
      label: 'Setup Time',
      description: 'Get your widget live on your website in minutes'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast.success('Interest registered! Our team will contact you within 24 hours.', {
        style: { background: colors.semantic.success, color: '#FFF' },
        duration: 5000
      });

      // TODO: Replace with actual API call
      console.log('Website Integration Interest:', formData);

      // Reset form
      setFormData({
        companyName: '',
        email: '',
        website: '',
        platform: 'react',
        useCase: 'contract_extension'
      });

    } catch (error) {
      toast.error('Something went wrong. Please try again.', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl p-12"
        style={{
          background: `linear-gradient(135deg, ${colors.brand.primary}15 0%, ${colors.brand.secondary}15 100%)`,
          borderColor: `${colors.brand.primary}30`
        }}
      >
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full mb-6"
            style={{
              backgroundColor: `${colors.semantic.success}20`,
              color: colors.semantic.success
            }}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">COMING SOON - Express Interest Now</span>
          </div>

          <h1 className="text-5xl font-bold mb-6"
            style={{ color: colors.utility.primaryText }}
          >
            Extend Contracts to<br />
            <span style={{
              background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Your Website
            </span>
          </h1>

          <p className="text-xl mb-8"
            style={{ color: colors.utility.secondaryText }}
          >
            Integrate ContractNest directly into your website. Let customers extend contracts,
            book services, and manage subscriptions without leaving your site.
          </p>

          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => document.getElementById('interest-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 rounded-lg font-semibold text-white flex items-center space-x-2 transition-all hover:opacity-90 transform hover:scale-105"
              style={{
                background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
              }}
            >
              <Rocket className="w-5 h-5" />
              <span>Get Early Access</span>
            </button>

            <button
              onClick={() => toast('Demo video coming soon!', { icon: '🎬' })}
              className="px-8 py-4 rounded-lg font-semibold flex items-center space-x-2 transition-all hover:opacity-80"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                border: `2px solid ${colors.brand.primary}40`
              }}
            >
              <Play className="w-5 h-5" />
              <span>Watch Demo</span>
            </button>
          </div>
        </div>

        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20"
          style={{
            background: `radial-gradient(circle, ${colors.brand.primary}, transparent)`
          }}
        />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-20"
          style={{
            background: `radial-gradient(circle, ${colors.brand.secondary}, transparent)`
          }}
        />
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {benefits.map((benefit, index) => (
          <Card
            key={index}
            className="text-center p-6"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}20`
            }}
          >
            <div className="text-4xl font-bold mb-2"
              style={{
                background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              {benefit.stat}
            </div>
            <div className="font-semibold mb-2"
              style={{ color: colors.utility.primaryText }}
            >
              {benefit.label}
            </div>
            <p className="text-sm"
              style={{ color: colors.utility.secondaryText }}
            >
              {benefit.description}
            </p>
          </Card>
        ))}
      </div>

      {/* Features Grid */}
      <div className="space-y-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl font-bold mb-4"
            style={{ color: colors.utility.primaryText }}
          >
            Everything You Need to Integrate
          </h2>
          <p className="text-lg"
            style={{ color: colors.utility.secondaryText }}
          >
            Powerful features designed for seamless integration with your existing website
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="p-6 hover:shadow-lg transition-all cursor-pointer transform hover:scale-105"
                style={{
                  backgroundColor: colors.utility.primaryBackground,
                  borderColor: `${colors.utility.primaryText}15`
                }}
              >
                <div className="mb-4">
                  <div className="p-3 rounded-lg inline-flex"
                    style={{
                      backgroundColor: `${feature.color}20`
                    }}
                  >
                    <Icon className="w-6 h-6" style={{ color: feature.color }} />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2"
                  style={{ color: colors.utility.primaryText }}
                >
                  {feature.title}
                </h3>
                <p style={{ color: colors.utility.secondaryText }}>
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Platform Selection */}
      <div className="space-y-6">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <h2 className="text-3xl font-bold mb-4"
            style={{ color: colors.utility.primaryText }}
          >
            Choose Your Platform
          </h2>
          <p className="text-lg"
            style={{ color: colors.utility.secondaryText }}
          >
            We support all major platforms and frameworks
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {platforms.map((platform) => (
            <Card
              key={platform.id}
              className="p-6 text-center hover:shadow-lg transition-all cursor-pointer transform hover:scale-105"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: `${colors.brand.primary}30`
              }}
            >
              <div className="text-5xl mb-4">{platform.icon}</div>
              <h3 className="text-xl font-semibold mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                {platform.name}
              </h3>
              <p className="text-sm"
                style={{ color: colors.utility.secondaryText }}
              >
                {platform.description}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <Card style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: `${colors.utility.primaryText}20`
      }}>
        <CardHeader>
          <CardTitle style={{ color: colors.utility.primaryText }}>
            <div className="flex items-center space-x-2">
              <BookOpen className="w-6 h-6" />
              <span>How It Works</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Express Interest', description: 'Fill out the form below to get early access' },
              { step: '2', title: 'Get API Keys', description: 'Receive your unique API keys and tenant ID' },
              { step: '3', title: 'Copy & Paste Code', description: 'Add our widget snippet to your website' },
              { step: '4', title: 'Go Live', description: 'Start accepting contract extensions instantly' }
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center text-xl font-bold"
                  style={{
                    background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                    color: '#FFF'
                  }}
                >
                  {step.step}
                </div>
                <h4 className="font-semibold mb-2"
                  style={{ color: colors.utility.primaryText }}
                >
                  {step.title}
                </h4>
                <p className="text-sm"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {step.description}
                </p>
                {index < 3 && (
                  <div className="hidden md:block">
                    <ArrowRight className="w-6 h-6 mx-auto mt-4 opacity-30"
                      style={{ color: colors.brand.primary }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Interest Form */}
      <Card
        id="interest-form"
        className="max-w-2xl mx-auto"
        style={{
          backgroundColor: colors.utility.primaryBackground,
          borderColor: `${colors.brand.primary}40`
        }}
      >
        <CardHeader>
          <CardTitle
            className="text-center text-2xl"
            style={{ color: colors.utility.primaryText }}
          >
            Express Your Interest
          </CardTitle>
          <p className="text-center mt-2"
            style={{ color: colors.utility.secondaryText }}
          >
            Be among the first to integrate ContractNest into your website.
            Get 50% off for the first 6 months!
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                Company Name *
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2"
                style={{
                  borderColor: `${colors.utility.secondaryText}40`,
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  '--tw-ring-color': colors.brand.primary
                } as React.CSSProperties}
                placeholder="Your company name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2"
                style={{
                  borderColor: `${colors.utility.secondaryText}40`,
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  '--tw-ring-color': colors.brand.primary
                } as React.CSSProperties}
                placeholder="your.email@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                Website URL *
              </label>
              <input
                type="url"
                required
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2"
                style={{
                  borderColor: `${colors.utility.secondaryText}40`,
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  '--tw-ring-color': colors.brand.primary
                } as React.CSSProperties}
                placeholder="https://www.yourwebsite.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                Platform/Technology *
              </label>
              <select
                required
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2"
                style={{
                  borderColor: `${colors.utility.secondaryText}40`,
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  '--tw-ring-color': colors.brand.primary
                } as React.CSSProperties}
              >
                {platforms.map(platform => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name} - {platform.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                Primary Use Case *
              </label>
              <select
                required
                value={formData.useCase}
                onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2"
                style={{
                  borderColor: `${colors.utility.secondaryText}40`,
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  '--tw-ring-color': colors.brand.primary
                } as React.CSSProperties}
              >
                {useCases.map(useCase => (
                  <option key={useCase.id} value={useCase.id}>
                    {useCase.name} - {useCase.description}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-2 px-6 py-4 rounded-lg font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  <span>Express Interest</span>
                </>
              )}
            </button>

            <p className="text-xs text-center"
              style={{ color: colors.utility.secondaryText }}
            >
              By submitting, you agree to be contacted about Website Integration.
              We'll never share your information.
            </p>
          </form>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: `${colors.utility.primaryText}20`
      }}>
        <CardHeader>
          <CardTitle style={{ color: colors.utility.primaryText }}>
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              q: 'When will Website Integration be available?',
              a: 'We\'re targeting Q1 2026 for the first beta release. Early access participants will get it first.'
            },
            {
              q: 'How much will it cost?',
              a: 'Pricing starts at ₹999/month. First 50 tenants get 50% off for 6 months.'
            },
            {
              q: 'Do I need technical knowledge to integrate?',
              a: 'No! Our SDK is designed for easy copy-paste integration. Full documentation and support included.'
            },
            {
              q: 'Can I customize the widget appearance?',
              a: 'Absolutely! Full white-label customization to match your brand colors, fonts, and style.'
            },
            {
              q: 'Is it mobile-friendly?',
              a: 'Yes! Our widget is fully responsive and works seamlessly on all devices.'
            }
          ].map((faq, index) => (
            <div key={index} className="p-4 rounded-lg"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                borderLeft: `4px solid ${colors.brand.primary}`
              }}
            >
              <h4 className="font-semibold mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                {faq.q}
              </h4>
              <p style={{ color: colors.utility.secondaryText }}>
                {faq.a}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default WebsiteIntegrationPage;

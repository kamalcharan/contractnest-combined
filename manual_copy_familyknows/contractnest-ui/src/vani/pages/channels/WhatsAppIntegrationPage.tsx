// src/vani/pages/channels/WhatsAppIntegrationPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import {
  MessageSquare,
  Smartphone,
  Users,
  Lock,
  Zap,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Rocket,
  Shield,
  Clock,
  Sparkles,
  Brain,
  BookOpen,
  Play,
  Key,
  UserPlus,
  Globe,
  Target,
  Bell
} from 'lucide-react';
import toast from 'react-hot-toast';

const WhatsAppIntegrationPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'bot' | 'groups'>('bot');
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    phone: '',
    useCase: 'customer_support',
    hasWhatsAppBusiness: 'no'
  });

  const [groupJoinData, setGroupJoinData] = useState({
    phone: '',
    password: '',
    name: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isJoiningGroup, setIsJoiningGroup] = useState(false);

  const features = [
    {
      icon: MessageSquare,
      title: 'WhatsApp Business API',
      description: 'Official Meta API integration for reliable messaging',
      color: colors.brand.primary
    },
    {
      icon: Brain,
      title: 'Context-Aware Bot',
      description: 'AI understands user profile, services, and conversation history',
      color: colors.semantic.success
    },
    {
      icon: Target,
      title: 'Intent Recognition',
      description: 'Automatically classifies queries: support, sales, or information',
      color: colors.semantic.warning
    },
    {
      icon: BookOpen,
      title: 'Document Learning',
      description: 'Upload brochures and docs to train your WhatsApp bot',
      color: colors.brand.secondary
    },
    {
      icon: Users,
      title: 'Group Management',
      description: 'Password-protected WhatsApp groups for exclusive communities',
      color: colors.brand.primary
    },
    {
      icon: Shield,
      title: 'Secure & Compliant',
      description: 'End-to-end encryption with WhatsApp Business guidelines',
      color: colors.semantic.error
    }
  ];

  const benefits = [
    {
      stat: '2.5B+',
      label: 'WhatsApp Users',
      description: 'Reach customers on their favorite messaging platform'
    },
    {
      stat: '98%',
      label: 'Open Rate',
      description: 'WhatsApp messages have 10x higher open rates than email'
    },
    {
      stat: '< 1min',
      label: 'Avg Response',
      description: 'Instant AI-powered responses to customer queries'
    },
    {
      stat: '24/7',
      label: 'Always On',
      description: 'Never miss a customer message, even at midnight'
    }
  ];

  const botCapabilities = [
    'Automated FAQ responses',
    'Service booking and scheduling',
    'Contract status inquiries',
    'Payment reminders and links',
    'Document sharing (PDFs, images)',
    'Multi-language support',
    'Smart routing to human agents',
    'Conversation analytics'
  ];

  const groupFeatures = [
    'Password-protected group invites',
    'Exclusive member-only content',
    'Admin-managed access control',
    'Broadcast messages to all members',
    'Subset groups (e.g., BBB network)',
    'Custom intents (e.g., "Hi BBB")',
    'Member analytics and engagement',
    'Automated welcome messages'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast.success('Interest registered! Our team will reach out within 24 hours to help you set up WhatsApp integration.', {
        style: { background: colors.semantic.success, color: '#FFF' },
        duration: 5000
      });

      console.log('WhatsApp Integration Interest:', formData);

      setFormData({
        companyName: '',
        email: '',
        phone: '',
        useCase: 'customer_support',
        hasWhatsAppBusiness: 'no'
      });

    } catch (error) {
      toast.error('Something went wrong. Please try again.', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGroupJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsJoiningGroup(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Validate password (example: "bagyanagar")
      if (groupJoinData.password.toLowerCase() === 'bagyanagar') {
        toast.success('Password verified! You will receive a WhatsApp group invite link shortly.', {
          style: { background: colors.semantic.success, color: '#FFF' },
          duration: 5000
        });

        console.log('Group Join Request:', groupJoinData);

        setGroupJoinData({
          phone: '',
          password: '',
          name: ''
        });
      } else {
        toast.error('Incorrect password. Please contact the group admin for the correct password.', {
          style: { background: colors.semantic.error, color: '#FFF' }
        });
      }

    } catch (error) {
      toast.error('Something went wrong. Please try again.', {
        style: { background: colors.semantic.error, color: '#FFF' }
      });
    } finally {
      setIsJoiningGroup(false);
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl p-12"
        style={{
          background: `linear-gradient(135deg, #25D366 15, ${colors.brand.secondary}15 100%)`,
          borderColor: '#25D366'
        }}
      >
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full mb-6"
            style={{
              backgroundColor: '#25D36620',
              color: '#25D366'
            }}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">WHATSAPP BUSINESS - Express Interest Now</span>
          </div>

          <div className="flex items-center justify-center space-x-3 mb-6">
            <MessageSquare className="w-16 h-16"
              style={{ color: '#25D366' }}
            />
            <h1 className="text-5xl font-bold"
              style={{ color: colors.utility.primaryText }}
            >
              Connect with Customers on
              <br />
              <span style={{ color: '#25D366' }}>
                WhatsApp
              </span>
            </h1>
          </div>

          <p className="text-xl mb-8"
            style={{ color: colors.utility.secondaryText }}
          >
            Deploy an AI-powered WhatsApp bot for customer support, sales, and service.
            Plus, create password-protected WhatsApp groups for exclusive communities.
          </p>

          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => document.getElementById('interest-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 rounded-lg font-semibold text-white flex items-center space-x-2 transition-all hover:opacity-90 transform hover:scale-105"
              style={{
                backgroundColor: '#25D366'
              }}
            >
              <Rocket className="w-5 h-5" />
              <span>Get Early Access</span>
            </button>

            <button
              onClick={() => document.getElementById('group-invite')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 rounded-lg font-semibold flex items-center space-x-2 transition-all hover:opacity-80"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                border: `2px solid #25D366`
              }}
            >
              <Key className="w-5 h-5" />
              <span>Join BBB Group</span>
            </button>
          </div>
        </div>

        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #25D366, transparent)'
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
              style={{ color: '#25D366' }}
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

      {/* Tabs: Bot vs Groups */}
      <div className="flex justify-center space-x-2">
        <button
          onClick={() => setActiveTab('bot')}
          className="px-6 py-3 rounded-lg font-semibold transition-all"
          style={{
            backgroundColor: activeTab === 'bot' ? '#25D366' : colors.utility.secondaryBackground,
            color: activeTab === 'bot' ? '#FFF' : colors.utility.primaryText
          }}
        >
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>WhatsApp Bot</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className="px-6 py-3 rounded-lg font-semibold transition-all"
          style={{
            backgroundColor: activeTab === 'groups' ? '#25D366' : colors.utility.secondaryBackground,
            color: activeTab === 'groups' ? '#FFF' : colors.utility.primaryText
          }}
        >
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>WhatsApp Groups</span>
          </div>
        </button>
      </div>

      {/* Bot Tab Content */}
      {activeTab === 'bot' && (
        <div className="space-y-8">
          {/* Features Grid */}
          <div className="space-y-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl font-bold mb-4"
                style={{ color: colors.utility.primaryText }}
              >
                WhatsApp Bot Features
              </h2>
              <p className="text-lg"
                style={{ color: colors.utility.secondaryText }}
              >
                AI-powered automation for customer engagement on WhatsApp
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.slice(0, 4).map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card
                    key={index}
                    className="p-6 hover:shadow-lg transition-all"
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

          {/* Bot Capabilities */}
          <Card style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}20`
          }}>
            <CardHeader>
              <CardTitle style={{ color: colors.utility.primaryText }}>
                What Can Your WhatsApp Bot Do?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {botCapabilities.map((capability, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0"
                      style={{ color: '#25D366' }}
                    />
                    <span style={{ color: colors.utility.secondaryText }}>
                      {capability}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}20`
          }}>
            <CardHeader>
              <CardTitle style={{ color: colors.utility.primaryText }}>
                How WhatsApp Bot Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                  { step: '1', title: 'Setup N8N Workflow', description: 'Configure automation workflow on separate N8N server' },
                  { step: '2', title: 'Connect Meta API', description: 'Link your WhatsApp Business account via Meta Cloud API' },
                  { step: '3', title: 'Train AI', description: 'Upload context, services, and brochures for semantic learning' },
                  { step: '4', title: 'Go Live', description: 'Start receiving and auto-responding to customer messages' }
                ].map((step, index) => (
                  <div key={index} className="text-center">
                    <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center text-xl font-bold text-white"
                      style={{ backgroundColor: '#25D366' }}
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
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Groups Tab Content */}
      {activeTab === 'groups' && (
        <div className="space-y-8">
          {/* Group Features */}
          <div className="space-y-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl font-bold mb-4"
                style={{ color: colors.utility.primaryText }}
              >
                WhatsApp Groups with Access Control
              </h2>
              <p className="text-lg"
                style={{ color: colors.utility.secondaryText }}
              >
                Create exclusive communities with password-protected invites (BBB model)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.slice(4, 6).map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card
                    key={index}
                    className="p-6 hover:shadow-lg transition-all"
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

          {/* Group Features List */}
          <Card style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}20`
          }}>
            <CardHeader>
              <CardTitle style={{ color: colors.utility.primaryText }}>
                WhatsApp Group Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0"
                      style={{ color: '#25D366' }}
                    />
                    <span style={{ color: colors.utility.secondaryText }}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* BBB Subset Model Explained */}
          <Card style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: `${colors.utility.primaryText}20`
          }}>
            <CardHeader>
              <CardTitle style={{ color: colors.utility.primaryText }}>
                <div className="flex items-center space-x-2">
                  <Target className="w-6 h-6" />
                  <span>BBB Subset Model</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p style={{ color: colors.utility.secondaryText }}>
                The BBB (Bagyanagar Business Network) model allows you to create exclusive WhatsApp groups
                that function as subsets of ContractNest with their own custom intents.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Core ContractNest Intents (Default)
                  </h4>
                  <ul className="space-y-2">
                    {['Service inquiries', 'Contract status', 'Payment reminders', 'General support'].map((intent, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span style={{ color: colors.brand.primary }}>•</span>
                        <span style={{ color: colors.utility.secondaryText }}>{intent}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold"
                    style={{ color: colors.utility.primaryText }}
                  >
                    BBB Group Exclusive Intents
                  </h4>
                  <ul className="space-y-2">
                    {['Activate with "Hi BBB"', 'Network-specific queries', 'Member-only content', 'Community discussions'].map((intent, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span style={{ color: '#25D366' }}>•</span>
                        <span style={{ color: colors.utility.secondaryText }}>{intent}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-lg"
                style={{
                  backgroundColor: '#25D36620',
                  border: `2px solid #25D366`
                }}
              >
                <p className="font-semibold mb-2"
                  style={{ color: colors.utility.primaryText }}
                >
                  Example: Triggering BBB Intent
                </p>
                <div className="space-y-2">
                  <div className="flex items-start space-x-3">
                    <MessageSquare className="w-5 h-5 flex-shrink-0"
                      style={{ color: '#25D366' }}
                    />
                    <div>
                      <p className="text-sm font-medium"
                        style={{ color: colors.utility.primaryText }}
                      >
                        User sends: "Hi BBB"
                      </p>
                      <p className="text-xs"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        Bot switches to BBB-specific context and intents
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Join Group Form */}
          <Card
            id="group-invite"
            className="max-w-2xl mx-auto"
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderColor: '#25D366'
            }}
          >
            <CardHeader>
              <CardTitle
                className="text-center text-2xl"
                style={{ color: colors.utility.primaryText }}
              >
                <div className="flex items-center justify-center space-x-2">
                  <Key className="w-6 h-6" style={{ color: '#25D366' }} />
                  <span>Join BBB WhatsApp Group</span>
                </div>
              </CardTitle>
              <p className="text-center mt-2"
                style={{ color: colors.utility.secondaryText }}
              >
                Enter the password to receive an exclusive invite link
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGroupJoin} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={groupJoinData.name}
                    onChange={(e) => setGroupJoinData({ ...groupJoinData, name: e.target.value })}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2"
                    style={{
                      borderColor: `${colors.utility.secondaryText}40`,
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.primaryText,
                      '--tw-ring-color': '#25D366'
                    } as React.CSSProperties}
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2"
                    style={{ color: colors.utility.primaryText }}
                  >
                    WhatsApp Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={groupJoinData.phone}
                    onChange={(e) => setGroupJoinData({ ...groupJoinData, phone: e.target.value })}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2"
                    style={{
                      borderColor: `${colors.utility.secondaryText}40`,
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.primaryText,
                      '--tw-ring-color': '#25D366'
                    } as React.CSSProperties}
                    placeholder="+91 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2"
                    style={{ color: colors.utility.primaryText }}
                  >
                    <div className="flex items-center space-x-2">
                      <Lock className="w-4 h-4" />
                      <span>Group Password *</span>
                    </div>
                  </label>
                  <input
                    type="password"
                    required
                    value={groupJoinData.password}
                    onChange={(e) => setGroupJoinData({ ...groupJoinData, password: e.target.value })}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2"
                    style={{
                      borderColor: `${colors.utility.secondaryText}40`,
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.primaryText,
                      '--tw-ring-color': '#25D366'
                    } as React.CSSProperties}
                    placeholder="Enter password provided by admin"
                  />
                  <p className="text-xs mt-1"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    Contact the group admin if you don't have the password
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isJoiningGroup}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-4 rounded-lg font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    backgroundColor: '#25D366'
                  }}
                >
                  {isJoiningGroup ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      <span>Join WhatsApp Group</span>
                    </>
                  )}
                </button>

                <p className="text-xs text-center"
                  style={{ color: colors.utility.secondaryText }}
                >
                  By joining, you agree to group rules and ContractNest's terms of service.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Interest Form (shown for both tabs) */}
      <Card
        id="interest-form"
        className="max-w-2xl mx-auto"
        style={{
          backgroundColor: colors.utility.primaryBackground,
          borderColor: '#25D366'
        }}
      >
        <CardHeader>
          <CardTitle
            className="text-center text-2xl"
            style={{ color: colors.utility.primaryText }}
          >
            Express Interest in WhatsApp Integration
          </CardTitle>
          <p className="text-center mt-2"
            style={{ color: colors.utility.secondaryText }}
          >
            Be among the first to deploy WhatsApp Bot and Groups. Early access gets 50% off!
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    '--tw-ring-color': '#25D366'
                  } as React.CSSProperties}
                  placeholder="Your company"
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
                    '--tw-ring-color': '#25D366'
                  } as React.CSSProperties}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2"
                style={{
                  borderColor: `${colors.utility.secondaryText}40`,
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  '--tw-ring-color': '#25D366'
                } as React.CSSProperties}
                placeholder="+91 9876543210"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    '--tw-ring-color': '#25D366'
                  } as React.CSSProperties}
                >
                  <option value="customer_support">Customer Support</option>
                  <option value="sales">Sales & Lead Generation</option>
                  <option value="service_updates">Service Updates</option>
                  <option value="groups">WhatsApp Groups</option>
                  <option value="all">All of the above</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2"
                  style={{ color: colors.utility.primaryText }}
                >
                  Have WhatsApp Business? *
                </label>
                <select
                  required
                  value={formData.hasWhatsAppBusiness}
                  onChange={(e) => setFormData({ ...formData, hasWhatsAppBusiness: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    borderColor: `${colors.utility.secondaryText}40`,
                    backgroundColor: colors.utility.secondaryBackground,
                    color: colors.utility.primaryText,
                    '--tw-ring-color': '#25D366'
                  } as React.CSSProperties}
                >
                  <option value="no">No, need help setting up</option>
                  <option value="yes">Yes, already have account</option>
                  <option value="pending">Application pending</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-2 px-6 py-4 rounded-lg font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: '#25D366'
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5" />
                  <span>Get Early Access</span>
                </>
              )}
            </button>

            <p className="text-xs text-center"
              style={{ color: colors.utility.secondaryText }}
            >
              Our team will help you set up WhatsApp Business API if you don't have it yet.
              Early access participants get 50% off for 6 months.
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
              q: 'Do I need a WhatsApp Business account?',
              a: 'Yes, but we\'ll help you set it up! Meta approval typically takes 1-2 weeks.'
            },
            {
              q: 'How much does WhatsApp integration cost?',
              a: 'Starts at ₹1,499/month + WhatsApp message costs ($0.005-$0.05 per message). Early access gets 50% off.'
            },
            {
              q: 'Can I create multiple WhatsApp groups?',
              a: 'Yes! Create unlimited password-protected groups for different customer segments.'
            },
            {
              q: 'What is the "Hi BBB" trigger?',
              a: 'It\'s a custom intent that switches the bot to BBB-specific context, allowing subset-specific responses.'
            },
            {
              q: 'Is N8N workflow required?',
              a: 'Yes, we use N8N for workflow automation. We\'ll set it up on a separate server for you.'
            },
            {
              q: 'How does semantic clustering work?',
              a: 'Our AI groups similar user profiles and queries to improve response accuracy over time.'
            }
          ].map((faq, index) => (
            <div key={index} className="p-4 rounded-lg"
              style={{
                backgroundColor: colors.utility.primaryBackground,
                borderLeft: `4px solid #25D366`
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

export default WhatsAppIntegrationPage;

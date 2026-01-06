// src/vani/pages/channels/ChatBotIntegrationPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../contexts/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import {
  MessageSquare,
  Bot,
  Brain,
  Zap,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Rocket,
  Shield,
  Users,
  Clock,
  Sparkles,
  Database,
  BookOpen,
  Play,
  FileText,
  Target,
  BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';

const ChatBotIntegrationPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    website: '',
    industry: '',
    useCase: 'customer_support',
    monthlyQueries: '100-500'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const useCases = [
    { id: 'customer_support', name: 'Customer Support', icon: Users, description: 'Answer FAQs and support tickets' },
    { id: 'sales', name: 'Sales Assistant', icon: Target, description: 'Lead qualification and product info' },
    { id: 'informational', name: 'Information Bot', icon: BookOpen, description: 'Service details and documentation' },
    { id: 'all', name: 'All-in-One', icon: Sparkles, description: 'Support + Sales + Info combined' }
  ];

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Intelligence',
      description: 'Advanced LLM with semantic understanding of your business',
      color: colors.brand.primary
    },
    {
      icon: Database,
      title: 'Semantic Clustering',
      description: 'Automatically groups user profiles and intents for better targeting',
      color: colors.semantic.success
    },
    {
      icon: FileText,
      title: 'Document Learning',
      description: 'Upload brochures, PDFs, and docs to train your bot',
      color: colors.semantic.warning
    },
    {
      icon: Target,
      title: 'Context-Aware',
      description: 'Understands user profile, services, and conversation history',
      color: colors.brand.secondary
    },
    {
      icon: Zap,
      title: 'Instant Responses',
      description: 'Sub-second response times for natural conversations',
      color: colors.brand.primary
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Enterprise-grade security with data encryption',
      color: colors.semantic.error
    }
  ];

  const benefits = [
    {
      stat: '24/7',
      label: 'Availability',
      description: 'Never miss a customer query, even outside business hours'
    },
    {
      stat: '70%',
      label: 'Cost Reduction',
      description: 'Reduce customer support costs by automating responses'
    },
    {
      stat: '< 2s',
      label: 'Response Time',
      description: 'Lightning-fast responses improve customer satisfaction'
    },
    {
      stat: '85%',
      label: 'Accuracy',
      description: 'High accuracy with continuous learning from interactions'
    }
  ];

  const capabilities = [
    {
      category: 'Customer Support',
      items: [
        'Answer FAQs automatically',
        'Ticket creation and routing',
        'Service status inquiries',
        'Appointment scheduling'
      ]
    },
    {
      category: 'Sales & Lead Generation',
      items: [
        'Lead qualification questions',
        'Product recommendations',
        'Pricing information',
        'Demo scheduling'
      ]
    },
    {
      category: 'Information Services',
      items: [
        'Contract details lookup',
        'Service catalog browsing',
        'Document retrieval',
        'Knowledge base search'
      ]
    },
    {
      category: 'Intelligence & Analytics',
      items: [
        'User intent recognition',
        'Sentiment analysis',
        'Conversation analytics',
        'Performance metrics'
      ]
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast.success('Interest registered! We\'ll send you early access details within 24 hours.', {
        style: { background: colors.semantic.success, color: '#FFF' },
        duration: 5000
      });

      // TODO: Replace with actual API call
      console.log('Chat Bot Integration Interest:', formData);

      // Reset form
      setFormData({
        companyName: '',
        email: '',
        website: '',
        industry: '',
        useCase: 'customer_support',
        monthlyQueries: '100-500'
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
            <span className="text-sm font-medium">AI-POWERED - Express Interest for Early Access</span>
          </div>

          <div className="flex items-center justify-center space-x-3 mb-6">
            <Bot className="w-16 h-16"
              style={{ color: colors.brand.primary }}
            />
            <h1 className="text-5xl font-bold"
              style={{ color: colors.utility.primaryText }}
            >
              Intelligent Chat Bot for
              <br />
              <span style={{
                background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Support, Sales & Service
              </span>
            </h1>
          </div>

          <p className="text-xl mb-8"
            style={{ color: colors.utility.secondaryText }}
          >
            Deploy an AI-powered chatbot that understands your business, learns from your documents,
            and provides intelligent customer support, sales assistance, and information services - all in one.
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
              onClick={() => toast('Interactive demo coming soon!', { icon: '🤖' })}
              className="px-8 py-4 rounded-lg font-semibold flex items-center space-x-2 transition-all hover:opacity-80"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                border: `2px solid ${colors.brand.primary}40`
              }}
            >
              <Play className="w-5 h-5" />
              <span>Try Demo</span>
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
            Powered by Advanced AI
          </h2>
          <p className="text-lg"
            style={{ color: colors.utility.secondaryText }}
          >
            Our chatbot uses cutting-edge language models and semantic clustering to deliver
            intelligent, context-aware responses
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

      {/* Use Cases */}
      <div className="space-y-6">
        <div className="text-center max-w-3xl mx-auto mb-8">
          <h2 className="text-3xl font-bold mb-4"
            style={{ color: colors.utility.primaryText }}
          >
            Choose Your Bot Type
          </h2>
          <p className="text-lg"
            style={{ color: colors.utility.secondaryText }}
          >
            Specialized bots for different business needs, or combine them all
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {useCases.map((useCase) => {
            const Icon = useCase.icon;
            return (
              <Card
                key={useCase.id}
                className="p-6 text-center hover:shadow-lg transition-all cursor-pointer transform hover:scale-105"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderColor: `${colors.brand.primary}30`
                }}
              >
                <div className="mb-4">
                  <div className="p-4 rounded-full inline-flex mx-auto"
                    style={{
                      backgroundColor: `${colors.brand.primary}20`
                    }}
                  >
                    <Icon className="w-8 h-8"
                      style={{ color: colors.brand.primary }}
                    />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2"
                  style={{ color: colors.utility.primaryText }}
                >
                  {useCase.name}
                </h3>
                <p className="text-sm"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {useCase.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Capabilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {capabilities.map((capability, index) => (
          <Card
            key={index}
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: `${colors.utility.primaryText}20`
            }}
          >
            <CardHeader>
              <CardTitle style={{ color: colors.utility.primaryText }}>
                {capability.category}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {capability.items.map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0"
                      style={{ color: colors.semantic.success }}
                    />
                    <span style={{ color: colors.utility.secondaryText }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* How It Works */}
      <Card style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderColor: `${colors.utility.primaryText}20`
      }}>
        <CardHeader>
          <CardTitle style={{ color: colors.utility.primaryText }}>
            <div className="flex items-center space-x-2">
              <Brain className="w-6 h-6" />
              <span>How Our AI Bot Works</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: '1',
                title: 'Upload Context',
                description: 'Upload brochures, product docs, and FAQs to train your bot',
                icon: FileText
              },
              {
                step: '2',
                title: 'Semantic Learning',
                description: 'AI creates semantic clusters of your services and user profiles',
                icon: Database
              },
              {
                step: '3',
                title: 'Context Understanding',
                description: 'Bot learns tenant profile, services, and business context',
                icon: Brain
              },
              {
                step: '4',
                title: 'Intelligent Responses',
                description: 'Provides accurate, context-aware answers to customer queries',
                icon: MessageSquare
              }
            ].map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                    style={{
                      background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
                    }}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-sm font-bold mb-2"
                    style={{
                      color: colors.brand.primary
                    }}
                  >
                    STEP {step.step}
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
              );
            })}
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
            Express Your Interest in AI Chat Bot
          </CardTitle>
          <p className="text-center mt-2"
            style={{ color: colors.utility.secondaryText }}
          >
            Get early access to our intelligent chat bot and save 50% for the first 6 months!
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
                    '--tw-ring-color': colors.brand.primary
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
                    '--tw-ring-color': colors.brand.primary
                  } as React.CSSProperties}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2"
                style={{ color: colors.utility.primaryText }}
              >
                Website (Optional)
              </label>
              <input
                type="url"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2"
                  style={{ color: colors.utility.primaryText }}
                >
                  Industry *
                </label>
                <input
                  type="text"
                  required
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    borderColor: `${colors.utility.secondaryText}40`,
                    backgroundColor: colors.utility.secondaryBackground,
                    color: colors.utility.primaryText,
                    '--tw-ring-color': colors.brand.primary
                  } as React.CSSProperties}
                  placeholder="e.g., Healthcare, Manufacturing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2"
                  style={{ color: colors.utility.primaryText }}
                >
                  Expected Monthly Queries *
                </label>
                <select
                  required
                  value={formData.monthlyQueries}
                  onChange={(e) => setFormData({ ...formData, monthlyQueries: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    borderColor: `${colors.utility.secondaryText}40`,
                    backgroundColor: colors.utility.secondaryBackground,
                    color: colors.utility.primaryText,
                    '--tw-ring-color': colors.brand.primary
                  } as React.CSSProperties}
                >
                  <option value="0-100">0-100</option>
                  <option value="100-500">100-500</option>
                  <option value="500-2000">500-2,000</option>
                  <option value="2000+">2,000+</option>
                </select>
              </div>
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
                  <Bot className="w-5 h-5" />
                  <span>Get Early Access to AI Bot</span>
                </>
              )}
            </button>

            <p className="text-xs text-center"
              style={{ color: colors.utility.secondaryText }}
            >
              By submitting, you agree to be contacted about Chat Bot Integration.
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
              q: 'What AI model powers the chat bot?',
              a: 'We use state-of-the-art language models (GPT-4 or Claude) with custom fine-tuning for your business context.'
            },
            {
              q: 'How does semantic clustering work?',
              a: 'Our AI automatically groups similar user queries and profiles to improve response accuracy over time.'
            },
            {
              q: 'Can I train the bot with my documents?',
              a: 'Yes! Upload brochures, PDFs, FAQs, and product docs. The bot learns from all your content.'
            },
            {
              q: 'What languages are supported?',
              a: 'Initially English and Hindi. We\'ll expand to 10+ Indian languages based on demand.'
            },
            {
              q: 'How much does it cost?',
              a: 'Pricing starts at ₹1,999/month for 1,000 conversations. Early access gets 50% off for 6 months.'
            },
            {
              q: 'Can it hand off to human agents?',
              a: 'Absolutely! Smart routing to human agents when confidence is low or user requests it.'
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

export default ChatBotIntegrationPage;

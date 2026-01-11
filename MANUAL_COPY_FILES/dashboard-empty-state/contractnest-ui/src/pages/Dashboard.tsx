// src/pages/Dashboard.tsx - Empty State with Coming Soon
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import {
  MessageCircle,
  Sparkles,
  Rocket,
  FileText,
  Calendar,
  Users,
  Bot,
  ArrowRight,
  Clock,
  Zap,
  Shield,
  BarChart3
} from 'lucide-react';

// Floating background icons for animation
const floatingIcons = [
  { Icon: FileText, top: '10%', left: '5%', delay: '0s', duration: '20s' },
  { Icon: Calendar, top: '20%', right: '8%', delay: '2s', duration: '18s' },
  { Icon: Users, top: '65%', left: '3%', delay: '4s', duration: '22s' },
  { Icon: Shield, top: '75%', right: '6%', delay: '1s', duration: '19s' },
  { Icon: BarChart3, top: '40%', left: '7%', delay: '3s', duration: '21s' },
  { Icon: Zap, top: '30%', right: '10%', delay: '5s', duration: '17s' },
];

// Coming soon features
const comingSoonFeatures = [
  { icon: FileText, title: 'Smart Contracts', description: 'Digital contract creation & management' },
  { icon: Calendar, title: 'Appointments', description: 'Schedule & track service visits' },
  { icon: BarChart3, title: 'Analytics', description: 'Insights & performance reports' },
  { icon: Shield, title: 'Compliance', description: 'Automated compliance tracking' },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const { user } = useAuth();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const handleWhatsAppProfileClick = () => {
    navigate('/settings/configure/customer-channels/groups');
  };

  return (
    <div
      className="relative min-h-[calc(100vh-120px)] overflow-hidden"
      style={{ backgroundColor: colors.utility.primaryBackground }}
    >
      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.06; }
          25% { transform: translateY(-15px) rotate(3deg); opacity: 0.1; }
          50% { transform: translateY(-8px) rotate(-2deg); opacity: 0.08; }
          75% { transform: translateY(-20px) rotate(2deg); opacity: 0.12; }
        }
        @keyframes slideUp {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(var(--glow-color), 0.3); }
          50% { box-shadow: 0 0 40px rgba(var(--glow-color), 0.5); }
        }
        @keyframes bot-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.05); }
        }
        .animate-float {
          animation: float var(--duration, 20s) ease-in-out infinite;
          animation-delay: var(--delay, 0s);
        }
        .animate-slide-up {
          animation: slideUp 0.6s ease-out forwards;
        }
        .animate-slide-up-delay-1 {
          animation: slideUp 0.6s ease-out 0.1s forwards;
          opacity: 0;
        }
        .animate-slide-up-delay-2 {
          animation: slideUp 0.6s ease-out 0.2s forwards;
          opacity: 0;
        }
        .animate-slide-up-delay-3 {
          animation: slideUp 0.6s ease-out 0.3s forwards;
          opacity: 0;
        }
        .animate-bot-bounce {
          animation: bot-bounce 2s ease-in-out infinite;
        }
        .hover-lift {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .hover-lift:hover {
          transform: translateY(-5px);
        }
      `}</style>

      {/* Floating Background Icons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {floatingIcons.map((item, index) => (
          <div
            key={index}
            className="absolute animate-float"
            style={{
              top: item.top,
              left: item.left,
              right: item.right,
              ['--delay' as any]: item.delay,
              ['--duration' as any]: item.duration,
            } as React.CSSProperties}
          >
            <item.Icon
              className="w-12 h-12 md:w-16 md:h-16"
              style={{ color: colors.brand.primary, opacity: 0.08 }}
            />
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">

        {/* Welcome Section */}
        <div className="text-center mb-12 animate-slide-up">
          <div
            className="inline-flex items-center px-4 py-2 rounded-full mb-6"
            style={{
              backgroundColor: `${colors.brand.primary}15`,
              border: `1px solid ${colors.brand.primary}30`
            }}
          >
            <Sparkles className="w-4 h-4 mr-2" style={{ color: colors.brand.primary }} />
            <span className="text-sm font-medium" style={{ color: colors.brand.primary }}>
              Welcome to ContractNest
            </span>
          </div>

          <h1
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: colors.utility.primaryText }}
          >
            Hello{user?.first_name ? `, ${user.first_name}` : ''}! 👋
          </h1>

          <p
            className="text-lg max-w-2xl mx-auto"
            style={{ color: colors.utility.secondaryText }}
          >
            Your workspace is ready. We're building something amazing for you.
          </p>
        </div>

        {/* WhatsApp AI Profile CTA Card */}
        <div
          className="relative mb-12 animate-slide-up-delay-1 hover-lift cursor-pointer"
          onClick={handleWhatsAppProfileClick}
        >
          <div
            className="rounded-2xl p-8 overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary})`,
              boxShadow: `0 20px 40px ${colors.brand.primary}30`
            }}
          >
            {/* Decorative circles */}
            <div
              className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20"
              style={{ backgroundColor: '#ffffff' }}
            />
            <div
              className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full opacity-10"
              style={{ backgroundColor: '#ffffff' }}
            />

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center animate-bot-bounce"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  <Bot className="w-10 h-10 text-white" />
                </div>
                <div className="text-center md:text-left">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                    Create Your WhatsApp AI Profile
                  </h2>
                  <p className="text-white/80 text-sm md:text-base max-w-md">
                    If you're here from a BBB group, create your profile to be discoverable via WhatsApp Bot
                  </p>
                </div>
              </div>

              <button
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105"
                style={{
                  backgroundColor: '#ffffff',
                  color: colors.brand.primary
                }}
              >
                <MessageCircle className="w-5 h-5" />
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Coming Soon Section */}
        <div className="animate-slide-up-delay-2">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Clock className="w-5 h-5" style={{ color: colors.brand.primary }} />
            <h2
              className="text-xl font-semibold"
              style={{ color: colors.utility.primaryText }}
            >
              Coming Soon
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {comingSoonFeatures.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-xl border transition-all hover-lift"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderColor: `${colors.utility.primaryText}10`
                }}
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${colors.brand.primary}10` }}
                >
                  <feature.icon
                    className="w-6 h-6"
                    style={{ color: colors.brand.primary }}
                  />
                </div>
                <h3
                  className="font-semibold mb-2"
                  style={{ color: colors.utility.primaryText }}
                >
                  {feature.title}
                </h3>
                <p
                  className="text-sm"
                  style={{ color: colors.utility.secondaryText }}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Message */}
        <div className="text-center mt-12 animate-slide-up-delay-3">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              backgroundColor: `${colors.semantic.info}10`,
              border: `1px solid ${colors.semantic.info}20`
            }}
          >
            <Rocket className="w-4 h-4" style={{ color: colors.semantic.info }} />
            <span
              className="text-sm"
              style={{ color: colors.semantic.info }}
            >
              We're working hard to bring you more features. Stay tuned!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

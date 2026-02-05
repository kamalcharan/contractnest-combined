// src/components/contacts/cockpit/ActionIsland.tsx
// Floating Action Island - Bottom center persistent actions
// Cycle 1: Updated with Profile, Message, VaNi, Invoice, Contract

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  DollarSign,
  MessageSquare,
  ChevronUp,
  User,
  Truck,
  Handshake,
  Sparkles,
  Mail,
  Phone,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ActionIslandProps {
  contactId: string;
  contactName: string;
  classifications?: string[];
  contactStatus?: 'active' | 'inactive' | 'archived';
  primaryEmail?: string;
  primaryPhone?: string;
  onProfileClick?: () => void;
  className?: string;
}

const ActionIsland: React.FC<ActionIslandProps> = ({
  contactId,
  contactName,
  classifications = [],
  contactStatus = 'active',
  primaryEmail,
  primaryPhone,
  onProfileClick,
  className = '',
}) => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [showContractMenu, setShowContractMenu] = useState(false);
  const [showMessageMenu, setShowMessageMenu] = useState(false);

  const isDisabled = contactStatus === 'archived';

  // Contract creation options based on classification
  const getContractOptions = () => {
    const options = [];

    if (classifications.includes('client') || classifications.length === 0) {
      options.push({
        id: 'client',
        label: 'Client Contract',
        icon: <FileText className="h-4 w-4" />,
        color: '#10B981',
        type: 'client',
      });
    }

    if (classifications.includes('vendor') || classifications.includes('partner')) {
      if (!options.find((o) => o.id === 'client')) {
        options.push({
          id: 'client',
          label: 'Client Contract',
          icon: <FileText className="h-4 w-4" />,
          color: '#10B981',
          type: 'client',
        });
      }
      options.push({
        id: 'vendor',
        label: 'Vendor Contract',
        icon: <Truck className="h-4 w-4" />,
        color: '#3B82F6',
        type: 'vendor',
      });
    }

    if (classifications.includes('partner')) {
      options.push({
        id: 'partner',
        label: 'Partner Contract',
        icon: <Handshake className="h-4 w-4" />,
        color: '#8B5CF6',
        type: 'partner',
      });
    }

    return options;
  };

  const contractOptions = getContractOptions();

  const handleCreateContract = (type: string) => {
    navigate(`/contracts/create?contactId=${contactId}&contractType=${type}`);
    setShowContractMenu(false);
  };

  const handleCreateInvoice = () => {
    navigate(`/billing/create?contactId=${contactId}`);
  };

  const handleSendEmail = () => {
    if (primaryEmail) {
      window.location.href = `mailto:${primaryEmail}`;
    }
    setShowMessageMenu(false);
  };

  const handleSendWhatsApp = () => {
    if (primaryPhone) {
      // Remove non-numeric characters and add country code if needed
      const phone = primaryPhone.replace(/\D/g, '');
      const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;
      window.open(`https://wa.me/${formattedPhone}`, '_blank');
    }
    setShowMessageMenu(false);
  };

  const handleVaNiClick = () => {
    // VaNi AI assistant - placeholder for future implementation
    console.log('VaNi clicked for contact:', contactId);
    // TODO: Open VaNi chat interface
  };

  // Button base styles
  const getButtonStyle = (color: string, isIcon: boolean = false) => ({
    backgroundColor: color,
    color: 'white',
    padding: isIcon ? '10px' : '8px 16px',
    borderRadius: isIcon ? '50%' : '9999px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isIcon ? 0 : '6px',
    fontWeight: 600,
    fontSize: '13px',
    transition: 'all 0.2s ease',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.5 : 1,
    border: 'none',
    outline: 'none',
  });

  return (
    <>
      {/* Island Container */}
      <div
        className={`
          fixed bottom-6 left-1/2 -translate-x-1/2 z-50
          transition-all duration-300 ease-out
          ${className}
        `}
      >
        {/* Main Island */}
        <div
          className={`
            flex items-center gap-2 px-3 py-2.5 rounded-full
            shadow-2xl backdrop-blur-xl
            transition-all duration-300
            ${isDarkMode ? 'bg-gray-900/95 border border-gray-700' : 'bg-white/95 border border-gray-200'}
          `}
          style={{
            boxShadow: isDarkMode
              ? '0 20px 60px rgba(0, 0, 0, 0.5), 0 8px 20px rgba(0, 0, 0, 0.3)'
              : '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Profile Button */}
          <button
            onClick={onProfileClick}
            disabled={isDisabled}
            className="hover:scale-105 active:scale-95 transition-transform"
            style={getButtonStyle('#6366F1', true)}
            title="View Profile"
          >
            <User className="h-5 w-5" />
          </button>

          {/* Divider */}
          <div className={`w-px h-8 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

          {/* Message Button with Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                if (primaryEmail && !primaryPhone) {
                  handleSendEmail();
                } else if (primaryPhone && !primaryEmail) {
                  handleSendWhatsApp();
                } else {
                  setShowMessageMenu(!showMessageMenu);
                }
              }}
              disabled={isDisabled || (!primaryEmail && !primaryPhone)}
              className="hover:scale-105 active:scale-95 transition-transform"
              style={{
                ...getButtonStyle('#10B981', true),
                opacity: isDisabled || (!primaryEmail && !primaryPhone) ? 0.5 : 1,
              }}
              title="Send Message"
            >
              <MessageSquare className="h-5 w-5" />
            </button>

            {/* Message Dropdown */}
            {showMessageMenu && (primaryEmail || primaryPhone) && (
              <div
                className={`
                  absolute bottom-full left-1/2 -translate-x-1/2 mb-2 py-2 rounded-xl
                  shadow-xl border min-w-[160px]
                  ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
                `}
              >
                {primaryEmail && (
                  <button
                    onClick={handleSendEmail}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left
                      transition-colors
                      ${isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'}
                    `}
                  >
                    <Mail className="h-4 w-4 text-blue-500" />
                    Send Email
                  </button>
                )}
                {primaryPhone && (
                  <button
                    onClick={handleSendWhatsApp}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left
                      transition-colors
                      ${isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'}
                    `}
                  >
                    <Phone className="h-4 w-4 text-green-500" />
                    WhatsApp
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className={`w-px h-8 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

          {/* VaNi Button with Shimmer */}
          <button
            onClick={handleVaNiClick}
            disabled={isDisabled}
            className="relative overflow-hidden hover:scale-105 active:scale-95 transition-transform"
            style={getButtonStyle('linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)', true)}
            title="Ask VaNi"
          >
            <Sparkles className="h-5 w-5 relative z-10" />
            {/* Shimmer Effect */}
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                animation: 'shimmer 2s infinite',
              }}
            />
            <style>
              {`
                @keyframes shimmer {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(100%); }
                }
              `}
            </style>
          </button>

          {/* Divider */}
          <div className={`w-px h-8 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

          {/* Invoice Button */}
          <button
            onClick={handleCreateInvoice}
            disabled={isDisabled}
            className="hover:scale-105 active:scale-95 transition-transform"
            style={getButtonStyle('#3B82F6')}
          >
            <DollarSign className="h-4 w-4" />
            <span>Invoice</span>
          </button>

          {/* Divider */}
          <div className={`w-px h-8 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

          {/* Contract Button with Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                if (contractOptions.length === 1) {
                  handleCreateContract(contractOptions[0].type);
                } else {
                  setShowContractMenu(!showContractMenu);
                }
              }}
              disabled={isDisabled}
              className="hover:scale-105 active:scale-95 transition-transform"
              style={getButtonStyle('#10B981')}
            >
              <FileText className="h-4 w-4" />
              <span>Contract</span>
              {contractOptions.length > 1 && (
                <ChevronUp
                  className={`h-3 w-3 transition-transform ${showContractMenu ? '' : 'rotate-180'}`}
                />
              )}
            </button>

            {/* Contract Dropdown */}
            {showContractMenu && contractOptions.length > 1 && (
              <div
                className={`
                  absolute bottom-full right-0 mb-2 py-2 rounded-xl
                  shadow-xl border min-w-[180px]
                  ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
                `}
              >
                {contractOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleCreateContract(option.type)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left
                      transition-colors
                      ${isDarkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'}
                    `}
                  >
                    <span style={{ color: option.color }}>{option.icon}</span>
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside handlers for dropdowns */}
      {(showContractMenu || showMessageMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowContractMenu(false);
            setShowMessageMenu(false);
          }}
        />
      )}
    </>
  );
};

export default ActionIsland;

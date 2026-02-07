// src/components/contacts/cockpit/ActionIsland.tsx
// Floating Action Island - Bottom center persistent actions
// Actions: Profile | Contract ▾ | Email (mailto:) | WhatsApp (wa.me/)

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  ChevronUp,
  User,
  Truck,
  Handshake,
  Mail,
  MessageCircle,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ActionIslandProps {
  contactId: string;
  contactName: string;
  classifications?: string[];
  contactStatus?: 'active' | 'inactive' | 'archived';
  primaryEmail?: string;
  primaryPhone?: string;
  phoneCountryCode?: string;
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
  phoneCountryCode,
  onProfileClick,
  className = '',
}) => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [showContractMenu, setShowContractMenu] = useState(false);

  const isDisabled = contactStatus === 'archived';

  // Contract creation options based on classification
  const getContractOptions = () => {
    const options: { id: string; label: string; icon: React.ReactNode; color: string; type: string }[] = [];

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
      if (!options.find(o => o.id === 'client')) {
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

  // Email via mailto:
  const handleEmail = () => {
    if (primaryEmail) {
      window.location.href = `mailto:${primaryEmail}`;
    }
  };

  // WhatsApp via wa.me/
  const handleWhatsApp = () => {
    if (primaryPhone) {
      const digits = primaryPhone.replace(/\D/g, '');
      const code = phoneCountryCode?.replace(/\D/g, '') || '91';
      window.open(`https://wa.me/${code}${digits}`, '_blank');
    }
  };

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
            flex items-center gap-2 px-4 py-3 rounded-full
            shadow-2xl backdrop-blur-xl
            transition-all duration-300
            ${isDarkMode
              ? 'bg-gray-900/95 border border-gray-700'
              : 'bg-white/95 border border-gray-200'
            }
          `}
          style={{
            boxShadow: isDarkMode
              ? '0 20px 60px rgba(0, 0, 0, 0.5), 0 8px 20px rgba(0, 0, 0, 0.3)'
              : '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Profile Button */}
          {onProfileClick && (
            <>
              <button
                onClick={onProfileClick}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full
                  font-semibold text-sm transition-all
                  hover:scale-105 active:scale-95
                `}
                style={{
                  backgroundColor: isDarkMode ? '#6366F1' : '#4F46E5',
                  color: 'white',
                }}
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </button>

              {/* Divider */}
              <div className={`w-px h-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
            </>
          )}

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
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full
                font-semibold text-sm transition-all
                ${isDisabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-105 active:scale-95'
                }
              `}
              style={{
                backgroundColor: '#10B981',
                color: 'white',
              }}
            >
              <FileText className="h-4 w-4" />
              <span>Contract</span>
              {contractOptions.length > 1 && (
                <ChevronUp className={`h-3 w-3 transition-transform ${showContractMenu ? '' : 'rotate-180'}`} />
              )}
            </button>

            {/* Contract Dropdown */}
            {showContractMenu && contractOptions.length > 1 && (
              <div
                className={`
                  absolute bottom-full left-0 mb-2 py-2 rounded-xl
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

          {/* Divider */}
          <div className={`w-px h-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

          {/* Email Button (mailto:) */}
          <button
            onClick={handleEmail}
            disabled={!primaryEmail || isDisabled}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full
              font-semibold text-sm transition-all
              ${(!primaryEmail || isDisabled)
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:scale-105 active:scale-95'
              }
            `}
            style={{
              backgroundColor: '#3B82F6',
              color: 'white',
            }}
            title={primaryEmail || 'No email available'}
          >
            <Mail className="h-4 w-4" />
            <span>Email</span>
          </button>

          {/* WhatsApp Button (wa.me/) */}
          <button
            onClick={handleWhatsApp}
            disabled={!primaryPhone || isDisabled}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full
              font-semibold text-sm transition-all
              ${(!primaryPhone || isDisabled)
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:scale-105 active:scale-95'
              }
            `}
            style={{
              backgroundColor: '#25D366',
              color: 'white',
            }}
            title={primaryPhone ? `WhatsApp: ${primaryPhone}` : 'No phone available'}
          >
            <MessageCircle className="h-4 w-4" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Click outside to close contract menu */}
      {showContractMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowContractMenu(false)}
        />
      )}
    </>
  );
};

export default ActionIsland;

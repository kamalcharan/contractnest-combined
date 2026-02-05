// src/components/contacts/cockpit/ActionIsland.tsx
// Floating Action Island - Bottom center persistent actions

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  DollarSign,
  Plus,
  MessageSquare,
  ChevronUp,
  X,
  Calendar,
  User,
  Settings,
  Truck,
  Handshake,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ActionIslandProps {
  contactId: string;
  contactName: string;
  classifications?: string[];
  contactStatus?: 'active' | 'inactive' | 'archived';
  className?: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  hoverBgColor: string;
  onClick: () => void;
  disabled?: boolean;
}

const ActionIsland: React.FC<ActionIslandProps> = ({
  contactId,
  contactName,
  classifications = [],
  contactStatus = 'active',
  className = '',
}) => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showContractMenu, setShowContractMenu] = useState(false);

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

  const handleCreateInvoice = () => {
    navigate(`/billing/create?contactId=${contactId}`);
  };

  const handleLogActivity = () => {
    // TODO: Open activity log modal
    console.log('Log activity for', contactId);
  };

  const handleScheduleEvent = () => {
    navigate(`/calendar?contactId=${contactId}`);
  };

  return (
    <>
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

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

          {/* Invoice Button */}
          <button
            onClick={handleCreateInvoice}
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
              backgroundColor: '#3B82F6',
              color: 'white',
            }}
          >
            <DollarSign className="h-4 w-4" />
            <span>Invoice</span>
          </button>

          {/* Divider */}
          <div className={`w-px h-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

          {/* Quick Actions Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`
              p-2.5 rounded-full transition-all
              ${isExpanded
                ? (isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900')
                : (isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100')
              }
            `}
          >
            {isExpanded ? (
              <X className="h-5 w-5" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Expanded Actions */}
        {isExpanded && (
          <div
            className={`
              absolute bottom-full left-1/2 -translate-x-1/2 mb-3
              flex items-center gap-3 px-4 py-3 rounded-2xl
              shadow-xl backdrop-blur-xl
              animate-in slide-in-from-bottom-2 fade-in duration-200
              ${isDarkMode
                ? 'bg-gray-800/95 border border-gray-700'
                : 'bg-white/95 border border-gray-200'
              }
            `}
          >
            {/* Schedule Event */}
            <button
              onClick={handleScheduleEvent}
              disabled={isDisabled}
              className={`
                flex flex-col items-center gap-1 p-3 rounded-xl
                transition-all
                ${isDisabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-purple-500/10 hover:scale-105'
                }
              `}
            >
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Calendar className="h-5 w-5 text-purple-500" />
              </div>
              <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Schedule
              </span>
            </button>

            {/* Log Activity */}
            <button
              onClick={handleLogActivity}
              disabled={isDisabled}
              className={`
                flex flex-col items-center gap-1 p-3 rounded-xl
                transition-all
                ${isDisabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-amber-500/10 hover:scale-105'
                }
              `}
            >
              <div className="p-2 rounded-lg bg-amber-500/10">
                <MessageSquare className="h-5 w-5 text-amber-500" />
              </div>
              <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Log Activity
              </span>
            </button>

            {/* Assign Task */}
            <button
              onClick={() => navigate(`/tasks/create?contactId=${contactId}`)}
              disabled={isDisabled}
              className={`
                flex flex-col items-center gap-1 p-3 rounded-xl
                transition-all
                ${isDisabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-cyan-500/10 hover:scale-105'
                }
              `}
            >
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <User className="h-5 w-5 text-cyan-500" />
              </div>
              <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Assign
              </span>
            </button>
          </div>
        )}
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

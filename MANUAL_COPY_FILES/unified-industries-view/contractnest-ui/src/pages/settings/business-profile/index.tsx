// src/pages/settings/business-profile/index.tsx - Business Profile with Sidebar Nav
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building, Phone, Mail, Globe, MapPin, Palette, Pencil, ShoppingCart, Wrench, Info, MessageCircle, Calendar, FileText, AlertTriangle, Trash2, Factory } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { analyticsService } from '@/services/analytics.service';
import { businessTypes } from '@/utils/constants/businessTypes';
import { useIndustries } from '@/hooks/queries/useProductMasterdata';
import { countries } from '@/utils/constants/countries';
import { cn } from '@/lib/utils';
import { VaNiLoader } from '@/components/common/loaders/UnifiedLoader';
import { vaniToast } from '@/components/common/toast/VaNiToast';
import ServedIndustriesSection from './ServedIndustriesSection';

const BusinessProfilePage = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [activeSection, setActiveSection] = useState<string>('overview');

  // Track page view
  React.useEffect(() => {
    analyticsService.trackPageView('settings/business-profile', 'Business Profile');
  }, []);

  // Use the tenant profile hook
  const { loading, profile } = useTenantProfile();

  // Fetch industries from API
  const { data: industriesResponse } = useIndustries();
  const industries = industriesResponse?.data || [];

  const handleEditClick = () => navigate('/settings/business-profile/edit');
  const handleBack = () => navigate('/settings');
  const handleCloseAccountClick = () => navigate('/settings/business-profile/close-account');

  // Find matching business type and industry
  const businessType = profile?.business_type_id
    ? businessTypes.find(type => type.id === profile.business_type_id)
    : null;
  const industry = profile?.industry_id
    ? industries.find(ind => ind.id === profile.industry_id)
    : null;
  const country = profile?.country_code
    ? countries.find(c => c.code === profile.country_code)
    : null;

  const getBusinessTypeIcon = (typeId: string) => {
    switch (typeId) {
      case 'buyer': return ShoppingCart;
      case 'seller': return Wrench;
      default: return Building;
    }
  };

  // Sidebar sections
  const sections = [
    { id: 'overview', label: 'Overview', icon: Building },
    { id: 'industries', label: 'Industries', icon: Factory },
    { id: 'danger', label: 'Close Account', icon: AlertTriangle },
  ];

  return (
    <div
      className="min-h-screen transition-colors duration-200"
      style={{
        background: isDarkMode
          ? `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
          : `linear-gradient(to bottom right, ${colors.utility.primaryBackground}, ${colors.utility.secondaryBackground})`
      }}
    >
      {/* Header */}
      <div className="border-b" style={{ borderColor: colors.utility.primaryText + '20' }}>
        <div className="p-6">
          <div className="flex items-center mb-2">
            <button
              onClick={handleBack}
              className="mr-4 p-2 rounded-full transition-colors hover:opacity-80"
              style={{ backgroundColor: colors.utility.secondaryBackground + '80' }}
            >
              <ArrowLeft className="h-5 w-5" style={{ color: colors.utility.secondaryText }} />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold" style={{ color: colors.utility.primaryText }}>
                Business Profile
              </h1>
              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                Manage your service contract management profile and settings
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading state (before sidebar shows) */}
      {loading ? (
        <div className="p-10">
          <VaNiLoader size="md" message="Loading business profile..." />
        </div>
      ) : !profile ? (
        /* No profile - show create prompt */
        <div className="p-6">
          <div
            className="rounded-lg shadow-sm border p-10 text-center transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.primaryText + '20'
            }}
          >
            <h3 className="text-lg font-medium mb-2 transition-colors" style={{ color: colors.utility.primaryText }}>
              No Business Profile Found
            </h3>
            <p className="mb-6 transition-colors" style={{ color: colors.utility.secondaryText }}>
              Set up your business profile to define your role in service contract management and customize your experience.
            </p>
            <button
              onClick={handleEditClick}
              className="px-4 py-2 rounded-md hover:opacity-90 transition-colors"
              style={{ backgroundColor: colors.brand.primary, color: '#ffffff' }}
            >
              Create Business Profile
            </button>
          </div>
        </div>
      ) : (
        /* Profile exists — show sidebar + content */
        <div className="flex flex-col lg:flex-row">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 border-r" style={{ borderColor: colors.utility.primaryText + '20' }}>
            <nav className="p-4 space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                const isDanger = section.id === 'danger';
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                      isActive && "font-medium"
                    )}
                    style={{
                      backgroundColor: isActive
                        ? isDanger ? 'rgba(239, 68, 68, 0.1)' : colors.brand.primary + '10'
                        : 'transparent',
                      color: isActive
                        ? isDanger ? '#EF4444' : colors.brand.primary
                        : colors.utility.secondaryText
                    }}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6">
            <div className="max-w-4xl">

              {/* ═══ OVERVIEW SECTION ═══ */}
              {activeSection === 'overview' && (
                <div className="space-y-8">
                  {/* Header with Edit Button */}
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold transition-colors" style={{ color: colors.utility.primaryText }}>
                      Business Profile
                    </h2>
                    <button
                      onClick={handleEditClick}
                      className="flex items-center px-4 py-2 rounded-md border hover:opacity-80 transition-colors"
                      style={{
                        borderColor: colors.brand.primary,
                        color: colors.brand.primary,
                        backgroundColor: colors.brand.primary + '10'
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Profile
                    </button>
                  </div>

                  {/* Business Type Persona Card */}
                  {businessType && (
                    <div
                      className="rounded-lg border shadow-sm transition-colors"
                      style={{
                        backgroundColor: colors.utility.secondaryBackground,
                        borderColor: businessType.color + '30',
                        borderLeft: `4px solid ${businessType.color}`
                      }}
                    >
                      <div className="p-6 pb-4">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div
                              className="w-14 h-14 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: businessType.color + '20', color: businessType.color }}
                            >
                              {React.createElement(getBusinessTypeIcon(businessType.id), { size: 28 })}
                            </div>
                            <div>
                              <h3 className="font-bold text-2xl transition-colors" style={{ color: colors.utility.primaryText }}>
                                {businessType.name}
                              </h3>
                              <p className="text-sm mt-1 font-medium transition-colors" style={{ color: businessType.color }}>
                                Your Service Contract Management Role
                              </p>
                            </div>
                          </div>
                        </div>
                        <div
                          className="mb-4 p-4 rounded-lg border"
                          style={{ backgroundColor: businessType.color + '08', borderColor: businessType.color + '20' }}
                        >
                          <div className="flex items-start">
                            <Info className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" style={{ color: businessType.color }} />
                            <p className="text-sm leading-relaxed transition-colors" style={{ color: colors.utility.primaryText }}>
                              <strong>As a {businessType.name.split(' ')[0]}:</strong> {businessType.helpText}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="px-6 py-4 border-t" style={{ borderColor: businessType.color + '15' }}>
                        <h4 className="font-semibold mb-3 text-base transition-colors" style={{ color: colors.utility.primaryText }}>
                          Real-World Examples:
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {businessType.examples.map((example, index) => (
                            <div
                              key={index}
                              className="p-3 rounded-lg border transition-colors"
                              style={{ backgroundColor: businessType.color + '05', borderColor: businessType.color + '15' }}
                            >
                              <div className="flex items-start">
                                <span className="w-2 h-2 rounded-full mr-3 mt-2 flex-shrink-0" style={{ backgroundColor: businessType.color }} />
                                <span className="text-sm leading-relaxed" style={{ color: colors.utility.primaryText }}>
                                  {example}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div
                        className="px-6 py-4 border-t"
                        style={{ borderColor: businessType.color + '15', backgroundColor: businessType.color + '05' }}
                      >
                        <h4 className="font-semibold mb-3 text-base transition-colors" style={{ color: colors.utility.primaryText }}>
                          How This Customizes Your ContractNest Experience:
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {businessType.id === 'buyer' ? (
                            <>
                              <div className="text-sm">
                                <div className="font-medium mb-1" style={{ color: businessType.color }}>Dashboard Focus</div>
                                <div style={{ color: colors.utility.secondaryText }}>Service requests, vendor performance, and SLA compliance tracking</div>
                              </div>
                              <div className="text-sm">
                                <div className="font-medium mb-1" style={{ color: businessType.color }}>Key Workflows</div>
                                <div style={{ color: colors.utility.secondaryText }}>Invoice approval, vendor evaluation, and service quality monitoring</div>
                              </div>
                              <div className="text-sm">
                                <div className="font-medium mb-1" style={{ color: businessType.color }}>Priority Tools</div>
                                <div style={{ color: colors.utility.secondaryText }}>Vendor management, contract compliance, and cost analysis</div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-sm">
                                <div className="font-medium mb-1" style={{ color: businessType.color }}>Dashboard Focus</div>
                                <div style={{ color: colors.utility.secondaryText }}>Client relationships, service delivery, and performance metrics</div>
                              </div>
                              <div className="text-sm">
                                <div className="font-medium mb-1" style={{ color: businessType.color }}>Key Workflows</div>
                                <div style={{ color: colors.utility.secondaryText }}>Service scheduling, client communication, and billing management</div>
                              </div>
                              <div className="text-sm">
                                <div className="font-medium mb-1" style={{ color: businessType.color }}>Priority Tools</div>
                                <div style={{ color: colors.utility.secondaryText }}>Client portal, service tracking, and revenue optimization</div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Organization Card */}
                    <div
                      className="rounded-lg border shadow-sm p-6 transition-colors"
                      style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '20' }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: colors.brand.primary + '20', color: colors.brand.primary }}
                          >
                            <Building size={20} />
                          </div>
                          <h3 className="font-semibold text-lg transition-colors" style={{ color: colors.utility.primaryText }}>
                            Organization
                          </h3>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                          {profile.logo_url ? (
                            <div className="w-16 h-16 rounded overflow-hidden border" style={{ borderColor: colors.utility.primaryText + '20' }}>
                              <img src={profile.logo_url} alt={profile.business_name} className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded flex items-center justify-center" style={{ backgroundColor: colors.utility.secondaryText + '20' }}>
                              <Building size={24} style={{ color: colors.utility.secondaryText }} />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-lg transition-colors" style={{ color: colors.utility.primaryText }}>
                              {profile.business_name}
                            </div>
                            <button
                              className="text-sm transition-colors hover:underline text-left"
                              style={{ color: industry ? colors.brand.primary : colors.utility.secondaryText }}
                              onClick={() => setActiveSection('industries')}
                              title="View Industries"
                            >
                              {industry?.name || 'Industry not specified'}
                            </button>
                          </div>
                        </div>
                        {profile.short_description && (
                          <div className="flex space-x-3">
                            <FileText className="h-5 w-5 shrink-0 mt-0.5" style={{ color: colors.utility.secondaryText }} />
                            <div className="text-sm transition-colors" style={{ color: colors.utility.primaryText }}>
                              {profile.short_description}
                            </div>
                          </div>
                        )}
                        {(profile.address_line1 || profile.city || profile.country_code) && (
                          <div className="flex space-x-3">
                            <MapPin className="h-5 w-5 shrink-0 mt-0.5" style={{ color: colors.utility.secondaryText }} />
                            <div style={{ color: colors.utility.primaryText }}>
                              {profile.address_line1 && <div>{profile.address_line1}</div>}
                              {profile.address_line2 && <div>{profile.address_line2}</div>}
                              {(profile.city || profile.state_code || profile.postal_code) && (
                                <div>
                                  {profile.city && `${profile.city}, `}
                                  {profile.state_code && `${profile.state_code} `}
                                  {profile.postal_code && profile.postal_code}
                                </div>
                              )}
                              {country?.name && <div>{country.name}</div>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contact Information Card */}
                    <div
                      className="rounded-lg border shadow-sm p-6 transition-colors"
                      style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '20' }}
                    >
                      <div className="flex items-center space-x-3 mb-4">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: colors.brand.primary + '20', color: colors.brand.primary }}
                        >
                          <Phone size={20} />
                        </div>
                        <h3 className="font-semibold text-lg transition-colors" style={{ color: colors.utility.primaryText }}>
                          Contact Information
                        </h3>
                      </div>
                      <div className="space-y-4">
                        {profile.business_phone && (
                          <div className="flex space-x-3">
                            <Phone className="h-5 w-5 shrink-0" style={{ color: colors.utility.secondaryText }} />
                            <div style={{ color: colors.utility.primaryText }}>
                              {profile.business_phone_country_code || ''} {profile.business_phone}
                            </div>
                          </div>
                        )}
                        {profile.business_whatsapp && (
                          <div className="flex space-x-3">
                            <MessageCircle className="h-5 w-5 shrink-0" style={{ color: '#25D366' }} />
                            <div>
                              <div style={{ color: colors.utility.primaryText }}>
                                {profile.business_whatsapp_country_code || ''} {profile.business_whatsapp}
                              </div>
                              <div className="text-xs mt-0.5" style={{ color: colors.utility.secondaryText }}>
                                WhatsApp Business
                              </div>
                            </div>
                          </div>
                        )}
                        {profile.business_email && (
                          <div className="flex space-x-3">
                            <Mail className="h-5 w-5 shrink-0" style={{ color: colors.utility.secondaryText }} />
                            <div style={{ color: colors.utility.primaryText }}>{profile.business_email}</div>
                          </div>
                        )}
                        {profile.website_url && (
                          <div className="flex space-x-3">
                            <Globe className="h-5 w-5 shrink-0" style={{ color: colors.utility.secondaryText }} />
                            <div>
                              <a
                                href={profile.website_url.startsWith('http') ? profile.website_url : `https://${profile.website_url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline transition-colors"
                                style={{ color: colors.brand.primary }}
                              >
                                {profile.website_url.replace(/^https?:\/\//, '')}
                              </a>
                            </div>
                          </div>
                        )}
                        {!profile.business_phone && !profile.business_whatsapp && !profile.business_email && !profile.website_url && (
                          <div className="text-sm transition-colors" style={{ color: colors.utility.secondaryText }}>
                            No contact information provided
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Business Tools Card */}
                  {profile.booking_url && (
                    <div
                      className="rounded-lg border shadow-sm p-6 transition-colors"
                      style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '20' }}
                    >
                      <div className="flex items-center space-x-3 mb-4">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: colors.brand.primary + '20', color: colors.brand.primary }}
                        >
                          <Calendar size={20} />
                        </div>
                        <h3 className="font-semibold text-lg transition-colors" style={{ color: colors.utility.primaryText }}>
                          Business Tools
                        </h3>
                      </div>
                      <div className="space-y-4">
                        <div className="flex space-x-3">
                          <Calendar className="h-5 w-5 shrink-0" style={{ color: colors.utility.secondaryText }} />
                          <div>
                            <div className="text-sm font-medium mb-1 transition-colors" style={{ color: colors.utility.primaryText }}>
                              Appointment Booking
                            </div>
                            <a
                              href={profile.booking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm hover:underline transition-colors"
                              style={{ color: colors.brand.primary }}
                            >
                              {profile.booking_url.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Brand Colors Card */}
                  <div
                    className="rounded-lg border shadow-sm p-6 transition-colors"
                    style={{ backgroundColor: colors.utility.secondaryBackground, borderColor: colors.utility.primaryText + '20' }}
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: colors.brand.primary + '20', color: colors.brand.primary }}
                      >
                        <Palette size={20} />
                      </div>
                      <h3 className="font-semibold text-lg transition-colors" style={{ color: colors.utility.primaryText }}>
                        Brand Colors
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="flex items-center space-x-4">
                        <div
                          className="w-10 h-10 rounded-full border"
                          style={{ backgroundColor: profile.primary_color || '#4F46E5', borderColor: colors.utility.primaryText + '20' }}
                        />
                        <div>
                          <div className="font-medium transition-colors" style={{ color: colors.utility.primaryText }}>Primary Color</div>
                          <div className="text-sm transition-colors" style={{ color: colors.utility.secondaryText }}>
                            {profile.primary_color || '#4F46E5'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div
                          className="w-10 h-10 rounded-full border"
                          style={{ backgroundColor: profile.secondary_color || '#10B981', borderColor: colors.utility.primaryText + '20' }}
                        />
                        <div>
                          <div className="font-medium transition-colors" style={{ color: colors.utility.primaryText }}>Secondary Color</div>
                          <div className="text-sm transition-colors" style={{ color: colors.utility.secondaryText }}>
                            {profile.secondary_color || '#10B981'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ INDUSTRIES SECTION (unified: your industry + served) ═══ */}
              {activeSection === 'industries' && (
                <ServedIndustriesSection profileIndustryId={profile?.industry_id} />
              )}

              {/* ═══ DANGER ZONE / CLOSE ACCOUNT SECTION ═══ */}
              {activeSection === 'danger' && (
                <div>
                  <h2 className="text-xl font-semibold mb-6" style={{ color: '#EF4444' }}>
                    Danger Zone
                  </h2>
                  <div
                    className="rounded-lg border shadow-sm p-6 transition-colors"
                    style={{
                      backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.03)',
                      borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)'
                    }}
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}
                      >
                        <AlertTriangle size={20} />
                      </div>
                      <h3 className="font-semibold text-lg" style={{ color: '#EF4444' }}>
                        Close Account
                      </h3>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <p className="font-medium transition-colors" style={{ color: colors.utility.primaryText }}>
                          Close Account & Delete All Data
                        </p>
                        <p className="text-sm mt-1 transition-colors" style={{ color: colors.utility.secondaryText }}>
                          Permanently delete your organization's data and close this account. This action cannot be undone.
                        </p>
                      </div>
                      <button
                        onClick={handleCloseAccountClick}
                        className="flex items-center px-4 py-2 rounded-md border hover:opacity-80 transition-colors whitespace-nowrap"
                        style={{ borderColor: '#EF4444', color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Close Account
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessProfilePage;

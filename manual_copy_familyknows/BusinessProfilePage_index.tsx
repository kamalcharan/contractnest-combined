// src/pages/settings/business-profile/index.tsx - Updated with WhatsApp display
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building, Phone, Mail, Globe, MapPin, Palette, Pencil, ShoppingCart, Wrench, Info, MessageCircle, Calendar, FileText } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useTenantProfile } from '@/hooks/useTenantProfile';
import { analyticsService } from '@/services/analytics.service';
import { businessTypes } from '@/utils/constants/businessTypes';
import { useIndustries } from '@/hooks/queries/useProductMasterdata';
import { countries } from '@/utils/constants/countries';
import { cn } from '@/lib/utils';

const BusinessProfilePage = () => {
  const navigate = useNavigate();
  const { isDarkMode, currentTheme } = useTheme();
  
  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;
  
  // Track page view
  React.useEffect(() => {
    analyticsService.trackPageView('settings/business-profile', 'Business Profile');
  }, []);
  
  // Use the tenant profile hook
  const {
    loading,
    profile
  } = useTenantProfile();

  // Fetch industries from API
  const { data: industriesResponse, isLoading: industriesLoading } = useIndustries();
  const industries = industriesResponse?.data || [];

  // Handle edit button click
  const handleEditClick = () => {
    navigate('/settings/business-profile/edit');
  };
  
  // Handle Back
  const handleBack = () => {
    navigate('/settings');
  };
  
  // Find matching business type and industry
  const businessType = profile?.business_type_id ? 
    businessTypes.find(type => type.id === profile.business_type_id) : null;
    
  const industry = profile?.industry_id ? 
    industries.find(ind => ind.id === profile.industry_id) : null;
    
  const country = profile?.country_code ? 
    countries.find(c => c.code === profile.country_code) : null;

  // Get appropriate icon
  const getBusinessTypeIcon = (typeId: string) => {
    switch (typeId) {
      case 'buyer':
        return ShoppingCart;
      case 'seller':
        return Wrench;
      default:
        return Building;
    }
  };
  
  return (
    <div 
      className="p-6 transition-colors"
      style={{ backgroundColor: colors.utility.secondaryText + '10' }}
    >
      {/* Page Header */}
      <div className="flex items-center mb-8">
        <button 
          onClick={handleBack} 
          className="mr-4 p-2 rounded-full hover:opacity-80 transition-colors"
          style={{ backgroundColor: colors.utility.secondaryText + '20' }}
        >
          <ArrowLeft 
            className="h-5 w-5"
            style={{ color: colors.utility.secondaryText }}
          />
        </button>
        <div>
          <h1 
            className="text-2xl font-bold transition-colors"
            style={{ color: colors.utility.primaryText }}
          >
            Business Profile
          </h1>
          <p 
            className="transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            Manage your service contract management profile and settings
          </p>
        </div>
      </div>
      
      {/* Profile Content */}
      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div 
              className="animate-spin h-8 w-8 border-4 border-t-transparent rounded-full"
              style={{ borderColor: colors.brand.primary }}
            ></div>
          </div>
        ) : !profile ? (
          <div 
            className="rounded-lg shadow-sm border p-10 text-center transition-colors"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderColor: colors.utility.primaryText + '20'
            }}
          >
            <h3 
              className="text-lg font-medium mb-2 transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              No Business Profile Found
            </h3>
            <p 
              className="mb-6 transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Set up your business profile to define your role in service contract management and customize your experience.
            </p>
            <button 
              onClick={handleEditClick}
              className="px-4 py-2 rounded-md hover:opacity-90 transition-colors"
              style={{
                backgroundColor: colors.brand.primary,
                color: '#ffffff'
              }}
            >
              Create Business Profile
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Header with Edit Button */}
            <div className="flex justify-between items-center">
              <h2 
                className="text-xl font-semibold transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
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

            {/* Business Type Persona Card - Featured prominently */}
            {businessType && (
              <div 
                className="rounded-lg border shadow-sm transition-colors"
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderColor: businessType.color + '30',
                  borderLeft: `4px solid ${businessType.color}`
                }}
              >
                {/* Header Section */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div 
                        className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: businessType.color + '20',
                          color: businessType.color
                        }}
                      >
                        {React.createElement(getBusinessTypeIcon(businessType.id), { size: 28 })}
                      </div>
                      <div>
                        <h3 
                          className="font-bold text-2xl transition-colors"
                          style={{ color: colors.utility.primaryText }}
                        >
                          {businessType.name}
                        </h3>
                        <p 
                          className="text-sm mt-1 font-medium transition-colors"
                          style={{ color: businessType.color }}
                        >
                          Your Service Contract Management Role
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Role Description */}
                  <div 
                    className="mb-4 p-4 rounded-lg border"
                    style={{
                      backgroundColor: businessType.color + '08',
                      borderColor: businessType.color + '20'
                    }}
                  >
                    <div className="flex items-start">
                      <Info 
                        className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0"
                        style={{ color: businessType.color }}
                      />
                      <p 
                        className="text-sm leading-relaxed transition-colors"
                        style={{ color: colors.utility.primaryText }}
                      >
                        <strong>As a {businessType.name.split(' ')[0]}:</strong> {businessType.helpText}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Examples Section */}
                <div 
                  className="px-6 py-4 border-t"
                  style={{ borderColor: businessType.color + '15' }}
                >
                  <h4 
                    className="font-semibold mb-3 text-base transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Real-World Examples:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {businessType.examples.map((example, index) => (
                      <div 
                        key={index}
                        className="p-3 rounded-lg border transition-colors"
                        style={{ 
                          backgroundColor: businessType.color + '05',
                          borderColor: businessType.color + '15'
                        }}
                      >
                        <div className="flex items-start">
                          <span 
                            className="w-2 h-2 rounded-full mr-3 mt-2 flex-shrink-0"
                            style={{ backgroundColor: businessType.color }}
                          />
                          <span 
                            className="text-sm leading-relaxed"
                            style={{ color: colors.utility.primaryText }}
                          >
                            {example}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Platform Impact Section */}
                <div 
                  className="px-6 py-4 border-t"
                  style={{ 
                    borderColor: businessType.color + '15',
                    backgroundColor: businessType.color + '05'
                  }}
                >
                  <h4 
                    className="font-semibold mb-3 text-base transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    How This Customizes Your ContractNest Experience:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {businessType.id === 'buyer' ? (
                      <>
                        <div className="text-sm">
                          <div 
                            className="font-medium mb-1"
                            style={{ color: businessType.color }}
                          >
                            Dashboard Focus
                          </div>
                          <div style={{ color: colors.utility.secondaryText }}>
                            Service requests, vendor performance, and SLA compliance tracking
                          </div>
                        </div>
                        <div className="text-sm">
                          <div 
                            className="font-medium mb-1"
                            style={{ color: businessType.color }}
                          >
                            Key Workflows
                          </div>
                          <div style={{ color: colors.utility.secondaryText }}>
                            Invoice approval, vendor evaluation, and service quality monitoring
                          </div>
                        </div>
                        <div className="text-sm">
                          <div 
                            className="font-medium mb-1"
                            style={{ color: businessType.color }}
                          >
                            Priority Tools
                          </div>
                          <div style={{ color: colors.utility.secondaryText }}>
                            Vendor management, contract compliance, and cost analysis
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm">
                          <div 
                            className="font-medium mb-1"
                            style={{ color: businessType.color }}
                          >
                            Dashboard Focus
                          </div>
                          <div style={{ color: colors.utility.secondaryText }}>
                            Client relationships, service delivery, and performance metrics
                          </div>
                        </div>
                        <div className="text-sm">
                          <div 
                            className="font-medium mb-1"
                            style={{ color: businessType.color }}
                          >
                            Key Workflows
                          </div>
                          <div style={{ color: colors.utility.secondaryText }}>
                            Service scheduling, client communication, and billing management
                          </div>
                        </div>
                        <div className="text-sm">
                          <div 
                            className="font-medium mb-1"
                            style={{ color: businessType.color }}
                          >
                            Priority Tools
                          </div>
                          <div style={{ color: colors.utility.secondaryText }}>
                            Client portal, service tracking, and revenue optimization
                          </div>
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
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderColor: colors.utility.primaryText + '20'
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: colors.brand.primary + '20',
                        color: colors.brand.primary
                      }}
                    >
                      <Building size={20} />
                    </div>
                    <h3 
                      className="font-semibold text-lg transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      Organization
                    </h3>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Logo and Name */}
                  <div className="flex items-center space-x-4">
                    {profile.logo_url ? (
                      <div 
                        className="w-16 h-16 rounded overflow-hidden border"
                        style={{ borderColor: colors.utility.primaryText + '20' }}
                      >
                        <img 
                          src={profile.logo_url} 
                          alt={profile.business_name} 
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-16 h-16 rounded flex items-center justify-center"
                        style={{ backgroundColor: colors.utility.secondaryText + '20' }}
                      >
                        <Building 
                          size={24} 
                          style={{ color: colors.utility.secondaryText }}
                        />
                      </div>
                    )}
                    
                    <div>
                      <div
                        className="font-semibold text-lg transition-colors"
                        style={{ color: colors.utility.primaryText }}
                      >
                        {profile.business_name}
                      </div>
                      <div
                        className="text-sm transition-colors"
                        style={{ color: colors.utility.secondaryText }}
                      >
                        {industry?.name || 'Industry not specified'}
                      </div>
                    </div>
                  </div>

                  {/* Short Description */}
                  {profile.short_description && (
                    <div className="flex space-x-3">
                      <FileText
                        className="h-5 w-5 shrink-0 mt-0.5"
                        style={{ color: colors.utility.secondaryText }}
                      />
                      <div
                        className="text-sm transition-colors"
                        style={{ color: colors.utility.primaryText }}
                      >
                        {profile.short_description}
                      </div>
                    </div>
                  )}

                  {/* Address */}
                  {(profile.address_line1 || profile.city || profile.country_code) && (
                    <div className="flex space-x-3">
                      <MapPin 
                        className="h-5 w-5 shrink-0 mt-0.5"
                        style={{ color: colors.utility.secondaryText }}
                      />
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
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderColor: colors.utility.primaryText + '20'
                }}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: colors.brand.primary + '20',
                      color: colors.brand.primary
                    }}
                  >
                    <Phone size={20} />
                  </div>
                  <h3 
                    className="font-semibold text-lg transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Contact Information
                  </h3>
                </div>
                
                <div className="space-y-4">
                  {/* Phone */}
                  {profile.business_phone && (
                    <div className="flex space-x-3">
                      <Phone 
                        className="h-5 w-5 shrink-0"
                        style={{ color: colors.utility.secondaryText }}
                      />
                      <div style={{ color: colors.utility.primaryText }}>
                        {profile.business_phone_country_code || ''} {profile.business_phone}
                      </div>
                    </div>
                  )}
                  
                  {/* WhatsApp - NEW */}
                  {profile.business_whatsapp && (
                    <div className="flex space-x-3">
                      <MessageCircle 
                        className="h-5 w-5 shrink-0"
                        style={{ color: '#25D366' }} // WhatsApp green
                      />
                      <div>
                        <div style={{ color: colors.utility.primaryText }}>
                          {profile.business_whatsapp_country_code || ''} {profile.business_whatsapp}
                        </div>
                        <div 
                          className="text-xs mt-0.5"
                          style={{ color: colors.utility.secondaryText }}
                        >
                          WhatsApp Business
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Email */}
                  {profile.business_email && (
                    <div className="flex space-x-3">
                      <Mail 
                        className="h-5 w-5 shrink-0"
                        style={{ color: colors.utility.secondaryText }}
                      />
                      <div style={{ color: colors.utility.primaryText }}>
                        {profile.business_email}
                      </div>
                    </div>
                  )}
                  
                  {/* Website */}
                  {profile.website_url && (
                    <div className="flex space-x-3">
                      <Globe 
                        className="h-5 w-5 shrink-0"
                        style={{ color: colors.utility.secondaryText }}
                      />
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
                    <div 
                      className="text-sm transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
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
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderColor: colors.utility.primaryText + '20'
                }}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: colors.brand.primary + '20',
                      color: colors.brand.primary
                    }}
                  >
                    <Calendar size={20} />
                  </div>
                  <h3
                    className="font-semibold text-lg transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Business Tools
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Booking URL */}
                  <div className="flex space-x-3">
                    <Calendar
                      className="h-5 w-5 shrink-0"
                      style={{ color: colors.utility.secondaryText }}
                    />
                    <div>
                      <div
                        className="text-sm font-medium mb-1 transition-colors"
                        style={{ color: colors.utility.primaryText }}
                      >
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
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.primaryText + '20'
              }}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: colors.brand.primary + '20',
                    color: colors.brand.primary
                  }}
                >
                  <Palette size={20} />
                </div>
                <h3 
                  className="font-semibold text-lg transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  Brand Colors
                </h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Primary Color */}
                <div className="flex items-center space-x-4">
                  <div 
                    className="w-10 h-10 rounded-full border"
                    style={{ 
                      backgroundColor: profile.primary_color || '#4F46E5',
                      borderColor: colors.utility.primaryText + '20'
                    }}
                  />
                  <div>
                    <div 
                      className="font-medium transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      Primary Color
                    </div>
                    <div 
                      className="text-sm transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {profile.primary_color || '#4F46E5'}
                    </div>
                  </div>
                </div>
                
                {/* Secondary Color */}
                <div className="flex items-center space-x-4">
                  <div 
                    className="w-10 h-10 rounded-full border"
                    style={{ 
                      backgroundColor: profile.secondary_color || '#10B981',
                      borderColor: colors.utility.primaryText + '20'
                    }}
                  />
                  <div>
                    <div 
                      className="font-medium transition-colors"
                      style={{ color: colors.utility.primaryText }}
                    >
                      Secondary Color
                    </div>
                    <div 
                      className="text-sm transition-colors"
                      style={{ color: colors.utility.secondaryText }}
                    >
                      {profile.secondary_color || '#10B981'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessProfilePage;
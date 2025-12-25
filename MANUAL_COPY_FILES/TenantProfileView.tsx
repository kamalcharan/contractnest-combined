// src/components/tenantprofile/TenantProfileView.tsx
// Updated to use useIndustries() hook - fetches from m_catalog_industries table
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext'; // Fixed import path
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button'; // Fixed casing - use uppercase Button
import {
  Building,
  Phone,
  Mail,
  Globe,
  MapPin,
  Palette,
  Pencil,
  ChevronLeft
} from 'lucide-react';
import { TenantProfile } from '@/hooks/useTenantProfile';
import { businessTypes } from '@/utils/constants/businessTypes';
import { useIndustries } from '@/hooks/queries/useMasterDataQueries';
import { countries } from '@/utils/constants/countries';
import { Link } from 'react-router-dom';

interface TenantProfileViewProps {
  profile: TenantProfile | null;
  isLoading?: boolean;
  onEdit?: () => void;
}

const TenantProfileView: React.FC<TenantProfileViewProps> = ({
  profile,
  isLoading = false,
  onEdit
}) => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Fetch industries from database
  const { data: industries = [] } = useIndustries();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div 
          className="h-10 rounded-md w-1/4"
          style={{ backgroundColor: colors.utility.secondaryText + '20' }}
        ></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div 
            className="h-40 rounded-md"
            style={{ backgroundColor: colors.utility.secondaryText + '20' }}
          ></div>
          <div 
            className="h-40 rounded-md"
            style={{ backgroundColor: colors.utility.secondaryText + '20' }}
          ></div>
        </div>
        <div 
          className="h-40 rounded-md"
          style={{ backgroundColor: colors.utility.secondaryText + '20' }}
        ></div>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div 
        className="text-center p-10 rounded-lg border border-dashed transition-colors"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.secondaryText + '30'
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
          You haven't set up your business profile yet. Create one to customize your experience.
        </p>
        {onEdit && (
          <button 
            onClick={onEdit}
            className="px-4 py-2 rounded-md text-white transition-colors hover:opacity-90"
            style={{
              background: `linear-gradient(to right, ${colors.brand.primary}, ${colors.brand.secondary})`
            }}
          >
            Create Business Profile
          </button>
        )}
      </div>
    );
  }
  
  const businessType = businessTypes.find(bt => bt.id === profile?.business_type_id);
  const industry = industries.find(ind => ind.id === profile?.industry_id);
  const country = countries.find(c => c.code === profile?.country_code);  

  const getCardStyles = () => ({
    backgroundColor: colors.utility.secondaryBackground,
    borderColor: colors.utility.secondaryText + '20'
  });

  const getIconContainerStyles = () => ({
    backgroundColor: colors.brand.primary + '10',
    color: colors.brand.primary
  });

  return (
    <div className="space-y-8">
      {/* Header with Edit Button */}
      <div className="flex justify-between items-center">
        <h2 
          className="text-2xl font-semibold transition-colors"
          style={{ color: colors.utility.primaryText }}
        >
          Business Profile
        </h2>
        {onEdit && (
          <Button 
            variant="outline" 
            onClick={onEdit}
            className="flex items-center"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        )}
      </div>
      
      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Organization Card */}
        <div 
          className="p-6 rounded-lg border shadow-sm transition-colors"
          style={getCardStyles()}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={getIconContainerStyles()}
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
                  className="w-16 h-16 rounded overflow-hidden border transition-colors"
                  style={{ borderColor: colors.utility.secondaryText + '20' }}
                >
                  <img 
                    src={profile.logo_url} 
                    alt={profile.business_name} 
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div 
                  className="w-16 h-16 rounded flex items-center justify-center transition-colors"
                  style={{ backgroundColor: colors.utility.secondaryText + '10' }}
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
                  {businessType?.name || 'Not specified'} • {industry?.name || 'Not specified'}
                </div>
              </div>
            </div>
            
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
          className="p-6 rounded-lg border shadow-sm transition-colors"
          style={getCardStyles()}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              style={getIconContainerStyles()}
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
            
            {!profile.business_phone && !profile.business_email && !profile.website_url && (
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
      
      {/* Brand Colors Card */}
      <div 
        className="p-6 rounded-lg border shadow-sm transition-colors"
        style={getCardStyles()}
      >
        <div className="flex items-center space-x-3 mb-4">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            style={getIconContainerStyles()}
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
              className="w-10 h-10 rounded-full border shadow-sm transition-colors"
              style={{ 
                backgroundColor: profile.primary_color || '#4F46E5',
                borderColor: colors.utility.secondaryText + '20'
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
              className="w-10 h-10 rounded-full border shadow-sm transition-colors"
              style={{ 
                backgroundColor: profile.secondary_color || '#10B981',
                borderColor: colors.utility.secondaryText + '20'
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
  );
};

export default TenantProfileView;
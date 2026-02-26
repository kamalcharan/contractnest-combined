// src/pages/auth/SelectTenantPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  Building2, 
  Search, 
  Crown, 
  Users, 
  Calendar,
  CheckCircle2,
  Star,
  ArrowRight,
  Sparkles,
  Shield
} from 'lucide-react';

interface TenantCardProps {
  tenant: any;
  onSelect: (tenant: any) => void;
  isSelected?: boolean;
  colors: any;
}

const TenantCard: React.FC<TenantCardProps> = ({ tenant, onSelect, isSelected, colors }) => {
  const getBadges = () => {
    const badges = [];
    if (tenant.is_default) badges.push({ label: 'Default', color: `${colors.brand.primary}20`, textColor: colors.brand.primary });
    if (tenant.is_admin) badges.push({ label: 'Admin Workspace', color: `${colors.brand.tertiary}20`, textColor: colors.brand.tertiary });
    if (tenant.is_owner) badges.push({ label: 'Owner', color: `${colors.semantic.success}20`, textColor: colors.semantic.success });
    if (tenant.is_explicitly_assigned) badges.push({ label: 'Assigned', color: `${colors.utility.secondaryText}20`, textColor: colors.utility.secondaryText });
    return badges;
  };

  const badges = getBadges();

  return (
    <button
      onClick={() => onSelect(tenant)}
      className="w-full text-left p-6 rounded-xl border-2 transition-all duration-200 hover:scale-[1.01]"
      style={{
        borderColor: isSelected ? colors.brand.primary : colors.utility.secondaryText + '40',
        backgroundColor: isSelected ? `${colors.brand.primary}10` : colors.utility.secondaryBackground,
        boxShadow: isSelected ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : undefined
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div 
            className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg"
            style={{
              background: tenant.is_admin 
                ? `linear-gradient(to bottom right, ${colors.brand.tertiary}, ${colors.brand.secondary})` 
                : `linear-gradient(to bottom right, ${colors.utility.secondaryText}20, ${colors.utility.secondaryText}40)`,
              color: tenant.is_admin ? '#FFF' : colors.utility.primaryText
            }}
          >
            {tenant.is_admin ? <Crown size={24} /> : tenant.name.substring(0, 2).toUpperCase()}
          </div>
          
          <div className="flex-1">
            <h3 
              className="text-lg font-semibold flex items-center gap-2 transition-colors"
              style={{ color: colors.utility.primaryText }}
            >
              {tenant.name}
              {tenant.is_default && <Star size={16} style={{ color: colors.semantic.warning }} className="fill-current" />}
            </h3>
            <p 
              className="text-sm mt-1 transition-colors"
              style={{ color: colors.utility.secondaryText }}
            >
              Workspace Code: <span className="font-mono">{tenant.workspace_code}</span>
            </p>
            
            {/* Badges */}
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {badges.map((badge, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: badge.color,
                      color: badge.textColor
                    }}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <ArrowRight 
          size={20} 
          className="transition-all"
          style={{ 
            color: isSelected ? colors.brand.primary : colors.utility.secondaryText,
            transform: isSelected ? 'translateX(4px)' : 'translateX(0)'
          }}
        />
      </div>
    </button>
  );
};

const SelectTenantPage: React.FC = () => {
  const { tenants, setCurrentTenant, isLoading, user } = useAuth();
  const { isDarkMode, currentTheme } = useTheme();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'admin' | 'assigned' | 'recent'>('all');
  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  // Get theme colors
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Mock recent tenants - in production, this would come from localStorage or API
  const [recentTenantIds] = useState<string[]>([]);

  useEffect(() => {
    // Pre-select default tenant if exists
    const defaultTenant = tenants.find(t => t.is_default);
    if (defaultTenant) {
      setSelectedTenant(defaultTenant);
    }
  }, [tenants]);

  const handleSelectTenant = (tenant: any) => {
    setSelectedTenant(tenant);
  };

  const handleContinue = () => {
    if (selectedTenant) {
      setCurrentTenant(selectedTenant);
      navigate('/ops/cockpit');
    }
  };

  const handleCreateTenant = () => {
    navigate('/create-tenant');
  };

  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center transition-colors duration-200"
        style={{ backgroundColor: colors.utility.primaryBackground }}
      >
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 mx-auto"
            style={{ borderColor: colors.brand.primary }}
          />
          <p 
            className="mt-4 transition-colors"
            style={{ color: colors.utility.secondaryText }}
          >
            Loading workspaces...
          </p>
        </div>
      </div>
    );
  }

  // Filter tenants based on search and category
  const filteredTenants = tenants.filter(tenant => {
    // Search filter
    if (searchTerm && !tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !tenant.workspace_code.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Category filter
    switch (selectedCategory) {
      case 'admin':
        return tenant.is_admin;
      case 'assigned':
        return tenant.is_explicitly_assigned;
      case 'recent':
        return recentTenantIds.includes(tenant.id);
      default:
        return true;
    }
  });

  // Group tenants for better organization (for admin users)
  const adminWorkspaces = filteredTenants.filter(t => t.is_admin);
  const assignedWorkspaces = filteredTenants.filter(t => !t.is_admin && t.is_explicitly_assigned);
  const otherWorkspaces = filteredTenants.filter(t => !t.is_admin && !t.is_explicitly_assigned);

  const isAdmin = user?.is_admin || false;
  const hasMultipleTenants = tenants.length > 5;

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
      <div 
        className="shadow-sm border-b transition-colors"
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderColor: colors.utility.secondaryText + '20'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 
                className="h-8 w-8"
                style={{ color: colors.brand.primary }}
              />
              <div>
                <h1 
                  className="text-2xl font-bold transition-colors"
                  style={{ color: colors.utility.primaryText }}
                >
                  Select Workspace
                </h1>
                <p 
                  className="text-sm transition-colors"
                  style={{ color: colors.utility.secondaryText }}
                >
                  Welcome back, {user?.first_name || user?.email}
                  {isAdmin && <span style={{ color: colors.brand.tertiary }}>• System Admin</span>}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and filters - only show for admin users with many tenants */}
        {isAdmin && hasMultipleTenants && (
          <div className="mb-8 space-y-4">
            {/* Search bar */}
            <div className="relative">
              <Search 
                className="absolute left-3 top-1/2 transform -translate-y-1/2"
                style={{ color: colors.utility.secondaryText }}
                size={20} 
              />
              <input
                type="text"
                placeholder="Search workspaces by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors"
                style={{
                  borderColor: colors.utility.secondaryText + '40',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  '--tw-ring-color': colors.brand.primary
                } as React.CSSProperties}
              />
            </div>

            {/* Category filters */}
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: selectedCategory === 'all' ? colors.brand.primary : `${colors.utility.secondaryText}20`,
                  color: selectedCategory === 'all' ? '#FFF' : colors.utility.primaryText
                }}
              >
                All ({tenants.length})
              </button>
              <button
                onClick={() => setSelectedCategory('admin')}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: selectedCategory === 'admin' ? colors.brand.primary : `${colors.utility.secondaryText}20`,
                  color: selectedCategory === 'admin' ? '#FFF' : colors.utility.primaryText
                }}
              >
                Admin ({adminWorkspaces.length})
              </button>
              <button
                onClick={() => setSelectedCategory('assigned')}
                className="px-4 py-2 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: selectedCategory === 'assigned' ? colors.brand.primary : `${colors.utility.secondaryText}20`,
                  color: selectedCategory === 'assigned' ? '#FFF' : colors.utility.primaryText
                }}
              >
                Assigned ({assignedWorkspaces.length})
              </button>
              {recentTenantIds.length > 0 && (
                <button
                  onClick={() => setSelectedCategory('recent')}
                  className="px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: selectedCategory === 'recent' ? colors.brand.primary : `${colors.utility.secondaryText}20`,
                    color: selectedCategory === 'recent' ? '#FFF' : colors.utility.primaryText
                  }}
                >
                  Recent ({recentTenantIds.length})
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tenant grid/list */}
        <div className="space-y-6">
          {filteredTenants.length === 0 ? (
            <div 
              className="text-center py-12 rounded-xl border-2 border-dashed transition-colors"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.secondaryText + '40'
              }}
            >
              <Building2 
                className="mx-auto h-12 w-12"
                style={{ color: colors.utility.secondaryText }}
              />
              <h3 
                className="mt-4 text-lg font-medium transition-colors"
                style={{ color: colors.utility.primaryText }}
              >
                No workspaces found
              </h3>
              <p 
                className="mt-2 text-sm transition-colors"
                style={{ color: colors.utility.secondaryText }}
              >
                {searchTerm ? 'Try adjusting your search terms' : 'You don\'t have access to any workspaces yet'}
              </p>
              <button
                onClick={handleCreateTenant}
                className="mt-4 inline-flex items-center px-4 py-2 border-transparent text-sm font-medium rounded-md text-white transition-all hover:opacity-90"
                style={{ backgroundColor: colors.brand.primary }}
              >
                Create New Workspace
              </button>
            </div>
          ) : isAdmin && filteredTenants.length > 10 ? (
            // Grid view for admin users with many tenants
            <div>
              {adminWorkspaces.length > 0 && (
                <div className="mb-8">
                  <h3 
                    className="text-lg font-semibold mb-4 flex items-center gap-2 transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    <Shield style={{ color: colors.brand.tertiary }} size={20} />
                    Admin Workspaces
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {adminWorkspaces.map((tenant) => (
                      <TenantCard
                        key={tenant.id}
                        tenant={tenant}
                        onSelect={handleSelectTenant}
                        isSelected={selectedTenant?.id === tenant.id}
                        colors={colors}
                      />
                    ))}
                  </div>
                </div>
              )}

              {assignedWorkspaces.length > 0 && (
                <div className="mb-8">
                  <h3 
                    className="text-lg font-semibold mb-4 flex items-center gap-2 transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    <Users style={{ color: colors.brand.primary }} size={20} />
                    Assigned Workspaces
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignedWorkspaces.map((tenant) => (
                      <TenantCard
                        key={tenant.id}
                        tenant={tenant}
                        onSelect={handleSelectTenant}
                        isSelected={selectedTenant?.id === tenant.id}
                        colors={colors}
                      />
                    ))}
                  </div>
                </div>
              )}

              {otherWorkspaces.length > 0 && (
                <div className="mb-8">
                  <h3 
                    className="text-lg font-semibold mb-4 flex items-center gap-2 transition-colors"
                    style={{ color: colors.utility.primaryText }}
                  >
                    <Building2 style={{ color: colors.utility.secondaryText }} size={20} />
                    Other Workspaces
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {otherWorkspaces.map((tenant) => (
                      <TenantCard
                        key={tenant.id}
                        tenant={tenant}
                        onSelect={handleSelectTenant}
                        isSelected={selectedTenant?.id === tenant.id}
                        colors={colors}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // List view for regular users or few tenants
            <div className="space-y-3 max-w-2xl mx-auto">
              {filteredTenants.map((tenant) => (
                <TenantCard
                  key={tenant.id}
                  tenant={tenant}
                  onSelect={handleSelectTenant}
                  isSelected={selectedTenant?.id === tenant.id}
                  colors={colors}
                />
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-8 flex justify-between items-center max-w-2xl mx-auto">
          <button
            onClick={handleCreateTenant}
            className="font-medium text-sm transition-colors hover:opacity-80"
            style={{ color: colors.utility.secondaryText }}
          >
            Create New Workspace
          </button>
          
          <button
            onClick={handleContinue}
            disabled={!selectedTenant}
            className="px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{
              backgroundColor: selectedTenant ? colors.brand.primary : colors.utility.secondaryText + '40',
              color: selectedTenant ? '#FFF' : colors.utility.secondaryText
            }}
          >
            Continue to {selectedTenant?.name || 'Workspace'}
            <ArrowRight size={20} />
          </button>
        </div>

        {/* Info section for admin users */}
        {isAdmin && (
          <div 
            className="mt-12 p-6 rounded-xl border transition-colors"
            style={{
              backgroundColor: `${colors.brand.tertiary}10`,
              borderColor: `${colors.brand.tertiary}40`
            }}
          >
            <div className="flex items-start gap-4">
              <Sparkles 
                className="mt-1"
                style={{ color: colors.brand.tertiary }}
                size={24} 
              />
              <div>
                <h3 
                  className="text-lg font-semibold transition-colors"
                  style={{ color: colors.brand.tertiary }}
                >
                  System Admin Access
                </h3>
                <p 
                  className="mt-1 transition-colors"
                  style={{ color: colors.brand.tertiary }}
                >
                  As a system administrator, you have access to all workspaces in the platform. 
                  Admin workspaces are marked with a crown icon and purple highlight.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectTenantPage;
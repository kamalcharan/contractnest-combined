// src/components/layout/TenantSwitcher.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { 
  ChevronDown, 
  Building2, 
  Check, 
  Search, 
  Crown,
  Star,
  Shield,
  ArrowRightLeft,
  Plus,
  Loader2
} from 'lucide-react';

interface TenantSwitcherProps {
  className?: string;
  showFullName?: boolean;
}

const TenantSwitcher: React.FC<TenantSwitcherProps> = ({ 
  className = '', 
  showFullName = true 
}) => {
  const { currentTenant, tenants, setCurrentTenant, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current && tenants.length > 5) {
      searchInputRef.current.focus();
    }
  }, [isOpen, tenants.length]);

  const handleTenantSwitch = async (tenant: any) => {
    if (tenant.id === currentTenant?.id) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);
    
    try {
      // Set the new tenant
      setCurrentTenant(tenant);
      
      // Close dropdown
      setIsOpen(false);
      setSearchTerm('');
      
      // Store recent tenant in localStorage for quick access
      const recentTenants = JSON.parse(localStorage.getItem('recent_tenants') || '[]');
      const updated = [tenant.id, ...recentTenants.filter((id: string) => id !== tenant.id)].slice(0, 3);
      localStorage.setItem('recent_tenants', JSON.stringify(updated));
      
      // Navigate to dashboard to trigger data refresh
      navigate('/ops/cockpit');
      
      // Show success message using react-hot-toast
      toast.success(`Switched to ${tenant.name}`, {
        duration: 3000,
        position: 'top-right',
        style: {
          background: 'rgb(34 197 94)',
          color: 'white',
        },
        icon: '✅',
      });
      
    } catch (error) {
      console.error('Error switching tenant:', error);
      toast.error('Failed to switch workspace', {
        duration: 3000,
        position: 'top-right',
      });
    } finally {
      setIsSwitching(false);
    }
  };

  const handleManageWorkspaces = () => {
    setIsOpen(false);
    navigate('/select-tenant');
  };

  const handleCreateWorkspace = () => {
    setIsOpen(false);
    navigate('/create-tenant');
  };

  // Filter tenants based on search
  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.workspace_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get recent tenants
  const recentTenantIds = JSON.parse(localStorage.getItem('recent_tenants') || '[]');
  const recentTenants = tenants.filter(t => recentTenantIds.includes(t.id) && t.id !== currentTenant?.id).slice(0, 3);

  // Separate admin and regular workspaces
  const adminWorkspaces = filteredTenants.filter(t => t.is_admin);
  const regularWorkspaces = filteredTenants.filter(t => !t.is_admin);

  if (!currentTenant) {
    return null;
  }

  const isUserAdmin = user?.is_admin || false;
  const hasMultipleTenants = tenants.length > 1;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching || !hasMultipleTenants}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg transition-all
          ${hasMultipleTenants 
            ? 'hover:bg-accent cursor-pointer' 
            : 'cursor-default'
          }
          ${isOpen ? 'bg-accent' : ''}
        `}
      >
        {/* Tenant Icon */}
        <div className={`
          w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground font-medium
          ${currentTenant.is_admin 
            ? 'bg-gradient-to-br from-purple-500 to-purple-600' 
            : 'bg-gradient-to-br from-primary to-primary/80'
          }
        `}>
          {currentTenant.is_admin ? (
            <Crown size={16} />
          ) : (
            <span className="text-xs">{currentTenant.name.substring(0, 2).toUpperCase()}</span>
          )}
        </div>

        {/* Tenant Name */}
        {showFullName && (
          <div className="text-left">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-foreground">
                {currentTenant.name}
              </span>
              {currentTenant.is_default && (
                <Star size={12} className="text-yellow-500 fill-yellow-500" />
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {currentTenant.workspace_code}
            </span>
          </div>
        )}

        {/* Dropdown Arrow */}
        {hasMultipleTenants && (
          <>
            {isSwitching ? (
              <Loader2 size={16} className="animate-spin text-muted-foreground" />
            ) : (
              <ChevronDown 
                size={16} 
                className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} 
              />
            )}
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && hasMultipleTenants && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-popover text-popover-foreground rounded-lg shadow-lg border border-border z-50 animate-in fade-in-0 zoom-in-95">
          {/* Search (for many tenants) */}
          {tenants.length > 5 && (
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search workspaces..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                />
              </div>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {/* Current Workspace */}
            <div className="px-3 pt-3 pb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Current Workspace
              </p>
              <div className="mt-2 p-2 bg-muted rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-8 h-8 rounded-md flex items-center justify-center text-primary-foreground text-xs font-medium
                      ${currentTenant.is_admin 
                        ? 'bg-gradient-to-br from-purple-500 to-purple-600' 
                        : 'bg-gradient-to-br from-primary to-primary/80'
                      }
                    `}>
                      {currentTenant.is_admin ? (
                        <Crown size={14} />
                      ) : (
                        currentTenant.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{currentTenant.name}</span>
                        {currentTenant.is_default && (
                          <Star size={12} className="text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{currentTenant.workspace_code}</span>
                    </div>
                  </div>
                  <Check size={16} className="text-green-500" />
                </div>
              </div>
            </div>

            {/* Recent Workspaces */}
            {recentTenants.length > 0 && searchTerm === '' && (
              <div className="px-3 pt-2 pb-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Recent
                </p>
                <div className="space-y-1">
                  {recentTenants.map((tenant) => (
                    <button
                      key={tenant.id}
                      onClick={() => handleTenantSwitch(tenant)}
                      className="w-full p-2 rounded-md hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-8 h-8 rounded-md flex items-center justify-center text-primary-foreground text-xs font-medium
                          ${tenant.is_admin 
                            ? 'bg-gradient-to-br from-purple-500 to-purple-600' 
                            : 'bg-gradient-to-br from-muted-foreground to-muted-foreground/80'
                          }
                        `}>
                          {tenant.is_admin ? (
                            <Crown size={14} />
                          ) : (
                            tenant.name.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="text-left flex-1">
                          <div className="flex items-center gap-1">
                            <span className="text-sm">{tenant.name}</span>
                            {tenant.is_default && (
                              <Star size={12} className="text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{tenant.workspace_code}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* All Workspaces */}
            <div className="px-3 pt-2 pb-2 border-t border-border">
              {filteredTenants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No workspaces found</p>
              ) : (
                <>
                  {/* Admin Workspaces */}
                  {isUserAdmin && adminWorkspaces.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Shield size={12} />
                        Admin Workspaces
                      </p>
                      <div className="space-y-1">
                        {adminWorkspaces.map((tenant) => (
                          <TenantOption
                            key={tenant.id}
                            tenant={tenant}
                            isSelected={tenant.id === currentTenant.id}
                            onSelect={() => handleTenantSwitch(tenant)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regular Workspaces */}
                  {regularWorkspaces.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        {isUserAdmin && adminWorkspaces.length > 0 ? 'Other Workspaces' : 'All Workspaces'}
                      </p>
                      <div className="space-y-1">
                        {regularWorkspaces.map((tenant) => (
                          <TenantOption
                            key={tenant.id}
                            tenant={tenant}
                            isSelected={tenant.id === currentTenant.id}
                            onSelect={() => handleTenantSwitch(tenant)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-3 border-t border-border space-y-2">
            {tenants.length > 3 && (
              <button
                onClick={handleManageWorkspaces}
                className="w-full px-3 py-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors flex items-center gap-2"
              >
                <ArrowRightLeft size={16} />
                Manage Workspaces
              </button>
            )}
            <button
              onClick={handleCreateWorkspace}
              className="w-full px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-md transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              Create New Workspace
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Tenant Option Component
const TenantOption: React.FC<{
  tenant: any;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ tenant, isSelected, onSelect }) => {
  if (isSelected) return null;
  
  return (
    <button
      onClick={onSelect}
      className="w-full p-2 rounded-md hover:bg-accent transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`
            w-8 h-8 rounded-md flex items-center justify-center text-primary-foreground text-xs font-medium
            ${tenant.is_admin 
              ? 'bg-gradient-to-br from-purple-500 to-purple-600' 
              : 'bg-gradient-to-br from-muted-foreground to-muted-foreground/80'
            }
          `}>
            {tenant.is_admin ? (
              <Crown size={14} />
            ) : (
              tenant.name.substring(0, 2).toUpperCase()
            )}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1">
              <span className="text-sm">{tenant.name}</span>
              {tenant.is_default && (
                <Star size={12} className="text-yellow-500 fill-yellow-500" />
              )}
            </div>
            <span className="text-xs text-muted-foreground">{tenant.workspace_code}</span>
          </div>
        </div>
        {tenant.is_owner && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            Owner
          </span>
        )}
      </div>
    </button>
  );
};

export default TenantSwitcher;
// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { ThemeProvider } from './contexts/ThemeContext';
import { MasterDataProvider } from './contexts/MasterDataContext';
import { QueryProvider } from './providers/QueryProvider'; // ✅ NEW: TanStack Query Provider
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Add this import
import './styles/globals.css';
import './styles/layout.css';
import { Toaster } from 'react-hot-toast';
import { initSentry } from './utils/sentry';
import ErrorBoundary from './components/ErrorBoundary';
import { MiscPageWrapper } from './components/misc';
import SessionConflictNotification from './components/SessionConflictNotification';
import EnvironmentSwitchModal from './components/EnvironmentSwitchModal';
import LockScreen from './components/auth/LockScreen';
import LandingPage from './pages/public/LandingPage';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Initialize Sentry as early as possible
initSentry();

// Layouts
import MainLayout from './components/layout/MainLayout';

// Catalog Pages
import CatalogPage from './pages/catalog/index';
import ServiceViewPage from './pages/catalog/view';
import CatalogServiceFormPage from './pages/catalog/catalogService-form';


// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import InvitationRegisterPage from './pages/auth/InvitationRegisterPage';
import GoogleCallbackPage from './pages/auth/GoogleCallbackPage';
import SelectTenantPage from './pages/auth/SelectTenantPage';
import CreateTenantPage from './pages/auth/CreateTenantPage';

// Onboarding imports

import WelcomeStep from './pages/onboarding/steps/WelcomeStep';
import OnboardingIndexPage from './pages/onboarding/index';
import OnboardingLayout from './components/onboarding/OnboardingLayout';
import StorageSetupStep from './pages/onboarding/steps/StorageSetupStep';
import UserProfileStep from '@/pages/onboarding/steps/UserProfileStep';
import ThemeSelectionStep from '@/pages/onboarding/steps/ThemeSelectionStep';
import BusinessBasicStep from '@/pages/onboarding/steps/BusinessBasicStep';
import BusinessBrandingStep from '@/pages/onboarding/steps/BusinessBrandingStep';     
import BusinessPreferencesStep from '@/pages/onboarding/steps/BusinessPreferencesStep'; 


//VaNi Pages
import VaNiDashboard from './vani/pages/VaNiDashboard';
import JobsListPage from './vani/pages/JobsListPage';
import JobCreatePage from './vani/pages/JobCreatePage';
import JobDetailsPage from './vani/pages/JobDetailsPage';
import BusinessEventsPage from './vani/pages/BusinessEventsPage';
import JobCommunicationsPage from './vani/pages/JobCommunicationsPage';
import TemplateEditorPage from './vani/pages/TemplateEditorPage';
import ChannelsConfigPage from './vani/pages/ChannelsConfigPage';
import TemplatesLibraryPage from './vani/pages/TemplatesLibraryPage';
import AnalyticsPage from './vani/pages/AnalyticsPage';
import WebhookManagementPage from './vani/pages/WebhookManagementPage';
import AccountsReceivablePage from './vani/pages/AccountsReceivablePage';
import ServiceSchedulePage from './vani/pages/ServiceSchedulePage';
import ProcessRulesPage from './vani/pages/ProcessRulesPage';
import ChatPage from './vani/pages/ChatPage';
import { ChatConversation, ChatMessage } from './vani/types/chat.types';

// MISC Pages
import { 
  NotFoundPage,
  MaintenancePage,
  UnauthorizedPage,
  SessionConflictPage,
  NoInternetPage,
  ComingSoonPage,
  ErrorPage,
  ApiServerDownPage
} from './pages/misc';
import TaxSettingsPage from './pages/settings/TaxSettings';

// Main pages
import Dashboard from './pages/Dashboard';
import SettingsPage from './pages/settings'; 
import ListOfValuesPage from './pages/settings/LOV'; 
import StorageSettingsPage from './pages/settings/storagesettings';

// ✅ FIXED: Import the actual Resources page instead of placeholder
import ResourcesPage from './pages/settings/Resources';

// Service Contracts - Templates
import MyTemplatesPage from './pages/service-contracts/templates';
import TemplatePreviewPage from './pages/service-contracts/templates/preview';
import GlobalTemplatesPage from './pages/service-contracts/templates/admin/global-templates';
import TemplateDesignerPage from './pages/service-contracts/templates/designer';

// Service Contracts - Contracts
import ContractsPage from './pages/service-contracts/contracts';

// Team Management pages (using existing components)
import UsersPage from './pages/settings/users';
import UserViewPage from './pages/settings/users/userview';
import UserProfilePage from './pages/settings/users/user-profile';

// Business Profile pages
import BusinessProfilePage from './pages/settings/business-profile';
import EditBusinessProfilePage from './pages/settings/business-profile/edit';
import OnboardingBusinessProfilePage from './pages/onboarding/business-profile';

// Integration pages
import IntegrationsPage from './pages/settings/integrations';

// Storage Management Pages
import StorageSetupPage from './pages/settings/storage/storagesetup';
import StorageCompletePage from './pages/settings/storage/storagecomplete';
import StorageManagementPage from './pages/settings/storage/storagemanagement';
import CategoryFilesPage from './pages/settings/storage/categoryfiles';

// Business Model - Admin Pages
import PricingPlansAdminPage from './pages/settings/businessmodel/admin/pricing-plans';
import PricingPlanForm from './pages/settings/businessmodel/admin/pricing-plans/create';
import PlanDetailView from './pages/settings/businessmodel/admin/pricing-plans/detail';
import EditPlanPage from './pages/settings/businessmodel/admin/pricing-plans/edit';
import AssignPlanPage from './pages/settings/businessmodel/admin/pricing-plans/assign';

// Business Model - Plan Versions
import PlanVersionsPage from './pages/settings/businessmodel/admin/pricing-plans/versions/index';
import CreateVersionPage from './pages/settings/businessmodel/admin/pricing-plans/versions/create';
import MigrationDashboardPage from './pages/settings/businessmodel/admin/pricing-plans/versions/migrate';

// Business Model - Billing
import BillingDashboardPage from './pages/settings/businessmodel/admin/billing';
import CreateInvoicePage from './pages/settings/businessmodel/admin/billing/create-invoice';
import InvoiceDetailPage from './pages/settings/businessmodel/admin/billing/invoices/index';

// Business Model - Tenant Pages
import PricingPlansPage from './pages/settings/businessmodel/tenants/pricing-plans';
import SubscriptionPage from './pages/settings/businessmodel/tenants/Subscription';

// Contacts pages
import ContactsPage from './pages/contacts/index';
import ContactViewPage from './pages/contacts/view';
import ContactCreateForm from './pages/contacts/create';

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 3,
    },
  },
});

// Temporary API test
const testAPIConnection = () => {
  console.log('Testing API connection...');
  console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
  
  // Test with your api service
  import('./services/api').then(({ default: api }) => {
    api.get('/')
      .then(response => console.log('✅ API Connected:', response.data))
      .catch(err => console.error('❌ API Error:', err));
  });
};

// Call it immediately when module loads
testAPIConnection();

// Placeholder components for pages we haven't built yet
const ProfilePage = () => <div className="p-8">Profile Page (Coming Soon)</div>;
const TeamEditPage = () => <div className="p-8">Edit Team Member Page (Coming Soon)</div>;

// ✅ REMOVED: Placeholder ResourcesPage - now using real import

// Smart Home Page Component - Shows landing page OR redirects based on auth
const SmartHomePage: React.FC = () => {
  const { isAuthenticated, isLoading, currentTenant } = useAuth();
  const location = useLocation();
  
  // ✅ Don't redirect if user is on auth pages
  const isAuthPage = ['/login', '/signup', '/register', '/forgot-password', '/reset-password'].includes(location.pathname);
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (isAuthPage) {
    // Let auth pages handle themselves
    return null;
  }
  
  if (isAuthenticated && currentTenant) {
    return <Navigate to="/dashboard" replace />;
  }
  
  if (isAuthenticated && !currentTenant) {
    return <Navigate to="/select-tenant" replace />;
  }
  
  // Not authenticated - show landing page
  return <LandingPage />;
};

// Network status component
const NetworkStatusHandler: React.FC = () => {
  useEffect(() => {
    // Handle online/offline events
    const handleOnline = () => {
      console.log('Back online');
      // Optionally show a toast notification
      // toast.success('Connection restored', { duration: 2000 });
    };
    
    const handleOffline = () => {
      console.log('Gone offline');
      // The MiscPageWrapper will handle showing the no-internet page
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return null;
};

// App content component that has access to auth context
const AppContent: React.FC = () => {
  const { isLocked, isAuthenticated } = useAuth();
  
  return (
    <>
      {/* Show lock screen overlay when locked */}
      {isAuthenticated && isLocked && <LockScreen />}
      
      <NetworkStatusHandler />
      <SessionConflictNotification />
      <EnvironmentSwitchModal />
      <Toaster position="bottom-right" />
      <MiscPageWrapper>
        <Routes>
          {/* MISC Routes - Outside of MainLayout */}
          <Route path="/misc/maintenance" element={<MaintenancePage />} />
          <Route path="/misc/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/misc/session-conflict" element={<SessionConflictPage />} />
          <Route path="/misc/no-internet" element={<NoInternetPage />} />
          <Route path="/misc/error" element={<ErrorPage />} />
          <Route path="/misc/coming-soon" element={<ComingSoonPage />} />
          <Route path="/misc/api-server-down" element={<ApiServerDownPage />} />

          {/* Root Route - Smart Landing/Dashboard */}
          <Route path="/" element={<SmartHomePage />} />
          
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/register-invitation" element={<InvitationRegisterPage />} />
          <Route path="/auth/google-callback" element={<GoogleCallbackPage />} />

          {/* Routes outside of MainLayout that require auth */}
          <Route
            path="/select-tenant"
            element={
              <ProtectedRoute requireTenant={false}>
                <SelectTenantPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-tenant"
            element={
              <ProtectedRoute requireTenant={false}>
                <CreateTenantPage />
              </ProtectedRoute>
            }
          />
          
          {/* Complete Onboarding Routes - with Layout */}
          <Route
  path="/onboarding"
  element={
    <ProtectedRoute requireTenant={true}>
      <OnboardingLayout />
    </ProtectedRoute>
  }
>
  <Route index element={<OnboardingIndexPage />} />
  <Route path="welcome" element={<WelcomeStep />} />
  <Route path="storage-setup" element={<StorageSetupStep />} />
  <Route path="user-profile" element={<UserProfileStep />} />
 <Route path="/onboarding/theme-selection" element={<ThemeSelectionStep />} />
 <Route path="/onboarding/business-basic" element={<BusinessBasicStep />} />
<Route path="business-branding" element={<BusinessBrandingStep />} />              
<Route path="business-preferences" element={<BusinessPreferencesStep />} />       
  <Route path="master-data" element={<div>Master Data Step (Coming Soon)</div>} />
  <Route path="team-invite" element={<div>Team Invite Step (Coming Soon)</div>} />
  <Route path="product-tour" element={<div>Product Tour Step (Coming Soon)</div>} />
  <Route path="sample-contract" element={<div>Sample Contract Step (Coming Soon)</div>} />
  <Route path="complete" element={<div>Complete Step (Coming Soon)</div>} />
</Route>
          {/* Protected Routes with MainLayout - Your Original Structure */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
          </Route>

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ProfilePage />} />
          </Route>

          {/* Catalog routes */}
          <Route
            path="/catalog"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<CatalogPage />} />

            <Route path="view/:id" element={<ServiceViewPage />} />
            <Route path="/catalog/catalogService-form" element={<CatalogServiceFormPage />} />
          </Route>

          {/* Service Contracts Routes */}
          <Route
            path="/service-contracts"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="templates" replace />} />
            <Route path="contracts" element={<ContractsPage />} />
            
            {/* Service Contracts - Templates Routes */}
            <Route path="templates">
              <Route index element={<MyTemplatesPage />} />
              <Route path="designer" element={<TemplateDesignerPage />} />
              <Route path="preview" element={<TemplatePreviewPage />} />
              {/* Admin routes */}
              <Route path="admin">
                <Route path="global-templates" element={<GlobalTemplatesPage />} />
                <Route path="global-designer" element={<div>Global Designer Coming Soon</div>} />
                <Route path="analytics" element={<div>Analytics Coming Soon</div>} />
              </Route>
            </Route>
          </Route>
          
          {/* Legacy support for old routes - redirect to new structure */}
          <Route path="/contracts" element={<Navigate to="/service-contracts/contracts" replace />} />
          <Route path="/templates" element={<Navigate to="/service-contracts/templates" replace />} />
          
          {/* Settings routes */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<SettingsPage />} />
            <Route path="configure" element={<SettingsPage />} />
            <Route path="configure/lovs" element={<ListOfValuesPage />} />
            <Route path="configure/resources" element={<ResourcesPage />} />
            
            {/* Team Management Routes */}
            <Route path="users" element={<UsersPage />} />
            <Route path="users/view/:id" element={<UserViewPage />} />
            <Route path="users/edit/:id" element={<TeamEditPage />} />
            <Route path="/settings/user-profile" element={<UserProfilePage />} />

            {/* Business Profile Settings */}
            <Route path="business-profile" element={<BusinessProfilePage />} />
            <Route path="business-profile/edit" element={<EditBusinessProfilePage />} />
            
            {/* Storage Settings */}
            <Route path="configure/storage" element={<StorageSettingsPage />} />

            {/* tax-settings route */}
            <Route path="tax-settings" element={<TaxSettingsPage />} />
            
            {/* Storage Management Routes */}
            <Route path="storage/storagesetup" element={<StorageSetupPage />} />
            <Route path="storage/storagecomplete" element={<StorageCompletePage />} />
            <Route path="storage/storagemanagement" element={<StorageManagementPage />} />
            <Route path="storage/categoryfiles/:categoryId" element={<CategoryFilesPage />} />
            
            {/* Integration Settings */}
            <Route path="integrations" element={<IntegrationsPage />} />
            
            {/* Business Model Routes */}
            
            {/* Admin - Pricing Plans Management */}
            <Route path="businessmodel/admin/pricing-plans" element={<PricingPlansAdminPage />} />
            <Route path="businessmodel/admin/pricing-plans/create" element={<PricingPlanForm />} />
            <Route path="businessmodel/admin/pricing-plans/:id" element={<PlanDetailView />} />
            <Route path="businessmodel/admin/pricing-plans/:id/edit" element={<EditPlanPage />} />
            <Route path="businessmodel/admin/pricing-plans/:id/assign" element={<AssignPlanPage />} />
            
            {/* Admin - Plan Versions */}
            <Route path="businessmodel/admin/pricing-plans/:id/versions" element={<PlanVersionsPage />} />
            <Route path="businessmodel/admin/pricing-plans/:id/versions/create" element={<CreateVersionPage />} />
            <Route path="businessmodel/admin/pricing-plans/:id/versions/migrate" element={<MigrationDashboardPage />} />
            
            {/* Admin - Billing Management */}
            <Route path="businessmodel/admin/billing" element={<BillingDashboardPage />} />
            <Route path="businessmodel/admin/billing/create-invoice" element={<CreateInvoicePage />} />
            <Route path="businessmodel/admin/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Route>

          {/* Contacts Routes */}
          <Route
            path="/contacts"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ContactsPage />} />
            <Route path="create" element={<ContactCreateForm />} />
            <Route path=":id" element={<ContactViewPage />} />
            <Route path=":id/edit" element={<ContactCreateForm mode="edit" />} />
          </Route>

          {/* VaNi Routes */}
          <Route
            path="/vani"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/vani/dashboard" replace />} />
            <Route path="dashboard" element={<VaNiDashboard />} />
            <Route path="jobs" element={<JobsListPage />} />
            <Route path="jobs/create" element={<JobCreatePage />} />
            <Route path="events" element={<BusinessEventsPage />} />
            <Route path="jobs/:id" element={<JobDetailsPage />} />
            <Route path="jobs/:id/communications" element={<JobCommunicationsPage />} />
            <Route path="templates" element={<TemplatesLibraryPage />} />
            <Route path="templates/create" element={<TemplateEditorPage />} />
            <Route path="templates/:id" element={<TemplateEditorPage />} />
            <Route path="templates/:id/edit" element={<TemplateEditorPage />} />
            <Route path="channels" element={<ChannelsConfigPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="analytics/cross-module" element={<AnalyticsPage />} />
            <Route path="webhooks" element={<WebhookManagementPage />} />
            <Route path="webhooks/create" element={<div>Create Webhook - Coming Soon</div>} />
            <Route path="webhooks/:id" element={<div>Webhook Details - Coming Soon</div>} />
            <Route path="finance/receivables" element={<AccountsReceivablePage />} />
            <Route path="operations/services" element={<ServiceSchedulePage />} />
            <Route path="rules" element={<ProcessRulesPage />} />
            <Route path="rules/create" element={<div>Create Rule - Coming Soon</div>} />
            <Route path="rules/:id/edit" element={<div>Edit Rule - Coming Soon</div>} />
            <Route path="analytics/rules" element={<div>Rules Analytics - Coming Soon</div>} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="chat/:conversationId" element={<ChatPage />} />
          </Route>
          
          {/* Tenant - Pricing Plans & Subscription */}
          <Route
            path="/businessmodel/tenants/pricing-plans"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<PricingPlansPage />} />
          </Route>
          
          <Route
            path="/businessmodel/tenants/subscription"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<SubscriptionPage />} />
          </Route>
          
          {/* Legacy routes - redirect to new structure */}
          <Route path="/implementation/configure-plan" element={<Navigate to="/settings/businessmodel/admin/pricing-plans" replace />} />
          
          {/* 404 Page - Must be last */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </MiscPageWrapper>
    </>
  );
};

// ✅ UPDATED: App component with QueryProvider
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <ThemeProvider>
          <Router>
            <AuthProvider>
              <QueryClientProvider client={queryClient}>
                <QueryProvider> {/* ✅ NEW: Wrap with QueryProvider */}
                  <MasterDataProvider>
                    <AppContent />
                  </MasterDataProvider>
                </QueryProvider>
              </QueryClientProvider>
            </AuthProvider>
          </Router>
        </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

console.log('VITE_API_URL =', import.meta.env.VITE_API_URL);

export default App;
// src/pages/contracts/create/steps/RecipientStep.tsx
import React, { useState, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Check,
  ArrowRight,
  X,
  Plus,
  Star,
  Clock,
  Filter,
  ChevronDown
} from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useContractBuilder } from '../../../../contexts/ContractBuilderContext';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  type: 'individual' | 'business';
  isFavorite?: boolean;
  lastContract?: string;
  totalContracts?: number;
}

// Mock customer data
const MOCK_CUSTOMERS: Customer[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '(555) 123-4567',
    company: 'Smith Industries',
    address: { street: '123 Main St', city: 'Austin', state: 'TX', zip: '78701' },
    type: 'business',
    isFavorite: true,
    lastContract: '2024-01-15',
    totalContracts: 5
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.j@gmail.com',
    phone: '(555) 234-5678',
    address: { street: '456 Oak Ave', city: 'Dallas', state: 'TX', zip: '75201' },
    type: 'individual',
    isFavorite: false,
    lastContract: '2024-02-20',
    totalContracts: 2
  },
  {
    id: '3',
    name: 'Robert Williams',
    email: 'rwilliams@techcorp.com',
    phone: '(555) 345-6789',
    company: 'TechCorp Solutions',
    address: { street: '789 Tech Blvd', city: 'Houston', state: 'TX', zip: '77001' },
    type: 'business',
    isFavorite: true,
    lastContract: '2024-03-10',
    totalContracts: 8
  },
  {
    id: '4',
    name: 'Emily Davis',
    email: 'emily.davis@email.com',
    phone: '(555) 456-7890',
    address: { street: '321 Elm Street', city: 'San Antonio', state: 'TX', zip: '78201' },
    type: 'individual',
    isFavorite: false,
    totalContracts: 1
  },
  {
    id: '5',
    name: 'Michael Brown',
    email: 'mbrown@brownllc.com',
    phone: '(555) 567-8901',
    company: 'Brown LLC',
    address: { street: '555 Business Park', city: 'Austin', state: 'TX', zip: '78702' },
    type: 'business',
    isFavorite: false,
    lastContract: '2024-01-05',
    totalContracts: 3
  }
];

interface RecipientStepProps {
  onNext: () => void;
  onBack: () => void;
}

const RecipientStep: React.FC<RecipientStepProps> = ({ onNext, onBack }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const { state, dispatch } = useContractBuilder();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'individual' | 'business'>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    state.contractData?.recipient || null
  );
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    type: 'individual',
    address: { street: '', city: '', state: '', zip: '' }
  });

  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return MOCK_CUSTOMERS.filter(customer => {
      const matchesSearch =
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.company?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = filterType === 'all' || customer.type === filterType;
      const matchesFavorite = !showFavoritesOnly || customer.isFavorite;

      return matchesSearch && matchesType && matchesFavorite;
    });
  }, [searchQuery, filterType, showFavoritesOnly]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    dispatch({
      type: 'UPDATE_CONTRACT_DATA',
      payload: { recipient: customer }
    });
  };

  const handleContinue = () => {
    if (selectedCustomer) {
      dispatch({ type: 'MARK_STEP_COMPLETED', payload: 2 });
      onNext();
    }
  };

  const handleCreateCustomer = () => {
    if (newCustomer.name && newCustomer.email) {
      const customer: Customer = {
        id: `new-${Date.now()}`,
        name: newCustomer.name || '',
        email: newCustomer.email || '',
        phone: newCustomer.phone || '',
        company: newCustomer.company,
        address: newCustomer.address as Customer['address'],
        type: newCustomer.type as 'individual' | 'business'
      };
      setSelectedCustomer(customer);
      dispatch({
        type: 'UPDATE_CONTRACT_DATA',
        payload: { recipient: customer }
      });
      setShowNewCustomerForm(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Select Recipient
          </h1>
          <p className="text-muted-foreground">
            Choose an existing customer or create a new one
          </p>
        </div>
        <button
          onClick={() => setShowNewCustomerForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          New Customer
        </button>
      </div>

      {/* Selected Customer Preview */}
      {selectedCustomer && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-green-900 dark:text-green-100">
                  {selectedCustomer.name}
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {selectedCustomer.email}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedCustomer(null)}
              className="text-green-600 hover:text-green-800 dark:text-green-400"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search customers by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Types</option>
            <option value="individual">Individual</option>
            <option value="business">Business</option>
          </select>
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-4 py-2.5 border rounded-lg transition-colors flex items-center gap-2 ${
              showFavoritesOnly
                ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600'
                : 'border-border bg-background text-muted-foreground hover:border-yellow-500'
            }`}
          >
            <Star className={`h-4 w-4 ${showFavoritesOnly ? 'fill-yellow-500' : ''}`} />
            Favorites
          </button>
        </div>
      </div>

      {/* Customer List */}
      <div className="space-y-3 mb-8 max-h-96 overflow-y-auto">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 bg-muted/50 rounded-lg">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-1">No customers found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or create a new customer
            </p>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              onClick={() => handleSelectCustomer(customer)}
              className={`
                w-full p-4 rounded-lg border text-left transition-all
                ${selectedCustomer?.id === customer.id
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border bg-card hover:border-primary/50'
                }
              `}
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                  ${customer.type === 'business' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}
                `}>
                  {customer.type === 'business' ? (
                    <Building2 className="h-6 w-6" />
                  ) : (
                    <User className="h-6 w-6" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-foreground truncate">
                      {customer.name}
                    </h4>
                    {customer.isFavorite && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                    )}
                    {customer.company && (
                      <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                        {customer.company}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {customer.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {customer.phone}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {customer.address.city}, {customer.address.state}
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right flex-shrink-0">
                  {customer.totalContracts && (
                    <div className="text-sm text-muted-foreground">
                      {customer.totalContracts} contract{customer.totalContracts > 1 ? 's' : ''}
                    </div>
                  )}
                  {customer.lastContract && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-1">
                      <Clock className="h-3 w-3" />
                      Last: {new Date(customer.lastContract).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Selection indicator */}
                {selectedCustomer?.id === customer.id && (
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* New Customer Modal */}
      {showNewCustomerForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">New Customer</h2>
                <button
                  onClick={() => setShowNewCustomerForm(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* Customer Type */}
              <div className="flex gap-4">
                <button
                  onClick={() => setNewCustomer({ ...newCustomer, type: 'individual' })}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    newCustomer.type === 'individual'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <User className="h-6 w-6 mx-auto mb-2" />
                  <div className="text-sm font-medium">Individual</div>
                </button>
                <button
                  onClick={() => setNewCustomer({ ...newCustomer, type: 'business' })}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    newCustomer.type === 'business'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Building2 className="h-6 w-6 mx-auto mb-2" />
                  <div className="text-sm font-medium">Business</div>
                </button>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newCustomer.name || ''}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Enter full name"
                />
              </div>

              {/* Company (if business) */}
              {newCustomer.type === 'business' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={newCustomer.company || ''}
                    onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Enter company name"
                  />
                </div>
              )}

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newCustomer.email || ''}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newCustomer.phone || ''}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={newCustomer.address?.street || ''}
                  onChange={(e) => setNewCustomer({
                    ...newCustomer,
                    address: { ...newCustomer.address!, street: e.target.value }
                  })}
                  className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={newCustomer.address?.city || ''}
                    onChange={(e) => setNewCustomer({
                      ...newCustomer,
                      address: { ...newCustomer.address!, city: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={newCustomer.address?.state || ''}
                    onChange={(e) => setNewCustomer({
                      ...newCustomer,
                      address: { ...newCustomer.address!, state: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    ZIP
                  </label>
                  <input
                    type="text"
                    value={newCustomer.address?.zip || ''}
                    onChange={(e) => setNewCustomer({
                      ...newCustomer,
                      address: { ...newCustomer.address!, zip: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="ZIP"
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setShowNewCustomerForm(false)}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomer}
                disabled={!newCustomer.name || !newCustomer.email}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  newCustomer.name && newCustomer.email
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                Create Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        <button
          onClick={onBack}
          className="px-6 py-2.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!selectedCustomer}
          className={`
            flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all
            ${selectedCustomer
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
            }
          `}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default RecipientStep;

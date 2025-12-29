// src/pages/contracts/create/steps/BuilderStep.tsx
import React, { useState } from 'react';
import {
  Settings,
  ArrowRight,
  Plus,
  Trash2,
  GripVertical,
  Package,
  Wrench,
  Calendar,
  DollarSign,
  FileText,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
  Copy
} from 'lucide-react';
import { useTheme } from '../../../../contexts/ThemeContext';
import { useContractBuilder } from '../../../../contexts/ContractBuilderContext';

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  frequency: 'one-time' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'annually';
  price: number;
  quantity: number;
  isIncluded: boolean;
}

interface EquipmentItem {
  id: string;
  name: string;
  description: string;
  serialNumber?: string;
  monthlyRate?: number;
  isRental: boolean;
  isIncluded: boolean;
}

interface ContractTerm {
  id: string;
  title: string;
  content: string;
  isRequired: boolean;
  isCustom: boolean;
}

// Mock service catalog
const SERVICE_CATALOG: ServiceItem[] = [
  { id: 's1', name: 'General Pest Control', description: 'Interior and exterior pest treatment', frequency: 'monthly', price: 89, quantity: 1, isIncluded: false },
  { id: 's2', name: 'Termite Inspection', description: 'Annual termite inspection and report', frequency: 'annually', price: 150, quantity: 1, isIncluded: false },
  { id: 's3', name: 'Rodent Control', description: 'Rodent baiting and exclusion services', frequency: 'monthly', price: 65, quantity: 1, isIncluded: false },
  { id: 's4', name: 'Mosquito Treatment', description: 'Yard spray and larvicide application', frequency: 'monthly', price: 75, quantity: 1, isIncluded: false },
  { id: 's5', name: 'Bed Bug Treatment', description: 'Heat treatment for bed bugs', frequency: 'one-time', price: 500, quantity: 1, isIncluded: false }
];

// Mock equipment catalog
const EQUIPMENT_CATALOG: EquipmentItem[] = [
  { id: 'e1', name: 'Bait Stations (5 pack)', description: 'Exterior rodent bait stations', monthlyRate: 15, isRental: true, isIncluded: false },
  { id: 'e2', name: 'UV Fly Trap', description: 'Commercial-grade fly trap', monthlyRate: 25, isRental: true, isIncluded: false },
  { id: 'e3', name: 'Monitoring System', description: 'IoT pest monitoring sensors', monthlyRate: 50, isRental: true, isIncluded: false }
];

// Default contract terms
const DEFAULT_TERMS: ContractTerm[] = [
  { id: 't1', title: 'Service Guarantee', content: 'If pests return between scheduled services, we will re-treat at no additional charge.', isRequired: true, isCustom: false },
  { id: 't2', title: 'Payment Terms', content: 'Payment is due within 30 days of service completion. Late payments may incur a 1.5% monthly fee.', isRequired: true, isCustom: false },
  { id: 't3', title: 'Cancellation Policy', content: 'Either party may cancel with 30 days written notice. Prepaid services will be refunded on a prorated basis.', isRequired: true, isCustom: false },
  { id: 't4', title: 'Access Requirements', content: 'Customer agrees to provide access to all treatment areas during scheduled service visits.', isRequired: false, isCustom: false },
  { id: 't5', title: 'Liability Limitation', content: 'Our liability is limited to the cost of services provided under this agreement.', isRequired: true, isCustom: false }
];

interface BuilderStepProps {
  onNext: () => void;
  onBack: () => void;
}

const BuilderStep: React.FC<BuilderStepProps> = ({ onNext, onBack }) => {
  const { isDarkMode, currentTheme } = useTheme();
  const { state, dispatch } = useContractBuilder();

  const [activeTab, setActiveTab] = useState<'services' | 'equipment' | 'terms'>('services');
  const [services, setServices] = useState<ServiceItem[]>(
    state.contractData?.services || SERVICE_CATALOG
  );
  const [equipment, setEquipment] = useState<EquipmentItem[]>(
    state.contractData?.equipment || EQUIPMENT_CATALOG
  );
  const [terms, setTerms] = useState<ContractTerm[]>(
    state.contractData?.terms || DEFAULT_TERMS
  );
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);
  const [showAddService, setShowAddService] = useState(false);
  const [newTerm, setNewTerm] = useState({ title: '', content: '' });

  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const includedServices = services.filter(s => s.isIncluded);
  const includedEquipment = equipment.filter(e => e.isIncluded);

  // Calculate totals
  const monthlyTotal = includedServices
    .filter(s => ['monthly', 'bi-weekly', 'weekly'].includes(s.frequency))
    .reduce((sum, s) => sum + (s.price * s.quantity), 0) +
    includedEquipment.filter(e => e.isRental && e.monthlyRate).reduce((sum, e) => sum + (e.monthlyRate || 0), 0);

  const oneTimeTotal = includedServices
    .filter(s => s.frequency === 'one-time')
    .reduce((sum, s) => sum + (s.price * s.quantity), 0);

  const toggleService = (id: string) => {
    setServices(services.map(s =>
      s.id === id ? { ...s, isIncluded: !s.isIncluded } : s
    ));
  };

  const toggleEquipment = (id: string) => {
    setEquipment(equipment.map(e =>
      e.id === id ? { ...e, isIncluded: !e.isIncluded } : e
    ));
  };

  const updateServiceQuantity = (id: string, quantity: number) => {
    setServices(services.map(s =>
      s.id === id ? { ...s, quantity: Math.max(1, quantity) } : s
    ));
  };

  const toggleTerm = (id: string) => {
    setTerms(terms.map(t =>
      t.id === id && !t.isRequired ? { ...t, isRequired: !t.isRequired } : t
    ));
  };

  const addCustomTerm = () => {
    if (newTerm.title && newTerm.content) {
      setTerms([...terms, {
        id: `custom-${Date.now()}`,
        title: newTerm.title,
        content: newTerm.content,
        isRequired: true,
        isCustom: true
      }]);
      setNewTerm({ title: '', content: '' });
    }
  };

  const removeTerm = (id: string) => {
    setTerms(terms.filter(t => t.id !== id));
  };

  const handleContinue = () => {
    dispatch({
      type: 'UPDATE_CONTRACT_DATA',
      payload: { services, equipment, terms }
    });
    dispatch({ type: 'MARK_STEP_COMPLETED', payload: 4 });
    onNext();
  };

  const frequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      'one-time': 'One-time',
      'weekly': '/week',
      'bi-weekly': '/2 weeks',
      'monthly': '/month',
      'quarterly': '/quarter',
      'annually': '/year'
    };
    return labels[freq] || freq;
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Build Your Contract
          </h1>
          <p className="text-muted-foreground">
            Configure services, equipment, and contract terms
          </p>
        </div>

        {/* Summary Card */}
        <div className="bg-card border border-border rounded-xl p-4 min-w-64">
          <h4 className="font-semibold text-foreground mb-3">Contract Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Services:</span>
              <span className="font-medium">{includedServices.length} selected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Equipment:</span>
              <span className="font-medium">{includedEquipment.length} items</span>
            </div>
            <div className="pt-2 border-t border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly:</span>
                <span className="font-semibold text-primary">${monthlyTotal.toFixed(2)}</span>
              </div>
              {oneTimeTotal > 0 && (
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">One-time:</span>
                  <span className="font-semibold">${oneTimeTotal.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {[
          { id: 'services', label: 'Services', icon: Wrench, count: includedServices.length },
          { id: 'equipment', label: 'Equipment', icon: Package, count: includedEquipment.length },
          { id: 'terms', label: 'Terms & Conditions', icon: FileText, count: terms.filter(t => t.isRequired).length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex items-center gap-2 px-6 py-3 border-b-2 transition-colors
              ${activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
              }
            `}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.count > 0 && (
              <span className={`
                ml-1 px-2 py-0.5 text-xs rounded-full
                ${activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}
              `}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Select services to include in this contract
            </p>
            <button
              onClick={() => setShowAddService(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Custom Service
            </button>
          </div>

          {services.map((service) => (
            <div
              key={service.id}
              className={`
                p-4 rounded-xl border-2 transition-all
                ${service.isIncluded
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/50'
                }
              `}
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => toggleService(service.id)}
                  className={`
                    w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1
                    ${service.isIncluded
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-border hover:border-primary'
                    }
                  `}
                >
                  {service.isIncluded && <Check className="h-4 w-4" />}
                </button>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">{service.name}</h4>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-foreground">
                        ${service.price.toFixed(2)}
                        <span className="text-sm font-normal text-muted-foreground">
                          {frequencyLabel(service.frequency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {service.isIncluded && (
                    <div className="mt-3 pt-3 border-t border-border flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-muted-foreground">Quantity:</label>
                        <div className="flex items-center">
                          <button
                            onClick={() => updateServiceQuantity(service.id, service.quantity - 1)}
                            className="px-2 py-1 border border-border rounded-l-lg hover:bg-muted"
                          >
                            -
                          </button>
                          <span className="px-4 py-1 border-t border-b border-border bg-background text-foreground">
                            {service.quantity}
                          </span>
                          <button
                            onClick={() => updateServiceQuantity(service.id, service.quantity + 1)}
                            className="px-2 py-1 border border-border rounded-r-lg hover:bg-muted"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground capitalize">{service.frequency.replace('-', ' ')}</span>
                      </div>
                      <div className="ml-auto font-semibold text-primary">
                        Subtotal: ${(service.price * service.quantity).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {includedServices.length === 0 && (
            <div className="text-center py-8 bg-muted/50 rounded-xl">
              <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No services selected yet</p>
              <p className="text-sm text-muted-foreground">Click on a service above to include it in the contract</p>
            </div>
          )}
        </div>
      )}

      {/* Equipment Tab */}
      {activeTab === 'equipment' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Add equipment rentals or purchases to the contract
          </p>

          {equipment.map((item) => (
            <div
              key={item.id}
              className={`
                p-4 rounded-xl border-2 transition-all
                ${item.isIncluded
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-primary/50'
                }
              `}
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => toggleEquipment(item.id)}
                  className={`
                    w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1
                    ${item.isIncluded
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-border hover:border-primary'
                    }
                  `}
                >
                  {item.isIncluded && <Check className="h-4 w-4" />}
                </button>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      {item.isRental && (
                        <span className="inline-flex items-center gap-1 mt-1 text-xs text-blue-600 dark:text-blue-400">
                          <Package className="h-3 w-3" />
                          Rental Equipment
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      {item.monthlyRate && (
                        <div className="font-semibold text-foreground">
                          ${item.monthlyRate.toFixed(2)}
                          <span className="text-sm font-normal text-muted-foreground">/month</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {includedEquipment.length === 0 && (
            <div className="text-center py-8 bg-muted/50 rounded-xl">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No equipment added yet</p>
              <p className="text-sm text-muted-foreground">Equipment is optional for most contracts</p>
            </div>
          )}
        </div>
      )}

      {/* Terms Tab */}
      {activeTab === 'terms' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Review and customize contract terms
            </p>
          </div>

          {terms.map((term) => (
            <div
              key={term.id}
              className={`
                rounded-xl border transition-all overflow-hidden
                ${term.isRequired
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border bg-card'
                }
              `}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => !term.isCustom && toggleTerm(term.id)}
                    disabled={term.isRequired && !term.isCustom}
                    className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                      ${term.isRequired
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-border hover:border-primary'
                      }
                      ${term.isRequired && !term.isCustom ? 'cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {term.isRequired && <Check className="h-3 w-3" />}
                  </button>

                  <div className="flex-1">
                    <button
                      onClick={() => setExpandedTerm(expandedTerm === term.id ? null : term.id)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">{term.title}</h4>
                        {term.isCustom && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                            Custom
                          </span>
                        )}
                        {!term.isCustom && term.isRequired && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
                            Required
                          </span>
                        )}
                      </div>
                      {expandedTerm === term.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>

                  {term.isCustom && (
                    <button
                      onClick={() => removeTerm(term.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {expandedTerm === term.id && (
                  <div className="mt-3 pl-8">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {term.content}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Add Custom Term */}
          <div className="border border-dashed border-border rounded-xl p-4">
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Custom Term
            </h4>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Term title"
                value={newTerm.title}
                onChange={(e) => setNewTerm({ ...newTerm, title: e.target.value })}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <textarea
                placeholder="Term content..."
                value={newTerm.content}
                onChange={(e) => setNewTerm({ ...newTerm, content: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
              <button
                onClick={addCustomTerm}
                disabled={!newTerm.title || !newTerm.content}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${newTerm.title && newTerm.content
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }
                `}
              >
                Add Term
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Warning */}
      {includedServices.length === 0 && (
        <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                No services selected
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Please select at least one service to include in the contract before continuing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 mt-8 border-t border-border">
        <button
          onClick={onBack}
          className="px-6 py-2.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={includedServices.length === 0}
          className={`
            flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all
            ${includedServices.length > 0
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

export default BuilderStep;

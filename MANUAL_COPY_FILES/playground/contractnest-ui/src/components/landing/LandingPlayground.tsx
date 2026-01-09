// src/components/landing/LandingPlayground.tsx
// Playground section for Landing Page - Interactive Contract Builder Demo
import React, { useState, useCallback } from 'react';
import {
  Play,
  User,
  Building2,
  Phone,
  ArrowRight,
  GripVertical,
  Trash2,
  Send,
  Eye,
  FileText,
  Package,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Download,
  RotateCcw,
  CheckCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../utils/supabase';

// Types
interface PlaygroundBlock {
  id: string;
  categoryId: string;
  name: string;
  icon: string;
  description: string;
  price?: number;
}

interface CanvasBlock extends PlaygroundBlock {
  canvasId: string;
}

interface LeadData {
  name: string;
  mobile: string;
  company: string;
}

// Demo blocks data
const DEMO_BLOCKS: PlaygroundBlock[] = [
  // Customer
  { id: 'customer-basic', categoryId: 'customer', name: 'Customer Details', icon: 'User', description: 'Name, Contact, Address' },
  // Services
  { id: 'service-visit', categoryId: 'service', name: 'Service Visit', icon: 'Wrench', description: 'On-site service call', price: 2500 },
  { id: 'maintenance', categoryId: 'service', name: 'Preventive Maintenance', icon: 'Shield', description: 'Quarterly maintenance', price: 4500 },
  { id: 'emergency', categoryId: 'service', name: 'Emergency Support', icon: 'AlertTriangle', description: '24/7 breakdown support', price: 1500 },
  // Billing
  { id: 'monthly', categoryId: 'billing', name: 'Monthly Billing', icon: 'Calendar', description: 'Bill every month' },
  { id: 'milestone', categoryId: 'billing', name: 'Milestone Payment', icon: 'Target', description: 'Pay on completion' },
  // Terms
  { id: 'sla', categoryId: 'terms', name: 'SLA Terms', icon: 'Clock', description: 'Response time guarantee' },
  { id: 'cancellation', categoryId: 'terms', name: 'Cancellation Policy', icon: 'XCircle', description: 'Terms for cancellation' },
];

const CATEGORY_STYLES: Record<string, { color: string; bgColor: string; label: string; icon: string }> = {
  customer: { color: '#3B82F6', bgColor: '#DBEAFE', label: 'Customer', icon: 'User' },
  service: { color: '#6366F1', bgColor: '#E0E7FF', label: 'Services', icon: 'Wrench' },
  billing: { color: '#10B981', bgColor: '#D1FAE5', label: 'Billing', icon: 'CreditCard' },
  terms: { color: '#F59E0B', bgColor: '#FEF3C7', label: 'Terms', icon: 'FileText' },
};

// Helper to get Lucide icon
const getIcon = (iconName: string) => {
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>;
  return icons[iconName] || LucideIcons.Circle;
};

type PlaygroundStep = 'cta' | 'form' | 'builder' | 'sending' | 'success';

const LandingPlayground: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  const [step, setStep] = useState<PlaygroundStep>('cta');
  const [leadData, setLeadData] = useState<LeadData>({ name: '', mobile: '', company: '' });
  const [canvasBlocks, setCanvasBlocks] = useState<CanvasBlock[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [draggedBlock, setDraggedBlock] = useState<PlaygroundBlock | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('service');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);

  // Check for mobile on resize
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Group blocks by category
  const blocksByCategory = DEMO_BLOCKS.reduce((acc, block) => {
    if (!acc[block.categoryId]) acc[block.categoryId] = [];
    acc[block.categoryId].push(block);
    return acc;
  }, {} as Record<string, PlaygroundBlock[]>);

  // Calculate total
  const totalValue = canvasBlocks.reduce((sum, block) => sum + (block.price || 0), 0);

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!leadData.name.trim()) newErrors.name = 'Name is required';
    if (!leadData.mobile.trim()) newErrors.mobile = 'Mobile is required';
    else if (!/^[0-9]{10}$/.test(leadData.mobile.replace(/\s/g, ''))) newErrors.mobile = 'Enter valid 10-digit mobile';
    if (!leadData.company.trim()) newErrors.company = 'Company is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Start builder
  const handleStartBuilder = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      // Save lead to Supabase
      await supabase.from('leads_contractnest').insert([{
        name: leadData.name.trim(),
        email: `${leadData.mobile}@playground.demo`,
        phone: leadData.mobile.trim(),
        industry: 'equipment_amc',
        persona: 'seller',
        completed_demo: false,
      }]);
    } catch (err) {
      console.error('Error saving lead:', err);
    }

    setIsSubmitting(false);
    setStep('builder');
  };

  // Add block to canvas
  const addBlockToCanvas = useCallback((block: PlaygroundBlock) => {
    const canvasBlock: CanvasBlock = { ...block, canvasId: `${block.id}-${Date.now()}` };
    setCanvasBlocks((prev) => [...prev, canvasBlock]);
  }, []);

  // Remove block from canvas
  const removeBlockFromCanvas = useCallback((canvasId: string) => {
    setCanvasBlocks((prev) => prev.filter((b) => b.canvasId !== canvasId));
  }, []);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, block: PlaygroundBlock) => {
    setDraggedBlock(block);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedBlock) {
      addBlockToCanvas(draggedBlock);
      setDraggedBlock(null);
    }
  };

  // Send contract
  const handleSendContract = () => {
    if (!customerName.trim() || canvasBlocks.length === 0) return;
    setStep('sending');
    setTimeout(() => setStep('success'), 2500);
  };

  // Generate HTML for download
  const downloadContract = () => {
    const html = `<!DOCTYPE html>
<html><head><title>Contract - ${customerName}</title>
<style>body{font-family:sans-serif;max-width:600px;margin:40px auto;padding:20px}
.header{background:#4F46E5;color:white;padding:20px;border-radius:8px;margin-bottom:20px}
.block{padding:12px;border:1px solid #ddd;border-radius:6px;margin-bottom:8px}
.total{font-size:1.5rem;font-weight:bold;color:#4F46E5;margin-top:20px}</style></head>
<body><div class="header"><h1>Service Contract</h1><p>For: ${customerName}</p><p>From: ${leadData.company}</p></div>
${canvasBlocks.map(b => `<div class="block"><strong>${b.name}</strong><br><small>${b.description}</small>${b.price ? `<br><strong>₹${b.price.toLocaleString()}</strong>` : ''}</div>`).join('')}
<p class="total">Total: ₹${totalValue.toLocaleString()}</p>
<p style="color:#666;font-size:12px;margin-top:40px">Generated via ContractNest Playground</p></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract-${customerName.replace(/\s+/g, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Restart
  const handleRestart = () => {
    setStep('cta');
    setCanvasBlocks([]);
    setCustomerName('');
    setLeadData({ name: '', mobile: '', company: '' });
  };

  const canSend = customerName.trim() && canvasBlocks.length > 0;

  return (
    <section
      id="playground"
      className="py-16 px-4 sm:px-6 lg:px-8 transition-colors"
      style={{ backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#F8FAFC' }}
    >
      <div className="max-w-6xl mx-auto">
        {/* CTA Card */}
        {step === 'cta' && (
          <div
            className="rounded-2xl p-8 md:p-12 text-center shadow-lg transition-colors"
            style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF' }}
          >
            <div className="text-5xl mb-4">🎮</div>
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ color: colors.utility.primaryText }}
            >
              Playground
            </h2>
            <p
              className="text-lg mb-8 max-w-xl mx-auto"
              style={{ color: colors.utility.secondaryText }}
            >
              See how easy it is to build service contracts with drag-and-drop blocks
            </p>

            {/* Workflow Visual */}
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 mb-8">
              {[
                { icon: '📝', label: 'Seller Creates' },
                { icon: '📤', label: 'Sends to Buyer' },
                { icon: '✅', label: 'Review & Accept' },
                { icon: '🎉', label: 'Contract Active!' },
              ].map((item, i) => (
                <React.Fragment key={i}>
                  <div
                    className="flex flex-col items-center px-3 py-2 rounded-lg"
                    style={{ backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#F1F5F9' }}
                  >
                    <span className="text-2xl mb-1">{item.icon}</span>
                    <span className="text-xs font-medium" style={{ color: colors.utility.secondaryText }}>
                      {item.label}
                    </span>
                  </div>
                  {i < 3 && (
                    <span className="text-xl" style={{ color: colors.utility.secondaryText }}>→</span>
                  )}
                </React.Fragment>
              ))}
            </div>

            <button
              onClick={() => setStep('form')}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-semibold text-lg transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: colors.brand.primary }}
            >
              <Eye className="w-5 h-5" />
              See For Yourself - Try Now
            </button>

            <p className="text-sm mt-4" style={{ color: colors.utility.secondaryText }}>
              Build a sample contract and download it instantly
            </p>
          </div>
        )}

        {/* User Form */}
        {step === 'form' && (
          <div
            className="rounded-2xl p-6 md:p-8 shadow-lg max-w-md mx-auto transition-colors"
            style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF' }}
          >
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">👤</div>
              <h3 className="text-xl font-bold" style={{ color: colors.utility.primaryText }}>
                Enter Your Details to Start
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: colors.utility.primaryText }}>
                  Mobile Number
                </label>
                <div className="flex">
                  <span
                    className="px-3 py-2.5 border border-r-0 rounded-l-lg text-sm"
                    style={{
                      backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#F9FAFB',
                      borderColor: errors.mobile ? '#EF4444' : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
                      color: colors.utility.secondaryText,
                    }}
                  >
                    +91
                  </span>
                  <input
                    type="tel"
                    value={leadData.mobile}
                    onChange={(e) => setLeadData({ ...leadData, mobile: e.target.value })}
                    placeholder="98765 43210"
                    maxLength={10}
                    className="flex-1 px-3 py-2.5 border rounded-r-lg focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
                      borderColor: errors.mobile ? '#EF4444' : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
                      color: colors.utility.primaryText,
                    }}
                  />
                </div>
                {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: colors.utility.primaryText }}>
                  Your Name
                </label>
                <input
                  type="text"
                  value={leadData.name}
                  onChange={(e) => setLeadData({ ...leadData, name: e.target.value })}
                  placeholder="Rajesh Kumar"
                  className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
                    borderColor: errors.name ? '#EF4444' : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
                    color: colors.utility.primaryText,
                  }}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: colors.utility.primaryText }}>
                  Company
                </label>
                <input
                  type="text"
                  value={leadData.company}
                  onChange={(e) => setLeadData({ ...leadData, company: e.target.value })}
                  placeholder="ABC Pvt Ltd"
                  className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
                    borderColor: errors.company ? '#EF4444' : (isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB'),
                    color: colors.utility.primaryText,
                  }}
                />
                {errors.company && <p className="text-red-500 text-xs mt-1">{errors.company}</p>}
              </div>

              <button
                onClick={handleStartBuilder}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: colors.brand.primary }}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Start Building <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Builder */}
        {step === 'builder' && (
          <div className="space-y-4">
            {/* Header */}
            <div
              className="rounded-xl p-4 flex items-center justify-between shadow-sm"
              style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF' }}
            >
              <div>
                <h3 className="font-bold text-lg" style={{ color: colors.utility.primaryText }}>
                  Contract Builder
                </h3>
                <p className="text-sm" style={{ color: colors.utility.secondaryText }}>
                  {isMobile ? 'Tap blocks to add' : 'Drag blocks to build your contract'}
                </p>
              </div>
              <button
                onClick={handleSendContract}
                disabled={!canSend}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                  canSend ? 'text-white hover:opacity-90' : 'opacity-50 cursor-not-allowed'
                }`}
                style={{ backgroundColor: canSend ? colors.brand.primary : '#9CA3AF' }}
              >
                <Send className="w-4 h-4" />
                Send Contract
              </button>
            </div>

            {/* Customer Name Input */}
            <div
              className="rounded-xl p-4 shadow-sm"
              style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF' }}
            >
              <label className="block text-sm font-medium mb-2" style={{ color: colors.utility.primaryText }}>
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter your customer's name"
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
                  borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                  color: colors.utility.primaryText,
                }}
              />
            </div>

            {/* Builder Layout */}
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-12'}`}>
              {/* Block Palette */}
              <div className={isMobile ? '' : 'col-span-4'}>
                <div
                  className="rounded-xl shadow-sm overflow-hidden"
                  style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF' }}
                >
                  <div className="p-4 border-b" style={{ borderColor: isDarkMode ? colors.utility.primaryBackground : '#E5E7EB' }}>
                    <h4 className="font-semibold flex items-center gap-2" style={{ color: colors.utility.primaryText }}>
                      <Package className="w-5 h-5" style={{ color: colors.brand.primary }} />
                      Building Blocks
                    </h4>
                  </div>

                  {Object.entries(blocksByCategory).map(([categoryId, blocks]) => {
                    const style = CATEGORY_STYLES[categoryId];
                    const isExpanded = expandedCategory === categoryId || !isMobile;
                    const CategoryIcon = getIcon(style.icon);

                    return (
                      <div key={categoryId} className="border-b last:border-b-0" style={{ borderColor: isDarkMode ? colors.utility.primaryBackground : '#E5E7EB' }}>
                        {isMobile ? (
                          <button
                            onClick={() => setExpandedCategory(isExpanded ? null : categoryId)}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-opacity-50"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: style.bgColor }}>
                                <CategoryIcon className="w-4 h-4" style={{ color: style.color }} />
                              </div>
                              <span className="font-medium" style={{ color: colors.utility.primaryText }}>{style.label}</span>
                            </div>
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        ) : (
                          <div className="px-4 pt-3 pb-1">
                            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: style.color }}>
                              {style.label}
                            </span>
                          </div>
                        )}

                        {(isExpanded || !isMobile) && (
                          <div className="px-3 pb-3 space-y-2">
                            {blocks.map((block) => {
                              const BlockIcon = getIcon(block.icon);
                              return (
                                <div
                                  key={block.id}
                                  draggable={!isMobile}
                                  onDragStart={(e) => handleDragStart(e, block)}
                                  onDragEnd={() => setDraggedBlock(null)}
                                  onClick={() => isMobile && addBlockToCanvas(block)}
                                  className="p-2.5 rounded-lg border-2 cursor-pointer transition-all hover:shadow-sm"
                                  style={{
                                    backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#F9FAFB',
                                    borderColor: isDarkMode ? colors.utility.secondaryBackground : '#E5E7EB',
                                  }}
                                >
                                  <div className="flex items-center gap-2.5">
                                    {!isMobile && <GripVertical className="w-4 h-4" style={{ color: colors.utility.secondaryText }} />}
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: style.bgColor }}>
                                      <BlockIcon className="w-4 h-4" style={{ color: style.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm truncate" style={{ color: colors.utility.primaryText }}>{block.name}</p>
                                      {block.price && (
                                        <p className="text-xs font-semibold" style={{ color: colors.brand.primary }}>
                                          ₹{block.price.toLocaleString()}
                                        </p>
                                      )}
                                    </div>
                                    {isMobile && <Plus className="w-5 h-5" style={{ color: colors.brand.primary }} />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Canvas */}
              <div className={isMobile ? '' : 'col-span-8'}>
                <div
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                  onDrop={handleDrop}
                  className={`rounded-xl shadow-sm min-h-[300px] border-2 border-dashed transition-all ${
                    draggedBlock ? 'border-opacity-100' : 'border-opacity-50'
                  }`}
                  style={{
                    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
                    borderColor: draggedBlock ? colors.brand.primary : (isDarkMode ? colors.utility.primaryBackground : '#E5E7EB'),
                  }}
                >
                  <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: isDarkMode ? colors.utility.primaryBackground : '#E5E7EB' }}>
                    <h4 className="font-semibold" style={{ color: colors.utility.primaryText }}>
                      Your Contract
                    </h4>
                    <span className="font-bold" style={{ color: colors.brand.primary }}>
                      ₹{totalValue.toLocaleString()}
                    </span>
                  </div>

                  {canvasBlocks.length === 0 ? (
                    <div className="p-12 text-center">
                      <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: colors.utility.secondaryText, opacity: 0.5 }} />
                      <p style={{ color: colors.utility.secondaryText }}>
                        {isMobile ? 'Tap blocks to add them here' : 'Drag blocks here to build your contract'}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-2">
                      {canvasBlocks.map((block) => {
                        const style = CATEGORY_STYLES[block.categoryId];
                        const BlockIcon = getIcon(block.icon);
                        return (
                          <div
                            key={block.canvasId}
                            className="p-3 rounded-lg flex items-center gap-3 group"
                            style={{ backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#F9FAFB' }}
                          >
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: style.bgColor }}>
                              <BlockIcon className="w-5 h-5" style={{ color: style.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium" style={{ color: colors.utility.primaryText }}>{block.name}</p>
                              <p className="text-sm" style={{ color: colors.utility.secondaryText }}>{block.description}</p>
                            </div>
                            {block.price && (
                              <span className="font-semibold" style={{ color: colors.brand.primary }}>
                                ₹{block.price.toLocaleString()}
                              </span>
                            )}
                            <button
                              onClick={() => removeBlockFromCanvas(block.canvasId)}
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sending Animation */}
        {step === 'sending' && (
          <div className="text-center py-20">
            <div className="relative inline-block">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center animate-pulse"
                style={{ backgroundColor: `${colors.brand.primary}20` }}
              >
                <Send className="w-12 h-12" style={{ color: colors.brand.primary }} />
              </div>
            </div>
            <h3 className="text-2xl font-bold mt-6" style={{ color: colors.utility.primaryText }}>
              Sending Contract...
            </h3>
            <p style={{ color: colors.utility.secondaryText }}>To: {customerName}</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: colors.brand.primary, animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: colors.brand.primary, animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: colors.brand.primary, animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Success */}
        {step === 'success' && (
          <div
            className="rounded-2xl p-8 text-center shadow-lg max-w-md mx-auto"
            style={{ backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF' }}
          >
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 bg-green-100">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold mb-2" style={{ color: colors.utility.primaryText }}>
              Contract Sent!
            </h3>
            <p className="mb-6" style={{ color: colors.utility.secondaryText }}>
              Your contract has been sent to {customerName}
            </p>

            <div className="space-y-3">
              <button
                onClick={downloadContract}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 font-semibold transition-all hover:opacity-80"
                style={{ borderColor: colors.brand.primary, color: colors.brand.primary }}
              >
                <Download className="w-5 h-5" />
                Download Contract (HTML)
              </button>

              <a
                href="/register"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: colors.brand.primary }}
              >
                <Sparkles className="w-5 h-5" />
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </a>

              <button
                onClick={handleRestart}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all hover:opacity-80"
                style={{ color: colors.utility.secondaryText }}
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default LandingPlayground;

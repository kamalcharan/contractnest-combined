// src/components/landing/TheProblem.tsx - The Problem Section with Dual Persona
import React, { useState } from 'react';
import {
  Building2,
  Wrench,
  ChevronDown,
  Check,
  Clock,
  Circle,
  FileText,
  Download,
  TrendingUp,
  AlertTriangle,
  Calendar,
  DollarSign,
  Bot,
  Camera,
  Play,
  Dumbbell,
  Cog,
  Package,
  Server
} from 'lucide-react';

type PersonaType = 'buyer' | 'seller';
type IndustryType = 'wellness' | 'equipment-maintenance' | 'equipment-lease' | 'oem-service';

interface TheProblemProps {
  onCtaClick?: () => void;
  className?: string;
}

// Industry options
const industries = [
  { id: 'equipment-maintenance', label: 'Equipment Maintenance (Lift AMC)', icon: Cog },
  { id: 'wellness', label: 'Wellness Programs', icon: Dumbbell },
  { id: 'equipment-lease', label: 'Equipment Lease', icon: Package },
  { id: 'oem-service', label: 'OEM Large Equipment', icon: Server },
];

// Pain points data
const painPoints = {
  buyer: {
    title: 'Sound Familiar?',
    subtitle: 'If you manage vendors...',
    points: [
      'Contracts buried in emails & filing cabinets',
      'Zero visibility into vendor performance',
      'Compliance audits = panic mode',
      'Surprise renewal costs drain budgets',
    ],
    stat: {
      value: '67%',
      label: 'of facilities have no central contract visibility',
    },
  },
  seller: {
    title: 'Sound Familiar?',
    subtitle: 'If you provide services...',
    points: [
      'Renewals slip through the cracks',
      'Quotes scattered across Excel files',
      'Chasing payments eats up your time',
      'No dashboard for recurring revenue',
    ],
    stat: {
      value: '42%',
      label: 'of SMBs miss renewal deadlines',
    },
  },
};

// Contract data by industry and persona
const contractData = {
  buyer: {
    'equipment-maintenance': {
      title: 'Lift AMC Contract',
      vendor: 'ThyssenKrupp Services',
      status: 'Active',
      statusColor: 'green',
      services: [
        { name: 'Q1 Preventive Maintenance', date: 'Jan 15, 2025', status: 'completed', evidence: 'Service Report.pdf' },
        { name: 'Q2 Preventive Maintenance', date: 'Apr 12, 2025', status: 'completed', evidence: 'Photos + Checklist' },
        { name: 'Q3 Preventive Maintenance', date: 'Jul 10, 2025', status: 'upcoming', evidence: null },
        { name: 'Q4 Preventive Maintenance', date: 'Oct 15, 2025', status: 'upcoming', evidence: null },
      ],
      investment: {
        total: '₹48,000/year',
        received: '₹24,000',
        progress: 50,
      },
      nextService: 'Jul 10, 2025',
    },
    'wellness': {
      title: 'PCOD Balance Program',
      vendor: 'Vikuna Wellness',
      status: 'Active',
      statusColor: 'green',
      services: [
        { name: 'Yoga Session #1', date: 'Dec 22, 2024', status: 'completed', evidence: 'Session Photos' },
        { name: 'Nutrition Consultation', date: 'Dec 26, 2024', status: 'completed', evidence: 'Diet Chart.pdf' },
        { name: 'Yoga Session #2', date: 'Dec 29, 2024', status: 'completed', evidence: 'Session Photos' },
        { name: 'Gynec Consultation', date: 'Jan 05, 2025', status: 'in-progress', evidence: null },
      ],
      investment: {
        total: '₹12,000',
        received: '₹5,400',
        progress: 45,
      },
      nextService: 'Jan 05, 2025',
    },
    'equipment-lease': {
      title: 'MRI Machine Lease',
      vendor: 'Siemens Healthineers',
      status: 'Active',
      statusColor: 'green',
      services: [
        { name: 'Installation & Calibration', date: 'Nov 01, 2024', status: 'completed', evidence: 'Installation Report' },
        { name: 'Operator Training', date: 'Nov 15, 2024', status: 'completed', evidence: 'Training Certificate' },
        { name: 'Q1 Service Check', date: 'Feb 01, 2025', status: 'upcoming', evidence: null },
        { name: 'Software Update', date: 'Mar 15, 2025', status: 'upcoming', evidence: null },
      ],
      investment: {
        total: '₹15,00,000/year',
        received: '₹3,75,000',
        progress: 25,
      },
      nextService: 'Feb 01, 2025',
    },
    'oem-service': {
      title: 'CT Scanner Service Contract',
      vendor: 'GE Healthcare',
      status: 'Active',
      statusColor: 'green',
      services: [
        { name: 'Annual Calibration', date: 'Jan 10, 2025', status: 'completed', evidence: 'Calibration Certificate' },
        { name: 'Tube Replacement', date: 'Mar 20, 2025', status: 'in-progress', evidence: null },
        { name: 'Software Upgrade v4.2', date: 'Jun 15, 2025', status: 'upcoming', evidence: null },
        { name: 'Preventive Maintenance', date: 'Sep 10, 2025', status: 'upcoming', evidence: null },
      ],
      investment: {
        total: '₹8,50,000/year',
        received: '₹2,12,500',
        progress: 25,
      },
      nextService: 'Mar 20, 2025',
    },
  },
  seller: {
    'equipment-maintenance': {
      title: 'Lift AMC Contract #CN-445',
      client: 'Apollo Hospitals',
      status: 'Active',
      statusColor: 'green',
      timeline: [
        { name: 'Q1 PM Visit', date: 'Jan 15, 2025', status: 'completed', assignee: 'Rajesh K.', evidence: true },
        { name: 'Q2 PM Visit', date: 'Apr 12, 2025', status: 'completed', assignee: 'Rajesh K.', evidence: true },
        { name: 'Q3 PM Visit', date: 'Jul 10, 2025', status: 'in-progress', assignee: 'Unassigned', sla: '5 days' },
        { name: 'Q4 PM Visit', date: 'Oct 15, 2025', status: 'upcoming', assignee: 'TBD', sla: null },
      ],
      financial: {
        value: '₹48,000',
        collected: '₹36,000',
        pending: '₹12,000',
        progress: 75,
      },
      renewalDays: 45,
      agentAlert: 'Q3 PM Visit is unassigned and due in 5 days. Assign a technician?',
    },
    'wellness': {
      title: 'PCOD Balance Program #CN-221',
      client: 'Anita Sharma',
      status: 'Active',
      statusColor: 'green',
      timeline: [
        { name: 'Yoga Session #1', date: 'Dec 22, 2024', status: 'completed', assignee: 'Priya (Trainer)', evidence: true },
        { name: 'Nutrition Consultation', date: 'Dec 26, 2024', status: 'completed', assignee: 'Dr. Meera', evidence: true },
        { name: 'Yoga Session #2', date: 'Dec 29, 2024', status: 'completed', assignee: 'Priya (Trainer)', evidence: true },
        { name: 'Gynec Consultation', date: 'Jan 05, 2025', status: 'in-progress', assignee: 'Unassigned', sla: '2 days' },
      ],
      financial: {
        value: '₹12,000',
        collected: '₹12,000',
        pending: '₹0',
        progress: 100,
      },
      renewalDays: null,
      agentAlert: 'Gynec Consultation is unassigned and due in 2 days. Notify Dr. Sunita?',
    },
    'equipment-lease': {
      title: 'MRI Lease + Service #CN-892',
      client: 'City Hospital',
      status: 'Active',
      statusColor: 'green',
      timeline: [
        { name: 'Installation', date: 'Nov 01, 2024', status: 'completed', assignee: 'Install Team', evidence: true },
        { name: 'Training Session', date: 'Nov 15, 2024', status: 'completed', assignee: 'Training Team', evidence: true },
        { name: 'Q1 Service', date: 'Feb 01, 2025', status: 'upcoming', assignee: 'Service Team', sla: '30 days' },
        { name: 'Lease Payment Q1', date: 'Feb 15, 2025', status: 'upcoming', assignee: 'Auto-Invoice', sla: null },
      ],
      financial: {
        value: '₹15,00,000',
        collected: '₹7,50,000',
        pending: '₹7,50,000',
        progress: 50,
      },
      renewalDays: 320,
      agentAlert: 'Q1 lease payment due in 30 days. Auto-invoice scheduled.',
    },
    'oem-service': {
      title: 'CT Scanner AMC #CN-1105',
      client: 'Max Healthcare (3 Sites)',
      status: 'Active',
      statusColor: 'green',
      timeline: [
        { name: 'Site 1 - Calibration', date: 'Jan 10, 2025', status: 'completed', assignee: 'OEM Engineer', evidence: true },
        { name: 'Site 2 - Calibration', date: 'Jan 12, 2025', status: 'completed', assignee: 'OEM Engineer', evidence: true },
        { name: 'Site 3 - Calibration', date: 'Jan 15, 2025', status: 'in-progress', assignee: 'Pending', sla: '3 days' },
        { name: 'Tube Replacement - Site 1', date: 'Mar 20, 2025', status: 'upcoming', assignee: 'TBD', sla: null },
      ],
      financial: {
        value: '₹25,50,000',
        collected: '₹12,75,000',
        pending: '₹12,75,000',
        progress: 50,
      },
      renewalDays: 180,
      agentAlert: 'Site 3 calibration pending. SLA breach in 3 days. Escalate?',
    },
  },
};

const TheProblem: React.FC<TheProblemProps> = ({ onCtaClick, className = '' }) => {
  const [persona, setPersona] = useState<PersonaType>('buyer');
  const [industry, setIndustry] = useState<IndustryType>('equipment-maintenance');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentPainPoints = painPoints[persona];
  const currentContract = contractData[persona][industry];
  const currentIndustry = industries.find(i => i.id === industry);

  const handleCtaClick = () => {
    if (onCtaClick) {
      onCtaClick();
    } else {
      const playgroundSection = document.getElementById('playground');
      if (playgroundSection) {
        playgroundSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="w-3.5 h-3.5" />;
      case 'in-progress':
        return <Clock className="w-3.5 h-3.5" />;
      default:
        return <Circle className="w-3.5 h-3.5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white';
      case 'in-progress':
        return 'bg-amber-500 text-white';
      default:
        return 'bg-slate-200 text-slate-500';
    }
  };

  return (
    <section className={`py-16 md:py-20 bg-slate-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            The Problem with Service Contracts Today
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            See how contracts look today—and imagine what's possible.
          </p>
        </div>

        {/* Persona Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white rounded-xl p-1.5 shadow-md border border-slate-200">
            <button
              onClick={() => setPersona('buyer')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                persona === 'buyer'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-4 h-4" />
              I Manage Vendors
            </button>
            <button
              onClick={() => setPersona('seller')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                persona === 'seller'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Wrench className="w-4 h-4" />
              I Provide Services
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-10 gap-6 lg:gap-8">

          {/* Left Panel - Pain Points (30%) */}
          <div className="lg:col-span-3">
            <div className={`bg-white rounded-2xl p-6 shadow-lg border-l-4 h-full ${
              persona === 'buyer' ? 'border-l-blue-500' : 'border-l-orange-500'
            }`}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {currentPainPoints.subtitle}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-5">
                {currentPainPoints.title}
              </h3>

              <ul className="space-y-3 mb-6">
                {currentPainPoints.points.map((point, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-red-500 mt-0.5">✗</span>
                    <span className="text-slate-600 text-sm">{point}</span>
                  </li>
                ))}
              </ul>

              {/* Stat */}
              <div className={`rounded-xl p-4 ${
                persona === 'buyer' ? 'bg-blue-50' : 'bg-orange-50'
              }`}>
                <div className={`text-3xl font-extrabold mb-1 ${
                  persona === 'buyer' ? 'text-blue-600' : 'text-orange-600'
                }`}>
                  {currentPainPoints.stat.value}
                </div>
                <div className="text-xs text-slate-600">
                  {currentPainPoints.stat.label}
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleCtaClick}
                className={`w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 ${
                  persona === 'buyer'
                    ? 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/25'
                    : 'bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/25'
                }`}
              >
                <Play className="w-4 h-4" />
                See How We Solve It
              </button>
            </div>
          </div>

          {/* Right Panel - Contract Preview (70%) */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">

              {/* Contract Header */}
              <div className={`px-6 py-4 border-b border-slate-100 ${
                persona === 'buyer' ? 'bg-blue-50/50' : 'bg-orange-50/50'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      persona === 'buyer' ? 'bg-blue-100' : 'bg-orange-100'
                    }`}>
                      <FileText className={`w-5 h-5 ${
                        persona === 'buyer' ? 'text-blue-600' : 'text-orange-600'
                      }`} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">
                        {persona === 'buyer' ? currentContract.title : (currentContract as any).title}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {persona === 'buyer'
                          ? `Vendor: ${(currentContract as any).vendor}`
                          : `Client: ${(currentContract as any).client}`
                        }
                      </p>
                    </div>
                  </div>

                  {/* Industry Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      {currentIndustry && <currentIndustry.icon className="w-4 h-4 text-slate-500" />}
                      <span className="hidden sm:inline">{currentIndustry?.label}</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {dropdownOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-10">
                        {industries.map((ind) => (
                          <button
                            key={ind.id}
                            onClick={() => {
                              setIndustry(ind.id as IndustryType);
                              setDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50 transition-colors ${
                              industry === ind.id ? 'bg-slate-50 font-semibold' : ''
                            } ${ind.id === industries[0].id ? 'rounded-t-xl' : ''} ${
                              ind.id === industries[industries.length - 1].id ? 'rounded-b-xl' : ''
                            }`}
                          >
                            <ind.icon className="w-4 h-4 text-slate-500" />
                            {ind.label}
                            {industry === ind.id && <Check className="w-4 h-4 text-green-500 ml-auto" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contract Body */}
              <div className="p-6">
                {persona === 'buyer' ? (
                  // BUYER VIEW
                  <div className="grid md:grid-cols-5 gap-6">
                    {/* Service Log */}
                    <div className="md:col-span-3">
                      <h5 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        Your Service Log
                      </h5>
                      <div className="space-y-3">
                        {(currentContract as any).services.map((service: any, index: number) => (
                          <div
                            key={index}
                            className={`flex items-center gap-3 p-3 rounded-lg border ${
                              service.status === 'completed'
                                ? 'bg-green-50/50 border-green-100'
                                : service.status === 'in-progress'
                                ? 'bg-amber-50/50 border-amber-100'
                                : 'bg-slate-50 border-slate-100'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${getStatusColor(service.status)}`}>
                              {getStatusIcon(service.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-slate-900">{service.name}</div>
                              <div className="text-xs text-slate-500">{service.date}</div>
                            </div>
                            {service.evidence && (
                              <button className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:text-blue-700">
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{service.evidence}</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Investment Summary */}
                    <div className="md:col-span-2">
                      <h5 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        Your Investment
                      </h5>
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 mb-4">
                        <div className="text-xs text-slate-500 mb-1">Value Received</div>
                        <div className="text-2xl font-bold text-blue-600">{(currentContract as any).investment.received}</div>
                        <div className="text-xs text-slate-500">of {(currentContract as any).investment.total} total</div>
                        <div className="mt-3 h-2 bg-blue-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${(currentContract as any).investment.progress}%` }}
                          />
                        </div>
                        <div className="text-right text-xs text-blue-600 mt-1 font-semibold">
                          {(currentContract as any).investment.progress}% delivered
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4">
                        <div className="text-xs text-slate-500 mb-1">Next Service</div>
                        <div className="font-semibold text-slate-900">{(currentContract as any).nextService}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // SELLER VIEW
                  <div className="grid md:grid-cols-5 gap-6">
                    {/* Timeline */}
                    <div className="md:col-span-3">
                      <h5 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-orange-500" />
                        Execution Timeline
                      </h5>
                      <div className="space-y-3">
                        {(currentContract as any).timeline.map((item: any, index: number) => (
                          <div
                            key={index}
                            className={`flex items-start gap-3 p-3 rounded-lg border ${
                              item.status === 'completed'
                                ? 'bg-green-50/50 border-green-100'
                                : item.status === 'in-progress'
                                ? 'bg-amber-50/50 border-amber-100'
                                : 'bg-slate-50 border-slate-100'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${getStatusColor(item.status)}`}>
                              {getStatusIcon(item.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-slate-900">{item.name}</div>
                              <div className="text-xs text-slate-500">{item.date}</div>
                              <div className="flex flex-wrap gap-2 mt-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                                  👤 {item.assignee}
                                </span>
                                {item.evidence && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                    <Camera className="w-3 h-3" /> Evidence
                                  </span>
                                )}
                                {item.sla && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                                    <Clock className="w-3 h-3" /> {item.sla}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Financial + Agent */}
                    <div className="md:col-span-2 space-y-4">
                      {/* Financial Health */}
                      <div>
                        <h5 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-orange-500" />
                          Financial Health
                        </h5>
                        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Contract Value</span>
                            <span className="font-semibold text-slate-900">{(currentContract as any).financial.value}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Collected</span>
                            <span className="font-semibold text-green-600">{(currentContract as any).financial.collected}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Pending</span>
                            <span className="font-semibold text-amber-600">{(currentContract as any).financial.pending}</span>
                          </div>
                          <div className="pt-2">
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all duration-500"
                                style={{ width: `${(currentContract as any).financial.progress}%` }}
                              />
                            </div>
                            <div className="text-right text-xs text-green-600 mt-1 font-semibold">
                              {(currentContract as any).financial.progress}% collected
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AI Agent Alert */}
                      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-purple-700 mb-1">AI Agent Alert</div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {(currentContract as any).agentAlert}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <button className="px-3 py-1 bg-purple-500 text-white text-xs font-semibold rounded-lg hover:bg-purple-600 transition-colors">
                                Yes
                              </button>
                              <button className="px-3 py-1 bg-white text-slate-600 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                                Dismiss
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer hint */}
              <div className={`px-6 py-3 text-center text-xs border-t ${
                persona === 'buyer'
                  ? 'bg-blue-50/30 border-blue-100 text-blue-600'
                  : 'bg-orange-50/30 border-orange-100 text-orange-600'
              }`}>
                {persona === 'buyer'
                  ? '👆 This is your view as a Buyer — track services, download evidence, see value received'
                  : '👆 This is your view as a Seller — manage execution, track payments, get AI alerts'
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TheProblem;

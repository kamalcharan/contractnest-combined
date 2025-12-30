// src/pages/Dashboard.tsx
import React from 'react';
import { 
  FileText, 
  Calendar, 
  Users, 
  CheckCircle, 
  Briefcase,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

// Correct the import paths to be relative to pages directory
import StatsCard from '../components/dashboard/StatsCard';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import QuickActions from '../components/dashboard/QuickActions';
import UpcomingAppointments from '../components/dashboard/UpcomingAppointments';
import ContractsOverview from '../components/dashboard/ContractsOverview';

const Dashboard: React.FC = () => {
  // Mock stats data
  const stats = [
    { 
      title: 'Total Contracts', 
      value: 128, 
      trend: 'up', 
      change: 12, 
      icon: FileText 
    },
    { 
      title: 'Active Contracts', 
      value: 85, 
      trend: 'up', 
      change: 8, 
      icon: Briefcase 
    },
    { 
      title: 'Appointments This Month', 
      value: 42, 
      trend: 'down', 
      change: 5, 
      icon: Calendar 
    },
    { 
      title: 'Total Contacts', 
      value: 356, 
      trend: 'up', 
      change: 24, 
      icon: Users 
    },
  ];

  // Mock quick actions
  const quickActions = [
    { title: 'Create Contract', icon: FileText, href: '/contracts/create' },
    { title: 'Schedule Appointment', icon: Calendar, href: '/appointments/new' },
    { title: 'Add Contact', icon: Users, href: '/contacts/new' },
    { title: 'View Tasks', icon: CheckCircle, href: '/tasks' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatsCard 
            key={index}
            title={stat.title}
            value={stat.value}
            trend={stat.trend as 'up' | 'down' | 'neutral'}
            change={stat.change}
            icon={stat.icon}
          />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-6">
        <QuickActions actions={quickActions} className="md:col-span-2" />
        <ContractsOverview className="md:col-span-4" />
      </div>

      <div className="grid gap-6 md:grid-cols-6">
        <ActivityFeed className="md:col-span-3" />
        <UpcomingAppointments className="md:col-span-3" />
      </div>
    </div>
  );
};

export default Dashboard;
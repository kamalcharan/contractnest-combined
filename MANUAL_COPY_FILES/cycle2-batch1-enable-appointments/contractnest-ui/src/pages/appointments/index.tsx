// src/pages/appointments/index.tsx
// Appointments Page — temporary scaffold showing the existing UpcomingAppointments widget
// This will be replaced with a full appointments list/create/detail UI in Cycle 2

import React from 'react';
import { Calendar, Plus, Clock, MapPin } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import UpcomingAppointments from '@/components/dashboard/UpcomingAppointments';

const AppointmentsPage: React.FC = () => {
  const { isDarkMode, currentTheme } = useTheme();
  const colors = isDarkMode ? currentTheme.darkMode.colors : currentTheme.colors;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${colors.brand.primary}20, ${colors.brand.primary}08)` }}
          >
            <Calendar className="w-5 h-5" style={{ color: colors.brand.primary }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: colors.utility.primaryText }}>
              Appointments
            </h1>
            <p className="text-xs" style={{ color: colors.utility.secondaryText }}>
              Manage service appointments and scheduling
            </p>
          </div>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: colors.brand.primary, color: '#ffffff', opacity: 0.5 }}
          disabled
        >
          <Plus className="w-4 h-4" />
          New Appointment
        </button>
      </div>

      {/* Existing Widget (mock data) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingAppointments />

        {/* Placeholder: What's Coming */}
        <div
          className="rounded-lg border p-6 flex flex-col items-center justify-center text-center"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.secondaryText + '20',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: colors.brand.primary + '10' }}
            >
              <Clock className="w-5 h-5" style={{ color: colors.brand.primary }} />
            </div>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: colors.semantic.success + '10' }}
            >
              <MapPin className="w-5 h-5" style={{ color: colors.semantic.success }} />
            </div>
          </div>
          <h3 className="text-sm font-bold mb-1" style={{ color: colors.utility.primaryText }}>
            Full Appointments Coming Soon
          </h3>
          <p className="text-xs max-w-sm" style={{ color: colors.utility.secondaryText }}>
            Create appointments, link them to service tickets, track scheduling and completion.
            This page will be built in Cycle 2.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AppointmentsPage;

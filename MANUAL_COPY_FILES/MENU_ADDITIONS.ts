// ============================================================
// UPDATES FOR src/utils/constants/industryMenus.ts
// ============================================================

// 1. UPDATE the 'contracts' menu item (around line 66-102)
// Replace the existing contracts menu with this updated version:

{
  id: 'contracts',
  label: 'Contracts',
  icon: 'FileText',
  path: '/service-contracts/contracts',
  hasSubmenu: true,
  submenuItems: [
    {
      id: 'contracts-all',
      label: 'All Contracts',
      icon: 'FileText',
      path: '/service-contracts/contracts'
    },
    {
      id: 'contracts-create',
      label: 'Create Contract',
      icon: 'FilePlus',
      path: '/contracts/create'
    },
    {
      id: 'contracts-preview',  // NEW
      label: 'Contract Preview',
      icon: 'Eye',
      path: '/contracts/preview'
    },
    {
      id: 'contracts-pdf',  // NEW
      label: 'PDF View',
      icon: 'FileSearch',
      path: '/contracts/pdf'
    },
    {
      id: 'contracts-invite',  // NEW
      label: 'Invite Sellers',
      icon: 'UserPlus',
      path: '/contracts/invite'
    },
    {
      id: 'contracts-drafts',
      label: 'Drafts',
      icon: 'FileEdit',
      path: '/service-contracts/contracts?status=draft'
    },
    {
      id: 'contracts-pending',
      label: 'Pending Acceptance',
      icon: 'Clock',
      path: '/service-contracts/contracts?status=pending'
    },
    {
      id: 'contracts-active',
      label: 'Active Contracts',
      icon: 'CheckCircle',
      path: '/service-contracts/contracts?status=active'
    }
  ]
},

// 2. ADD NEW 'operations' menu item (add after the 'vani' menu, around line 266)

{
  id: 'operations',
  label: 'Operations',
  icon: 'Activity',
  path: '/ops/cockpit',
  hasSubmenu: true,
  submenuItems: [
    {
      id: 'ops-cockpit',
      label: 'Ops Cockpit',
      icon: 'Gauge',
      path: '/ops/cockpit'
    },
    {
      id: 'ops-activity',
      label: 'Activity Feed',
      icon: 'Activity',
      path: '/ops/activity'
    },
    {
      id: 'ops-reports',
      label: 'Reports',
      icon: 'BarChart2',
      path: '/ops/reports'
    }
  ]
},

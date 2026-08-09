// src/components/services/AdHocServiceCard.tsx - Theme Enabled Version
import React, { useState } from 'react';
import { Zap, Plus, Clock, DollarSign } from 'lucide-react';
import AdHocInvoiceDialog from '@/components/finance/AdHocInvoiceDialog';

interface AdHocServiceCardProps {
  contactId: string;
}

const AdHocServiceCard: React.FC<AdHocServiceCardProps> = ({ contactId }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg shadow-sm border border-purple-200 dark:border-purple-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        <h3 className="text-base font-semibold text-purple-800 dark:text-purple-300">
          Create an Adhoc Service
        </h3>
      </div>
      
      <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
        Create a one-time service for this contact without a formal contract. 
        Perfect for quick tasks or emergency support.
      </p>
      
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
          <Clock className="h-3 w-3" />
          <span>Quick setup - no contract needed</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
          <DollarSign className="h-3 w-3" />
          <span>Immediate billing and invoicing</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
          <Zap className="h-3 w-3" />
          <span>Perfect for urgent requests</span>
        </div>
      </div>
      
      <button
        onClick={() => setIsDialogOpen(true)}
        className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded-md transition-colors text-sm font-medium"
      >
        <Plus className="mr-2 h-4 w-4" />
        Create Adhoc Service
      </button>

      <AdHocInvoiceDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        contactId={contactId}
      />
      
      <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
        <div className="text-center">
          <div className="text-sm font-semibold text-purple-800 dark:text-purple-300">
            3
          </div>
          <div className="text-xs text-purple-600 dark:text-purple-400">
            Adhoc services this month
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdHocServiceCard;
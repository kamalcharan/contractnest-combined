// src/pages/contracts/index.tsx
import React from 'react';

const ContractsListPage: React.FC = () => {
  return (
    <div className="p-8 min-h-screen bg-background">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Contracts</h1>
        <p className="text-muted-foreground mb-8">Manage all your contracts and agreements</p>
        <div className="bg-card border border-border rounded-lg p-12">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-semibold mb-2 text-foreground">Coming Soon</h2>
          <p className="text-muted-foreground">
            Full contract management system with status tracking, filtering, and lifecycle management.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContractsListPage;
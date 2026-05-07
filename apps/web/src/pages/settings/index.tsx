import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const SettingsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-[var(--bg-primary)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-2 py-2 shrink-0 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
        <button
          onClick={() => navigate('/')}
          className="p-1 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
        >
          <ChevronLeft size={24} className="text-[var(--text-primary)]" />
        </button>
        <span className="flex-1 text-lg font-semibold text-[var(--text-primary)] ml-2">
          Settings
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <p className="text-[var(--text-secondary)]">Settings page coming soon.</p>
      </div>
    </div>
  );
};

export default SettingsPage;

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { observer, bindServices } from '@rabjs/react';
import { ChevronLeft, User, Settings, Smartphone } from 'lucide-react';
import { getZenBridge } from '../../lib/zen-bridge';
import AccountSettings from './components/account-settings';
import GeneralSettings from './components/general-settings';
import DeviceSettings from './components/device-settings';

const isElectron = getZenBridge().isElectron;

type Tab = 'account' | 'devices' | 'general';

const tabs: { id: Tab; label: string; icon: typeof User; electronOnly?: boolean }[] = [
  { id: 'account', label: '账户设置', icon: User },
  { id: 'devices', label: '设备管理', icon: Smartphone },
  { id: 'general', label: '通用设置', icon: Settings, electronOnly: true },
];

function SettingsPageInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>('account');

  // Handle navigation state for tab selection
  useEffect(() => {
    const state = location.state as { activeTab?: Tab } | null;
    if (state?.activeTab) {
      setActiveTab(state.activeTab);
      // Clear the state after using it
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const visibleTabs = tabs.filter((t) => !t.electronOnly || isElectron);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-14 flex items-center gap-2 px-4 shrink-0 border-b border-[var(--border-subtle)]">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
        >
          <ChevronLeft size={20} className="text-[var(--text-primary)]" />
        </button>
        <span className="text-base font-semibold text-[var(--text-primary)]">设置</span>
      </div>

      {/* Body: nav + content */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Secondary nav */}
        <nav className="w-44 shrink-0 border-r border-[var(--border-subtle)] py-3 px-2 flex flex-col gap-0.5">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors relative
                  ${
                    isActive
                      ? 'bg-[var(--bg-surface)] text-[var(--accent)] font-medium'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                  }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r bg-[var(--accent)]" />
                )}
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {activeTab === 'account' && <AccountSettings />}
          {activeTab === 'devices' && <DeviceSettings />}
          {activeTab === 'general' && isElectron && <GeneralSettings />}
        </div>
      </div>
    </div>
  );
}

export default bindServices(observer(SettingsPageInner), []);

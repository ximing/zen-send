import React, { useState } from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FolderArchive,
  Smartphone,
  Settings,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { isElectron } from '../../lib/env';
import { SidebarService } from './sidebar-service';
import { SocketService } from '../../services/socket.service';

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: FolderArchive, label: 'Transfers', path: '/' },
  { icon: Smartphone, label: 'Devices', path: '/devices' },
];

interface TooltipProps {
  label: string;
  position: 'right';
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ label, children }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && (
        <div
          className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50
                     px-2 py-1 text-xs text-[var(--text-primary)] whitespace-nowrap
                     bg-[var(--bg-elevated)] rounded-md shadow-md pointer-events-none"
          style={{ minWidth: 'max-content' }}
        >
          {label}
        </div>
      )}
    </div>
  );
};

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ item, isActive, onClick }) => {
  const Icon = item.icon;
  return (
    <Tooltip label={item.label} position="right">
      <button
        onClick={onClick}
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors
          ${
            isActive
              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
      >
        <Icon size={20} />
      </button>
    </Tooltip>
  );
};

const SidebarContent = observer(() => {
  const service = useService(SidebarService);
  const socketService = useService(SocketService);
  const navigate = useNavigate();
  const location = useLocation();

  console.log('[Sidebar] socketService.isConnected:', socketService.isConnected);

  const handleLogout = async () => {
    await service.logout();
    navigate('/login');
  };

  const handleNav = (path: string) => {
    navigate(path);
  };

  return (
    <aside
      className="fixed left-0 top-0 h-full w-[68px] flex flex-col
                 bg-[var(--bg-surface)]
                 z-40"
    >
      {/* Top: Logo */}
      <div className={`h-16 flex items-center justify-center mb-4 ${isElectron ? 'mt-5' : ''}`}>
        <img src={service.logoSrc} alt="Zen Send" className="w-10 h-10 object-contain" />
      </div>

      {/* Middle: Navigation */}
      <div className="flex-1 flex flex-col items-center gap-2">
        {navItems.map((item) => (
          <NavButton
            key={item.path}
            item={item}
            isActive={location.pathname === item.path}
            onClick={() => handleNav(item.path)}
          />
        ))}
      </div>

      {/* Bottom: Connection Status, Settings, Theme, User, Logout */}
      <div className="flex flex-col items-center gap-2 py-4 mt-auto">
        {/* Connection status */}
        <Tooltip label={socketService.isConnected ? 'WebSocket connected' : 'WebSocket disconnected'} position="right">
          <div
            className="w-10 h-10 flex items-center justify-center rounded-md"
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: socketService.isConnected ? '#22C55E' : '#EF4444' }}
            />
          </div>
        </Tooltip>

        {/* Settings (placeholder, disabled) */}
        <Tooltip label="Settings (coming soon)" position="right">
          <button
            disabled
            className="w-10 h-10 flex items-center justify-center rounded-md
                       text-[var(--text-disabled)] cursor-not-allowed"
          >
            <Settings size={20} />
          </button>
        </Tooltip>

        {/* Theme toggle */}
        <Tooltip label="Toggle theme" position="right">
          <button
            onClick={() => service.toggleTheme()}
            className="w-10 h-10 flex items-center justify-center rounded-md
                       hover:bg-[var(--bg-elevated)] transition-colors"
          >
            {service.themeIcon}
          </button>
        </Tooltip>

        {/* User avatar */}
        <Tooltip label={service.userEmail || 'User'} position="right">
          <div
            className="w-10 h-10 rounded-md bg-[var(--primary)] text-[var(--on-primary)]
                       flex items-center justify-center text-xs font-semibold"
          >
            {service.userInitial}
          </div>
        </Tooltip>

        {/* Logout */}
        <Tooltip label="Logout" position="right">
          <button
            onClick={handleLogout}
            className="w-10 h-10 flex items-center justify-center rounded-md
                       hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]
                       hover:text-[var(--text-primary)] transition-colors"
          >
            <LogOut size={20} />
          </button>
        </Tooltip>
      </div>
    </aside>
  );
});

export default bindServices(SidebarContent, [SidebarService]);

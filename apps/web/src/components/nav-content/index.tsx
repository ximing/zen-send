import React from 'react';
import { observer, useService } from '@rabjs/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Download, Sun, Moon, LogOut, Smartphone } from 'lucide-react';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

interface NavContentProps {
  onNavigate?: () => void;
}

function NavContentInner({ onNavigate }: NavContentProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const authService = useService(AuthService);
  const themeService = useService(ThemeService);

  const handleThemeToggle = () => {
    themeService.toggleTheme();
    onNavigate?.();
  };

  const handleLogout = async () => {
    await authService.logout();
    onNavigate?.();
    navigate('/login');
  };

  const handleDownloads = () => {
    navigate('/downloads');
    onNavigate?.();
  };

  const handleDevices = () => {
    navigate('/devices');
    onNavigate?.();
  };

  const handleHome = () => {
    navigate('/');
    onNavigate?.();
  };

  const user = authService.user;
  const serverUrl = window.location.origin;

  const navItems = [
    { path: '/', label: '首页', icon: Home, onClick: handleHome },
    { path: '/devices', label: '设备管理', icon: Smartphone, onClick: handleDevices },
    { path: '/downloads', label: '下载', icon: Download, onClick: handleDownloads },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* User Info Section */}
      <div className="flex flex-col items-center pb-6 border-b border-[var(--border-subtle)] mb-4 pt-5 px-5">
        <div className="w-16 h-16 rounded-full bg-[var(--accent-soft)] flex items-center justify-center mb-3">
          <span className="text-2xl font-semibold text-[var(--accent)]">
            {user?.email?.charAt(0).toUpperCase() ?? '?'}
          </span>
        </div>
        <span className="text-lg font-semibold text-[var(--text-primary)]">
          {user?.email?.split('@')[0] ?? 'User'}
        </span>
        <span className="text-sm text-[var(--text-secondary)]">{user?.email ?? ''}</span>
        <span className="text-xs text-[var(--text-muted)]">{serverUrl}</span>
      </div>

      {/* Navigation Items */}
      <div className="pt-2 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={item.onClick}
              className={`w-full flex items-center gap-3 py-3.5 px-3 rounded-lg transition-colors relative
                ${
                  isActive
                    ? 'bg-[var(--bg-surface-hover)] text-[var(--accent)]'
                    : 'hover:bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-[var(--accent)]" />
              )}
              <Icon size={20} />
              <span className="text-base">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="mt-auto px-3 pb-4">
        <button
          onClick={handleThemeToggle}
          className="w-full flex items-center gap-3 py-3.5 px-3 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
        >
          {themeService.resolvedTheme === 'dark' ? (
            <Sun size={20} className="text-[var(--text-primary)]" />
          ) : (
            <Moon size={20} className="text-[var(--text-primary)]" />
          )}
          <span className="text-base text-[var(--text-primary)]">
            {themeService.resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 py-3.5 px-3 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
        >
          <LogOut size={20} className="text-[var(--text-primary)]" />
          <span className="text-base text-[var(--text-primary)]">Logout</span>
        </button>
      </div>
    </div>
  );
}

export default observer(NavContentInner);

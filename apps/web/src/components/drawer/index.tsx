import React from 'react';
import { observer, useService } from '@rabjs/react';
import { useNavigate } from 'react-router-dom';
import { Download, Sun, Moon, LogOut } from 'lucide-react';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function DrawerContent({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const authService = useService(AuthService);
  const themeService = useService(ThemeService);

  const handleThemeToggle = () => {
    themeService.toggleTheme();
    onClose();
  };

  const handleLogout = async () => {
    await authService.logout();
    onClose();
    navigate('/login');
  };

  const handleDownloads = () => {
    onClose();
    navigate('/downloads');
  };

  const user = authService.user;
  const serverUrl = window.location.origin;

  return (
    <div className="flex flex-col h-full pt-[60px] px-5">
      {/* User Info Section */}
      <div className="flex flex-col items-center pb-6 border-b border-[var(--border-subtle)] mb-4">
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

      {/* Actions Section */}
      <div className="pt-2">
        <button
          onClick={handleDownloads}
          className="w-full flex items-center gap-3 py-3.5 px-1 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
        >
          <Download size={20} className="text-[var(--text-primary)]" />
          <span className="text-base text-[var(--text-primary)]">下载</span>
        </button>

        <button
          onClick={handleThemeToggle}
          className="w-full flex items-center gap-3 py-3.5 px-1 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
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
          className="w-full flex items-center gap-3 py-3.5 px-1 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
        >
          <LogOut size={20} className="text-[var(--text-primary)]" />
          <span className="text-base text-[var(--text-primary)]">Logout</span>
        </button>
      </div>
    </div>
  );
}

function DrawerInner({ isOpen, onClose }: DrawerProps) {
  return (
    <div
      className={`fixed inset-0 z-50 transition-colors duration-[250ms]
        ${isOpen ? 'visible' : 'invisible'}`}
    >
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-[250ms]
          ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[280px] bg-[var(--bg-surface)]
          transition-transform duration-[250ms] ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <DrawerContent onClose={onClose} />
      </div>
    </div>
  );
}

export default observer(DrawerInner);

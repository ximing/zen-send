import React from 'react';
import { observer, useService } from '@rabjs/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeftRight, Download, Sun, Moon, LogOut, Smartphone, Settings, Notebook } from 'lucide-react';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { NoteService } from '../../services/note.service';
import { ToastService } from '../toast/toast.service';

interface NavContentProps {
  onNavigate?: () => void;
}

function NavContentInner({ onNavigate }: NavContentProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const authService = useService(AuthService);
  const themeService = useService(ThemeService);
  const noteService = useService(NoteService);
  const toastService = useService(ToastService);

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
    { path: '/', label: '文件传输', icon: ArrowLeftRight, onClick: handleHome },
    { path: '/devices', label: '设备管理', icon: Smartphone, onClick: handleDevices },
    { path: '/downloads', label: '下载', icon: Download, onClick: handleDownloads },
    {
      path: '/settings',
      label: '设置',
      icon: Settings,
      onClick: () => {
        navigate('/settings');
        onNavigate?.();
      },
    },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* User Info Section */}
      <div
        className="flex flex-col items-center pb-6 border-b border-[var(--border-subtle)] mb-4 pt-5 px-5 cursor-pointer"
        onClick={() => {
          navigate('/settings');
          onNavigate?.();
        }}
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt="Avatar"
            className="w-16 h-16 rounded-full object-cover mb-3"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-[var(--accent-soft)] flex items-center justify-center mb-3">
            <span className="text-2xl font-semibold text-[var(--accent)]">
              {user?.email?.charAt(0).toUpperCase() ?? '?'}
            </span>
          </div>
        )}
        <span className="text-lg font-semibold text-[var(--text-primary)]">
          {user?.nickname || user?.email?.split('@')[0] || 'User'}
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

      {/* Note section */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '4px 16px' }} />
      <div className="px-3">
        <button
          onClick={() => noteService.toggleNoteList()}
          className={`w-full flex items-center gap-3 py-3.5 px-3 rounded-lg transition-colors relative
            ${
              location.pathname.startsWith('/notes')
                ? 'bg-[var(--bg-surface-hover)] text-[var(--accent)]'
                : 'hover:bg-[var(--bg-elevated)] text-[var(--text-primary)]'
            }`}
        >
          {location.pathname.startsWith('/notes') && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-[var(--accent)]" />
          )}
          <Notebook size={20} />
          <span className="text-base">笔记</span>
          <span className="ml-auto text-[10px] text-[var(--text-muted)]">
            {noteService.noteListExpanded ? '▼' : '▶'}
          </span>
        </button>

        {/* Note list (expanded) */}
        {noteService.noteListExpanded && (
          <div style={{ paddingLeft: '24px' }}>
            <div
              onClick={async () => {
                await noteService.createNote();
                if (noteService.currentNoteId) {
                  navigate(`/notes/${noteService.currentNoteId}`);
                  onNavigate?.();
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs cursor-pointer rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <span style={{ fontSize: '14px' }}>+</span> 新建笔记
            </div>
            {noteService.notes.length === 0 && (
              <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                还没有笔记，点击 + 创建
              </div>
            )}
            {noteService.notes.map((note) => (
              <div
                key={note.id}
                onClick={() => {
                  navigate(`/notes/${note.id}`);
                  onNavigate?.();
                }}
                className="flex items-center justify-between px-3 py-1.5 text-xs cursor-pointer group rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
                style={{
                  color: location.pathname === `/notes/${note.id}` ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                <span className="truncate" style={{ fontWeight: location.pathname === `/notes/${note.id}` ? 500 : 400 }}>
                  {note.title}
                </span>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const confirmed = await toastService.confirm('确定删除该笔记？');
                    if (confirmed) {
                      await noteService.deleteNote(note.id);
                      if (location.pathname === `/notes/${note.id}`) {
                        navigate('/notes');
                      }
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity px-1"
                  style={{ color: 'var(--text-muted)', fontSize: '12px' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
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

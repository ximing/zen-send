import React from 'react';
import { observer, useService } from '@rabjs/react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeftRight,
  Sun,
  Moon,
  LogOut,
  Smartphone,
  Settings,
  Notebook,
  Plus,
  Trash2,
} from 'lucide-react';
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

  const handleDevices = () => {
    navigate('/devices');
    onNavigate?.();
  };

  const handleHome = () => {
    navigate('/');
    onNavigate?.();
  };

  const user = authService.user;

  const navItems = [
    { path: '/', label: '文件传输', icon: ArrowLeftRight, onClick: handleHome },
    { path: '/devices', label: '设备管理', icon: Smartphone, onClick: handleDevices },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* User Info Section */}
      <div
        className="h-14 flex items-center gap-2 px-4 shrink-0 hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
        onClick={() => {
          navigate('/settings');
          onNavigate?.();
        }}
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt="Avatar"
            className="w-9 h-9 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[var(--accent-soft)] flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-[var(--accent)]">
              {user?.email?.charAt(0).toUpperCase() ?? '?'}
            </span>
          </div>
        )}
        <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
          {user?.nickname || user?.email?.split('@')[0] || 'User'}
        </span>
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
                    ? 'bg-[var(--bg-surface)] text-[var(--accent)]'
                    : 'hover:bg-[var(--bg-surface)] text-[var(--text-primary)]'
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
      <div className="h-3" />
      <div className="px-3">
        <button
          onClick={() => noteService.toggleNoteList()}
          className={`w-full flex items-center gap-3 py-3.5 px-3 rounded-lg transition-colors relative
            ${
              location.pathname.startsWith('/notes')
                ? 'bg-[var(--bg-surface)] text-[var(--accent)]'
                : 'hover:bg-[var(--bg-surface)] text-[var(--text-primary)]'
            }`}
        >
          {location.pathname.startsWith('/notes') && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-[var(--accent)]" />
          )}
          <Notebook size={20} />
          <span className="text-base">笔记</span>
          <Plus
            size={16}
            className="ml-auto text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            onClick={async (e) => {
              e.stopPropagation();
              await noteService.createNote();
              if (noteService.currentNoteId) {
                navigate(`/notes/${noteService.currentNoteId}`);
                onNavigate?.();
              }
            }}
          />
        </button>

        {/* Note list (expanded) */}
        {noteService.noteListExpanded && (
          <div style={{ paddingLeft: '24px' }}>
            {noteService.notes.length === 0 && (
              <div className="px-3 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
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
                className="flex items-center justify-between px-3 py-1.5 cursor-pointer group rounded-lg hover:bg-[var(--bg-surface)] transition-colors"
                style={{
                  color:
                    location.pathname === `/notes/${note.id}`
                      ? 'var(--accent)'
                      : 'var(--text-secondary)',
                }}
              >
                <span
                  className="truncate text-sm"
                  style={{ fontWeight: location.pathname === `/notes/${note.id}` ? 500 : 400 }}
                >
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
                  className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center w-6 h-6 -mr-1 rounded hover:bg-[var(--border-subtle)] hover:text-[var(--text-primary)]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Trash2 size={12} />
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
          className="w-full flex items-center gap-3 py-3.5 px-3 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
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
          onClick={() => {
            navigate('/settings');
            onNavigate?.();
          }}
          className={`w-full flex items-center gap-3 py-3.5 px-3 rounded-lg transition-colors
            ${location.pathname === '/settings' ? 'bg-[var(--bg-surface)] text-[var(--accent)]' : 'hover:bg-[var(--bg-surface)] text-[var(--text-primary)]'}`}
        >
          <Settings size={20} />
          <span className="text-base">设置</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 py-3.5 px-3 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
        >
          <LogOut size={20} className="text-[var(--text-primary)]" />
          <span className="text-base text-[var(--text-primary)]">Logout</span>
        </button>
      </div>
    </div>
  );
}

export default observer(NavContentInner);

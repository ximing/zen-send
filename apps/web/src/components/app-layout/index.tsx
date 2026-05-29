import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { observer, useService } from '@rabjs/react';
import { CheckCircle, Download, X } from 'lucide-react';
import { useIsWide } from '../../hooks/use-is-wide';
import { AuthService } from '../../services/auth.service';
import { NoteService } from '../../services/note.service';
import { HomeService } from '../../pages/home/home.service';
import { SocketService } from '../../services/socket.service';
import Sidebar from '../sidebar';
import Drawer from '../drawer';
import Header from '../header';
import Toast from '../toast';

const HEADERLESS_PATHS = ['/notes', '/devices', '/settings'];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function useShowHeader() {
  const { pathname } = useLocation();
  return !HEADERLESS_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function AppLayoutInner() {
  const isWide = useIsWide();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [downloadDrawerOpen, setDownloadDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const showHeader = useShowHeader();
  const authService = useService(AuthService);
  const noteService = useService(NoteService);
  const homeService = useService(HomeService);
  const socketService = useService(SocketService);

  // Connect socket and initialize services when authenticated
  useEffect(() => {
    if (authService.isAuthenticated) {
      socketService.connect();
      noteService.loadNoteList();
    } else {
      socketService.disconnect();
      noteService.notes = [];
      noteService.currentNote = null;
      noteService.currentNoteId = '';
    }
  }, [authService.isAuthenticated]);

  // Auth guard - redirect to login if not authenticated
  if (!authService.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Close drawer when viewport crosses to wide
  useEffect(() => {
    if (isWide && drawerOpen) {
      setDrawerOpen(false);
    }
  }, [isWide, drawerOpen]);

  const downloads = homeService.uploadingFiles.filter((f) => f.status === 'completed');

  return (
    <div className="h-screen bg-[var(--bg-primary)] flex overflow-hidden">
      {/* Sidebar: wide screen only */}
      {isWide && <Sidebar />}

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header: only on home and search pages */}
        {showHeader && (
          <Header
            onMenuPress={isWide ? undefined : () => setDrawerOpen(true)}
            onSearchPress={() => navigate('/search')}
            onDownloadPress={() => setDownloadDrawerOpen(true)}
          />
        )}

        {/* Page content */}
        <Outlet />
      </div>

      {/* Drawer: narrow screen only */}
      {!isWide && <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />}

      {/* Download Drawer: right side */}
      <div
        className={`fixed inset-0 z-50 transition-visibility ${downloadDrawerOpen ? 'visible' : 'invisible'}`}
      >
        {/* Overlay */}
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity ${downloadDrawerOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setDownloadDrawerOpen(false)}
        />
        {/* Panel */}
        <div
          style={{ width: '85%', minWidth: 380, maxWidth: '85%' }}
          className={`absolute right-0 top-0 bottom-0 bg-[var(--bg-primary)] transition-transform duration-250 ease-in-out flex flex-col ${
            downloadDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Header */}
          <div className="h-14 flex items-center justify-between px-4 shrink-0 bg-[var(--bg-surface)]">
            <span className="text-base font-semibold text-[var(--text-primary)]">下载记录</span>
            <button
              onClick={() => setDownloadDrawerOpen(false)}
              className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
            >
              <X size={20} className="text-[var(--text-muted)]" />
            </button>
          </div>

          {/* Content */}
          {downloads.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Download size={48} className="text-[var(--text-muted)] mb-3" />
              <p className="text-sm text-[var(--text-muted)]">暂无下载记录</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto p-3">
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => {
                    homeService.uploadingFiles
                      .filter((f) => f.status === 'completed')
                      .forEach((f) => homeService.removeUpload(f.id));
                  }}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  清空全部
                </button>
              </div>
              {downloads.map((download) => (
                <div
                  key={download.id}
                  className="flex items-center p-3 rounded-[10px] mb-2 bg-[var(--bg-surface)]"
                >
                  <div className="mr-3">
                    <CheckCircle size={20} className="text-[#22C55E]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {download.name}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                      下载完成 · {formatSize(download.size)}
                    </div>
                  </div>
                  <button
                    onClick={() => homeService.removeUpload(download.id)}
                    className="p-1.5 ml-1 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
                  >
                    <X size={16} className="text-[var(--text-muted)]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Toast />
    </div>
  );
}

export default observer(AppLayoutInner);

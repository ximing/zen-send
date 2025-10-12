import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { observer, useService } from '@rabjs/react';
import { useIsWide } from '../../hooks/use-is-wide';
import { AuthService } from '../../services/auth.service';
import { NoteService } from '../../services/note.service';
import Sidebar from '../sidebar';
import Drawer from '../drawer';
import Header from '../header';

const HEADERLESS_PATHS = ['/notes', '/devices', '/downloads', '/settings'];

function useShowHeader() {
  const { pathname } = useLocation();
  return !HEADERLESS_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function AppLayoutInner() {
  const isWide = useIsWide();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const showHeader = useShowHeader();
  const authService = useService(AuthService);
  const noteService = useService(NoteService);

  // Initialize note service when authenticated
  useEffect(() => {
    if (authService.isAuthenticated) {
      noteService.loadNoteList();
    } else {
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
          />
        )}

        {/* Page content */}
        <Outlet />
      </div>

      {/* Drawer: narrow screen only */}
      {!isWide && <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />}
    </div>
  );
}

export default observer(AppLayoutInner);

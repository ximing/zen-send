import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { observer, useService } from '@rabjs/react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState, Prec, StateEffect } from '@codemirror/state';
import { NoteService } from '../../services/note.service';
import { NoteCollabService } from '../../services/note-collab.service';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { useTheme } from '../../theme/theme-provider';
import {
  createEditorExtensions,
  createEditorTheme,
  themeCompartment,
  createCollabExtensions,
} from '../notes/components/note-editor/editor-setup';
import { hashToColor } from '../notes/components/note-editor/collab-colors';
import {
  blockState,
  DEFAULT_BLOCK_CONTENT,
  migrateFromMarkdownFormat,
} from '../notes/components/note-editor/block-state';
import {
  blockDecorations,
  blockChangeFilter,
  blockAtomicRanges,
  preventSelectionBeforeFirstBlock,
  copiedHighlightState,
  copiedHighlightPlugin,
  updateCreatedOnEmptyBlock,
} from '../notes/components/note-editor/block-decoration';
import { blockLayer } from '../notes/components/note-editor/block-layer';
import { blockLineNumbers } from '../notes/components/note-editor/block-line-numbers';
import { blockKeymap, emptyBlockSelected } from '../notes/components/note-editor/block-commands';
import type { SharedNoteDetail } from '@zen-send/dto';

const GUEST_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#F7DC6F'];

function randomGuestName() {
  return `访客${Math.floor(1000 + Math.random() * 9000)}`;
}

function randomGuestColor() {
  return GUEST_COLORS[Math.floor(Math.random() * GUEST_COLORS.length)];
}

function SharedNotePage() {
  const { token } = useParams<{ token: string }>();
  const noteService = useService(NoteService);
  const noteCollabService = useService(NoteCollabService);
  const socketService = useService(SocketService);
  const authService = useService(AuthService);
  const { resolvedTheme } = useTheme();

  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const [sharedNote, setSharedNote] = useState<SharedNoteDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 访客模式：用 shareToken 建立 socket 连接（无需 JWT）
  useEffect(() => {
    if (!socketService.isConnected && token) {
      socketService.connect(token);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    noteService
      .getSharedNote(token)
      .then((note) => {
        setSharedNote(note);
        setLoading(false);
      })
      .catch(() => {
        setError('链接已失效或笔记不存在');
        setLoading(false);
      });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
      noteCollabService.leaveNote();
    };
  }, [token]);

  useEffect(() => {
    if (!sharedNote || !editorRef.current || !token) return;

    const content = migrateFromMarkdownFormat(sharedNote.content || DEFAULT_BLOCK_CONTENT);

    const state = EditorState.create({
      doc: content,
      extensions: [
        ...createEditorExtensions(resolvedTheme === 'dark'),
        blockState,
        ...blockLineNumbers,
        blockDecorations,
        blockChangeFilter,
        blockAtomicRanges,
        preventSelectionBeforeFirstBlock,
        updateCreatedOnEmptyBlock,
        emptyBlockSelected,
        blockLayer,
        copiedHighlightState,
        copiedHighlightPlugin,
        Prec.high(keymap.of(blockKeymap)),
      ],
    });

    const view = new EditorView({ state, parent: editorRef.current });
    viewRef.current = view;

    const userName = authService.user?.nickname ?? authService.user?.email ?? randomGuestName();
    const userColor = authService.user ? hashToColor(authService.user.id) : randomGuestColor();

    const { ytext, awareness } = noteCollabService.joinNote(
      sharedNote.id,
      userName,
      userColor,
      token
    );
    view.dispatch({
      effects: StateEffect.appendConfig.of(createCollabExtensions(ytext, awareness)),
    });

    return () => {
      noteCollabService.leaveNote();
      view.destroy();
      viewRef.current = null;
    };
  }, [sharedNote]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompartment.reconfigure(createEditorTheme(resolvedTheme === 'dark')),
    });
  }, [resolvedTheme]);

  if (loading) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}
      >
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          加载中...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex h-screen flex-col items-center justify-center gap-3"
        style={{ background: 'var(--bg-primary)' }}
      >
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {error}
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col" style={{ background: 'var(--bg-primary)' }}>
      <div
        className="flex h-14 shrink-0 items-center px-4"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {sharedNote?.title || '共享笔记'}
        </span>
        <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          · 协作模式
        </span>
      </div>
      <div ref={editorRef} className="flex-1 overflow-hidden" />
    </div>
  );
}

export default observer(SharedNotePage);

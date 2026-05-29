import { useEffect, useRef, useState, useCallback } from 'react';
import { observer, useService } from '@rabjs/react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState, Prec, StateEffect } from '@codemirror/state';
import { ChevronLeft, ChevronDown, Share2 } from 'lucide-react';
import ShareDialog from '../share-dialog/share-dialog';
import { NoteService } from '../../../../services/note.service';
import { NoteCollabService } from '../../../../services/note-collab.service';
import { AuthService } from '../../../../services/auth.service';
import { ToastService } from '../../../../components/toast/toast.service';
import { useTheme } from '../../../../theme/theme-provider';
import {
  createEditorExtensions,
  createEditorTheme,
  themeCompartment,
  createCollabExtensions,
} from './editor-setup';
import { hashToColor } from './collab-colors';
import { blockState, getActiveBlock } from './block-state';
import {
  blockKeymap,
  getLanguageList,
  changeBlockLanguage,
  emptyBlockSelected,
} from './block-commands';
import {
  blockDecorations,
  blockChangeFilter,
  blockAtomicRanges,
  preventSelectionBeforeFirstBlock,
  copiedHighlightState,
  copiedHighlightPlugin,
  updateCreatedOnEmptyBlock,
} from './block-decoration';
import { blockLayer } from './block-layer';
import { blockLineNumbers } from './block-line-numbers';
import { useIsWide } from '../../../../hooks/use-is-wide';
import { useNavigate } from 'react-router-dom';

function NoteEditorInner() {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteService = useService(NoteService);
  const noteCollabService = useService(NoteCollabService);
  const authService = useService(AuthService);
  const toastService = useService(ToastService);
  const { resolvedTheme } = useTheme();
  const isWide = useIsWide();
  const navigate = useNavigate();

  const [activeBlock, setActiveBlock] = useState<{ language: string } | null>(null);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const prevActiveBlockRef = useRef<{ language: string } | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleSaveNow = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (viewRef.current && noteService.currentNote) {
      const doc = viewRef.current.state.doc.toString();
      const title = noteService.shouldAutoExtractTitle(noteService.currentNote.id)
        ? noteService.extractTitleFromContent(doc)
        : noteService.currentNote.title;
      noteService.saveNote(noteService.currentNote.id, doc, title);
    }
  }, [noteService]);

  useEffect(() => {
    if (!editorRef.current || !noteService.currentNote) return;

    if (saveTimeoutRef.current) {
      handleSaveNow();
    }

    const noteId = noteService.currentNote.id;
    const currentSaveTimeoutRef = saveTimeoutRef;
    const userName = authService.user?.nickname ?? authService.user?.email ?? 'Anonymous';
    const userColor = hashToColor(authService.user?.id ?? '');
    const { ytext, awareness } = noteCollabService.joinNote(noteId, userName, userColor);

    // CM6 初始内容必须为空，yCollab 会在 Yjs sync 后把 YText 内容推入 CM6
    // 不能用 DB content 初始化，否则与 YText sync 叠加会产生重复内容
    const state = EditorState.create({
      doc: '',
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
        createCollabExtensions(ytext, awareness),
        Prec.high(keymap.of(blockKeymap)),
        keymap.of([
          {
            key: 'Mod-s',
            run: () => true,
          },
          {
            key: 'Mod-l',
            run: () => {
              setLangDropdownOpen((prev) => !prev);
              return true;
            },
          },
        ]),
        EditorView.updateListener.of((update) => {
          if (update.selectionSet || update.docChanged) {
            const block = getActiveBlock(update.state);
            if (block) {
              const newBlock = { language: block.language.name };
              const prev = prevActiveBlockRef.current;
              if (!prev || prev.language !== newBlock.language) {
                prevActiveBlockRef.current = newBlock;
                setActiveBlock(newBlock);
              }
            }
          }
          // Yjs 负责内容持久化；这里只在 title 自动提取时保存 title
          if (update.docChanged) {
            if (currentSaveTimeoutRef.current) clearTimeout(currentSaveTimeoutRef.current);
            currentSaveTimeoutRef.current = setTimeout(() => {
              if (!viewRef.current || !noteService.currentNote) return;
              if (!noteService.shouldAutoExtractTitle(noteService.currentNote.id)) return;
              const docText = viewRef.current.state.doc.toString();
              const title = noteService.extractTitleFromContent(docText);
              if (title !== noteService.currentNote.title) {
                noteService.saveNote(noteService.currentNote.id, docText, title);
              }
            }, 2000);
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: editorRef.current });
    viewRef.current = view;

    return () => {
      noteCollabService.leaveNote();
      handleSaveNow();
      view.destroy();
      viewRef.current = null;
    };
  }, [noteService.currentNoteId]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompartment.reconfigure(createEditorTheme(resolvedTheme === 'dark')),
    });
  }, [resolvedTheme]);

  useEffect(() => {
    noteService._saveNowFn = handleSaveNow;
    return () => {
      noteService._saveNowFn = null;
    };
  }, [handleSaveNow, noteService]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        toastService.show('已保存', 'success');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [toastService]);

  useEffect(() => {
    if (!langDropdownOpen) return;
    const clickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.lang-dropdown-container')) {
        setLangDropdownOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', clickHandler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', clickHandler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [langDropdownOpen]);

  const blocks = viewRef.current ? viewRef.current.state.field(blockState) : [];
  const blockCount = blocks.length;
  const saveStatusText = {
    idle: '',
    saving: '保存中...',
    saved: '已保存',
    error: '保存失败',
  }[noteService.saveStatus];

  const languages = getLanguageList();
  const displayLanguage = activeBlock ? activeBlock.language.toUpperCase() : '';

  const handleLanguageSelect = (lang: string) => {
    const view = viewRef.current;
    if (!view || !activeBlock) return;

    changeBlockLanguage(view, lang);
    setLangDropdownOpen(false);
  };

  const startEditingTitle = () => {
    if (!noteService.currentNote) return;
    setEditTitle(noteService.currentNote.title);
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 0);
  };

  const commitTitle = () => {
    setIsEditingTitle(false);
    const trimmed = editTitle.trim();
    if (!trimmed || !noteService.currentNote || !noteService.currentNoteId) return;
    if (trimmed === noteService.currentNote.title) return;
    noteService.markTitleManuallyEdited(noteService.currentNoteId);
    noteService.saveNote(noteService.currentNoteId, noteService.currentNote.content || '', trimmed);
  };

  const connectionStatus = noteCollabService.connectionStatus;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* 离线 / 重连 Banner */}
      {connectionStatus !== 'connected' && (
        <div
          className="flex items-center justify-center px-4 py-1 text-xs"
          style={{
            background:
              connectionStatus === 'reconnecting' ? 'var(--color-warning)' : 'var(--color-error)',
            color: '#fff',
          }}
        >
          {connectionStatus === 'disconnected'
            ? '连接已断开，编辑内容将在重连后自动同步'
            : '正在重新连接...'}
        </div>
      )}
      <div
        className="note-toolbar h-14 flex items-center justify-between px-4 py-2"
        style={{
          background: 'var(--bg-surface)',
        }}
      >
        <div className="flex items-center gap-2">
          {!isWide && (
            <button onClick={() => navigate('/notes')} style={{ color: 'var(--text-secondary)' }}>
              <ChevronLeft size={16} />
            </button>
          )}
          <span
            className="text-xs flex items-center gap-1.5"
            style={{ color: 'var(--text-secondary)' }}
          >
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                className="text-xs bg-transparent outline-none border-b"
                style={{
                  color: 'var(--text-primary)',
                  borderColor: 'var(--accent)',
                  width: Math.max(80, editTitle.length * 8),
                }}
              />
            ) : (
              <span
                onClick={startEditingTitle}
                className="cursor-pointer hover:underline underline-offset-2 decoration-[var(--border-subtle)]"
              >
                {noteService.currentNote?.title}
              </span>
            )}
            · {blockCount} 个块
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* 在线协作者头像堆叠 */}
          {noteCollabService.collaborators.length > 0 && (
            <div className="flex items-center" style={{ marginRight: -4 }}>
              {noteCollabService.collaborators.slice(0, 5).map((collab) => (
                <div
                  key={collab.clientId}
                  title={collab.name}
                  className="flex items-center justify-center rounded-full text-white text-xs font-medium shrink-0"
                  style={{
                    width: 22,
                    height: 22,
                    backgroundColor: collab.color,
                    border: '2px solid var(--bg-surface)',
                    marginLeft: -6,
                    fontSize: 9,
                  }}
                >
                  {collab.name.slice(0, 1).toUpperCase()}
                </div>
              ))}
              {noteCollabService.collaborators.length > 5 && (
                <div
                  className="flex items-center justify-center rounded-full text-xs font-medium shrink-0"
                  style={{
                    width: 22,
                    height: 22,
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                    border: '2px solid var(--bg-surface)',
                    marginLeft: -6,
                    fontSize: 9,
                  }}
                >
                  +{noteCollabService.collaborators.length - 5}
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => setShareDialogOpen(true)}
            className="rounded px-2 py-1 flex items-center"
            style={{
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-primary)',
            }}
            title="分享笔记"
          >
            <Share2 size={13} />
          </button>
          <div className="lang-dropdown-container relative">
            <button
              onClick={() => setLangDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs"
              style={{
                color: 'var(--accent)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-primary)',
              }}
            >
              {displayLanguage}
              <ChevronDown size={12} />
            </button>
            {langDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  zIndex: 1000,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  padding: '4px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  minWidth: '120px',
                }}
              >
                {languages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageSelect(lang)}
                    className="lang-dropdown-item block w-full text-left px-3 py-1.5 text-xs rounded"
                    style={{
                      color:
                        activeBlock?.language === lang ? 'var(--accent)' : 'var(--text-primary)',
                      fontWeight: activeBlock?.language === lang ? 600 : 400,
                    }}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
          {saveStatusText && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {saveStatusText}
            </span>
          )}
        </div>
      </div>
      <div ref={editorRef} className="flex-1 overflow-hidden" />
      {noteService.currentNoteId && (
        <ShareDialog
          noteId={noteService.currentNoteId}
          open={shareDialogOpen}
          onClose={() => setShareDialogOpen(false)}
        />
      )}
    </div>
  );
}

export default observer(NoteEditorInner);

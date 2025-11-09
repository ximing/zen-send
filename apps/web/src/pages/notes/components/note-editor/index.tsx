import { useEffect, useRef, useState, useCallback } from 'react';
import { observer, useService } from '@rabjs/react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState, Prec } from '@codemirror/state';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import { NoteService } from '../../../../services/note.service';
import { ThemeService } from '../../../../services/theme.service';
import { createEditorExtensions, createEditorTheme, themeCompartment } from './editor-setup';
import { blockState, getActiveBlock, DEFAULT_BLOCK_CONTENT, migrateFromMarkdownFormat } from './block-state';
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
  const themeService = useService(ThemeService);
  const isWide = useIsWide();
  const navigate = useNavigate();

  const [activeBlock, setActiveBlock] = useState<{ language: string } | null>(null);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
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

    const content = migrateFromMarkdownFormat(noteService.currentNote.content || DEFAULT_BLOCK_CONTENT);
    const currentSaveTimeoutRef = saveTimeoutRef;

    const state = EditorState.create({
      doc: content,
      extensions: [
        ...createEditorExtensions(themeService.resolvedTheme === 'dark'),
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
        keymap.of([
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
          if (update.docChanged) {
            noteService.saveStatus = 'idle';
            if (currentSaveTimeoutRef.current) clearTimeout(currentSaveTimeoutRef.current);
            currentSaveTimeoutRef.current = setTimeout(() => {
              if (!viewRef.current || !noteService.currentNote) return;
              const doc = viewRef.current.state.doc.toString();
              const title = noteService.shouldAutoExtractTitle(noteService.currentNote.id)
                ? noteService.extractTitleFromContent(doc)
                : noteService.currentNote.title;
              noteService.saveNote(noteService.currentNote.id, doc, title);
            }, 2000);
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      handleSaveNow();
      view.destroy();
      viewRef.current = null;
    };
  }, [noteService.currentNoteId]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompartment.reconfigure(
        createEditorTheme(themeService.resolvedTheme === 'dark'),
      ),
    });
  }, [themeService.resolvedTheme]);

  useEffect(() => {
    noteService._saveNowFn = handleSaveNow;
    return () => {
      noteService._saveNowFn = null;
    };
  }, [handleSaveNow, noteService]);

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

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div
        className="note-toolbar h-14 flex items-center justify-between px-4 py-2"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
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
    </div>
  );
}

export default observer(NoteEditorInner);

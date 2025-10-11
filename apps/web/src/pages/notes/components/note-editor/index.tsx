import { useEffect, useRef, useState, useCallback } from 'react';
import { observer, useService } from '@rabjs/react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState, Prec } from '@codemirror/state';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import { NoteService } from '../../../../services/note.service';
import { createEditorExtensions } from './editor-setup';
import { blockState, getActiveBlock } from './block-state';
import { blockKeymap, getLanguageList, convertBlockToCode, convertBlockToMarkdown, changeBlockLanguage } from './block-commands';
import { blockDecorations, blockChangeFilter, blockAtomicRanges, copiedHighlightState, copiedHighlightPlugin } from './block-decoration';
import { blockLayer } from './block-layer';
import { blockLineNumbers } from './block-line-numbers';
import { useIsWide } from '../../../../hooks/use-is-wide';
import { useNavigate } from 'react-router-dom';

function NoteEditorInner() {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteService = useService(NoteService);
  const isWide = useIsWide();
  const navigate = useNavigate();

  const [activeBlock, setActiveBlock] = useState<{ type: string; language: string } | null>(null);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const prevActiveBlockRef = useRef<{ type: string; language: string } | null>(null);

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

    const content = noteService.currentNote.content || '\n';
    const currentSaveTimeoutRef = saveTimeoutRef;

    const state = EditorState.create({
      doc: content,
      extensions: [
        ...createEditorExtensions(),
        blockState,
        blockLineNumbers,
        blockDecorations,
        blockChangeFilter,
        blockAtomicRanges,
        blockLayer,
        copiedHighlightState,
        copiedHighlightPlugin,
        // Block keymap with highest precedence — must run before default keymaps
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
              const newBlock = { type: block.type, language: block.language };
              const prev = prevActiveBlockRef.current;
              if (!prev || prev.type !== newBlock.type || prev.language !== newBlock.language) {
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
    noteService._saveNowFn = handleSaveNow;
    return () => {
      noteService._saveNowFn = null;
    };
  }, [handleSaveNow, noteService]);

  // Close dropdown when clicking outside or pressing Escape
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
  const displayLanguage = activeBlock
    ? activeBlock.type === 'markdown'
      ? 'MARKDOWN'
      : activeBlock.language.toUpperCase()
    : '';

  const handleLanguageSelect = (lang: string) => {
    const view = viewRef.current;
    if (!view || !activeBlock) return;

    if (lang === 'markdown') {
      if (activeBlock.type === 'code') {
        convertBlockToMarkdown(view);
      }
    } else {
      if (activeBlock.type === 'markdown') {
        convertBlockToCode(view, lang);
      } else {
        changeBlockLanguage(view, lang);
      }
    }
    setLangDropdownOpen(false);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
        }}
      >
        <div className="flex items-center gap-2">
          {!isWide && (
            <button
              onClick={() => navigate('/notes')}
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {noteService.currentNote?.title} · {blockCount} 个块
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="lang-dropdown-container relative">
            <button
              onClick={() => setLangDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-xs"
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
                <button
                  onClick={() => handleLanguageSelect('markdown')}
                  className="lang-dropdown-item block w-full text-left px-3 py-1.5 text-xs rounded"
                  style={{
                    color: activeBlock?.type === 'markdown' ? 'var(--accent)' : 'var(--text-primary)',
                    fontWeight: activeBlock?.type === 'markdown' ? 600 : 400,
                  }}
                >
                  MARKDOWN
                </button>
                {languages
                  .filter((l) => l !== 'markdown')
                  .map((lang) => (
                    <button
                      key={lang}
                      onClick={() => handleLanguageSelect(lang)}
                      className="lang-dropdown-item block w-full text-left px-3 py-1.5 text-xs rounded"
                      style={{
                        color: activeBlock?.type === 'code' && activeBlock?.language === lang ? 'var(--accent)' : 'var(--text-primary)',
                        fontWeight: activeBlock?.type === 'code' && activeBlock?.language === lang ? 600 : 400,
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

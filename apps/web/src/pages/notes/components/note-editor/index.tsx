import { useEffect, useRef, useState, useCallback } from 'react';
import { observer, useService } from '@rabjs/react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState, Prec } from '@codemirror/state';
import { ChevronLeft } from 'lucide-react';
import { NoteService } from '../../../../services/note.service';
import { createEditorExtensions } from './editor-setup';
import { blockState, getActiveBlock } from './block-state';
import { blockKeymap } from './block-commands';
import { blockDecorations, blockChangeFilter, blockAtomicRanges } from './block-decoration';
import { blockLayer } from './block-layer';
import { blockLineNumbers } from './block-line-numbers';
import LanguageSelector from './language-selector';
import { useIsWide } from '../../../../hooks/use-is-wide';
import { useNavigate } from 'react-router-dom';

function NoteEditorInner() {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteService = useService(NoteService);
  const isWide = useIsWide();
  const navigate = useNavigate();

  const [langSelectorOpen, setLangSelectorOpen] = useState(false);
  const [langSelectorPos, setLangSelectorPos] = useState({ top: 0, left: 0 });

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
        // Block keymap with highest precedence — must run before default keymaps
        Prec.high(keymap.of(blockKeymap)),
        keymap.of([
          {
            key: 'Mod-l',
            run: (view) => {
              const block = getActiveBlock(view.state);
              if (block?.type !== 'code') return false;
              const coords = view.coordsAtPos(view.state.selection.main.from);
              if (coords) {
                setLangSelectorPos({ top: coords.bottom + 4, left: coords.left });
                setLangSelectorOpen(true);
              }
              return true;
            },
          },
        ]),
        EditorView.updateListener.of((update) => {
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

  const blocks = viewRef.current ? viewRef.current.state.field(blockState) : [];
  const blockCount = blocks.length;
  const saveStatusText = {
    idle: '',
    saving: '保存中...',
    saved: '已保存',
    error: '保存失败',
  }[noteService.saveStatus];

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
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            ⌘Enter 新增块 · ⌘L 切换语言
          </span>
          {saveStatusText && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {saveStatusText}
            </span>
          )}
        </div>
      </div>
      <div ref={editorRef} className="flex-1 overflow-hidden" />
      {langSelectorOpen && (
        <LanguageSelector
          view={viewRef.current}
          position={langSelectorPos}
          onClose={() => setLangSelectorOpen(false)}
        />
      )}
    </div>
  );
}

export default observer(NoteEditorInner);

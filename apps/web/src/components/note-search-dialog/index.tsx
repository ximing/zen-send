import { useEffect, useRef, useState } from 'react';
import { observer, useService } from '@rabjs/react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  FileText,
  CornerDownRight,
  Loader2,
  FileSearch,
  SearchX,
  CircleAlert,
} from 'lucide-react';
import type { NoteSearchHit, NoteSearchMatch } from '@zen-send/dto';
import { NoteSearchService } from '../../services/note-search.service';

export function searchShortcutLabel(): string {
  if (typeof navigator === 'undefined') return 'Ctrl+K';
  return /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl+K';
}

function Keycap({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[5px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-1 text-[10px] font-medium leading-none text-[var(--text-secondary)]"
      style={{ fontFamily: 'inherit' }}
    >
      {children}
    </kbd>
  );
}

function PaletteState({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-12">
      <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)]">
        {icon}
      </div>
      <p className="text-[13px] text-[var(--text-secondary)]">{title}</p>
      {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

function highlightQuery(text: string, query: string) {
  const needle = query.trim();
  if (!needle) return text;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'ig'));
  return parts.map((part, index) =>
    part.toLowerCase() === needle.toLowerCase() ? (
      <mark key={index} className="bg-transparent font-semibold" style={{ color: 'var(--accent)' }}>
        {part}
      </mark>
    ) : (
      <span key={index}>{part}</span>
    )
  );
}

interface PaletteItem {
  hit: NoteSearchHit;
  match?: NoteSearchMatch;
}

function NoteSearchPalette() {
  const navigate = useNavigate();
  const noteSearch = useService(NoteSearchService);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const items: PaletteItem[] = [];
  for (const hit of noteSearch.hits) {
    items.push({ hit });
    for (const match of hit.matches) items.push({ hit, match });
  }
  const safeIndex = items.length === 0 ? 0 : Math.min(activeIndex, items.length - 1);
  const matchCount = noteSearch.hits.reduce((sum, hit) => sum + hit.matches.length, 0);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      noteSearch.closePalette();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [noteSearch]);

  useEffect(() => {
    setActiveIndex(0);
  }, [noteSearch.query]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [safeIndex, noteSearch.hits.length]);

  const openItem = (item: PaletteItem | undefined) => {
    if (!item) return;
    noteSearch.openHit(item.hit, item.match);
    noteSearch.closePalette();
    navigate(`/notes/${item.hit.id}`);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[14vh]">
      <button
        type="button"
        aria-label="关闭搜索"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        style={{ outline: 'none', animation: 'note-palette-fade 160ms ease-out' }}
        onClick={() => noteSearch.closePalette()}
      />
      <div
        role="dialog"
        aria-label="搜索笔记"
        className="relative flex max-h-[min(560px,72vh)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
        style={{
          boxShadow: '0 24px 64px -16px rgba(28, 25, 23, 0.28), 0 4px 16px rgba(28, 25, 23, 0.08)',
          animation: 'note-palette-in 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* 输入行 */}
        <div className="flex h-[52px] shrink-0 items-center gap-3 px-4">
          <Search size={16} className="shrink-0 text-[var(--text-muted)]" />
          <input
            ref={inputRef}
            value={noteSearch.query}
            onChange={(event) => noteSearch.setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                noteSearch.closePalette();
                return;
              }
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveIndex(Math.min(safeIndex + 1, Math.max(items.length - 1, 0)));
                return;
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex(Math.max(safeIndex - 1, 0));
                return;
              }
              if (event.key === 'Enter') {
                event.preventDefault();
                openItem(items[safeIndex]);
              }
            }}
            placeholder="搜索笔记标题或正文…"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
            style={{ outline: 'none' }}
          />
          {noteSearch.searching ? (
            <Loader2 size={14} className="shrink-0 animate-spin text-[var(--text-muted)]" />
          ) : (
            <Keycap>esc</Keycap>
          )}
        </div>

        <div className="mx-4 h-px shrink-0 bg-[var(--border-subtle)]" />

        {/* 结果列表 */}
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {!noteSearch.hasQuery && (
            <PaletteState
              icon={<FileSearch size={18} />}
              title="输入标题或正文中的关键词"
              hint="回车打开第一条结果"
            />
          )}
          {noteSearch.error && (
            <PaletteState icon={<CircleAlert size={18} />} title={noteSearch.error} />
          )}
          {noteSearch.hasQuery &&
            noteSearch.searching &&
            noteSearch.hits.length === 0 &&
            !noteSearch.error && <PaletteState icon={<Search size={18} />} title="搜索中…" />}
          {noteSearch.isEmpty && (
            <PaletteState
              icon={<SearchX size={18} />}
              title={`没有找到「${noteSearch.query.trim()}」相关的笔记`}
              hint="换个关键词试试"
            />
          )}
          {items.map((item, index) => {
            const selected = index === safeIndex;
            const label = item.match ? item.match.snippet : item.hit.title || '未命名笔记';
            return (
              <button
                key={
                  item.match ? `${item.hit.id}-${item.match.start}-${item.match.end}` : item.hit.id
                }
                ref={selected ? activeRef : undefined}
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => openItem(item)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 text-left transition-colors ${
                  item.match ? 'py-1.5' : 'py-2'
                } ${selected ? 'bg-[var(--accent-soft)]' : ''}`}
                style={{ outline: 'none' }}
              >
                <span className="flex w-[14px] shrink-0 items-center justify-center">
                  {item.match ? (
                    <CornerDownRight
                      size={12}
                      style={{ color: selected ? 'var(--accent)' : 'var(--text-muted)' }}
                    />
                  ) : (
                    <FileText
                      size={14}
                      style={{ color: selected ? 'var(--accent)' : 'var(--text-muted)' }}
                    />
                  )}
                </span>
                <span
                  className={`truncate ${item.match ? 'text-xs' : 'text-sm'}`}
                  style={{
                    color: item.match ? 'var(--text-secondary)' : 'var(--text-primary)',
                    fontWeight: item.match ? 400 : 450,
                  }}
                >
                  {highlightQuery(label, noteSearch.query)}
                </span>
              </button>
            );
          })}
        </div>

        {/* 底部提示栏 */}
        <div className="flex shrink-0 items-center justify-between border-t border-[var(--border-subtle)] px-4 py-2">
          <span className="text-[11px] text-[var(--text-muted)]">
            {noteSearch.hasQuery &&
              !noteSearch.error &&
              (noteSearch.searching
                ? '搜索中…'
                : `${noteSearch.hits.length} 篇笔记 · ${matchCount} 处匹配`)}
          </span>
          <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <Keycap>↑</Keycap>
              <Keycap>↓</Keycap>
              选择
            </span>
            <span className="flex items-center gap-1">
              <Keycap>↵</Keycap>
              打开
            </span>
            <span className="flex items-center gap-1">
              <Keycap>esc</Keycap>
              关闭
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const ObservedPalette = observer(NoteSearchPalette);

function NoteSearchDialogInner() {
  const noteSearch = useService(NoteSearchService);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.isComposing || event.repeat) return;
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || event.altKey || event.shiftKey || event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      event.stopPropagation();
      noteSearch.togglePalette();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [noteSearch]);

  if (!noteSearch.paletteOpen) return null;
  return <ObservedPalette />;
}

export default observer(NoteSearchDialogInner);

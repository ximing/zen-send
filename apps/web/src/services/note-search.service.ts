import { Service } from '@rabjs/react';
import type { NoteSearchHit, NoteSearchMatch } from '@zen-send/dto';
import { ApiService } from './api.service';

const DEBOUNCE_MS = 300;

function isAbortError(err: unknown): boolean {
  if (
    typeof DOMException !== 'undefined' &&
    err instanceof DOMException &&
    err.name === 'AbortError'
  ) {
    return true;
  }
  return err instanceof Error && err.name === 'AbortError';
}

export class NoteSearchService extends Service {
  query = '';
  hits: NoteSearchHit[] = [];
  error: string | null = null;
  pendingNoteId = '';
  pendingQuery = '';
  pendingStart: number | null = null;
  pendingEnd: number | null = null;
  jumpToken = 0;
  paletteOpen = false;
  debounceTimer: ReturnType<typeof setTimeout> | null = null;
  abort: AbortController | null = null;
  seq = 0;
  /** Own field so an empty result re-renders. `$model.runSearch.loading` does not. */
  pendingCount = 0;

  private get apiService() {
    return this.resolve(ApiService);
  }

  get hasQuery(): boolean {
    return this.query.trim().length > 0;
  }

  get searching(): boolean {
    return this.pendingCount > 0 || this.debounceTimer !== null;
  }

  get isEmpty(): boolean {
    return this.hasQuery && !this.searching && !this.error && this.hits.length === 0;
  }

  setQuery(value: string): void {
    this.query = value;
    this.schedule();
  }

  clear(): void {
    this.query = '';
    this.schedule();
  }

  openPalette(): void {
    this.paletteOpen = true;
  }

  closePalette(): void {
    this.paletteOpen = false;
    this.clear();
  }

  togglePalette(): void {
    if (this.paletteOpen) this.closePalette();
    else this.openPalette();
  }

  openHit(hit: NoteSearchHit, match?: NoteSearchMatch): void {
    const chosen = match ?? hit.matches[0];
    this.pendingNoteId = hit.id;
    this.pendingQuery = this.query.trim();
    this.pendingStart = chosen ? chosen.start : null;
    this.pendingEnd = chosen ? chosen.end : null;
    this.jumpToken += 1;
  }

  /** Embed route arms a one-shot jump from the WebView URL. */
  arm(noteId: string, query: string, start: number | null, end: number | null): void {
    const trimmed = query.trim();
    if (!noteId || !trimmed) return;
    this.pendingNoteId = noteId;
    this.pendingQuery = trimmed;
    this.pendingStart = start;
    this.pendingEnd = end;
    this.jumpToken += 1;
  }

  takePending(noteId: string): { query: string; start: number | null; end: number | null } | null {
    if (!this.pendingQuery || this.pendingNoteId !== noteId) return null;
    const pending = {
      query: this.pendingQuery,
      start: this.pendingStart,
      end: this.pendingEnd,
    };
    this.pendingQuery = '';
    this.pendingNoteId = '';
    this.pendingStart = null;
    this.pendingEnd = null;
    return pending;
  }

  schedule(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    const q = this.query.trim();
    if (!q) {
      this.seq += 1;
      this.abort?.abort();
      this.abort = null;
      this.hits = [];
      this.error = null;
      return;
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.runSearch(q);
    }, DEBOUNCE_MS);
  }

  async runSearch(q: string): Promise<void> {
    const trimmed = q.trim();
    if (!trimmed) return;
    this.seq += 1;
    const seq = this.seq;
    this.abort?.abort();
    const ac = new AbortController();
    this.abort = ac;
    this.error = null;
    this.pendingCount += 1;
    try {
      const data = await this.apiService.get<NoteSearchHit[]>(
        `/api/notes/search?q=${encodeURIComponent(trimmed)}`,
        { signal: ac.signal }
      );
      if (seq !== this.seq) return;
      this.hits = data;
    } catch (err) {
      if (seq !== this.seq || ac.signal.aborted || isAbortError(err)) return;
      this.error = err instanceof Error ? err.message : '搜索失败';
    } finally {
      this.pendingCount -= 1;
    }
  }
}

import { Service } from '@rabjs/react';
import type { NoteSearchHit } from '@zen-send/dto';
import { ApiService } from './api.service';

const DEBOUNCE_MS = 300;

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

export class NoteSearchService extends Service {
  query = '';
  hits: NoteSearchHit[] = [];
  error: string | null = null;
  debounceTimer: ReturnType<typeof setTimeout> | null = null;
  abort: AbortController | null = null;
  seq = 0;
  /** Own field so an empty result re-renders. `$model.runSearch.loading` does not. */
  pendingCount = 0;

  get apiService() {
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

import type { NoteSearchHit, NoteSearchMatch } from '@zen-send/dto';

export const NOTE_SEARCH_LIMIT = 20;
export const NOTE_SEARCH_MATCHES = 3;
export const NOTE_SEARCH_SNIPPET_CHARS = 80;
const BLOCK_MARKER = '∞∞∞';

export interface NoteSearchSource {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

/** MySQL LIKE uses backslash as its default escape character. */
export function escapeLike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export function likeContainsPattern(query: string): string {
  return `%${escapeLike(query.trim().toLowerCase())}%`;
}

interface Range {
  start: number;
  end: number;
}

function delimiterRanges(content: string): Range[] {
  const ranges: Range[] = [];
  let lineStart = 0;
  for (let i = 0; i <= content.length; i += 1) {
    if (i !== content.length && content[i] !== '\n') continue;
    if (content.startsWith(BLOCK_MARKER, lineStart)) {
      ranges.push({ start: lineStart, end: i });
    }
    lineStart = i + 1;
  }
  return ranges;
}

function overlaps(ranges: Range[], start: number, end: number): boolean {
  for (const range of ranges) {
    if (range.end <= start) continue;
    if (range.start >= end) break;
    return true;
  }
  return false;
}

function findContentMatches(content: string, query: string, skipped: Range[]): Range[] {
  const needle = query.toLowerCase();
  if (!needle) return [];
  const haystack = content.toLowerCase();
  const matches: Range[] = [];
  let from = 0;
  while (matches.length < NOTE_SEARCH_MATCHES && from <= haystack.length - needle.length) {
    const start = haystack.indexOf(needle, from);
    if (start < 0) break;
    const end = start + needle.length;
    if (!overlaps(skipped, start, end)) matches.push({ start, end });
    from = end;
  }
  return matches;
}

function isSkipped(skipped: Range[], index: number): boolean {
  return overlaps(skipped, index, index + 1);
}

function hasVisible(content: string, from: number, step: -1 | 1, skipped: Range[]): boolean {
  for (let k = from; k >= 0 && k < content.length; k += step) {
    if (isSkipped(skipped, k)) continue;
    if (content[k] !== '\n' && content[k] !== ' ' && content[k] !== '\t') return true;
  }
  return false;
}

function makeSnippet(content: string, start: number, end: number, skipped: Range[]): string {
  const matchLen = end - start;
  const budget = Math.max(0, NOTE_SEARCH_SNIPPET_CHARS - matchLen);
  const leftBudget = Math.floor(budget / 2);
  const leftChars: string[] = [];
  let i = start - 1;
  while (leftChars.length < leftBudget && i >= 0) {
    if (isSkipped(skipped, i)) {
      i -= 1;
      continue;
    }
    leftChars.push(content[i] ?? '');
    i -= 1;
  }
  const prefix = hasVisible(content, i, -1, skipped);
  const rightBudget = budget - leftBudget + (leftBudget - leftChars.length);
  const rightChars: string[] = [];
  let j = end;
  while (rightChars.length < rightBudget && j < content.length) {
    if (isSkipped(skipped, j)) {
      j += 1;
      continue;
    }
    rightChars.push(content[j] ?? '');
    j += 1;
  }
  const suffix = hasVisible(content, j, 1, skipped);
  const text = (leftChars.reverse().join('') + content.slice(start, end) + rightChars.join(''))
    .replace(/\n/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  return `${prefix ? '…' : ''}${text}${suffix ? '…' : ''}`;
}

export function rankNoteHits(notes: NoteSearchSource[], query: string): NoteSearchHit[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const needle = trimmed.toLowerCase();
  const hits: NoteSearchHit[] = [];
  for (const note of notes) {
    const titleMatch = note.title.toLowerCase().includes(needle);
    const skipped = delimiterRanges(note.content);
    const matches: NoteSearchMatch[] = findContentMatches(note.content, trimmed, skipped).map(
      (match) => ({
        start: match.start,
        end: match.end,
        snippet: makeSnippet(note.content, match.start, match.end, skipped),
      })
    );
    if (!titleMatch && matches.length === 0) continue;
    hits.push({
      id: note.id,
      title: note.title,
      updatedAt: note.updatedAt,
      titleMatch,
      matches,
    });
  }
  hits.sort((a, b) => {
    if (a.titleMatch !== b.titleMatch) return a.titleMatch ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
  return hits.slice(0, NOTE_SEARCH_LIMIT);
}

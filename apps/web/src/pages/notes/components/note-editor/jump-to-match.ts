import { SearchQuery, setSearchQuery } from '@codemirror/search';
import { EditorView } from '@codemirror/view';

function indexOfIgnoreCase(haystack: string, needle: string): number {
  return haystack.toLowerCase().indexOf(needle.toLowerCase());
}

/** Select the hit and scroll it into view. Offsets are ignored when the live doc differs. */
export function revealMatch(
  view: EditorView,
  query: string,
  start: number | null,
  end: number | null
): void {
  const trimmed = query.trim();
  if (!trimmed) return;
  const searchQuery = new SearchQuery({
    search: trimmed,
    caseSensitive: false,
    literal: true,
  });
  const doc = view.state.doc.toString();
  let from = start ?? -1;
  let to = end ?? -1;
  const inRange =
    from >= 0 &&
    to <= doc.length &&
    to > from &&
    doc.slice(from, to).toLowerCase() === trimmed.toLowerCase();
  if (!inRange) {
    const idx = indexOfIgnoreCase(doc, trimmed);
    if (idx < 0) {
      if (searchQuery.valid) view.dispatch({ effects: setSearchQuery.of(searchQuery) });
      return;
    }
    from = idx;
    to = idx + trimmed.length;
  }
  view.dispatch({
    selection: { anchor: from, head: to },
    effects: [
      ...(searchQuery.valid ? [setSearchQuery.of(searchQuery)] : []),
      EditorView.scrollIntoView(from, { y: 'center' }),
    ],
  });
}

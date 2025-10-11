import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';
import { EditorState, RangeSetBuilder, type Range } from '@codemirror/state';
import { blockState, type Block } from './block-state';
import { heynoteEvent } from './block-commands';

class LanguageLabelWidget extends WidgetType {
  constructor(readonly language: string) {
    super();
  }

  toDOM() {
    const wrap = document.createElement('div');
    wrap.className = 'cm-block-lang-label';
    wrap.textContent = this.language.toUpperCase();
    wrap.style.cssText = `
      font-size: 11px;
      color: var(--accent);
      padding: 2px 8px;
      border-bottom: 1px solid var(--border-subtle);
      margin-bottom: 4px;
      font-family: var(--font-sans, 'Inter', sans-serif);
      letter-spacing: 0.5px;
      user-select: none;
    `;
    return wrap;
  }

  ignoreEvent() {
    return false;
  }
}

export const blockDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

function buildDecorations(view: EditorView): DecorationSet {
  const blocks = view.state.field(blockState);
  const visible = view.visibleRanges;
  const ranges: Range<Decoration>[] = [];

  for (const block of blocks) {
    if (block.type !== 'code' || !block.delimiter) continue;

    const isVisible = visible.some(
      (r) => r.from <= block.content.to && r.to >= block.delimiter!.from,
    );
    if (!isVisible) continue;

    const doc = view.state.doc;

    // Language label widget before the opening ``` line
    const openingLine = doc.lineAt(block.delimiter.from);
    ranges.push(
      Decoration.widget({
        widget: new LanguageLabelWidget(block.language),
        side: -1,
        block: true,
      }).range(openingLine.from),
    );

    // Hide the opening ```lang line
    ranges.push(Decoration.replace({}).range(openingLine.from, openingLine.to));

    // Hide the closing ``` line
    const closingLineNum = doc.lineAt(block.content.to).number + 1;
    if (closingLineNum <= doc.lines) {
      const closingLine = doc.line(closingLineNum);
      if (closingLine.text.trim() === '```' || closingLine.text.trim().startsWith('```')) {
        ranges.push(Decoration.replace({}).range(closingLine.from, closingLine.to));
      }
    }
  }

  // Sort by from position (required by Decoration.set)
  ranges.sort((a, b) => a.from - b.from);
  return Decoration.set(ranges, true);
}

// changeFilter: protect ``` delimiter lines from direct user editing
// Block commands carry heynoteEvent annotation and bypass this filter
export const blockChangeFilter = EditorState.changeFilter.of((tr) => {
  // Allow if it's an internal operation
  if (tr.annotation(heynoteEvent) !== undefined) return true;

  // For user edits, check if any change touches a ``` delimiter line
  const state = tr.startState;
  const blocks = state.field(blockState);
  const protectedRanges: [number, number][] = [];

  for (const block of blocks) {
    if (block.type === 'code' && block.delimiter) {
      const openingLine = state.doc.lineAt(block.delimiter.from);
      protectedRanges.push([openingLine.from, openingLine.to]);

      // Also protect closing ``` line
      const closingLineNum = state.doc.lineAt(block.content.to).number + 1;
      if (closingLineNum <= state.doc.lines) {
        const closingLine = state.doc.line(closingLineNum);
        if (closingLine.text.trim() === '```' || closingLine.text.trim().startsWith('```')) {
          protectedRanges.push([closingLine.from, closingLine.to]);
        }
      }
    }
  }

  // Check each change against protected ranges
  let rejected = false;
  tr.changes.iterChanges((fromA, toA) => {
    if (rejected) return;
    for (const [pFrom, pTo] of protectedRanges) {
      if (fromA < pTo && toA > pFrom) {
        rejected = true;
        return;
      }
    }
  });
  if (rejected) return false;

  return true;
});

// atomicRanges: cursor skips over ``` delimiter lines
// EditorView.atomicRanges is a Facet<(view) => RangeSet<any>>
export const blockAtomicRanges = EditorView.atomicRanges.of((view: EditorView) => {
  const blocks = view.state.field(blockState);
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  const ranges: { from: number; to: number }[] = [];

  for (const block of blocks) {
    if (block.type !== 'code' || !block.delimiter) continue;

    const openingLine = doc.lineAt(block.delimiter.from);
    ranges.push({ from: openingLine.from, to: openingLine.to });

    const closingLineNum = doc.lineAt(block.content.to).number + 1;
    if (closingLineNum <= doc.lines) {
      const closingLine = doc.line(closingLineNum);
      if (closingLine.text.trim() === '```' || closingLine.text.trim().startsWith('```')) {
        ranges.push({ from: closingLine.from, to: closingLine.to });
      }
    }
  }

  ranges.sort((a, b) => a.from - b.from);

  // atomicRanges facet accepts RangeSet<any>, use mark decoration as placeholder value
  const placeholder = Decoration.mark({ class: 'cm-atomic-range' });
  for (const r of ranges) {
    builder.add(r.from, r.to, placeholder);
  }

  return builder.finish();
});

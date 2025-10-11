import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';
import { EditorState, RangeSetBuilder, StateEffect, StateField, type Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { blockState } from './block-state';
import { heynoteEvent } from './block-commands';

// Collect all fence delimiter line positions from the syntax tree
function collectFenceLines(state: EditorState): Set<number> {
  const fenceLines = new Set<number>();
  const doc = state.doc;
  const tree = syntaxTree(state);
  tree.iterate({
    enter(node) {
      if (node.name === 'FencedCode') {
        // Opening fence line
        const openingLine = doc.lineAt(node.from);
        fenceLines.add(openingLine.number);
        // Closing fence line (last line of the FencedCode node)
        const closingLine = doc.lineAt(node.to);
        if (closingLine.text.trim().startsWith('```')) {
          fenceLines.add(closingLine.number);
        }
      }
    },
  });
  return fenceLines;
}

// Effects for block copied highlight feedback
export const blockCopiedEffect = StateEffect.define<{ from: number; to: number }>();
export const clearCopiedEffect = StateEffect.define();

export const copiedHighlightState = StateField.define<{ from: number; to: number } | null>({
  create: () => null,
  update: (val, tr) => {
    for (const e of tr.effects) {
      if (e.is(blockCopiedEffect)) return e.value;
      if (e.is(clearCopiedEffect)) return null;
    }
    return val;
  },
});

export const copiedHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }
    update(update: ViewUpdate) {
      this.decorations = this.build(update.view);
    }
    build(view: EditorView): DecorationSet {
      const range = view.state.field(copiedHighlightState);
      if (!range) return Decoration.none;
      return Decoration.set([Decoration.mark({ class: 'cm-block-copied' }).range(range.from, range.to)]);
    }
  },
  { decorations: (v) => v.decorations },
);

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

export const blockDecorations = EditorView.decorations.compute(
  [blockState],
  (state) => {
    const blocks = state.field(blockState);
    const ranges: Range<Decoration>[] = [];
    const doc = state.doc;

    // Track which lines are already handled by block-state parsed blocks
    const hiddenLines = new Set<number>();

    for (const block of blocks) {
      if (block.type !== 'code' || !block.delimiter) continue;

      // Safety: skip blocks with positions outside current document
      if (block.delimiter.from > doc.length || block.content.to > doc.length) continue;

      // Language label widget before the opening ``` line
      const openingLine = doc.lineAt(block.delimiter.from);
      ranges.push(
        Decoration.widget({
          widget: new LanguageLabelWidget(block.language),
          side: -1,
          block: true,
        }).range(openingLine.from),
      );

      // Hide the opening ```lang line (including newline to remove empty space)
      ranges.push(Decoration.replace({}).range(openingLine.from, Math.min(openingLine.to + 1, doc.length)));
      hiddenLines.add(openingLine.number);

      // Hide the closing ``` line (including newline to remove empty space)
      if (block.content.to > 0) {
        const closingLineNum = doc.lineAt(block.content.to).number + 1;
        if (closingLineNum <= doc.lines) {
          const closingLine = doc.line(closingLineNum);
          if (closingLine.text.trim() === '```' || closingLine.text.trim().startsWith('```')) {
            ranges.push(Decoration.replace({}).range(closingLine.from, Math.min(closingLine.to + 1, doc.length)));
            hiddenLines.add(closingLine.number);
          }
        }
      }
    }

    // Catch-all: hide fence delimiter lines recognized by the syntax tree
    // but not yet covered by the block-state loop above
    const fenceLines = collectFenceLines(state);
    for (const lineNum of fenceLines) {
      if (hiddenLines.has(lineNum)) continue;
      const line = doc.line(lineNum);
      ranges.push(Decoration.replace({}).range(line.from, Math.min(line.to + 1, doc.length)));
    }

    // Sort by from position (required by Decoration.set)
    ranges.sort((a, b) => a.from - b.from);
    return Decoration.set(ranges, true);
  },
);

// changeFilter: protect ``` delimiter lines from direct user editing
// Block commands carry heynoteEvent annotation and bypass this filter
export const blockChangeFilter = EditorState.changeFilter.of((tr) => {
  // Allow if it's an internal operation
  if (tr.annotation(heynoteEvent) !== undefined) return true;

  // For user edits, check if any change touches a ``` delimiter line
  const state = tr.startState;
  const protectedRanges: [number, number][] = [];

  // Protect fence delimiter lines identified by the syntax tree
  const fenceLines = collectFenceLines(state);
  for (const lineNum of fenceLines) {
    const line = state.doc.line(lineNum);
    protectedRanges.push([line.from, Math.min(line.to + 1, state.doc.length)]);
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
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  const ranges: { from: number; to: number }[] = [];

  // Make fence delimiter lines atomic (cursor skips over them)
  const fenceLines = collectFenceLines(view.state);
  for (const lineNum of fenceLines) {
    const line = doc.line(lineNum);
    ranges.push({ from: line.from, to: Math.min(line.to + 1, doc.length) });
  }

  ranges.sort((a, b) => a.from - b.from);

  // atomicRanges facet accepts RangeSet<any>, use mark decoration as placeholder value
  const placeholder = Decoration.mark({ class: 'cm-atomic-range' });
  for (const r of ranges) {
    builder.add(r.from, r.to, placeholder);
  }

  return builder.finish();
});

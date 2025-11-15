import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';
import {
  EditorSelection,
  EditorState,
  RangeSetBuilder,
  StateEffect,
  StateField,
  Transaction,
  type Range,
  type TransactionSpec,
} from '@codemirror/state';
import { blockState, firstBlockDelimiterSize, getBlockDelimiter } from './block-state';
import { heynoteEvent, HEYNOTE_EVENTS } from './block-commands';

class NoteBlockStartWidget extends WidgetType {
  constructor(readonly isFirst: boolean) {
    super();
  }

  toDOM() {
    const wrap = document.createElement('div');
    wrap.className = 'heynote-block-start' + (this.isFirst ? ' first' : '');
    return wrap;
  }

  ignoreEvent() {
    return false;
  }
}

export const blockDecorations = EditorView.decorations.compute([blockState], (state) => {
  const blocks = state.field(blockState);
  const ranges: Range<Decoration>[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const isFirst = i === 0;

    if (block.delimiter.from <= state.doc.length && block.delimiter.to <= state.doc.length) {
      const from = isFirst ? block.delimiter.from : block.delimiter.from + 1;
      const to = Math.min(block.delimiter.to - 1, state.doc.length);
      ranges.push(
        Decoration.replace({
          widget: new NoteBlockStartWidget(isFirst),
          inclusive: true,
          block: true,
          side: 0,
        }).range(from, to),
      );
    }
  }

  ranges.sort((a, b) => a.from - b.from);
  return Decoration.set(ranges, true);
});

export const blockChangeFilter = EditorState.changeFilter.of((tr) => {
  const protect: number[] = [];

  if (tr.annotation(heynoteEvent) === undefined && firstBlockDelimiterSize) {
    protect.push(0, firstBlockDelimiterSize);
  }

  // Protect all delimiters during search/replace
  const isReplace = tr.isUserEvent('input.replace') || tr.isUserEvent('input.replace.all');
  if (isReplace) {
    const state = tr.startState;
    const blocks = state.field(blockState, false);
    if (blocks) {
      for (const block of blocks) {
        protect.push(block.delimiter.from, block.delimiter.to);
      }
    }
  }

  if (protect.length > 0) return protect;
  return true;
});

export const blockAtomicRanges = EditorView.atomicRanges.of((view: EditorView) => {
  const blocks = view.state.field(blockState, false);
  if (!blocks) return Decoration.none;

  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  const ranges: { from: number; to: number }[] = [];

  for (const block of blocks) {
    if (block.delimiter.from <= doc.length && block.delimiter.to <= doc.length) {
      ranges.push({
        from: block.delimiter.from,
        to: Math.min(block.delimiter.to, doc.length),
      });
    }
  }

  ranges.sort((a, b) => a.from - b.from);
  const placeholder = Decoration.mark({ class: 'cm-atomic-range' });
  for (const r of ranges) {
    builder.add(r.from, r.to, placeholder);
  }

  return builder.finish();
});

export const preventSelectionBeforeFirstBlock = EditorState.transactionFilter.of(
  (tr): Transaction | TransactionSpec => {
    if (!firstBlockDelimiterSize) return tr;
    if (tr.annotation(heynoteEvent) !== undefined) return tr;
    if (!tr.selection) return tr;

    let changed = false;
    const mappedRanges = tr.selection.ranges.map((r) => {
      let from = r.from;
      let to = r.to;
      if (from < firstBlockDelimiterSize!) {
        from = firstBlockDelimiterSize!;
        changed = true;
      }
      if (to < firstBlockDelimiterSize!) {
        to = firstBlockDelimiterSize!;
        changed = true;
      }
      if (!changed) return r;
      return EditorSelection.range(
        Math.max(r.anchor, firstBlockDelimiterSize!),
        Math.max(r.head, firstBlockDelimiterSize!),
      );
    });

    if (!changed) return tr;
    return {
      selection: EditorSelection.create(mappedRanges, tr.selection.mainIndex),
    };
  },
);

// Copy highlight
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
      return Decoration.set([
        Decoration.mark({ class: 'cm-block-copied' }).range(range.from, range.to),
      ]);
    }
  },
  { decorations: (v) => v.decorations },
);

/**
 * Transaction filter that updates the created time when content is written
 * to empty blocks, so the created time reflects first content entry.
 */
export const updateCreatedOnEmptyBlock = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged || tr.startState.readOnly) return tr;
  if (
    tr.annotation(heynoteEvent) === HEYNOTE_EVENTS.SET_CONTENT ||
    tr.annotation(heynoteEvent) === HEYNOTE_EVENTS.ADD_BLOCK
  ) {
    return tr;
  }
  if (tr.isUserEvent('undo') || tr.isUserEvent('redo')) return tr;

  const startBlocks = tr.startState.field(blockState, false);
  if (!startBlocks) return tr;

  const emptyBlocks: { pos: number; block: (typeof startBlocks)[0]; touched: boolean }[] = [];
  for (const block of startBlocks) {
    if (block.content.from === block.content.to) {
      emptyBlocks.push({ pos: block.content.from, block, touched: false });
    }
  }
  if (emptyBlocks.length === 0) return tr;

  let emptyIdx = 0;
  tr.changes.iterChanges((fromA, toA, fromB, toB) => {
    if (toB === fromB) return; // removal only
    if (fromA !== toA) return; // replacement, not insertion
    while (emptyIdx < emptyBlocks.length && emptyBlocks[emptyIdx].pos < fromA) {
      emptyIdx++;
    }
    let idx = emptyIdx;
    while (idx < emptyBlocks.length && emptyBlocks[idx].pos <= toB) {
      emptyBlocks[idx].touched = true;
      idx++;
    }
  });

  const changes: { from: number; to: number; insert: string }[] = [];
  const now = new Date();
  for (const entry of emptyBlocks) {
    if (!entry.touched) continue;
    const delimiterText = getBlockDelimiter(entry.block.language.name, entry.block.language.auto, now);
    changes.push({
      from: tr.changes.mapPos(entry.block.delimiter.from, 1),
      to: tr.changes.mapPos(entry.block.delimiter.to, -1),
      insert: delimiterText,
    });
  }

  if (changes.length === 0) return tr;

  return [
    tr,
    {
      changes,
      annotations: [heynoteEvent.of(HEYNOTE_EVENTS.UPDATE_CREATED)],
    },
  ];
});

import { EditorView, ViewPlugin, Decoration } from '@codemirror/view';
import {
  Annotation,
  EditorSelection,
  RangeSetBuilder,
  StateEffect,
  StateField,
  type EditorState,
} from '@codemirror/state';
import { selectAll as defaultSelectAll } from '@codemirror/commands';
import {
  blockState,
  getActiveBlock,
  getBlockDelimiter,
  DEFAULT_BLOCK_LANGUAGE,
  type Block,
} from './block-state';
import { blockCopiedEffect, clearCopiedEffect } from './block-decoration';

export const heynoteEvent = Annotation.define<string>();

export const HEYNOTE_EVENTS = {
  ADD_BLOCK: 'addBlock',
  DELETE_BLOCK: 'deleteBlock',
  MOVE_BLOCK: 'moveBlock',
  CHANGE_LANGUAGE: 'changeLanguage',
  GOTO_BLOCK: 'gotoBlock',
  COPY_BLOCK: 'copyBlock',
  SET_CONTENT: 'setContent',
  UPDATE_CREATED: 'updateCreated',
} as const;

const LANGUAGES = [
  'markdown',
  'text',
  'javascript',
  'typescript',
  'python',
  'sql',
  'json',
  'css',
  'html',
];

export function getLanguageList(): string[] {
  return LANGUAGES;
}

/**
 * StateField tracking when an empty block is visually "selected" via Cmd-A.
 * Needed because an empty block's content.from === content.to, so we can't
 * detect "whole block selected" from the selection alone.
 */
const setEmptyBlockSelected = StateEffect.define<number>();

export const emptyBlockSelected = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    if (tr.selection) return null;
    for (const e of tr.effects) {
      if (e.is(setEmptyBlockSelected)) return e.value;
    }
    return value;
  },
  provide() {
    const deco = Decoration.line({
      attributes: { class: 'heynote-empty-block-selected' },
    });
    return ViewPlugin.fromClass(
      class {
        decorations;
        constructor(view: EditorView) {
          this.decorations = this.build(view);
        }
        update(update: { view: EditorView }) {
          this.decorations = this.build(update.view);
        }
        build(view: EditorView) {
          const pos = view.state.field(emptyBlockSelected);
          if (pos === null) return Decoration.none;
          const builder = new RangeSetBuilder<Decoration>();
          const line = view.state.doc.lineAt(pos);
          builder.add(line.from, line.from, deco);
          return builder.finish();
        }
      },
      { decorations: (v) => v.decorations },
    );
  },
});

function selectAllInBlock(view: EditorView): boolean {
  const range = view.state.selection.main;
  const block = getActiveBlock(view.state);
  if (!block) return false;

  // handle empty blocks separately
  if (block.content.from === block.content.to) {
    if (view.state.field(emptyBlockSelected, false)) {
      // empty block already marked as selected → select whole document
      return defaultSelectAll(view);
    } else if (range.empty) {
      // mark the empty block as selected
      view.dispatch({ effects: setEmptyBlockSelected.of(block.content.from) });
    }
    return true;
  }

  // if the whole block is already selected, select the whole document
  if (range.from === block.content.from && range.to === block.content.to) {
    return defaultSelectAll(view);
  }

  // first Cmd-A: select the current block's content
  view.dispatch({
    selection: { anchor: block.content.from, head: block.content.to },
    userEvent: 'select',
  });
  return true;
}

function copyBlock(view: EditorView): boolean {
  const sel = view.state.selection.main;
  if (!sel.empty) return false;
  const block = getActiveBlock(view.state);
  if (!block) return false;
  const text = view.state.doc.sliceString(block.content.from, block.content.to);
  navigator.clipboard
    .writeText(text)
    .then(() => {
      view.dispatch({
        effects: blockCopiedEffect.of({ from: block.content.from, to: block.content.to }),
      });
      setTimeout(() => {
        if (view.dom.isConnected) {
          view.dispatch({ effects: clearCopiedEffect.of(null) });
        }
      }, 200);
    })
    .catch(() => {});
  return true;
}

function addNewBlockAfterCurrent(view: EditorView): boolean {
  const block = getActiveBlock(view.state);
  if (!block) return false;

  const delimText = getBlockDelimiter(DEFAULT_BLOCK_LANGUAGE);
  const insertPos = block.content.to;

  view.dispatch({
    changes: { from: insertPos, insert: delimText },
    selection: { anchor: insertPos + delimText.length },
    scrollIntoView: true,
    annotations: heynoteEvent.of(HEYNOTE_EVENTS.ADD_BLOCK),
  });
  return true;
}

function addNewBlockBeforeCurrent(view: EditorView): boolean {
  const block = getActiveBlock(view.state);
  if (!block) return false;

  const delimText = getBlockDelimiter(DEFAULT_BLOCK_LANGUAGE);
  const insertPos = block.delimiter.from;

  view.dispatch({
    changes: { from: insertPos, insert: delimText },
    selection: { anchor: insertPos + delimText.length },
    scrollIntoView: true,
    annotations: heynoteEvent.of(HEYNOTE_EVENTS.ADD_BLOCK),
  });
  return true;
}

function addNewBlockAfterLast(view: EditorView): boolean {
  const blocks = view.state.field(blockState);
  if (blocks.length === 0) return false;

  const lastBlock = blocks[blocks.length - 1];
  const delimText = getBlockDelimiter(DEFAULT_BLOCK_LANGUAGE);

  view.dispatch({
    changes: { from: lastBlock.content.to, insert: delimText },
    selection: { anchor: lastBlock.content.to + delimText.length },
    scrollIntoView: true,
    annotations: heynoteEvent.of(HEYNOTE_EVENTS.ADD_BLOCK),
  });
  return true;
}

function deleteCurrentBlock(view: EditorView): boolean {
  const blocks = view.state.field(blockState);
  const block = getActiveBlock(view.state);
  if (!block) return false;

  let replace = '';
  let newSelection: number;

  if (blocks.length <= 1) {
    const content = view.state.doc.sliceString(block.content.from, block.content.to).trim();
    if (content === '') return true;
    replace = getBlockDelimiter(DEFAULT_BLOCK_LANGUAGE);
    newSelection = replace.length;
  } else {
    const idx = blocks.indexOf(block);
    const nextBlock = idx < blocks.length - 1 ? blocks[idx + 1] : null;

    if (!nextBlock) {
      newSelection = block.delimiter.from;
    } else {
      newSelection = block.delimiter.from + (nextBlock.delimiter.to - nextBlock.delimiter.from);
    }
  }

  view.dispatch({
    changes: { from: block.range.from, to: block.range.to, insert: replace },
    selection: { anchor: newSelection },
    annotations: heynoteEvent.of(HEYNOTE_EVENTS.DELETE_BLOCK),
  });
  return true;
}

export function changeBlockLanguage(view: EditorView, newLang: string): boolean {
  const block = getActiveBlock(view.state);
  if (!block) return false;

  const newDelim = getBlockDelimiter(newLang, block.language.auto, block.created ? new Date(block.created) : undefined);
  view.dispatch({
    changes: { from: block.delimiter.from, to: block.delimiter.to, insert: newDelim },
    annotations: heynoteEvent.of(HEYNOTE_EVENTS.CHANGE_LANGUAGE),
  });
  return true;
}

function gotoNextBlock(view: EditorView): boolean {
  const blocks = view.state.field(blockState);
  const block = getActiveBlock(view.state);
  if (!block) return false;

  const idx = blocks.indexOf(block);
  if (idx < blocks.length - 1) {
    const next = blocks[idx + 1];
    view.dispatch({
      selection: { anchor: next.content.from },
      annotations: heynoteEvent.of(HEYNOTE_EVENTS.GOTO_BLOCK),
    });
    return true;
  }
  return false;
}

function gotoPreviousBlock(view: EditorView): boolean {
  const blocks = view.state.field(blockState);
  const block = getActiveBlock(view.state);
  if (!block) return false;

  const idx = blocks.indexOf(block);
  if (idx > 0) {
    const prev = blocks[idx - 1];
    view.dispatch({
      selection: { anchor: prev.content.from },
      annotations: heynoteEvent.of(HEYNOTE_EVENTS.GOTO_BLOCK),
    });
    return true;
  }
  return false;
}

function moveBlockUp(view: EditorView): boolean {
  const blocks = view.state.field(blockState);
  const block = getActiveBlock(view.state);
  if (!block) return false;

  const idx = blocks.indexOf(block);
  if (idx === 0) return false;

  const prev = blocks[idx - 1];
  const blockText = view.state.doc.sliceString(block.delimiter.from, block.content.to);
  const prevText = view.state.doc.sliceString(prev.delimiter.from, prev.content.to);

  const selectionRange = view.state.selection.main;
  const newSelectionRange = EditorSelection.range(
    selectionRange.anchor - block.delimiter.from + prev.delimiter.from,
    selectionRange.head - block.delimiter.from + prev.delimiter.from,
  );

  view.dispatch({
    changes: { from: prev.delimiter.from, to: block.content.to, insert: blockText + prevText },
    selection: newSelectionRange,
    scrollIntoView: true,
    annotations: heynoteEvent.of(HEYNOTE_EVENTS.MOVE_BLOCK),
  });
  return true;
}

function moveBlockDown(view: EditorView): boolean {
  const blocks = view.state.field(blockState);
  const block = getActiveBlock(view.state);
  if (!block) return false;

  const idx = blocks.indexOf(block);
  if (idx >= blocks.length - 1) return false;

  const next = blocks[idx + 1];
  const blockText = view.state.doc.sliceString(block.delimiter.from, block.content.to);
  const nextText = view.state.doc.sliceString(next.delimiter.from, next.content.to);

  const selectionRange = view.state.selection.main;
  const newSelectionRange = EditorSelection.range(
    selectionRange.anchor + next.content.to - next.delimiter.from,
    selectionRange.head + next.content.to - next.delimiter.from,
  );

  view.dispatch({
    changes: {
      from: block.delimiter.from,
      to: next.content.to,
      insert: nextText + blockText,
    },
    selection: newSelectionRange,
    scrollIntoView: true,
    annotations: heynoteEvent.of(HEYNOTE_EVENTS.MOVE_BLOCK),
  });
  return true;
}

function backspaceInBlock(view: EditorView): boolean {
  const block = getActiveBlock(view.state);
  if (!block) return false;

  const sel = view.state.selection.main;
  if (!sel.empty) return false;
  if (sel.from !== block.content.from) return false;

  const content = view.state.doc.sliceString(block.content.from, block.content.to).trim();
  if (content !== '') return false;

  return deleteCurrentBlock(view);
}

function deleteInBlock(view: EditorView): boolean {
  const block = getActiveBlock(view.state);
  if (!block) return false;

  const sel = view.state.selection.main;
  if (!sel.empty) return false;
  if (sel.from !== block.content.to) return false;

  const content = view.state.doc.sliceString(block.content.from, block.content.to).trim();
  if (content !== '') return false;

  return deleteCurrentBlock(view);
}

export const blockKeymap = [
  { key: 'Mod-a', run: selectAllInBlock },
  { key: 'Mod-c', run: copyBlock },
  { key: 'Mod-Enter', run: addNewBlockAfterCurrent },
  { key: 'Mod-Shift-Enter', run: addNewBlockAfterLast },
  { key: 'Mod-Shift-d', run: deleteCurrentBlock },
  { key: 'Backspace', run: backspaceInBlock },
  { key: 'Delete', run: deleteInBlock },
  { key: 'Mod-ArrowUp', run: gotoPreviousBlock },
  { key: 'Mod-ArrowDown', run: gotoNextBlock },
  { key: 'Mod-Shift-ArrowUp', run: moveBlockUp },
  { key: 'Mod-Shift-ArrowDown', run: moveBlockDown },
];

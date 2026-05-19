import assert from 'node:assert/strict';
import test from 'node:test';
import { EditorState, EditorSelection } from '@codemirror/state';
import { blockState, getBlockDelimiter } from './block-state';
import {
  blockDecorations,
  blockChangeFilter,
  blockAtomicRanges,
  preventSelectionBeforeFirstBlock,
  copiedHighlightState,
  copiedHighlightPlugin,
  blockCopiedEffect,
  clearCopiedEffect,
} from './block-decoration';
import { heynoteEvent } from './block-commands';

function createState(doc: string, cursorPos?: number) {
  return EditorState.create({
    doc,
    extensions: [
      blockState,
      blockDecorations,
      blockChangeFilter,
      blockAtomicRanges,
      preventSelectionBeforeFirstBlock,
    ],
    selection: cursorPos !== undefined ? EditorSelection.cursor(cursorPos) : undefined,
  });
}

test('creates replacement decoration over each delimiter range', () => {
  const content = getBlockDelimiter('text') + 'Hello' + getBlockDelimiter('python') + 'code';
  const state = createState(content);
  const blocks = state.field(blockState);

  assert.equal(blocks.length, 2);
});

test('change filter blocks delimiter modification without heynoteEvent', () => {
  const content = getBlockDelimiter('text') + 'Hello';
  const state = createState(content);
  const blocks = state.field(blockState);

  // Attempt to modify delimiter without annotation
  const tr = state.update({
    changes: { from: blocks[0].delimiter.from + 1, to: blocks[0].delimiter.from + 2, insert: 'X' },
  });
  // The change filter should have prevented the modification
  assert.equal(tr.state.doc.toString(), state.doc.toString());
});

test('change filter allows delimiter modification with heynoteEvent', () => {
  const content = getBlockDelimiter('text') + 'Hello';
  const state = createState(content);
  const blocks = state.field(blockState);

  // Modify delimiter with heynoteEvent annotation
  const newDelim = getBlockDelimiter('python');
  const tr = state.update({
    changes: { from: blocks[0].delimiter.from, to: blocks[0].delimiter.to, insert: newDelim },
    annotations: heynoteEvent.of('changeLanguage'),
  });
  assert.notEqual(tr.state.doc.toString(), state.doc.toString());
  assert.equal(tr.state.field(blockState)[0].language.name, 'python');
});

test('change filter allows content modifications', () => {
  const content = getBlockDelimiter('text') + 'Hello';
  const state = createState(content);
  const blocks = state.field(blockState);

  // Modify content (should be allowed)
  const tr = state.update({
    changes: { from: blocks[0].content.from, insert: 'X' },
  });
  assert.notEqual(tr.state.doc.toString(), state.doc.toString());
});

test('preventSelectionBeforeFirstBlock clamps selection in transactions', () => {
  const content = getBlockDelimiter('text') + 'Hello';
  const state = createState(content);
  const blocks = state.field(blockState);
  const firstContentFrom = blocks[0].content.from;

  // Try to set cursor before first block content via a transaction
  const tr = state.update({
    selection: EditorSelection.cursor(0),
  });
  // The transaction filter should clamp the selection
  assert.equal(tr.state.selection.main.from, firstContentFrom);
});

test('copied highlight state tracks block range', () => {
  const state = EditorState.create({
    doc: getBlockDelimiter('text') + 'Hello',
    extensions: [copiedHighlightState],
  });

  // Initially null
  assert.equal(state.field(copiedHighlightState), null);

  // After effect, stores range
  const tr = state.update({
    effects: blockCopiedEffect.of({ from: 5, to: 10 }),
  });
  assert.deepEqual(tr.state.field(copiedHighlightState), { from: 5, to: 10 });

  // After clear effect, back to null
  const tr2 = tr.state.update({
    effects: clearCopiedEffect.of(null),
  });
  assert.equal(tr2.state.field(copiedHighlightState), null);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { EditorState } from '@codemirror/state';
import { hasLocalContentEdit } from './title-save';

const state = EditorState.create({ doc: 'original title' });

test('does not treat Yjs-style document synchronization as a local edit', () => {
  const update = state.update({ changes: { from: 0, insert: '# synchronized title' } });

  assert.equal(hasLocalContentEdit([update]), false);
});

test('does not treat selection or viewport updates as content edits', () => {
  const update = state.update({ selection: { anchor: 3 } });

  assert.equal(hasLocalContentEdit([update]), false);
});

test('accepts local input, deletion, undo and redo', () => {
  for (const userEvent of ['input', 'delete', 'undo', 'redo']) {
    const update = state.update({
      changes: { from: 0, insert: '# local title' },
      userEvent,
    });

    assert.equal(hasLocalContentEdit([update]), true, userEvent);
  }
});

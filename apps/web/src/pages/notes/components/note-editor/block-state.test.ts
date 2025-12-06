import assert from 'node:assert/strict';
import test from 'node:test';
import { EditorState } from '@codemirror/state';
import {
  blockState,
  getVisibleBlocks,
  DEFAULT_BLOCK_CONTENT,
  getBlockDelimiter,
} from './block-state';
import { getBlockLineNumber } from './block-line-numbers';

function createState(doc: string) {
  return EditorState.create({
    doc,
    extensions: [blockState],
  });
}

test('parses a single markdown block', () => {
  const content = getBlockDelimiter('markdown');
  const state = createState(content + 'Hello world');
  const blocks = state.field(blockState);

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].language.name, 'markdown');
});

test('parses multiple blocks', () => {
  const state = createState(
    getBlockDelimiter('markdown') + 'Hello' + getBlockDelimiter('python') + 'print("hi")'
  );
  const blocks = state.field(blockState);

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].language.name, 'markdown');
  assert.equal(blocks[1].language.name, 'python');
  assert.equal(state.doc.sliceString(blocks[0].content.from, blocks[0].content.to), 'Hello');
  assert.equal(state.doc.sliceString(blocks[1].content.from, blocks[1].content.to), 'print("hi")');
});

test('numbers block lines from 1', () => {
  const content = getBlockDelimiter('text') + 'alpha\nbeta';
  const state = createState(content);
  const visibleBlocks = getVisibleBlocks(state);

  assert.deepEqual(
    visibleBlocks[0].lines.map((line) => line.localLineNumber),
    [1, 2]
  );
});

test('returns empty for delimiter line numbers', () => {
  const content = getBlockDelimiter('text') + 'alpha\nbeta';
  const state = createState(content);

  assert.equal(getBlockLineNumber(state, 1), '');
  assert.equal(getBlockLineNumber(state, 2), '');
  assert.equal(getBlockLineNumber(state, 3), '1');
  assert.equal(getBlockLineNumber(state, 4), '2');
});

test('keeps numbering local to each block', () => {
  const state = createState(
    getBlockDelimiter('text') + 'alpha\nbeta' + getBlockDelimiter('python') + 'print("x")'
  );
  const visibleBlocks = getVisibleBlocks(state);

  assert.deepEqual(
    visibleBlocks.map((block) => block.lines.map((line) => line.localLineNumber)),
    [[1, 2], [1]]
  );
});

test('handles empty block content', () => {
  const state = createState(getBlockDelimiter('text') + getBlockDelimiter('python') + 'code');
  const blocks = state.field(blockState);
  const visibleBlocks = getVisibleBlocks(state);

  assert.equal(blocks.length, 2);
  assert.equal(visibleBlocks[0].hasNumberedLines, false);
  assert.equal(visibleBlocks[0].lines.length, 0);
  assert.equal(visibleBlocks[1].hasNumberedLines, true);
});

test('produces consistent geometry for single block', () => {
  const content = getBlockDelimiter('markdown') + 'alpha\nbeta';
  const state = createState(content);
  const visibleBlocks = getVisibleBlocks(state);
  const block = visibleBlocks[0];

  assert.equal(block.language, 'markdown');
  assert.equal(block.hasNumberedLines, true);
  assert.equal(block.contentTopPos !== undefined, true);
  assert.equal(block.blockTopPos !== undefined, true);
  assert.deepEqual(
    block.lines.map((line) => line.localLineNumber),
    [1, 2]
  );
});

test('default block content is a valid single block', () => {
  const state = createState(DEFAULT_BLOCK_CONTENT);
  const blocks = state.field(blockState);

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].language.name, 'markdown');
});

test('delimiter includes trailing newline', () => {
  const content = getBlockDelimiter('markdown') + 'Hello';
  const state = createState(content);
  const block = state.field(blockState)[0];

  assert.equal(state.doc.sliceString(block.delimiter.to - 1, block.delimiter.to), '\n');
  assert.equal(state.doc.sliceString(block.content.from, block.content.from + 1), 'H');
});

test('handles block with no trailing content', () => {
  const content = getBlockDelimiter('text');
  const state = createState(content);
  const blocks = state.field(blockState);

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].content.from, blocks[0].content.to);
});

test('block has range field', () => {
  const content = getBlockDelimiter('markdown') + 'Hello' + getBlockDelimiter('python') + 'code';
  const state = createState(content);
  const blocks = state.field(blockState);

  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].range.from, blocks[0].delimiter.from);
  assert.equal(blocks[0].range.to, blocks[0].content.to);
  assert.equal(blocks[1].range.from, blocks[1].delimiter.from);
  assert.equal(blocks[1].range.to, blocks[1].content.to);
});

test('block has created metadata', () => {
  const content = getBlockDelimiter('markdown');
  const state = createState(content);
  const blocks = state.field(blockState);

  assert.equal(blocks.length, 1);
  assert.equal(typeof blocks[0].created, 'string');
  assert.ok(blocks[0].created!.includes('T')); // ISO format
});

test('block language has auto flag', () => {
  const content = getBlockDelimiter('markdown', true);
  const state = createState(content + 'Hello');
  const blocks = state.field(blockState);

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].language.name, 'markdown');
  assert.equal(blocks[0].language.auto, true);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { languages } from '@codemirror/language-data';
import { blockState, getVisibleBlocks } from './block-state';
import { getBlockLineNumber } from './block-line-numbers';

function createState(doc: string) {
  return EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage, codeLanguages: languages }), blockState],
  });
}

test('numbers markdown block lines from 1', () => {
  const state = createState('alpha\nbeta');
  const visibleBlocks = getVisibleBlocks(state);

  assert.deepEqual(
    visibleBlocks[0].lines.map((line) => line.localLineNumber),
    [1, 2],
  );
});

test('numbers code block content from 1 after hiding fences', () => {
  const state = createState('```ts\nconst a = 1\nconst b = 2\n```');
  const visibleBlocks = getVisibleBlocks(state);

  assert.deepEqual(
    visibleBlocks[0].lines.map((line) => line.localLineNumber),
    [1, 2],
  );
});

test('resets numbering for each block', () => {
  const state = createState('alpha\n\n```ts\nconst a = 1\n```\nomega');
  const visibleBlocks = getVisibleBlocks(state);

  assert.deepEqual(
    visibleBlocks.map((block) => block.lines.map((line) => line.localLineNumber)),
    [[1, 2], [1], [1]],
  );
});

test('returns blank for fences and local numbers for visible lines', () => {
  const state = createState('```ts\nconst a = 1\nconst b = 2\n```');

  assert.equal(getBlockLineNumber(state, 1), '');
  assert.equal(getBlockLineNumber(state, 2), '1');
  assert.equal(getBlockLineNumber(state, 3), '2');
  assert.equal(getBlockLineNumber(state, 4), '');
});

test('keeps empty code blocks unnumbered but anchored', () => {
  const state = createState('```\n```');
  const visibleBlocks = getVisibleBlocks(state);

  assert.equal(visibleBlocks[0].hasNumberedLines, false);
  assert.deepEqual(visibleBlocks[0].lines, []);
  assert.equal(visibleBlocks[0].visibleStartLine, 1);
  assert.equal(visibleBlocks[0].visibleEndLine, 2);
  assert.equal(typeof visibleBlocks[0].topAnchorPos, 'number');
  assert.equal(typeof visibleBlocks[0].bottomAnchorPos, 'number');
});

test('counts visible blank lines inside a block without skipping numbers', () => {
  const state = createState('```ts\nconst a = 1\n\nconst b = 2\n```');
  const visibleBlocks = getVisibleBlocks(state);

  assert.deepEqual(
    visibleBlocks[0].lines.map((line) => ({ lineNumber: line.lineNumber, localLineNumber: line.localLineNumber })),
    [
      { lineNumber: 2, localLineNumber: 1 },
      { lineNumber: 3, localLineNumber: 2 },
      { lineNumber: 4, localLineNumber: 3 },
    ],
  );
});

test('exposes stable top and bottom anchors for markdown and code blocks', () => {
  const state = createState('alpha\n\n```ts\nconst a = 1\n```');
  const visibleBlocks = getVisibleBlocks(state);

  assert.equal(typeof visibleBlocks[0].topAnchorPos, 'number');
  assert.equal(typeof visibleBlocks[0].bottomAnchorPos, 'number');
  assert.equal(typeof visibleBlocks[1].topAnchorPos, 'number');
  assert.equal(typeof visibleBlocks[1].bottomAnchorPos, 'number');
  assert.equal(visibleBlocks[0].visibleStartLine, 1);
  assert.equal(visibleBlocks[0].visibleEndLine, 2);
  assert.equal(visibleBlocks[1].visibleStartLine, 4);
  assert.equal(visibleBlocks[1].visibleEndLine, 4);
});

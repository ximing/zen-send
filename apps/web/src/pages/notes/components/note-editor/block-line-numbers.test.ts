import assert from 'node:assert/strict';
import test from 'node:test';
import { getBlockLineNumberFromBlocks } from './block-line-numbers';
import type { VisibleBlock } from './block-state';

const blocks: VisibleBlock[] = [
  {
    blockIndex: 0,
    language: 'python',
    visibleStartLine: 2,
    visibleEndLine: 4,
    contentTopPos: 200,
    contentBottomPos: 400,
    blockTopPos: 1,
    blockBottomPos: 999,
    hasNumberedLines: true,
    lines: [
      { lineNumber: 2, localLineNumber: 1 },
      { lineNumber: 3, localLineNumber: 2 },
      { lineNumber: 4, localLineNumber: 3 },
    ],
  },
];

test('maps gutter labels from numbered lines rather than block geometry', () => {
  assert.equal(getBlockLineNumberFromBlocks(blocks, 1), '');
  assert.equal(getBlockLineNumberFromBlocks(blocks, 2), '1');
  assert.equal(getBlockLineNumberFromBlocks(blocks, 3), '2');
  assert.equal(getBlockLineNumberFromBlocks(blocks, 4), '3');
  assert.equal(getBlockLineNumberFromBlocks(blocks, 999), '');
});

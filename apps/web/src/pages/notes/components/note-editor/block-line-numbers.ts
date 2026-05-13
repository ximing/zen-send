import { lineNumbers } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import { blockState, type Block } from './block-state';

// Same logic as collectFenceLines in block-decoration.ts
function computeFenceLines(state: EditorState): Set<number> {
  const fenceLines = new Set<number>();
  const doc = state.doc;
  syntaxTree(state).iterate({
    enter(node) {
      if (node.name === 'FencedCode') {
        fenceLines.add(doc.lineAt(node.from).number);
        const closingLine = doc.lineAt(node.to);
        if (closingLine.text.trim().startsWith('```')) {
          fenceLines.add(closingLine.number);
        }
      }
    },
  });
  return fenceLines;
}

// Cache by state identity (state is immutable per transaction)
let _state: EditorState | null = null;
let _fenceLines: Set<number> | null = null;

function getFenceLines(state: EditorState): Set<number> {
  if (state === _state && _fenceLines) return _fenceLines;
  _state = state;
  _fenceLines = computeFenceLines(state);
  return _fenceLines;
}

export const blockLineNumbers = lineNumbers({
  formatNumber(lineNo: number, state: EditorState) {
    if (lineNo < 1 || lineNo > state.doc.lines) return '';

    const fenceLines = getFenceLines(state);
    if (fenceLines.has(lineNo)) return '';

    const doc = state.doc;
    const pos = doc.line(lineNo).from;
    const blocks = state.field(blockState) as Block[];

    for (const block of blocks) {
      if (pos >= block.content.from && pos <= block.content.to) {
        // Count non-fence lines from block start to current line
        const startLine = doc.lineAt(block.content.from).number;
        let num = 0;
        for (let l = startLine; l <= lineNo; l++) {
          if (!fenceLines.has(l)) num++;
        }
        return String(num);
      }
    }

    return '';
  },
});

import { lineNumbers } from '@codemirror/view';
import { blockState } from './block-state';

function getBlockLineFromPos(state: any, pos: number): { blockIndex: number; line: number } | null {
  const blocks = state.field(blockState);
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (pos >= block.content.from && pos <= block.content.to) {
      const line = state.doc.lineAt(pos);
      const startLine = state.doc.lineAt(block.content.from);
      return { blockIndex: i, line: line.number - startLine.number + 1 };
    }
  }
  return null;
}

export const blockLineNumbers = lineNumbers({
  formatNumber(lineNo: number, state: any) {
    if (lineNo < 1 || lineNo > state.doc.lines) return '';
    const lineInfo = getBlockLineFromPos(state, state.doc.line(lineNo).from);
    if (lineInfo !== null) {
      return String(lineInfo.line);
    }
    return '';
  },
});

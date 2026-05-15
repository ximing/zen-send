import { StateField, type EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

export interface Block {
  type: 'markdown' | 'code';
  language: string;
  content: { from: number; to: number };
  delimiter?: { from: number; to: number };
}

export interface VisibleBlockLine {
  lineNumber: number;
  localLineNumber: number;
}

export interface VisibleBlock {
  blockIndex: number;
  type: 'markdown' | 'code';
  visibleStartLine: number;
  visibleEndLine: number;
  topAnchorPos: number;
  bottomAnchorPos: number;
  hasNumberedLines: boolean;
  lines: VisibleBlockLine[];
}

function clampPos(state: EditorState, pos: number): number {
  return Math.max(0, Math.min(pos, state.doc.length));
}

function parseBlocks(state: EditorState): Block[] {
  const blocks: Block[] = [];
  const doc = state.doc;
  const tree = syntaxTree(state);
  let lastEnd = 0;

  tree.iterate({
    enter(node) {
      if (node.name === 'FencedCode') {
        if (node.from > lastEnd) {
          const mdContent = doc.sliceString(lastEnd, node.from).trim();
          if (mdContent) {
            blocks.push({
              type: 'markdown',
              language: 'markdown',
              content: { from: lastEnd, to: node.from },
            });
          }
        }

        let language = '';
        let codeTextFrom = -1;
        let codeTextTo = -1;

        for (let child = node.node.firstChild; child; child = child.nextSibling) {
          if (child.name === 'CodeInfo') {
            language = doc.sliceString(child.from, child.to).trim();
          }
          if (child.name === 'CodeText') {
            codeTextFrom = child.from;
            codeTextTo = child.to;
          }
        }

        const openingLine = doc.lineAt(node.from);
        const openingLineTo = openingLine.to;

        if (codeTextFrom === -1) {
          codeTextFrom = openingLineTo + 1;
          codeTextTo = openingLineTo + 1;
        }

        const contentFrom = clampPos(state, codeTextFrom);
        const contentEnd = clampPos(state, codeTextTo);

        blocks.push({
          type: 'code',
          language: language || 'text',
          content: { from: contentFrom, to: contentEnd },
          delimiter: { from: node.from, to: openingLineTo },
        });

        lastEnd = node.to;
      }
    },
  });

  if (lastEnd < doc.length) {
    const mdContent = doc.sliceString(lastEnd, doc.length).trim();
    if (mdContent) {
      blocks.push({
        type: 'markdown',
        language: 'markdown',
        content: { from: lastEnd, to: doc.length },
      });
    }
  }

  if (blocks.length === 0 && doc.length > 0) {
    blocks.push({
      type: 'markdown',
      language: 'markdown',
      content: { from: 0, to: doc.length },
    });
  }

  return blocks;
}

function getClosingFenceLine(state: EditorState, block: Block) {
  if (block.type !== 'code' || !block.delimiter) {
    return null;
  }

  const doc = state.doc;
  const openingLineNumber = doc.lineAt(clampPos(state, block.delimiter.from)).number;

  for (let lineNumber = openingLineNumber + 1; lineNumber <= doc.lines; lineNumber++) {
    const line = doc.line(lineNumber);
    if (line.text.trim().startsWith('```')) {
      return line;
    }
  }

  return null;
}

function getVisibleLines(state: EditorState, block: Block): VisibleBlockLine[] {
  let from = clampPos(state, block.content.from);
  const to = clampPos(state, block.content.to);

  if (block.type === 'markdown' && from > 0 && from < to && state.doc.sliceString(from, from + 1) === '\n') {
    from++;
  }

  if (from >= to || state.doc.length === 0) {
    return [];
  }

  const startLine = state.doc.lineAt(from).number;
  const endLine = state.doc.lineAt(Math.max(from, to - 1)).number;
  const lines: VisibleBlockLine[] = [];

  for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
    lines.push({
      lineNumber,
      localLineNumber: lines.length + 1,
    });
  }

  return lines;
}

function getFallbackAnchors(state: EditorState, block: Block) {
  const doc = state.doc;
  const fallbackLine =
    block.type === 'code' && block.delimiter
      ? doc.lineAt(clampPos(state, block.delimiter.from))
      : doc.lineAt(clampPos(state, block.content.from));

  if (block.type === 'code' && block.delimiter) {
    const closingFenceLine = getClosingFenceLine(state, block) ?? fallbackLine;

    return {
      visibleStartLine: fallbackLine.number,
      visibleEndLine: closingFenceLine.number,
      topAnchorPos: fallbackLine.from,
      bottomAnchorPos: closingFenceLine.to,
    };
  }

  return {
    visibleStartLine: fallbackLine.number,
    visibleEndLine: fallbackLine.number,
    topAnchorPos: fallbackLine.from,
    bottomAnchorPos: fallbackLine.to,
  };
}

export function getVisibleBlocks(state: EditorState): VisibleBlock[] {
  const blocks = state.field(blockState, false) ?? parseBlocks(state);

  return blocks.map((block, blockIndex) => {
    const lines = getVisibleLines(state, block);

    if (lines.length === 0) {
      return {
        blockIndex,
        type: block.type,
        hasNumberedLines: false,
        lines,
        ...getFallbackAnchors(state, block),
      };
    }

    const firstLine = state.doc.line(lines[0].lineNumber);
    const lastLine = state.doc.line(lines.at(-1)!.lineNumber);

    return {
      blockIndex,
      type: block.type,
      visibleStartLine: lines[0].lineNumber,
      visibleEndLine: lines.at(-1)!.lineNumber,
      topAnchorPos: firstLine.from,
      bottomAnchorPos: lastLine.to,
      hasNumberedLines: true,
      lines,
    };
  });
}

export const blockState = StateField.define<Block[]>({
  create(state) {
    return parseBlocks(state);
  },
  update(blocks, tr) {
    if (tr.docChanged || blocks.length === 0) {
      return parseBlocks(tr.state);
    }
    return blocks;
  },
});

export function getActiveBlock(state: EditorState): Block | null {
  const blocks = state.field(blockState);
  const pos = state.selection.main.from;
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i].content.from <= pos) {
      return blocks[i];
    }
  }
  return blocks[0] ?? null;
}

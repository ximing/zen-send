import { StateField, type EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

export interface Block {
  type: 'markdown' | 'code';
  language: string;
  content: { from: number; to: number };
  delimiter?: { from: number; to: number };
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

        const contentEnd = codeTextTo;

        blocks.push({
          type: 'code',
          language: language || 'text',
          content: { from: codeTextFrom, to: contentEnd },
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

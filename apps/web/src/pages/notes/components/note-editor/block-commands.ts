import { EditorView } from '@codemirror/view';
import { Annotation } from '@codemirror/state';
import { blockState, getActiveBlock, type Block } from './block-state';

export const heynoteEvent = Annotation.define<string>();

const LANGUAGES = ['markdown', 'javascript', 'typescript', 'python', 'sql', 'json', 'css', 'html', 'text'];

export function getLanguageList(): string[] {
  return LANGUAGES;
}

function addNewBlockAfterCurrent(view: EditorView): boolean {
  const block = getActiveBlock(view.state);
  if (!block) return false;

  const insertPos = block.type === 'code' ? view.state.doc.lineAt(block.content.to).to + 1 : block.content.to;
  const delimiter = `\n\`\`\`\n\n\`\`\`\n`;

  // Cursor goes to the empty line between the ``` pairs
  // \n``` \n = 5 chars from insertPos
  const codeContentPos = insertPos + 5;

  view.dispatch({
    changes: { from: insertPos, insert: delimiter },
    selection: { anchor: codeContentPos },
    scrollIntoView: true,
    annotations: heynoteEvent.of('addBlock'),
  });
  return true;
}

function deleteCurrentBlock(view: EditorView): boolean {
  const blocks = view.state.field(blockState);
  if (blocks.length <= 1) {
    const block = blocks[0];
    view.dispatch({
      changes: { from: block.content.from, to: block.content.to, insert: '' },
      annotations: heynoteEvent.of('deleteBlock'),
    });
    return true;
  }

  const block = getActiveBlock(view.state);
  if (!block) return false;

  const doc = view.state.doc;
  const from = block.type === 'code' && block.delimiter ? block.delimiter.from : block.content.from;

  let to: number;
  if (block.type === 'code' && block.delimiter) {
    const closingLineNum = doc.lineAt(block.content.to).number + 1;
    if (closingLineNum <= doc.lines) {
      to = Math.min(doc.line(closingLineNum).to + 1, doc.length);
    } else {
      to = block.content.to;
    }
  } else {
    to = block.content.to;
  }

  view.dispatch({
    changes: { from, to, insert: '' },
    annotations: heynoteEvent.of('deleteBlock'),
  });
  return true;
}

export function changeBlockLanguage(view: EditorView, newLang: string): boolean {
  const block = getActiveBlock(view.state);
  if (!block || block.type !== 'code' || !block.delimiter) return false;

  const doc = view.state.doc;
  const line = doc.lineAt(block.delimiter.from);
  const newLine = `\`\`\`${newLang}`;

  view.dispatch({
    changes: { from: line.from, to: line.to, insert: newLine },
    annotations: heynoteEvent.of('changeLanguage'),
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
      annotations: heynoteEvent.of('gotoBlock'),
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
      annotations: heynoteEvent.of('gotoBlock'),
    });
    return true;
  }
  return false;
}

function getBlockEnd(doc: any, block: Block): number {
  if (block.type === 'code' && block.delimiter) {
    const closingLineNum = doc.lineAt(block.content.to).number + 1;
    if (closingLineNum <= doc.lines) {
      return Math.min(doc.line(closingLineNum).to + 1, doc.length);
    }
  }
  return block.content.to;
}

function getBlockFrom(block: Block): number {
  return block.type === 'code' && block.delimiter ? block.delimiter.from : block.content.from;
}

function moveBlockUp(view: EditorView): boolean {
  const blocks = view.state.field(blockState);
  const block = getActiveBlock(view.state);
  if (!block) return false;

  const idx = blocks.indexOf(block);
  if (idx === 0) return false;

  const prev = blocks[idx - 1];
  const prevFrom = getBlockFrom(prev);
  const blockFrom = getBlockFrom(block);
  const blockEnd = getBlockEnd(view.state.doc, block);

  const blockText = view.state.doc.sliceString(blockFrom, blockEnd);
  const prevText = view.state.doc.sliceString(prevFrom, getBlockEnd(view.state.doc, prev));

  view.dispatch({
    changes: { from: prevFrom, to: blockEnd, insert: blockText + prevText },
    annotations: heynoteEvent.of('moveBlock'),
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
  const blockFrom = getBlockFrom(block);
  const nextFrom = getBlockFrom(next);

  const blockText = view.state.doc.sliceString(blockFrom, getBlockEnd(view.state.doc, block));
  const nextText = view.state.doc.sliceString(nextFrom, getBlockEnd(view.state.doc, next));

  view.dispatch({
    changes: { from: blockFrom, to: getBlockEnd(view.state.doc, next), insert: nextText + blockText },
    annotations: heynoteEvent.of('moveBlock'),
  });
  return true;
}

export const blockKeymap = [
  { key: 'Mod-Enter', run: addNewBlockAfterCurrent },
  { key: 'Mod-Shift-d', run: deleteCurrentBlock },
  { key: 'Mod-ArrowUp', run: gotoPreviousBlock },
  { key: 'Mod-ArrowDown', run: gotoNextBlock },
  { key: 'Mod-Shift-ArrowUp', run: moveBlockUp },
  { key: 'Mod-Shift-ArrowDown', run: moveBlockDown },
];

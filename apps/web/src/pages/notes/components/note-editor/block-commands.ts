import { EditorView } from '@codemirror/view';
import { Annotation } from '@codemirror/state';
import { blockState, getActiveBlock, type Block } from './block-state';
import { blockCopiedEffect, clearCopiedEffect } from './block-decoration';

export const heynoteEvent = Annotation.define<string>();

const LANGUAGES = ['markdown', 'javascript', 'typescript', 'python', 'sql', 'json', 'css', 'html', 'text'];

export function getLanguageList(): string[] {
  return LANGUAGES;
}

function selectAllInBlock(view: EditorView): boolean {
  const block = getActiveBlock(view.state);
  if (!block) return false;
  view.dispatch({
    selection: { anchor: block.content.from, head: block.content.to },
  });
  return true;
}

function copyBlock(view: EditorView): boolean {
  const sel = view.state.selection.main;
  if (!sel.empty) return false;
  const block = getActiveBlock(view.state);
  if (!block) return false;
  const text = view.state.doc.sliceString(block.content.from, block.content.to);
  navigator.clipboard.writeText(text).then(() => {
    view.dispatch({ effects: blockCopiedEffect.of({ from: block.content.from, to: block.content.to }) });
    setTimeout(() => {
      if (view.dom.isConnected) {
        view.dispatch({ effects: clearCopiedEffect.of(null) });
      }
    }, 200);
  }).catch(() => {
    // Clipboard API failed — permissions or insecure context
  });
  return true;
}

function addNewBlockAfterCurrent(view: EditorView): boolean {
  const block = getActiveBlock(view.state);
  if (!block) return false;

  const doc = view.state.doc;

  // Find the position right after the current block's full extent
  // (including closing ``` line for code blocks)
  const blockEnd = getBlockEnd(doc, block);
  const insertPos = Math.min(blockEnd, doc.length);

  const delimiter = `\n\`\`\`markdown\n\n\`\`\`\n`;

  // Find cursor position: the empty line between the ``` pairs
  // delimiter layout: \n```\n<cursor_here>\n```\n
  const firstNewline = delimiter.indexOf('\n');
  const secondNewline = delimiter.indexOf('\n', firstNewline + 1);
  const codeContentPos = insertPos + secondNewline + 1;

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
  const block = getActiveBlock(view.state);
  if (!block) return false;

  const doc = view.state.doc;

  // Only one block — just clear its content, preserve block structure
  if (blocks.length <= 1) {
    const content = doc.sliceString(block.content.from, block.content.to).trim();
    if (content === '') return true; // Already empty, nothing to do
    view.dispatch({
      changes: { from: block.content.from, to: block.content.to, insert: '' },
      selection: { anchor: block.content.from },
      annotations: heynoteEvent.of('deleteBlock'),
    });
    return true;
  }

  // Multiple blocks — delete entire block and move cursor
  const idx = blocks.indexOf(block);

  let from: number;
  let to: number;
  if (block.type === 'code' && block.delimiter) {
    from = block.delimiter.from;
    const closingLineNum = doc.lineAt(block.content.to).number + 1;
    if (closingLineNum <= doc.lines) {
      const closingLine = doc.line(closingLineNum);
      if (closingLine.text.trim() === '```' || closingLine.text.trim().startsWith('```')) {
        to = Math.min(closingLine.to + 1, doc.length);
      } else {
        to = block.content.to;
      }
    } else {
      to = block.content.to;
    }
  } else {
    from = block.content.from;
    to = block.content.to;
  }

  // Consume the newline before the block to avoid leftover blank lines
  if (from > 0 && doc.sliceString(from - 1, from) === '\n') {
    from -= 1;
  }

  // Cursor: end of previous block, or start of next block
  let cursorPos: number;
  if (idx > 0) {
    const prev = blocks[idx - 1];
    // Previous block's content end is at prev.content.to, but we may have deleted
    // a newline at the boundary. Calculate cursor in the new document.
    cursorPos = Math.min(from, Math.max(0, prev.content.to - 1));
  } else {
    // Deleting first block — cursor goes to start of what was the next block
    cursorPos = from;
  }

  view.dispatch({
    changes: { from, to, insert: '' },
    selection: { anchor: cursorPos },
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

export function convertBlockToCode(view: EditorView, language: string): boolean {
  const block = getActiveBlock(view.state);
  if (!block || block.type !== 'markdown') return false;
  const content = view.state.doc.sliceString(block.content.from, block.content.to).trimEnd();
  const newContent = `\`\`\`${language}\n${content}\n\`\`\`\n`;
  view.dispatch({
    changes: { from: block.content.from, to: block.content.to, insert: newContent },
    selection: { anchor: block.content.from + language.length + 4 },
    annotations: heynoteEvent.of('convertBlock'),
  });
  return true;
}

export function convertBlockToMarkdown(view: EditorView): boolean {
  const block = getActiveBlock(view.state);
  if (!block || block.type !== 'code' || !block.delimiter) return false;
  const content = view.state.doc.sliceString(block.content.from, block.content.to);
  const doc = view.state.doc;
  let to = block.content.to;
  const closingLineNum = doc.lineAt(block.content.to).number + 1;
  if (closingLineNum <= doc.lines) {
    const closingLine = doc.line(closingLineNum);
    if (closingLine.text.trim() === '```' || closingLine.text.trim().startsWith('```')) {
      to = Math.min(closingLine.to + 1, doc.length);
    }
  }
  view.dispatch({
    changes: { from: block.delimiter.from, to, insert: content },
    selection: { anchor: block.delimiter.from },
    annotations: heynoteEvent.of('convertBlock'),
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

function backspaceInBlock(view: EditorView): boolean {
  const block = getActiveBlock(view.state);
  if (!block) return false;

  const sel = view.state.selection.main;
  // Only intercept when there's no selection (simple cursor) and cursor is at block start
  if (!sel.empty) return false;
  if (sel.from !== block.content.from) return false;

  // Cursor at start of block with no selection — check if block is empty
  const content = view.state.doc.sliceString(block.content.from, block.content.to).trim();
  if (content !== '') return false;

  // Empty block at cursor start — delete the entire block
  return deleteCurrentBlock(view);
}

function deleteInBlock(view: EditorView): boolean {
  const block = getActiveBlock(view.state);
  if (!block) return false;

  const sel = view.state.selection.main;
  // Only intercept when there's no selection and cursor is at block end
  if (!sel.empty) return false;
  if (sel.from !== block.content.to) return false;

  const content = view.state.doc.sliceString(block.content.from, block.content.to).trim();
  if (content !== '') return false;

  return deleteCurrentBlock(view);
}

export const blockKeymap = [
  { key: 'Mod-a', run: selectAllInBlock },
  { key: 'Mod-c', run: copyBlock },
  { key: 'Mod-Enter', run: addNewBlockAfterCurrent },
  { key: 'Mod-Shift-d', run: deleteCurrentBlock },
  { key: 'Backspace', run: backspaceInBlock },
  { key: 'Delete', run: deleteInBlock },
  { key: 'Mod-ArrowUp', run: gotoPreviousBlock },
  { key: 'Mod-ArrowDown', run: gotoNextBlock },
  { key: 'Mod-Shift-ArrowUp', run: moveBlockUp },
  { key: 'Mod-Shift-ArrowDown', run: moveBlockDown },
];

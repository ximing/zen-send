import { lineNumbers, GutterMarker, lineNumberWidgetMarker, type WidgetType } from '@codemirror/view';
import type { EditorState } from '@codemirror/state';
import { getVisibleBlocks } from './block-state';

export function getBlockLineNumber(state: EditorState, lineNo: number): string {
  if (lineNo < 1 || lineNo > state.doc.lines) {
    return '';
  }

  const visibleBlocks = getVisibleBlocks(state);

  for (const block of visibleBlocks) {
    const visibleLine = block.lines.find((line) => line.lineNumber === lineNo);
    if (visibleLine) {
      return String(visibleLine.localLineNumber);
    }
  }

  return '';
}

class EmptyWidgetMarker extends GutterMarker {
  toDOM() {
    return document.createTextNode('');
  }
}

const emptyMarker = new EmptyWidgetMarker();

export const blockLineNumbers = [
  lineNumbers({
    formatNumber(lineNo: number, state: EditorState) {
      return getBlockLineNumber(state, lineNo);
    },
  }),
  lineNumberWidgetMarker.of((_view: unknown, _widget: WidgetType) => emptyMarker),
];

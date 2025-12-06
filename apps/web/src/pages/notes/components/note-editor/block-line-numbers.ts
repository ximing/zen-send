import {
  lineNumbers,
  GutterMarker,
  lineNumberWidgetMarker,
  type WidgetType,
} from '@codemirror/view';
import { getBlockLineFromPos, type VisibleBlock } from './block-state';

export function getBlockLineNumberFromBlocks(
  visibleBlocks: VisibleBlock[],
  lineNo: number
): string {
  for (const block of visibleBlocks) {
    const visibleLine = block.lines.find((line) => line.lineNumber === lineNo);
    if (visibleLine) {
      return String(visibleLine.localLineNumber);
    }
  }

  return '';
}

export function getBlockLineNumber(
  state: Parameters<typeof getBlockLineFromPos>[0],
  lineNo: number
): string {
  if (lineNo < 1 || lineNo > state.doc.lines) {
    return '';
  }

  const lineInfo = getBlockLineFromPos(state, state.doc.line(lineNo).from);
  if (lineInfo !== null) {
    return String(lineInfo.line);
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
    formatNumber(lineNo: number, state: Parameters<typeof getBlockLineFromPos>[0]) {
      return getBlockLineNumber(state, lineNo);
    },
    domEventHandlers: {
      click(view: { focus: () => void }) {
        view.focus();
        return true;
      },
    },
  }),
  lineNumberWidgetMarker.of((_view: unknown, _widget: WidgetType) => emptyMarker),
];

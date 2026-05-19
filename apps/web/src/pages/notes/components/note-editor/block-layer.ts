import { EditorView, layer, RectangleMarker } from '@codemirror/view';
import { blockState } from './block-state';

export const blockLayer = layer({
  above: false,

  markers(view: EditorView) {
    const markers: RectangleMarker[] = [];
    let idx = 0;

    function rangesOverlap(
      range1: { from: number; to: number },
      range2: { from: number; to: number },
    ) {
      return range1.from <= range2.to && range2.from <= range1.to;
    }

    const blocks = view.state.field(blockState);
    for (const block of blocks) {
      // make sure the block is visible
      if (!view.visibleRanges.some((range) => rangesOverlap(block.content, range))) {
        idx++;
        continue;
      }

      const fromPos = Math.max(block.content.from, view.visibleRanges[0].from);
      const toPos = Math.min(block.content.to, view.visibleRanges[view.visibleRanges.length - 1].to);
      const fromCoordsTop = view.lineBlockAt(fromPos)?.top;
      const toLine = view.state.doc.lineAt(toPos);
      const toLinePos =
        toLine.length === 0
          ? toLine.from
          : Math.max(fromPos, Math.min(toPos, block.content.to));
      let toCoordsBottom = view.lineBlockAt(toLinePos)?.bottom;

      // Extend the last block to fill the remaining editor height
      if (idx === blocks.length - 1) {
        const extraHeight =
          (view as unknown as { viewState: { editorHeight: number } }).viewState.editorHeight -
          (view.defaultLineHeight + view.documentPadding.top + 11);
        if (extraHeight > 0) {
          toCoordsBottom += extraHeight;
        }
      }

      markers.push(
        new RectangleMarker(
          idx % 2 === 0 ? 'block-even' : 'block-odd',
          0,
          fromCoordsTop - 2,
          null, // width is set to 100% in CSS
          toCoordsBottom - fromCoordsTop + 15,
        ),
      );
      idx++;
    }

    return markers;
  },

  update(update) {
    return update.docChanged || update.viewportChanged;
  },

  class: 'heynote-blocks-layer',
});

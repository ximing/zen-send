import { EditorView, layer, type LayerMarker, type ViewUpdate } from '@codemirror/view';
import { blockState } from './block-state';

class BlockMarker implements LayerMarker {
  constructor(
    readonly className: string,
    readonly top: number,
    readonly height: number,
  ) {}

  draw() {
    const elt = document.createElement('div');
    elt.className = this.className;
    elt.style.cssText = `position:absolute;top:${this.top}px;height:${this.height}px;left:0;right:0;`;
    return elt;
  }

  update(elt: HTMLElement) {
    elt.style.top = this.top + 'px';
    elt.style.height = this.height + 'px';
    return true;
  }

  eq(other: BlockMarker) {
    return this.className === other.className && this.top === other.top && this.height === other.height;
  }
}

function buildMarkers(view: EditorView): LayerMarker[] {
  const blocks = view.state.field(blockState);
  const markers: LayerMarker[] = [];

  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    const className = index % 2 === 0 ? 'cm-block-even' : 'cm-block-odd';
    const fromPos = block.type === 'code' && block.delimiter ? block.delimiter.from : block.content.from;
    const toPos = block.content.to;

    try {
      const top = view.coordsAtPos(Math.max(0, fromPos))?.top;
      const bottom = view.coordsAtPos(Math.min(view.state.doc.length, toPos))?.bottom;

      if (top !== undefined && bottom !== undefined) {
        const editorTop = view.dom.getBoundingClientRect().top;
        markers.push(new BlockMarker(className, top - editorTop, bottom - top));
      }
    } catch {
      // Skip blocks that can't be positioned
    }
  }

  return markers;
}

export const blockLayer = layer({
  above: false,
  markers(view: EditorView) {
    return buildMarkers(view);
  },
  update(update: ViewUpdate, _layer: HTMLElement) {
    return update.docChanged || update.viewportChanged;
  },
  class: 'cm-blocks-layer',
});

import { EditorView, layer, type LayerMarker, type ViewUpdate } from '@codemirror/view';
import { getVisibleBlocks } from './block-state';

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
  const visibleBlocks = getVisibleBlocks(view.state);
  const markers: LayerMarker[] = [];

  for (let index = 0; index < visibleBlocks.length; index++) {
    const visibleBlock = visibleBlocks[index];
    const className = index % 2 === 0 ? 'cm-block-even' : 'cm-block-odd';

    try {
      const top = view.coordsAtPos(visibleBlock.topAnchorPos)?.top;
      const bottom = view.coordsAtPos(visibleBlock.bottomAnchorPos)?.bottom;

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
    return update.docChanged || update.viewportChanged || update.heightChanged || update.geometryChanged;
  },
  class: 'cm-blocks-layer',
});

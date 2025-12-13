import {
  EditorView,
  keymap,
  highlightActiveLine,
  drawSelection,
  rectangularSelection,
  highlightSpecialChars,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { yCollab } from 'y-codemirror.next';
import type * as Y from 'yjs';
import type * as awarenessProtocol from 'y-protocols/awareness';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  selectAll,
} from '@codemirror/commands';
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  foldGutter,
  indentOnInput,
  bracketMatching,
  foldKeymap,
} from '@codemirror/language';
import { search, searchKeymap } from '@codemirror/search';
import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from '@codemirror/autocomplete';
import { heynoteLang } from './lang-heynote/heynote';
import { theme as appTheme } from '../../../../theme/tokens';

export const themeCompartment = new Compartment();

export function createCollabExtensions(
  ytext: Y.Text,
  awareness: awarenessProtocol.Awareness
): Extension {
  return yCollab(ytext, awareness);
}

/**
 * Ensures .cm-gutters height covers the full scroll area so that
 * the gutter background doesn't disappear when scrolling vertically.
 *
 * CodeMirror sets `height: 100%` on `.cm-gutters` which equals the
 * scroller's clientHeight. When the content is taller and the user
 * scrolls down, the gutter element scrolls up along with the content,
 * leaving an uncolored gap at the bottom of the gutter area.
 *
 * This plugin syncs the gutter height with the scroller's scrollHeight
 * so the background always covers the visible viewport.
 */
const gutterHeightFix = ViewPlugin.fromClass(
  class {
    update(update: ViewUpdate) {
      if (update.geometryChanged || update.viewportChanged) {
        const gutters = update.view.dom.querySelector<HTMLElement>('.cm-gutters');
        if (gutters) {
          const scrollHeight = update.view.scrollDOM.scrollHeight;
          const currentHeight = parseInt(gutters.style.height || '0', 10);
          if (currentHeight !== scrollHeight) {
            gutters.style.height = scrollHeight + 'px';
          }
        }
      }
    }
  },
);

export function createEditorExtensions(isDark: boolean) {
  return [
    heynoteLang(),
    gutterHeightFix,
    highlightActiveLine(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    search(),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap.filter((binding) => binding.run !== selectAll),
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      indentWithTab,
    ]),
    EditorView.lineWrapping,
    themeCompartment.of(createEditorTheme(isDark)),
  ];
}

export function createEditorTheme(isDark: boolean) {
  const t = isDark ? appTheme.dark : appTheme.light;
  const accentSoft = isDark ? 'rgba(139, 154, 125, 0.15)' : 'rgba(139, 154, 125, 0.12)';
  const searchMatch = isDark ? 'rgba(139, 154, 125, 0.30)' : 'rgba(139, 154, 125, 0.25)';
  const searchMatchSelected = isDark ? 'rgba(139, 154, 125, 0.60)' : 'rgba(139, 154, 125, 0.55)';
  const mono = "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace";

  return EditorView.theme(
    {
      '&': {
        fontSize: '13px',
        height: '100%',
      },
      '.cm-content': {
        fontFamily: mono,
        padding: '8px 0',
        lineHeight: '1.4',
      },
      '.cm-gutters': {
        backgroundColor: t.bgSurface,
        color: t.textMuted,
        border: 'none',
        lineHeight: '1.4',
      },
      '.cm-gutterElement': { lineHeight: '1.4' },
      '.cm-line': { lineHeight: '1.4' },
      '.cm-activeLineGutter': {
        backgroundColor: accentSoft,
        color: t.textPrimary,
      },
      '.cm-activeLine': { backgroundColor: accentSoft },
      '&.cm-focused .cm-cursor': { borderLeftColor: t.accent },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: `${accentSoft} !important`,
      },
      '.cm-scroller': { overflowX: 'auto' },
      // Block layer
      '.heynote-blocks-layer': { width: '100%' },
      '.heynote-blocks-layer .block-even': {
        width: '100%',
        boxSizing: 'content-box',
        backgroundColor: t.bgSurface,
      },
      '.heynote-blocks-layer .block-odd': {
        width: '100%',
        boxSizing: 'content-box',
        backgroundColor: t.bgPrimary,
      },
      '.heynote-block-start': { height: '12px' },
      '.heynote-block-start.first': { height: '0px' },
      '.cm-activeLine.heynote-empty-block-selected': { backgroundColor: accentSoft },
      '.cm-block-copied': { animation: 'cm-block-flash 200ms ease-out' },
      '@keyframes cm-block-flash': {
        '0%': { backgroundColor: accentSoft },
        '100%': { backgroundColor: 'transparent' },
      },
      // Search panel
      '.cm-panels': {
        backgroundColor: t.bgSurface,
        color: t.textPrimary,
      },
      '.cm-panel.cm-search': {
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flexWrap: 'wrap',
      },
      '.cm-panel.cm-search .cm-textfield': {
        backgroundColor: t.bgPrimary,
        border: `1px solid ${isDark ? '#2e2e30' : '#e8e5e0'}`,
        borderRadius: '4px',
        color: t.textPrimary,
        fontSize: '12px',
        fontFamily: mono,
        padding: '3px 8px',
        outline: 'none',
        margin: '0',
      },
      '.cm-panel.cm-search .cm-textfield:focus': {
        borderColor: t.accent,
      },
      '.cm-panel.cm-search input[type=checkbox]': {
        accentColor: t.accent,
        margin: '0',
      },
      '.cm-button': {
        backgroundImage: 'none',
      },
      '.cm-panel.cm-search button': {
        backgroundImage: 'none',
        backgroundColor: 'transparent',
        border: `1px solid ${isDark ? '#2e2e30' : '#e8e5e0'}`,
        borderRadius: '4px',
        color: t.textSecondary,
        fontSize: '12px',
        padding: '3px 8px',
        cursor: 'pointer',
        margin: '0',
      },
      '.cm-panel.cm-search button:hover': {
        backgroundImage: 'none',
        backgroundColor: t.bgPrimary,
        color: t.textPrimary,
      },
      '.cm-panel.cm-search button:active': {
        backgroundImage: 'none',
        backgroundColor: t.bgElevated,
      },
      '.cm-panel.cm-search button[name=close]': {
        border: 'none',
        padding: '3px 6px',
      },
      '.cm-panel.cm-search label': {
        color: t.textSecondary,
        fontSize: '12px',
        margin: '0',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      },
      '.cm-searchMatch': {
        backgroundColor: searchMatch,
        borderRadius: '2px',
      },
      '.cm-searchMatch-selected': {
        backgroundColor: searchMatchSelected,
      },
    },
    { dark: isDark }
  );
}

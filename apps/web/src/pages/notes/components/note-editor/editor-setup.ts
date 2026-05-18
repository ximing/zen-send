import {
  EditorView,
  keymap,
  highlightActiveLine,
  drawSelection,
  rectangularSelection,
  highlightSpecialChars,
} from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab, selectAll } from '@codemirror/commands';
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

export function createEditorExtensions() {
  return [
    heynoteLang(),
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
    createEditorTheme(),
  ];
}

function createEditorTheme() {
  return EditorView.theme({
    '&': {
      fontSize: '13px',
      height: '100%',
    },
    '.cm-content': {
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      padding: '8px 0',
      lineHeight: '1.4',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--bg-surface)',
      color: 'var(--text-muted)',
      border: 'none',
      borderRight: '1px solid var(--border-subtle)',
      lineHeight: '1.4',
    },
    '.cm-gutterElement': {
      lineHeight: '1.4',
    },
    '.cm-line': {
      lineHeight: '1.4',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--accent-soft)',
      color: 'var(--text-primary)',
    },
    '.cm-activeLine': {
      backgroundColor: 'var(--accent-soft)',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: 'var(--accent)',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'var(--accent-soft) !important',
    },
    '.cm-scroller': {
      overflow: 'auto',
    },
    '.heynote-blocks-layer': {
      width: '100%',
    },
    '.heynote-blocks-layer .block-even': {
      width: '100%',
      boxSizing: 'content-box',
      backgroundColor: 'var(--bg-surface)',
      borderTop: '1px solid var(--border-subtle)',
    },
    '.heynote-blocks-layer .block-odd': {
      width: '100%',
      boxSizing: 'content-box',
      backgroundColor: 'var(--bg-primary)',
      borderTop: '1px solid var(--border-subtle)',
    },
    '.heynote-blocks-layer .block-even:first-child': {
      borderTop: 'none',
    },
    '.heynote-block-start': {
      height: '12px',
    },
    '.heynote-block-start.first': {
      height: '0px',
    },
    '.cm-activeLine.heynote-empty-block-selected': {
      backgroundColor: 'var(--accent-soft)',
    },
    '.cm-block-copied': {
      animation: 'cm-block-flash 200ms ease-out',
    },
    '@keyframes cm-block-flash': {
      '0%': { backgroundColor: 'var(--accent-soft)' },
      '100%': { backgroundColor: 'transparent' },
    },
    // Search panel
    '.cm-panels': {
      backgroundColor: 'var(--bg-surface)',
      borderTop: '1px solid var(--border-subtle)',
      color: 'var(--text-primary)',
    },
    '.cm-panel.cm-search': {
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      flexWrap: 'wrap',
    },
    '.cm-panel.cm-search input': {
      backgroundColor: 'var(--bg-primary)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '4px',
      color: 'var(--text-primary)',
      fontSize: '12px',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      padding: '3px 8px',
      outline: 'none',
      margin: '0',
    },
    '.cm-panel.cm-search input:focus': {
      borderColor: 'var(--accent)',
    },
    '.cm-panel.cm-search button': {
      backgroundColor: 'transparent',
      border: '1px solid var(--border-subtle)',
      borderRadius: '4px',
      color: 'var(--text-secondary)',
      fontSize: '12px',
      padding: '3px 8px',
      cursor: 'pointer',
      margin: '0',
    },
    '.cm-panel.cm-search button:hover': {
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    },
    '.cm-panel.cm-search button[name=close]': {
      border: 'none',
      padding: '3px 6px',
      position: 'static',
    },
    '.cm-panel.cm-search label': {
      color: 'var(--text-secondary)',
      fontSize: '12px',
      margin: '0',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    '.cm-searchMatch': {
      backgroundColor: 'rgba(139, 154, 125, 0.25)',
      borderRadius: '2px',
    },
    '.cm-searchMatch-selected': {
      backgroundColor: 'rgba(139, 154, 125, 0.55)',
    },
  });
}

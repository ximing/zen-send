import { EditorView, keymap, highlightActiveLine, drawSelection, rectangularSelection, highlightSpecialChars } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, foldGutter, indentOnInput, bracketMatching, foldKeymap } from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';

export function createEditorExtensions() {
  return [
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
    highlightSelectionMatches(),
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
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
    },
    '.cm-gutters': {
      backgroundColor: 'var(--bg-surface)',
      color: 'var(--text-muted)',
      border: 'none',
      borderRight: '1px solid var(--border-subtle)',
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
    '.cm-block-even': {
      backgroundColor: 'var(--bg-surface)',
    },
    '.cm-block-odd': {
      backgroundColor: 'var(--bg-primary)',
    },
    '.cm-blocks-layer': {
      pointerEvents: 'none',
    },
    // Block separator — first line of each block gets a top border
    '.cm-block-start': {
      borderTop: '1px solid var(--border-subtle)',
      paddingTop: '6px',
      marginTop: '6px',
    },
    // Code block lines — subtle background
    '.cm-block-code': {
      backgroundColor: 'var(--bg-surface)',
    },
    '.cm-block-code-body': {
      backgroundColor: 'var(--bg-surface)',
    },
    '.cm-block-copied': {
      animation: 'cm-block-flash 200ms ease-out',
    },
    '@keyframes cm-block-flash': {
      '0%': { backgroundColor: 'var(--accent-soft)' },
      '100%': { backgroundColor: 'transparent' },
    },
  });
}

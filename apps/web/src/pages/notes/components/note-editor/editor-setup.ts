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
  HighlightStyle,
  foldGutter,
  indentOnInput,
  bracketMatching,
  foldKeymap,
} from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
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
export const highlightCompartment = new Compartment();

// Dark: Rosé Pine–inspired muted palette, no harsh blues
// Light: warm editorial tones
export const darkHighlight = HighlightStyle.define([
  { tag: t.comment, color: '#6B7A5E', fontStyle: 'italic' },
  { tag: t.lineComment, color: '#6B7A5E', fontStyle: 'italic' },
  { tag: t.blockComment, color: '#6B7A5E', fontStyle: 'italic' },
  { tag: t.docComment, color: '#6B7A5E', fontStyle: 'italic' },
  { tag: t.keyword, color: '#C3A6C9' },                  // soft lavender
  { tag: t.controlKeyword, color: '#C3A6C9' },
  { tag: t.operatorKeyword, color: '#C3A6C9' },
  { tag: t.definitionKeyword, color: '#C3A6C9' },
  { tag: t.moduleKeyword, color: '#C3A6C9' },
  { tag: t.string, color: '#9FC9A4' },                   // sage green
  { tag: t.special(t.string), color: '#9FC9A4' },
  { tag: t.regexp, color: '#EBBCBA' },                   // muted rose
  { tag: t.number, color: '#EAC88A' },                   // warm amber
  { tag: t.bool, color: '#EAC88A' },
  { tag: t.null, color: '#EAC88A' },
  { tag: t.typeName, color: '#9DC4D4' },                 // muted teal (replaces harsh blue)
  { tag: t.className, color: '#9DC4D4' },
  { tag: t.definition(t.typeName), color: '#9DC4D4' },
  { tag: t.function(t.variableName), color: '#D4B8A0' }, // warm sand
  { tag: t.function(t.propertyName), color: '#D4B8A0' },
  { tag: t.definition(t.variableName), color: '#E5E2DC' },
  { tag: t.variableName, color: '#E5E2DC' },
  { tag: t.propertyName, color: '#C5BFB5' },
  { tag: t.attributeName, color: '#9FC9A4' },
  { tag: t.attributeValue, color: '#9FC9A4' },
  { tag: t.tagName, color: '#C3A6C9' },
  { tag: t.angleBracket, color: '#6B7A5E' },
  { tag: t.operator, color: '#C5BFB5' },
  { tag: t.punctuation, color: '#7A7568' },
  { tag: t.bracket, color: '#8A8880' },
  { tag: t.meta, color: '#6B7A5E' },
  { tag: t.processingInstruction, color: '#6B7A5E' },
  { tag: t.invalid, color: '#f87171', textDecoration: 'underline' },
  { tag: t.heading, color: '#D4B8A0', fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.link, color: '#9FC9A4', textDecoration: 'underline' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.url, color: '#9FC9A4' },
]);

export const lightHighlight = HighlightStyle.define([
  { tag: t.comment, color: '#9A958F', fontStyle: 'italic' },
  { tag: t.lineComment, color: '#9A958F', fontStyle: 'italic' },
  { tag: t.blockComment, color: '#9A958F', fontStyle: 'italic' },
  { tag: t.docComment, color: '#9A958F', fontStyle: 'italic' },
  { tag: t.keyword, color: '#7C5B8A' },
  { tag: t.controlKeyword, color: '#7C5B8A' },
  { tag: t.operatorKeyword, color: '#7C5B8A' },
  { tag: t.definitionKeyword, color: '#7C5B8A' },
  { tag: t.moduleKeyword, color: '#7C5B8A' },
  { tag: t.string, color: '#4A7A52' },
  { tag: t.special(t.string), color: '#4A7A52' },
  { tag: t.regexp, color: '#A0522D' },
  { tag: t.number, color: '#B8860B' },
  { tag: t.bool, color: '#B8860B' },
  { tag: t.null, color: '#B8860B' },
  { tag: t.typeName, color: '#2C6E8A' },
  { tag: t.className, color: '#2C6E8A' },
  { tag: t.definition(t.typeName), color: '#2C6E8A' },
  { tag: t.function(t.variableName), color: '#7A4F2E' },
  { tag: t.function(t.propertyName), color: '#7A4F2E' },
  { tag: t.definition(t.variableName), color: '#2C2C2C' },
  { tag: t.variableName, color: '#2C2C2C' },
  { tag: t.propertyName, color: '#5C5850' },
  { tag: t.attributeName, color: '#4A7A52' },
  { tag: t.attributeValue, color: '#4A7A52' },
  { tag: t.tagName, color: '#7C5B8A' },
  { tag: t.angleBracket, color: '#9A958F' },
  { tag: t.operator, color: '#5C5850' },
  { tag: t.punctuation, color: '#9A958F' },
  { tag: t.bracket, color: '#7A7570' },
  { tag: t.meta, color: '#9A958F' },
  { tag: t.processingInstruction, color: '#9A958F' },
  { tag: t.invalid, color: '#dc2626', textDecoration: 'underline' },
  { tag: t.heading, color: '#7A4F2E', fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.link, color: '#4A7A52', textDecoration: 'underline' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.url, color: '#4A7A52' },
]);

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
    highlightCompartment.of(syntaxHighlighting(isDark ? darkHighlight : lightHighlight, { fallback: true })),
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

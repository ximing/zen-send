import { parser } from './parser.js';
import { configureNesting } from './nested-parser.js';
import {
  LRLanguage,
  LanguageSupport,
  foldNodeProp,
} from '@codemirror/language';
import { styleTags, tags as t } from '@lezer/highlight';
import { json } from '@codemirror/lang-json';

const FOLD_LABEL_LENGTH = 30;

export const HeynoteLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      styleTags({
        NoteDelimiter: t.tagName,
      }),
      foldNodeProp.add({
        NoteContent(node, state) {
          return {
            from: Math.min(state.doc.lineAt(node.from).to, node.from + FOLD_LABEL_LENGTH),
            to: node.to,
          };
        },
      }),
    ],
    wrap: configureNesting(),
  }),
  languageData: {
    commentTokens: { line: ';' },
  },
});

export function heynoteLang() {
  const wrap = configureNesting();
  const lang = HeynoteLanguage.configure({ dialect: '', wrap });
  return [new LanguageSupport(lang, [json().support])];
}

import { jsonLanguage } from '@codemirror/lang-json';
import { pythonLanguage } from '@codemirror/lang-python';
import {
  javascriptLanguage,
  typescriptLanguage,
} from '@codemirror/lang-javascript';
import { htmlLanguage } from '@codemirror/lang-html';
import { StandardSQL } from '@codemirror/lang-sql';
import { markdownLanguage } from '@codemirror/lang-markdown';
import { cssLanguage } from '@codemirror/lang-css';
import type { Parser } from '@lezer/common';

export interface LanguageDef {
  token: string;
  name: string;
  parser: Parser | null;
}

export const LANGUAGES: LanguageDef[] = [
  {
    token: 'text',
    name: 'Plain Text',
    parser: null,
  },
  {
    token: 'markdown',
    name: 'Markdown',
    parser: markdownLanguage.parser,
  },
  {
    token: 'javascript',
    name: 'JavaScript',
    parser: javascriptLanguage.parser,
  },
  {
    token: 'typescript',
    name: 'TypeScript',
    parser: typescriptLanguage.parser,
  },
  {
    token: 'python',
    name: 'Python',
    parser: pythonLanguage.parser,
  },
  {
    token: 'sql',
    name: 'SQL',
    parser: StandardSQL.language.parser,
  },
  {
    token: 'json',
    name: 'JSON',
    parser: jsonLanguage.parser,
  },
  {
    token: 'css',
    name: 'CSS',
    parser: cssLanguage.parser,
  },
  {
    token: 'html',
    name: 'HTML',
    parser: htmlLanguage.parser,
  },
];

const languageMapping: Record<string, Parser | null> = Object.fromEntries(
  LANGUAGES.map((l) => [l.token, l.parser]),
);

export function getLanguageParser(token: string): Parser | null {
  return languageMapping[token] ?? null;
}

export const LANGUAGE_TOKENS = LANGUAGES.map((l) => l.token);

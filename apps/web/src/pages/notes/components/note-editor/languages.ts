import { jsonLanguage } from '@codemirror/lang-json';
import { pythonLanguage } from '@codemirror/lang-python';
import { javascriptLanguage, typescriptLanguage } from '@codemirror/lang-javascript';
import { htmlLanguage } from '@codemirror/lang-html';
import { StandardSQL } from '@codemirror/lang-sql';
import { markdownLanguage } from '@codemirror/lang-markdown';
import { cssLanguage } from '@codemirror/lang-css';
import { languages as languageData } from '@codemirror/language-data';
import type { Parser } from '@lezer/common';

export interface LanguageDef {
  token: string;
  name: string;
  parser: Parser | null;
}

// Eagerly-loaded languages (bundled)
export const LANGUAGES: LanguageDef[] = [
  { token: 'text', name: 'Plain Text', parser: null },
  { token: 'markdown', name: 'Markdown', parser: markdownLanguage.parser },
  { token: 'javascript', name: 'JavaScript', parser: javascriptLanguage.parser },
  { token: 'typescript', name: 'TypeScript', parser: typescriptLanguage.parser },
  { token: 'python', name: 'Python', parser: pythonLanguage.parser },
  { token: 'sql', name: 'SQL', parser: StandardSQL.language.parser },
  { token: 'json', name: 'JSON', parser: jsonLanguage.parser },
  { token: 'css', name: 'CSS', parser: cssLanguage.parser },
  { token: 'html', name: 'HTML', parser: htmlLanguage.parser },
];

// Lazily-loaded languages via @codemirror/language-data
// token → language-data name (as returned by LanguageDescription.name)
const LAZY_LANGUAGE_MAP: Record<string, string> = {
  shell: 'Shell',
  go: 'Go',
  rust: 'Rust',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  ruby: 'Ruby',
  swift: 'Swift',
  kotlin: 'Kotlin',
  php: 'PHP',
  yaml: 'YAML',
  toml: 'TOML',
  xml: 'XML',
  dockerfile: 'Dockerfile',
  diff: 'diff',
  r: 'R',
};

export interface LazyLanguageDef {
  token: string;
  name: string;
}

export const LAZY_LANGUAGES: LazyLanguageDef[] = Object.entries(LAZY_LANGUAGE_MAP).map(
  ([token, name]) => ({ token, name })
);

// Combined token list for block delimiter regex
export const LANGUAGE_TOKENS = [
  ...LANGUAGES.map((l) => l.token),
  ...LAZY_LANGUAGES.map((l) => l.token),
];

const eagerMapping: Record<string, Parser | null> = Object.fromEntries(
  LANGUAGES.map((l) => [l.token, l.parser])
);

// Cache for lazily loaded parsers
const lazyCache = new Map<string, Parser | null>();

// Kick off background loading for all lazy languages
const loadPromises = new Map<string, Promise<void>>();

function loadLazy(token: string): void {
  if (loadPromises.has(token)) return;
  const langName = LAZY_LANGUAGE_MAP[token];
  if (!langName) return;
  const desc = languageData.find((d) => d.name === langName);
  if (!desc) {
    lazyCache.set(token, null);
    return;
  }
  const p = desc.load().then((support) => {
    lazyCache.set(token, support.language.parser);
  });
  loadPromises.set(token, p);
}

// Pre-warm all lazy languages in the background
Object.keys(LAZY_LANGUAGE_MAP).forEach(loadLazy);

export function getLanguageParser(token: string): Parser | null {
  if (token in eagerMapping) return eagerMapping[token];
  if (lazyCache.has(token)) return lazyCache.get(token) ?? null;
  loadLazy(token);
  return null;
}

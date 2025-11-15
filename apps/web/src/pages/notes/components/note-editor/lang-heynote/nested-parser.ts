import { parseMixed } from '@lezer/common';
import { NoteContent, NoteLanguage } from './parser.terms';
import { getLanguageParser } from '../languages';

export function configureNesting() {
  return parseMixed((node, input) => {
    const id = node.type.id;
    if (id === NoteContent) {
      const noteLang = node.node.parent?.firstChild?.getChildren(NoteLanguage)[0];
      if (!noteLang) return null;
      const langName = input.read(noteLang.from, noteLang.to);

      if (node.node.from === node.node.to) {
        return null;
      }

      const parser = getLanguageParser(langName);
      if (parser) {
        return {
          parser,
          overlay: [{ from: node.from, to: node.to }],
        };
      }
    }
    return null;
  });
}

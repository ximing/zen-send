import { StateField, type EditorState, Transaction } from '@codemirror/state';
import { syntaxTree, syntaxTreeAvailable } from '@codemirror/language';
import { IterMode } from '@lezer/common';
import { Note, Document, NoteDelimiter } from './lang-heynote/parser.terms';
import { LANGUAGE_TOKENS } from './languages';

export const BLOCK_MARKER = '∞∞∞';
export const DEFAULT_BLOCK_LANGUAGE = 'markdown';

const languageTokensMatcher = LANGUAGE_TOKENS.join('|');
export const BLOCK_DELIMITER_REGEX = new RegExp(
  `\\n${BLOCK_MARKER}(${languageTokensMatcher})(-a)?(?:;[^\\n]+)*\\n`,
  'g',
);
const CREATED_METADATA_REGEX = /;created=([^;\n]+)/;

export function getBlockDelimiter(language: string, auto = false, date?: Date): string {
  date = date ?? new Date();
  return `\n${BLOCK_MARKER}${auto ? language + '-a' : language};created=${date.toISOString()}\n`;
}

export const DEFAULT_BLOCK_CONTENT = getBlockDelimiter(DEFAULT_BLOCK_LANGUAGE);

export function migrateFromMarkdownFormat(content: string): string {
  if (content.includes(BLOCK_MARKER)) return content;
  if (!content) return DEFAULT_BLOCK_CONTENT;

  const FENCE_REGEX = /```([a-zA-Z0-9+-.]*)\n([\s\S]*?)```/g;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = FENCE_REGEX.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const mdContent = content.slice(lastIndex, match.index).trim();
      if (mdContent) {
        result += getBlockDelimiter('markdown') + mdContent;
      }
    }
    const lang = match[1] || 'text';
    const codeContent = match[2].trimEnd();
    result += getBlockDelimiter(lang) + codeContent;
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex).trim();
    if (remaining) {
      result += getBlockDelimiter('markdown') + remaining;
    }
  }

  if (!result) {
    result = getBlockDelimiter('markdown') + content.trim();
  }

  return result;
}

export interface Block {
  language: { name: string; auto: boolean };
  content: { from: number; to: number };
  delimiter: { from: number; to: number };
  range: { from: number; to: number };
  created?: string;
}

export interface VisibleBlockLine {
  lineNumber: number;
  localLineNumber: number;
}

export interface VisibleBlock {
  blockIndex: number;
  language: string;
  visibleStartLine: number;
  visibleEndLine: number;
  contentTopPos?: number;
  contentBottomPos?: number;
  blockTopPos: number;
  blockBottomPos: number;
  hasNumberedLines: boolean;
  lines: VisibleBlockLine[];
}

export let firstBlockDelimiterSize: number | undefined;

function getBlocksFromSyntaxTree(state: EditorState): Block[] {
  const blocks: Block[] = [];
  const tree = syntaxTree(state);
  if (!tree) return blocks;

  tree.iterate({
    enter(type) {
      if (type.type.id === Document || type.type.id === Note) {
        return true;
      } else if (type.type.id === NoteDelimiter) {
        const langNode = type.node.getChild('NoteLanguage');
        const language = langNode ? state.doc.sliceString(langNode.from, langNode.to) : 'text';
        const isAuto = !!type.node.getChild('Auto');

        let created: string | undefined;
        const metadataNode = type.node.getChild('Metadata');
        if (metadataNode) {
          for (let entry = metadataNode.firstChild; entry; entry = entry.nextSibling) {
            if (entry.name === 'MetadataEntry') {
              const keyNode = entry.getChild('MetadataKey');
              const valueNode = entry.getChild('MetadataValue');
              if (!keyNode || !valueNode) continue;
              const key = state.doc.sliceString(keyNode.from, keyNode.to);
              const value = state.doc.sliceString(valueNode.from, valueNode.to);
              if (key === 'created') {
                created = value;
              }
            }
          }
        }

        const contentNode = type.node.nextSibling;

        if (contentNode) {
          blocks.push({
            language: { name: language, auto: isAuto },
            content: { from: contentNode.from, to: contentNode.to },
            delimiter: { from: type.from, to: type.to },
            range: { from: type.node.from, to: contentNode.to },
            created,
          });
        } else {
          blocks.push({
            language: { name: language, auto: isAuto },
            content: { from: type.to, to: type.to },
            delimiter: { from: type.from, to: type.to },
            range: { from: type.node.from, to: type.to },
            created,
          });
        }
        return false;
      }
      return false;
    },
    mode: IterMode.IgnoreMounts,
  });

  firstBlockDelimiterSize = blocks[0]?.delimiter.to;
  return blocks;
}

function getBlocksFromString(state: EditorState): Block[] {
  const blocks: Block[] = [];
  const doc = state.doc;
  if (doc.length === 0) return blocks;

  const text = doc.sliceString(0, doc.length);
  const matches = [...text.matchAll(BLOCK_DELIMITER_REGEX)];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const nextMatch = i < matches.length - 1 ? matches[i + 1] : null;

    const blockStart = match.index!;
    const blockEnd = nextMatch ? nextMatch.index! : doc.length;
    const delimiterEnd = blockStart + match[0].length;

    const delimiterText = match[0];
    const createdMatch = delimiterText.match(CREATED_METADATA_REGEX);
    const created = createdMatch ? createdMatch[1] : undefined;

    blocks.push({
      language: {
        name: match[1],
        auto: match[2] === '-a',
      },
      content: { from: delimiterEnd, to: blockEnd },
      delimiter: { from: blockStart, to: delimiterEnd },
      range: { from: blockStart, to: blockEnd },
      created,
    });
  }

  firstBlockDelimiterSize = blocks[0]?.delimiter.to;
  return blocks;
}

function getBlocks(state: EditorState): Block[] {
  if (syntaxTreeAvailable(state, state.doc.length)) {
    return getBlocksFromSyntaxTree(state);
  }
  return getBlocksFromString(state);
}

function getVisibleLines(state: EditorState, block: Block): VisibleBlockLine[] {
  const from = Math.max(0, block.content.from);
  const to = Math.min(block.content.to, state.doc.length);

  if (from >= to || state.doc.length === 0) {
    return [];
  }

  const startLine = state.doc.lineAt(from).number;
  const endLine = state.doc.lineAt(Math.max(from, to - 1)).number;
  const lines: VisibleBlockLine[] = [];

  for (let lineNumber = startLine; lineNumber <= endLine; lineNumber++) {
    lines.push({
      lineNumber,
      localLineNumber: lines.length + 1,
    });
  }

  return lines;
}

function getBlockGeometry(state: EditorState, block: Block) {
  const doc = state.doc;
  const delimiterLine = doc.lineAt(Math.max(0, Math.min(block.delimiter.from, doc.length - 1)));
  const contentEndLine = doc.lineAt(
    Math.max(0, Math.min(Math.max(block.content.to - 1, 0), doc.length - 1)),
  );

  return {
    visibleStartLine: delimiterLine.number,
    visibleEndLine: contentEndLine.number,
    blockTopPos: delimiterLine.from,
    blockBottomPos: contentEndLine.to,
  };
}

export function getVisibleBlocks(state: EditorState): VisibleBlock[] {
  const blocks = state.field(blockState, false) ?? getBlocks(state);

  return blocks.map((block, blockIndex) => {
    const lines = getVisibleLines(state, block);
    const geometry = getBlockGeometry(state, block);

    if (lines.length === 0) {
      return {
        blockIndex,
        language: block.language.name,
        hasNumberedLines: false,
        lines,
        ...geometry,
      };
    }

    const firstLine = state.doc.line(lines[0].lineNumber);
    const lastLine = state.doc.line(lines.at(-1)!.lineNumber);

    return {
      blockIndex,
      language: block.language.name,
      visibleStartLine: lines[0].lineNumber,
      visibleEndLine: lines.at(-1)!.lineNumber,
      contentTopPos: firstLine.from,
      contentBottomPos: lastLine.to,
      blockTopPos: geometry.blockTopPos,
      blockBottomPos: geometry.blockBottomPos,
      hasNumberedLines: true,
      lines,
    };
  });
}

export const blockState = StateField.define<Block[]>({
  create(state) {
    return getBlocks(state);
  },
  update(blocks, tr) {
    if (tr.docChanged || blocks.length === 0) {
      return getBlocks(tr.state);
    }
    return blocks;
  },
});

export function getActiveBlock(state: EditorState): Block | null {
  const blocks = state.field(blockState);
  if (blocks.length === 0) return null;
  const head = state.selection.main.head;
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].content.to >= head) {
      return blocks[i];
    }
  }
  return blocks[blocks.length - 1];
}

export function getBlockFromPos(state: EditorState, pos: number): Block | null {
  const blocks = state.field(blockState);
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i].range.from <= pos && blocks[i].range.to >= pos) {
      return blocks[i];
    }
  }
  return blocks[0] ?? null;
}

export function getBlockLineFromPos(state: EditorState, pos: number) {
  const line = state.doc.lineAt(pos);
  const block = state
    .field(blockState)
    .find((b) => b.content.from <= line.from && b.content.to >= line.from);
  if (block) {
    const firstBlockLine = state.doc.lineAt(block.content.from).number;
    return {
      line: line.number - firstBlockLine + 1,
      col: pos - line.from + 1,
      length: line.length,
    };
  }
  return null;
}

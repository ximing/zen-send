import assert from 'node:assert/strict';
import test from 'node:test';
import {
  escapeLike,
  likeContainsPattern,
  rankNoteHits,
  type NoteSearchSource,
} from '../src/services/note-search.ts';

const marker = '\n∞∞∞markdown;created=2024-01-01T00:00:00.000Z\n';

function note(partial: Partial<NoteSearchSource> & Pick<NoteSearchSource, 'id'>): NoteSearchSource {
  return {
    title: partial.title ?? '未命名笔记',
    content: partial.content ?? '',
    updatedAt: partial.updatedAt ?? 1,
    id: partial.id,
  };
}

test('escapes LIKE wildcards and backslashes', () => {
  assert.equal(escapeLike('100%_a\\b'), '100\\%\\_a\\\\b');
  assert.equal(likeContainsPattern(' Hi '), '%hi%');
});

test('matches case-insensitively and reports UTF-16 offsets into the original text', () => {
  const content = 'Say Hello';
  const hits = rankNoteHits([note({ id: '1', content })], 'hello');
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.matches.length, 1);
  const match = hits[0]?.matches[0];
  assert.ok(match);
  assert.equal(content.slice(match.start, match.end), 'Hello');
  assert.equal(match.snippet.includes('Hello'), true);
});

test('matches Chinese substrings', () => {
  const content = '今天天气不错';
  const hits = rankNoteHits([note({ id: '1', content })], '天气');
  const match = hits[0]?.matches[0];
  assert.ok(match);
  assert.equal(content.slice(match.start, match.end), '天气');
  assert.equal(match.snippet.includes('天气'), true);
});

test('skips block delimiter lines and keeps offsets on the body hit', () => {
  const content = `${marker}hello created world`;
  const hits = rankNoteHits([note({ id: '1', content })], 'created');
  assert.equal(hits.length, 1);
  assert.equal(hits[0]?.matches.length, 1);
  const match = hits[0]?.matches[0];
  assert.ok(match);
  assert.equal(content.slice(match.start, match.end), 'created');
  assert.ok(match.start >= marker.length);
  assert.equal(match.snippet.includes('∞∞∞'), false);
  assert.equal(match.snippet.includes('created='), false);
  assert.equal(match.snippet.includes('created'), true);
});

test('drops a note whose only hit is inside a delimiter line', () => {
  const content = `${marker}hello`;
  const hits = rankNoteHits([note({ id: '1', content })], 'markdown');
  assert.deepEqual(hits, []);
});

test('returns at most three body matches', () => {
  const hits = rankNoteHits([note({ id: '1', content: 'a a a a' })], 'a');
  assert.equal(hits[0]?.matches.length, 3);
  assert.deepEqual(
    hits[0]?.matches.map((match) => match.start),
    [0, 2, 4]
  );
});

test('ranks title matches ahead of body matches, then by updatedAt', () => {
  const hits = rankNoteHits(
    [
      note({ id: 'body-old', title: 'other', content: 'needle', updatedAt: 200 }),
      note({ id: 'title-old', title: 'needle old', content: '', updatedAt: 100 }),
      note({ id: 'body-new', title: 'z', content: 'needle', updatedAt: 300 }),
      note({ id: 'title-new', title: 'needle new', content: 'x', updatedAt: 400 }),
    ],
    'needle'
  );
  assert.deepEqual(
    hits.map((hit) => hit.id),
    ['title-new', 'title-old', 'body-new', 'body-old']
  );
  assert.equal(hits[0]?.titleMatch, true);
  assert.equal(hits[2]?.titleMatch, false);
  assert.equal(hits[1]?.matches.length, 0);
});

test('caps the result at 20 notes', () => {
  const notes = Array.from({ length: 25 }, (_, index) =>
    note({ id: `n${index}`, title: 'needle', updatedAt: index })
  );
  const hits = rankNoteHits(notes, 'needle');
  assert.equal(hits.length, 20);
  assert.equal(hits[0]?.id, 'n24');
});

test('centers a short snippet on the match inside a long note', () => {
  const content = `${'甲'.repeat(200)}目标${'乙'.repeat(200)}`;
  const hits = rankNoteHits([note({ id: '1', content })], '目标');
  const snippet = hits[0]?.matches[0]?.snippet ?? '';
  assert.equal(snippet.includes('目标'), true);
  assert.equal(snippet.startsWith('…'), true);
  assert.equal(snippet.endsWith('…'), true);
  assert.ok(snippet.length <= 82);
});

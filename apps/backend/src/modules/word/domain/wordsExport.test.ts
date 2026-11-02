import { describe, expect, it } from 'vitest';

import type { Word, WordOccurrence } from './types/word.ts';
import { buildAnki, buildCsv } from './wordsExport.ts';

function occurrence(overrides: Partial<WordOccurrence> = {}): WordOccurrence {
  return {
    id: 'o1',
    bookId: 'b1',
    bookTitle: 'Harry Potter',
    surfaceForm: 'fled',
    sentence: 'Harry fled from the room.',
    translation: 'uciekać',
    createdAt: new Date('2026-11-02T10:00:00Z'),
    ...overrides,
  };
}

function word(occurrences: WordOccurrence[], lemma = 'flee'): Word {
  return {
    id: 'w1',
    lemma,
    sourceLanguage: 'en',
    targetLanguage: 'pl',
    createdAt: new Date('2026-11-02T10:00:00Z'),
    knownAt: null,
    encounters: occurrences.length,
    occurrences,
  };
}

describe('buildCsv', () => {
  it('writes a header and one row per sentence, with a BOM for Excel', () => {
    const csv = buildCsv([
      word([occurrence(), occurrence({ id: 'o2', sentence: 'They fled.', translation: 'zbiec' })]),
    ]);

    expect(csv.startsWith('\uFEFF"word","meaning"')).toBe(true);
    expect(csv.slice(1).trim().split('\r\n')).toEqual([
      '"word","meaning","sentence","word_in_sentence","book","source_language","target_language"',
      '"flee","uciekać","Harry fled from the room.","fled","Harry Potter","en","pl"',
      '"flee","zbiec","They fled.","fled","Harry Potter","en","pl"',
    ]);
  });

  it('escapes quotes and keeps commas and line breaks inside the cell', () => {
    const csv = buildCsv([word([occurrence({ sentence: 'He said "run", then\nfled.' })])]);

    expect(csv).toContain('"He said ""run"", then\nfled."');
  });

  it('defuses cells that a spreadsheet would run as a formula', () => {
    const csv = buildCsv([word([occurrence({ sentence: '=HYPERLINK("http://evil")', translation: '-1+1' })])]);

    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(csv).toContain(`"'-1+1"`);
  });

  it('returns only the header when there are no words', () => {
    expect(buildCsv([]).trim().split('\r\n')).toHaveLength(1);
  });
});

describe('buildAnki', () => {
  it('starts with the import settings Anki understands', () => {
    expect(buildAnki([]).split('\n').slice(0, 4)).toEqual([
      '#separator:tab',
      '#html:true',
      '#columns:Front\tBack\tContext\tTags',
      '#tags column:4',
    ]);
  });

  it('writes one note per word with distinct meanings, bold sentences and book tags', () => {
    const lines = buildAnki([
      word([
        occurrence(),
        occurrence({ id: 'o2', sentence: 'They fled.', translation: 'uciekać' }),
        occurrence({ id: 'o3', sentence: 'Fled!', translation: 'zbiec', bookTitle: 'Treasure Island' }),
      ]),
    ])
      .trim()
      .split('\n');

    expect(lines).toHaveLength(5);
    expect(lines[4]?.split('\t')).toEqual([
      'flee',
      'uciekać, zbiec',
      'Harry <b>fled</b> from the room.<br><br>They <b>fled</b>.<br><br><b>Fled</b>!',
      'underlined Harry_Potter Treasure_Island',
    ]);
  });

  it('escapes HTML and removes tabs and line breaks from the fields', () => {
    const lines = buildAnki([word([occurrence({ sentence: 'a <i>fled</i>\tover\nthere', translation: 'x\ty' })])])
      .trim()
      .split('\n');

    expect(lines).toHaveLength(5);
    expect(lines[4]?.split('\t')).toHaveLength(4);
    expect(lines[4]).toContain('a &lt;i&gt;<b>fled</b>&lt;/i&gt; over there');
    expect(lines[4]).toContain('x y');
  });

  it('keeps the sentence as it is when the word cannot be found in it', () => {
    const lines = buildAnki([word([occurrence({ surfaceForm: 'missing' })])]).split('\n');

    expect(lines[4]).toContain('Harry fled from the room.');
    expect(lines[4]).not.toContain('<b>');
  });
});

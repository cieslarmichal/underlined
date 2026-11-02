import type { Word } from './types/word.ts';

export type ExportFormat = 'csv' | 'anki';

// A formula-looking cell would be executed by spreadsheet apps, and sentences come from OCR of arbitrary pages.
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

function csvCell(value: string): string {
  const safe = FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix)) ? `'${value}` : value;

  return `"${safe.replaceAll('"', '""')}"`;
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

// Tab-separated fields must not contain tabs or line breaks.
function ankiField(value: string): string {
  return value.replace(/[\t\r\n]+/g, ' ').trim();
}

function boldWord(sentence: string, surfaceForm: string): string {
  const index = surfaceForm ? sentence.toLowerCase().indexOf(surfaceForm.toLowerCase()) : -1;

  if (index === -1) {
    return escapeHtml(sentence);
  }

  const end = index + surfaceForm.length;

  return `${escapeHtml(sentence.slice(0, index))}<b>${escapeHtml(sentence.slice(index, end))}</b>${escapeHtml(sentence.slice(end))}`;
}

function distinct(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

// One row per saved sentence, ready for a spreadsheet. Starts with a BOM so Excel reads the UTF-8 letters correctly.
export function buildCsv(words: Word[]): string {
  const rows = [['word', 'meaning', 'sentence', 'word_in_sentence', 'book', 'source_language', 'target_language']];

  for (const word of words) {
    for (const occurrence of word.occurrences) {
      rows.push([
        word.lemma,
        occurrence.translation,
        occurrence.sentence,
        occurrence.surfaceForm,
        occurrence.bookTitle,
        word.sourceLanguage,
        word.targetLanguage,
      ]);
    }
  }

  return `﻿${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

function tag(value: string): string {
  return value.trim().replace(/\s+/g, '_').replaceAll('::', '_');
}

// One note per word. Anki reads the leading "#" lines as import settings (Anki 2.1.54 or newer).
export function buildAnki(words: Word[]): string {
  const lines = ['#separator:tab', '#html:true', '#columns:Front\tBack\tContext\tTags', '#tags column:4'];

  for (const word of words) {
    if (word.occurrences.length === 0) {
      continue;
    }

    const meanings = distinct(word.occurrences.map((occurrence) => occurrence.translation));
    const context = word.occurrences
      .map((occurrence) => boldWord(occurrence.sentence, occurrence.surfaceForm))
      .join('<br><br>');
    const tags = ['underlined', ...distinct(word.occurrences.map((occurrence) => occurrence.bookTitle)).map(tag)];

    lines.push(
      [
        ankiField(escapeHtml(word.lemma)),
        ankiField(escapeHtml(meanings.join(', '))),
        ankiField(context),
        ankiField(tags.join(' ')),
      ].join('\t'),
    );
  }

  return `${lines.join('\n')}\n`;
}

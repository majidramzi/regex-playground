import { describe, expect, it } from 'vitest';
import { exportSavedPatterns, importSavedPatterns } from './savedPatterns';
import type { SavedPattern } from './types';

const saved: SavedPattern = {
  id: 'saved-1',
  name: 'Digits',
  description: 'Find digits',
  pattern: String.raw`\d+`,
  flags: 'g',
  testText: 'a12',
  replacement: '[$&]',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-02T00:00:00.000Z',
};

describe('saved pattern JSON', () => {
  it('round-trips the exported object format', () => {
    const imported = importSavedPatterns(exportSavedPatterns([saved]));
    expect(imported).toEqual([saved]);
  });

  it('accepts a raw array and defaults optional fields', () => {
    const imported = importSavedPatterns(JSON.stringify([{ name: 'Draft', pattern: '(' }]));
    expect(imported[0]).toMatchObject({ name: 'Draft', pattern: '(', flags: '', testText: '', replacement: '' });
    expect(imported[0]?.id).toBeTruthy();
  });

  it('rejects malformed JSON, duplicate flags, and invalid payload shapes', () => {
    expect(() => importSavedPatterns('{not json')).toThrow(/valid JSON/);
    expect(() => importSavedPatterns('{}')).toThrow(/array/);
    expect(() => importSavedPatterns(JSON.stringify([{ name: 'Bad', pattern: 'x', flags: 'gg' }]))).toThrow(/duplicate flag/);
  });
});

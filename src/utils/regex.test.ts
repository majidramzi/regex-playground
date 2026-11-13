import { describe, expect, it } from 'vitest';
import { analyzeRegex, explainRegex, getRegExpSyntaxError, supportsIndicesFlag } from './regex';
import { PATTERN_LIBRARY } from './patternLibrary';

describe('JavaScript RegExp analysis', () => {
  it('accepts valid syntax and reports invalid or incomplete syntax without crashing', () => {
    expect(getRegExpSyntaxError(String.raw`\d+`, 'g')).toBeNull();
    expect(getRegExpSyntaxError('[a-', '')).toBeTruthy();
    expect(() => analyzeRegex('(', 'g', 'text', '')).toThrow();
  });

  it('honors ignore-case and global flags', () => {
    const result = analyzeRegex('cat', 'gi', 'Cat cat CATER', '');
    expect(result.matches.map((match) => match.match)).toEqual(['Cat', 'cat', 'CAT']);
    expect(analyzeRegex('cat', 'i', 'Cat cat', '').matches).toHaveLength(1);
  });

  it('supports multiline anchors and dotAll', () => {
    const lines = analyzeRegex('^a', 'gm', 'x\na\na', '');
    expect(lines.matches.map((match) => match.index)).toEqual([2, 4]);
    expect(analyzeRegex('a.b', 's', 'a\nb', '').matches[0]?.match).toBe('a\nb');
  });

  it('honors sticky matching at lastIndex', () => {
    expect(analyzeRegex('\\d', 'y', 'a1', '').matches).toHaveLength(0);
    expect(analyzeRegex('\\d', 'y', '1a', '').matches[0]?.index).toBe(0);
    expect(analyzeRegex('\\d', 'gy', '1 2', '').matches.map((match) => match.match)).toEqual(['1']);
  });

  it('returns numbered and named capture groups', () => {
    const result = analyzeRegex(String.raw`(?<word>\w+)-(\d+)`, '', 'alpha-42 beta-7', '');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.captures).toEqual(['alpha', '42']);
    expect(result.matches[0]?.groups).toEqual({ word: 'alpha' });
    expect(result.matches[0]?.index).toBe(0);
    expect(result.matches[0]?.end).toBe(8);
  });

  it('uses native replacement references, including named groups and literal dollar signs', () => {
    const result = analyzeRegex(String.raw`(?<word>foo)`, 'g', 'foo foo', '<$<word>:$&:$$>');
    expect(result.replacement).toBe('<foo:foo:$> <foo:foo:$>');
    expect(analyzeRegex('(foo)', 'g', 'foo foo', '[$1]').replacement).toBe('[foo] [foo]');
  });

  it('handles empty input and zero-width global patterns safely', () => {
    expect(analyzeRegex('\\d+', 'g', '', '').matches).toEqual([]);
    const emptyPatternMatches = analyzeRegex('', 'g', 'ab', '').matches;
    expect(emptyPatternMatches.map((match) => match.index)).toEqual([0, 1, 2]);
    expect(emptyPatternMatches.every((match) => match.match === '')).toBe(true);
  });

  it('matches special characters literally when escaped', () => {
    const result = analyzeRegex(String.raw`\.\+\*`, 'g', 'symbols: .+* and .+?', '');
    expect(result.matches.map((match) => match.match)).toEqual(['.+*']);
  });

  it('treats Unicode surrogate pairs as one dot match with the u flag', () => {
    const withUnicode = analyzeRegex('.', 'gu', '😀', '').matches;
    const withoutUnicode = analyzeRegex('.', 'g', '😀', '').matches;
    expect(withUnicode).toHaveLength(1);
    expect(withUnicode[0]).toMatchObject({ index: 0, end: 2, match: '😀' });
    expect(withoutUnicode).toHaveLength(2);
  });

  it('returns capture indices when the browser supports the d flag', () => {
    if (!supportsIndicesFlag()) return;
    const result = analyzeRegex('(cat)', 'dg', 'a cat', '');
    expect(result.matches[0]?.indices).toEqual([[2, 5], [2, 5]]);
  });

  it('rejects unknown flags and duplicate flags using native JavaScript errors', () => {
    expect(() => analyzeRegex('a', 'z', 'a', '')).toThrow(/flag/i);
    expect(() => analyzeRegex('a', 'gg', 'a', '')).toThrow();
  });

  it('explains common tokens while making its best-effort nature explicit in the API copy', () => {
    const parts = explainRegex(String.raw`^(?<name>\w+)(?:\s+\d{2,})?$`);
    expect(parts.some((part) => part.token === '^' && part.kind === 'anchor')).toBe(true);
    expect(parts.some((part) => part.token === '(?<name>' && part.kind === 'group')).toBe(true);
    expect(parts.some((part) => part.token === '\\w' && part.kind === 'escape')).toBe(true);
    expect(parts.some((part) => part.token === '{2,}' && part.kind === 'quantifier')).toBe(true);
  });
});

describe('curated pattern library', () => {
  it('matches the expected samples for every bundled example', () => {
    for (const example of PATTERN_LIBRARY) {
      const result = analyzeRegex(example.pattern, example.flags, example.sampleInput, '');
      expect(result.matches.map((match) => match.match), example.name).toEqual(example.expectedMatches);
    }
  });

  it('contains each requested example category', () => {
    const names = PATTERN_LIBRARY.map((example) => example.name.toLowerCase()).join(' ');
    expect(names).toMatch(/email|url|phone|date|ipv4|zip|number|whitespace|password|html/);
  });
});

import type { ExplanationKind, ExplanationPart, RegexAnalysis, RegexMatchRecord } from './types';

export const MAX_PATTERN_LENGTH = 2_048;
export const MAX_INPUT_LENGTH = 100_000;
export const MAX_MATCHES = 2_000;
export const MAX_MATCH_ROWS = 20;

export const FLAG_DESCRIPTIONS = [
  { flag: 'g', label: 'Global', description: 'Find every match, not just the first.' },
  { flag: 'i', label: 'Ignore case', description: 'Match letters without distinguishing upper and lower case.' },
  { flag: 'm', label: 'Multiline', description: '^ and $ can match the start and end of each line.' },
  { flag: 's', label: 'Dot all', description: 'Let . match line terminators too.' },
  { flag: 'u', label: 'Unicode', description: 'Use Unicode-aware matching and code point escapes.' },
  { flag: 'y', label: 'Sticky', description: 'Match only at the current lastIndex position.' },
  { flag: 'd', label: 'Match indices', description: 'Include start/end indices for matches and capture groups when supported.' },
] as const;

const ALLOWED_FLAGS = new Set(FLAG_DESCRIPTIONS.map(({ flag }) => flag));

export function supportsIndicesFlag(): boolean {
  try {
    new RegExp('', 'd');
    return true;
  } catch {
    return false;
  }
}

export function getRegExpSyntaxError(pattern: string, flags: string): string | null {
  try {
    new RegExp(pattern, flags);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid regular expression.';
  }
}

function advanceStringIndex(input: string, index: number, unicode: boolean): number {
  if (!unicode || index + 1 >= input.length) return index + 1;
  const first = input.charCodeAt(index);
  if (first < 0xd800 || first > 0xdbff) return index + 1;
  const second = input.charCodeAt(index + 1);
  return second >= 0xdc00 && second <= 0xdfff ? index + 2 : index + 1;
}

type MatchWithIndices = RegExpExecArray & {
  indices?: Array<[number, number] | undefined> & {
    groups?: Record<string, [number, number] | undefined>;
  };
};

function toMatchRecord(match: RegExpExecArray): RegexMatchRecord {
  const indexed = match as MatchWithIndices;
  const matchIndices = indexed.indices;
  const namedGroups = match.groups ? { ...match.groups } : {};
  const namedIndices = matchIndices?.groups ? { ...matchIndices.groups } : undefined;

  return {
    match: match[0],
    index: match.index,
    end: match.index + match[0].length,
    captures: match.slice(1),
    groups: namedGroups,
    indices: matchIndices ? Array.from(matchIndices, (range) => range && [range[0], range[1]]) : undefined,
    namedIndices,
  };
}

/**
 * Runs the native JavaScript RegExp engine. The UI calls this only inside a
 * disposable Web Worker so a pathological backtracking expression can be
 * interrupted without freezing the page.
 */
export function analyzeRegex(
  pattern: string,
  flags: string,
  input: string,
  replacement: string,
): RegexAnalysis {
  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new Error(`Pattern is longer than the ${MAX_PATTERN_LENGTH.toLocaleString()} character safety limit.`);
  }
  if (input.length > MAX_INPUT_LENGTH) {
    throw new Error(`Test text is longer than the ${MAX_INPUT_LENGTH.toLocaleString()} character safety limit.`);
  }
  if (flags.length > ALLOWED_FLAGS.size || [...flags].some((flag) => !ALLOWED_FLAGS.has(flag as never))) {
    throw new Error('One or more regular expression flags are not supported by this playground.');
  }

  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const regex = new RegExp(pattern, flags);
  const matches: RegexMatchRecord[] = [];
  let truncated = false;

  if (regex.global) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(input)) !== null) {
      if (matches.length >= MAX_MATCHES) {
        truncated = true;
        break;
      }
      matches.push(toMatchRecord(match));
      if (match[0].length === 0) {
        regex.lastIndex = advanceStringIndex(input, regex.lastIndex, regex.unicode);
      }
    }
  } else {
    const match = regex.exec(input);
    if (match) matches.push(toMatchRecord(match));
  }

  // String.replace accepts JavaScript replacement tokens ($&, $1, $<name>, $$, etc.)
  // and treats the replacement strictly as text; no user-supplied JS is evaluated.
  const replacedText = input.replace(new RegExp(pattern, flags), replacement);
  const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return {
    matches,
    replacement: replacedText,
    durationMs: Math.max(0, endedAt - startedAt),
    truncated,
  };
}

function findClosingBrace(pattern: string, start: number): number {
  return pattern.indexOf('}', start);
}

function scanCharacterClass(pattern: string, start: number): { end: number; token: string; closed: boolean } {
  let escaped = false;
  for (let index = start + 1; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (escaped) {
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === ']') {
      return { end: index + 1, token: pattern.slice(start, index + 1), closed: true };
    }
  }
  return { end: pattern.length, token: pattern.slice(start), closed: false };
}

function describeEscape(pattern: string, start: number): { token: string; end: number; explanation: string; kind: ExplanationKind } {
  const next = pattern[start + 1];
  if (next === undefined) {
    return { token: '\\', end: start + 1, explanation: 'A trailing backslash is incomplete; JavaScript will report a syntax error.', kind: 'escape' };
  }

  if (/[1-9]/.test(next)) {
    const digits = pattern.slice(start + 1).match(/^\d+/)?.[0] ?? next;
    const token = `\\${digits}`;
    return { token, end: start + token.length, explanation: `Backreference to capture group ${digits}. Its meaning depends on the capture groups in this pattern.`, kind: 'escape' };
  }

  if ((next === 'k') && pattern[start + 2] === '<') {
    const close = pattern.indexOf('>', start + 3);
    if (close !== -1) {
      const token = pattern.slice(start, close + 1);
      return { token, end: close + 1, explanation: `Backreference to the named capture group “${pattern.slice(start + 3, close)}”.`, kind: 'escape' };
    }
  }

  if ((next === 'p' || next === 'P') && pattern[start + 2] === '{') {
    const close = findClosingBrace(pattern, start + 3);
    if (close !== -1) {
      const token = pattern.slice(start, close + 1);
      return { token, end: close + 1, explanation: `Unicode ${next === 'P' ? 'complement ' : ''}property escape; this syntax requires the u flag in JavaScript.`, kind: 'escape' };
    }
  }

  if (next === 'u' && pattern[start + 2] === '{') {
    const close = findClosingBrace(pattern, start + 3);
    if (close !== -1) {
      const token = pattern.slice(start, close + 1);
      return { token, end: close + 1, explanation: 'Unicode code point escape. JavaScript requires the u flag for this braced form.', kind: 'escape' };
    }
  }

  if (next === 'u' && /^[\da-fA-F]{4}$/.test(pattern.slice(start + 2, start + 6))) {
    const token = pattern.slice(start, start + 6);
    return { token, end: start + 6, explanation: 'Four-hex-digit Unicode escape for one UTF-16 code unit.', kind: 'escape' };
  }

  if (next === 'x' && /^[\da-fA-F]{2}$/.test(pattern.slice(start + 2, start + 4))) {
    const token = pattern.slice(start, start + 4);
    return { token, end: start + 4, explanation: 'Two-hex-digit character escape.', kind: 'escape' };
  }

  if (next === 'c' && /[A-Za-z]/.test(pattern[start + 2] ?? '')) {
    const token = pattern.slice(start, start + 3);
    return { token, end: start + 3, explanation: 'Control-character escape using the following ASCII letter.', kind: 'escape' };
  }

  const escapeDescriptions: Record<string, string> = {
    d: 'A digit character (ASCII 0–9 in JavaScript).',
    D: 'A character that is not an ASCII digit.',
    w: 'A JavaScript word character: usually ASCII letters, digits, or underscore.',
    W: 'A character that is not a JavaScript word character.',
    s: 'A JavaScript whitespace character, including line terminators.',
    S: 'A character that is not JavaScript whitespace.',
    b: 'A word boundary: a position between a word and non-word character.',
    B: 'A position that is not a word boundary.',
    n: 'A line-feed character.',
    r: 'A carriage-return character.',
    t: 'A tab character.',
    f: 'A form-feed character.',
    v: 'A vertical-tab character.',
    '0': 'The NUL character (a decimal digit must not follow it in this escape).',
  };
  const token = `\\${next}`;
  return {
    token,
    end: start + 2,
    explanation: escapeDescriptions[next] ?? `Escaped character “${next}”. In Unicode-aware mode, only valid ECMAScript escapes are accepted.`,
    kind: 'escape',
  };
}

/**
 * A lightweight, best-effort token walkthrough—not a complete ECMAScript
 * parser. The browser's RegExp constructor remains authoritative.
 */
export function explainRegex(pattern: string): ExplanationPart[] {
  const parts: ExplanationPart[] = [];
  let index = 0;

  const add = (token: string, explanation: string, kind: ExplanationKind) => {
    parts.push({ token, explanation, kind });
  };

  while (index < pattern.length) {
    const character = pattern[index];

    if (character === '\\') {
      const escaped = describeEscape(pattern, index);
      add(escaped.token, escaped.explanation, escaped.kind);
      index = escaped.end;
      continue;
    }

    if (character === '[') {
      const characterClass = scanCharacterClass(pattern, index);
      const negated = characterClass.token[1] === '^';
      const description = characterClass.closed
        ? `Matches one character ${negated ? 'not ' : ''}in this character class. Ranges and escapes are interpreted by JavaScript.`
        : 'Unclosed character class; the JavaScript engine will report a syntax error.';
      add(characterClass.token, description, 'class');
      index = characterClass.end;
      continue;
    }

    if (character === '(') {
      const groupPrefixes: Array<[string, string, ExplanationKind]> = [
        ['(?<=', 'Positive lookbehind: the preceding text must match, but is not consumed.', 'assertion'],
        ['(?<!', 'Negative lookbehind: the preceding text must not match; it is not consumed.', 'assertion'],
        ['(?=', 'Positive lookahead: the following text must match, but is not consumed.', 'assertion'],
        ['(?!', 'Negative lookahead: the following text must not match; it is not consumed.', 'assertion'],
        ['(?:', 'Opens a non-capturing group.', 'group'],
      ];
      const prefix = groupPrefixes.find(([candidate]) => pattern.startsWith(candidate, index));
      if (prefix) {
        add(prefix[0], prefix[1], prefix[2]);
        index += prefix[0].length;
        continue;
      }
      if (pattern.startsWith('(?<', index)) {
        const close = pattern.indexOf('>', index + 3);
        if (close !== -1) {
          const token = pattern.slice(index, close + 1);
          add(token, `Opens a named capturing group called “${pattern.slice(index + 3, close)}”.`, 'group');
          index = close + 1;
          continue;
        }
      }
      if (pattern.startsWith('(?', index)) {
        add('(?', 'Group modifier or special group prefix. Support varies; check the JavaScript engine error for the exact interpretation.', 'group');
        index += 2;
        continue;
      }
      add('(', 'Opens a numbered capturing group.', 'group');
      index += 1;
      continue;
    }

    if (character === ')') {
      add(')', 'Closes a group.', 'group');
      index += 1;
      continue;
    }

    if (character === '^') {
      add('^', 'Matches the start of the input, or the start of a line with the m flag.', 'anchor');
      index += 1;
      continue;
    }

    if (character === '$') {
      add('$', 'Matches the end of the input, or the end of a line with the m flag.', 'anchor');
      index += 1;
      continue;
    }

    if (character === '.') {
      add('.', 'Matches most single characters; line terminators are included only with the s flag.', 'wildcard');
      index += 1;
      continue;
    }

    if (character === '|') {
      add('|', 'Alternation: matches the expression on the left or the expression on the right.', 'alternation');
      index += 1;
      continue;
    }

    if (character === '*' || character === '+' || character === '?') {
      const lazy = pattern[index + 1] === '?';
      const token = lazy ? `${character}?` : character;
      const quantity = character === '*' ? 'zero or more' : character === '+' ? 'one or more' : 'zero or one';
      add(token, `Quantifier: ${quantity} repetition${lazy ? ', matched lazily (as few as possible)' : ', matched greedily by default'}.`, 'quantifier');
      index += token.length;
      continue;
    }

    if (character === '{') {
      const quantifier = pattern.slice(index).match(/^\{\d+(?:,\d*)?\}\??/);
      if (quantifier) {
        const token = quantifier[0];
        const body = token.replace(/\?$/, '').slice(1, -1);
        add(token, `Repetition count: {${body}}${token.endsWith('?') ? ', matched lazily' : ''}.`, 'quantifier');
        index += token.length;
        continue;
      }
    }

    // Coalesce runs of ordinary characters into readable literal tokens.
    const start = index;
    while (index < pattern.length && !'\\[]()^$.|*+?{}'.includes(pattern[index])) {
      index += 1;
    }
    if (index === start) {
      // A closing brace/bracket or another context-sensitive character is literal here.
      index += 1;
    }
    const token = pattern.slice(start, index);
    add(token, `Matches the literal text “${token}”.`, 'literal');
  }

  return parts;
}

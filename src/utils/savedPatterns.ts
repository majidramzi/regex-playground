import { MAX_INPUT_LENGTH, MAX_PATTERN_LENGTH } from './regex';
import type { SavedPattern } from './types';

export const SAVED_PATTERNS_STORAGE_KEY = 'regex-playground:saved-patterns:v1';
export const MAX_SAVED_PATTERNS = 100;
const SUPPORTED_FLAGS = new Set(['g', 'i', 'm', 's', 'u', 'y', 'd']);

export type SavedPatternDraft = Omit<SavedPattern, 'id' | 'createdAt' | 'updatedAt'>;

export function createPatternId(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === 'function') return randomUUID.call(globalThis.crypto);
  return `pattern-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalizeRecord(value: unknown, index: number): SavedPattern {
  if (!isRecord(value)) throw new Error(`Pattern ${index + 1} must be a JSON object.`);

  const name = readText(value.name).trim();
  const pattern = readText(value.pattern);
  const flags = readText(value.flags);
  const description = readText(value.description);
  const testText = readText(value.testText, readText(value.sampleInput));
  const replacement = readText(value.replacement);

  if (!name) throw new Error(`Pattern ${index + 1} needs a non-empty name.`);
  if (name.length > 100) throw new Error(`Pattern “${name.slice(0, 24)}…” has a name longer than 100 characters.`);
  if (description.length > 2_000) throw new Error(`Description for “${name}” is longer than 2,000 characters.`);
  if (pattern.length > MAX_PATTERN_LENGTH) throw new Error(`Pattern “${name}” exceeds the ${MAX_PATTERN_LENGTH.toLocaleString()} character limit.`);
  if (testText.length > MAX_INPUT_LENGTH) throw new Error(`Test text for “${name}” exceeds the ${MAX_INPUT_LENGTH.toLocaleString()} character limit.`);
  if (replacement.length > 2_048) throw new Error(`Replacement for “${name}” is longer than 2,048 characters.`);
  if ([...flags].some((flag) => !SUPPORTED_FLAGS.has(flag))) {
    throw new Error(`Pattern “${name}” has a flag not supported by this playground.`);
  }
  if (new Set(flags).size !== flags.length) throw new Error(`Pattern “${name}” contains a duplicate flag.`);

  const now = new Date().toISOString();
  const createdAt = readText(value.createdAt, now);
  const updatedAt = readText(value.updatedAt, createdAt);

  return {
    id: readText(value.id).trim() || createPatternId(),
    name,
    description,
    pattern,
    flags,
    testText,
    replacement,
    createdAt,
    updatedAt,
  };
}

/** Accepts either an exported { patterns } file or an array of saved patterns. */
export function importSavedPatterns(json: string): SavedPattern[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  const records = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.patterns)
      ? parsed.patterns
      : null;

  if (!records) throw new Error('Expected a JSON array or an object containing a “patterns” array.');
  if (records.length > MAX_SAVED_PATTERNS) {
    throw new Error(`A file can contain at most ${MAX_SAVED_PATTERNS} saved patterns.`);
  }

  const usedIds = new Set<string>();
  return records.map((record, index) => {
    const normalized = normalizeRecord(record, index);
    if (usedIds.has(normalized.id)) normalized.id = createPatternId();
    usedIds.add(normalized.id);
    return normalized;
  });
}

export function exportSavedPatterns(patterns: SavedPattern[]): string {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      patterns,
    },
    null,
    2,
  );
}

export function readSavedPatterns(): SavedPattern[] {
  try {
    const serialized = window.localStorage.getItem(SAVED_PATTERNS_STORAGE_KEY);
    if (!serialized) return [];
    return importSavedPatterns(serialized);
  } catch {
    // Ignore a corrupt or inaccessible local value; the app stays usable.
    return [];
  }
}

import { useEffect, useState } from 'react';
import {
  createPatternId,
  importSavedPatterns,
  MAX_SAVED_PATTERNS,
  SAVED_PATTERNS_STORAGE_KEY,
  type SavedPatternDraft,
} from '../utils/savedPatterns';
import type { SavedPattern } from '../utils/types';

export function useSavedPatterns() {
  const [patterns, setPatterns] = useState<SavedPattern[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(SAVED_PATTERNS_STORAGE_KEY);
      return raw ? importSavedPatterns(raw) : [];
    } catch {
      return [];
    }
  });
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(SAVED_PATTERNS_STORAGE_KEY, JSON.stringify(patterns));
      setStorageError(null);
    } catch {
      setStorageError('Browser storage is unavailable or full. Your patterns may not persist after this visit.');
    }
  }, [patterns]);

  function savePattern(draft: SavedPatternDraft, existingId?: string | null): SavedPattern {
    const existing = existingId ? patterns.find((item) => item.id === existingId) : undefined;
    if (!existing && patterns.length >= MAX_SAVED_PATTERNS) {
      throw new Error(`You can save up to ${MAX_SAVED_PATTERNS} patterns in this browser.`);
    }

    const now = new Date().toISOString();
    const saved: SavedPattern = {
      ...draft,
      id: existing?.id ?? createPatternId(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    setPatterns((current) => {
      const index = current.findIndex((item) => item.id === saved.id);
      if (index < 0) return [saved, ...current];
      return current.map((item) => item.id === saved.id ? saved : item);
    });
    return saved;
  }

  function removePattern(id: string) {
    setPatterns((current) => current.filter((item) => item.id !== id));
  }

  function importPatterns(json: string): number {
    const imported = importSavedPatterns(json);
    const merged = new Map(patterns.map((item) => [item.id, item]));
    for (const item of imported) merged.set(item.id, item);
    if (merged.size > MAX_SAVED_PATTERNS) {
      throw new Error(`Importing these patterns would exceed the ${MAX_SAVED_PATTERNS} pattern limit.`);
    }
    setPatterns([...merged.values()]);
    return imported.length;
  }

  return { patterns, storageError, savePattern, removePattern, importPatterns };
}

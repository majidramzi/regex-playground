export type FlagLetter = 'g' | 'i' | 'm' | 's' | 'u' | 'y' | 'd';

export interface RegexMatchRecord {
  match: string;
  index: number;
  end: number;
  captures: Array<string | undefined>;
  groups: Record<string, string | undefined>;
  indices?: Array<[number, number] | undefined>;
  namedIndices?: Record<string, [number, number] | undefined>;
}

export interface RegexAnalysis {
  matches: RegexMatchRecord[];
  replacement: string;
  durationMs: number;
  truncated: boolean;
}

export type AnalysisState =
  | { status: 'running' }
  | { status: 'ready'; result: RegexAnalysis }
  | { status: 'error'; error: string };

export interface LibraryExample {
  id: string;
  name: string;
  category: string;
  pattern: string;
  flags: string;
  description: string;
  sampleInput: string;
  expectedMatches: string[];
}

export interface SavedPattern {
  id: string;
  name: string;
  description: string;
  pattern: string;
  flags: string;
  testText: string;
  replacement: string;
  createdAt: string;
  updatedAt: string;
}

export type ExplanationKind =
  | 'literal'
  | 'class'
  | 'escape'
  | 'anchor'
  | 'quantifier'
  | 'group'
  | 'assertion'
  | 'alternation'
  | 'wildcard';

export interface ExplanationPart {
  token: string;
  explanation: string;
  kind: ExplanationKind;
}

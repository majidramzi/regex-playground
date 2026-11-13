import { useEffect, useState } from 'react';
import { MAX_INPUT_LENGTH, MAX_PATTERN_LENGTH } from '../utils/regex';
import type { AnalysisState, RegexAnalysis } from '../utils/types';

type WorkerReply =
  | { type: 'result'; result: RegexAnalysis }
  | { type: 'error'; error: string };

const ANALYSIS_DEBOUNCE_MS = 110;
const ANALYSIS_TIMEOUT_MS = 700;

/**
 * Keeps matching away from the UI thread. Each run gets a disposable worker,
 * which can be terminated if a backtracking expression takes too long.
 */
export function useRegexAnalysis(pattern: string, flags: string, input: string, replacement: string) {
  const [state, setState] = useState<AnalysisState>({ status: 'running' });

  useEffect(() => {
    let worker: Worker | undefined;
    let debounceTimer: number | undefined;
    let timeoutTimer: number | undefined;
    let isCurrent = true;

    setState({ status: 'running' });

    if (pattern.length > MAX_PATTERN_LENGTH) {
      setState({ status: 'error', error: `Pattern is longer than the ${MAX_PATTERN_LENGTH.toLocaleString()} character safety limit.` });
      return () => { isCurrent = false; };
    }
    if (input.length > MAX_INPUT_LENGTH) {
      setState({ status: 'error', error: `Test text is longer than the ${MAX_INPUT_LENGTH.toLocaleString()} character safety limit.` });
      return () => { isCurrent = false; };
    }

    debounceTimer = window.setTimeout(() => {
      try {
        worker = new Worker(new URL('../workers/regex.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (event: MessageEvent<WorkerReply>) => {
          if (!isCurrent) return;
          if (timeoutTimer !== undefined) window.clearTimeout(timeoutTimer);
          worker?.terminate();
          worker = undefined;
          const reply = event.data;
          if (reply.type === 'result') setState({ status: 'ready', result: reply.result });
          else setState({ status: 'error', error: reply.error });
        };
        worker.onerror = () => {
          if (!isCurrent) return;
          if (timeoutTimer !== undefined) window.clearTimeout(timeoutTimer);
          worker?.terminate();
          worker = undefined;
          setState({ status: 'error', error: 'The regular expression worker stopped unexpectedly. Try simplifying the pattern or shorten the test text.' });
        };
        timeoutTimer = window.setTimeout(() => {
          if (!isCurrent) return;
          worker?.terminate();
          worker = undefined;
          setState({ status: 'error', error: 'This expression took too long and was stopped to keep the page responsive. Try a simpler pattern or shorter input.' });
        }, ANALYSIS_TIMEOUT_MS);
        worker.postMessage({ pattern, flags, input, replacement });
      } catch {
        setState({ status: 'error', error: 'Web Workers are unavailable in this browser context, so safe matching cannot run here.' });
      }
    }, ANALYSIS_DEBOUNCE_MS);

    return () => {
      isCurrent = false;
      if (debounceTimer !== undefined) window.clearTimeout(debounceTimer);
      if (timeoutTimer !== undefined) window.clearTimeout(timeoutTimer);
      worker?.terminate();
    };
  }, [pattern, flags, input, replacement]);

  return state;
}

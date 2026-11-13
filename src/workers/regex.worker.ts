import { analyzeRegex } from '../utils/regex';

interface WorkerRequest {
  pattern: string;
  flags: string;
  input: string;
  replacement: string;
}

type WorkerReply =
  | { type: 'result'; result: ReturnType<typeof analyzeRegex> }
  | { type: 'error'; error: string };

const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: WorkerReply) => void;
};

workerScope.onmessage = (event) => {
  try {
    const { pattern, flags, input, replacement } = event.data;
    const result = analyzeRegex(pattern, flags, input, replacement);
    workerScope.postMessage({ type: 'result', result });
  } catch (error) {
    workerScope.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unable to process this regular expression.',
    });
  }
};

export {};

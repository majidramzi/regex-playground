import { ArrowRightLeft, Info } from 'lucide-react';
import type { AnalysisState } from '../utils/types';

interface ReplacementPanelProps {
  input: string;
  replacement: string;
  state: AnalysisState;
  onReplacementChange: (value: string) => void;
}

function displayOutput(text: string | undefined, isRunning: boolean, hasError: boolean) {
  if (isRunning) return 'Updating replacement…';
  if (hasError) return 'Replacement is unavailable until the pattern is valid.';
  return text ?? '';
}

export function ReplacementPanel({ input, replacement, state, onReplacementChange }: ReplacementPanelProps) {
  const isRunning = state.status === 'running';
  const hasError = state.status === 'error';
  const output = state.status === 'ready' ? state.result.replacement : undefined;

  return (
    <section className="panel replace-panel" aria-labelledby="replace-heading">
      <div className="panel-heading">
        <div className="heading-copy">
          <span className="step-index step-index-muted">03</span>
          <div>
            <h2 id="replace-heading">Replace tester</h2>
            <p>Preview JavaScript replacement strings</p>
          </div>
        </div>
        <span className="replace-icon"><ArrowRightLeft size={16} /></span>
      </div>

      <label className="field-label" htmlFor="replacement-input">Replacement string</label>
      <input
        id="replacement-input"
        className="replacement-input"
        type="text"
        value={replacement}
        onChange={(event) => onReplacementChange(event.target.value)}
        placeholder="$&"
        autoComplete="off"
        spellCheck={false}
      />
      <div className="replacement-reference" aria-label="Replacement tokens">
        <span><code>$$</code> literal $</span>
        <span><code>$&amp;</code> full match</span>
        <span><code>$1</code> capture</span>
        <span><code>$&lt;name&gt;</code> named capture</span>
      </div>
      <div className="replacement-note"><Info size={13} /> The replacement is plain text with native JavaScript tokens—never evaluated as code.</div>

      <div className="before-after-grid">
        <div className="replacement-result-block">
          <div className="result-label"><span className="before-dot" />BEFORE</div>
          <pre className="replacement-output before-output">{input || 'Empty test text'}</pre>
        </div>
        <div className="replacement-result-block">
          <div className="result-label"><span className="after-dot" />AFTER</div>
          <pre className={`replacement-output after-output ${hasError ? 'output-error' : ''}`} aria-live="polite">
            {displayOutput(output, isRunning, hasError)}
          </pre>
        </div>
      </div>
    </section>
  );
}

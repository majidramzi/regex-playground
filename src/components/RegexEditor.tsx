import { AlertCircle, BookmarkPlus, CheckCircle2, LoaderCircle } from 'lucide-react';
import { getRegExpSyntaxError } from '../utils/regex';
import type { AnalysisState } from '../utils/types';
import { FlagsPanel } from './FlagsPanel';

interface RegexEditorProps {
  pattern: string;
  flags: string;
  state: AnalysisState;
  savedName?: string;
  onPatternChange: (value: string) => void;
  onFlagsChange: (value: string) => void;
  onSave: () => void;
}

export function RegexEditor({ pattern, flags, state, savedName, onPatternChange, onFlagsChange, onSave }: RegexEditorProps) {
  const syntaxError = getRegExpSyntaxError(pattern, flags);

  return (
    <section className="panel regex-panel" aria-labelledby="regex-editor-heading">
      <div className="panel-heading">
        <div className="heading-copy">
          <span className="step-index">01</span>
          <div>
            <h2 id="regex-editor-heading">Regular expression</h2>
            <p>Build a pattern and configure its behavior</p>
          </div>
        </div>
        <button className="button button-outline save-current" type="button" onClick={onSave}>
          <BookmarkPlus size={15} />
          <span>{savedName ? 'Save changes' : 'Save pattern'}</span>
        </button>
      </div>

      <label className="visually-hidden" htmlFor="regex-pattern">Regular expression pattern</label>
      <div className={`pattern-input-shell ${syntaxError ? 'has-error' : ''}`}>
        <span className="pattern-delimiter" aria-hidden="true">/</span>
        <input
          id="regex-pattern"
          className="pattern-input"
          type="text"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={pattern}
          onChange={(event) => onPatternChange(event.target.value)}
          placeholder="Try \\bword\\b, a group, or a character class…"
          aria-invalid={Boolean(syntaxError)}
          aria-describedby="pattern-status"
        />
        <span className="pattern-suffix" aria-label={`Flags: ${flags || 'none'}`}>
          <span className="pattern-delimiter" aria-hidden="true">/</span>
          <code>{flags || ' '}</code>
        </span>
      </div>

      <div className={`pattern-status ${syntaxError ? 'status-error' : state.status === 'ready' ? 'status-success' : ''}`} id="pattern-status" role="status" aria-live="polite">
        {syntaxError ? (
          <><AlertCircle size={14} /><span>{syntaxError}</span></>
        ) : state.status === 'running' ? (
          <><LoaderCircle className="spin" size={14} /><span>Checking matches…</span></>
        ) : state.status === 'error' ? (
          <><AlertCircle size={14} /><span>{state.error}</span></>
        ) : (
          <><CheckCircle2 size={14} /><span>{savedName ? `Loaded from “${savedName}”` : 'Valid JavaScript regular expression'}</span></>
        )}
      </div>

      <FlagsPanel flags={flags} onChange={onFlagsChange} />
    </section>
  );
}

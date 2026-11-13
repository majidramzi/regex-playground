import { FileText } from 'lucide-react';

interface TestTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  matchCount: number | null;
  truncated?: boolean;
  running: boolean;
}

export function TestTextEditor({ value, onChange, matchCount, truncated = false, running }: TestTextEditorProps) {
  const lines = value ? value.split('\n').length : 1;
  const characters = value.length;
  const matchLabel = matchCount === null
    ? 'Ready'
    : `${matchCount.toLocaleString()}${truncated ? '+' : ''} ${matchCount === 1 && !truncated ? 'match' : 'matches'}`;

  return (
    <section className="panel source-panel" aria-labelledby="test-text-heading">
      <div className="panel-heading source-heading">
        <div className="heading-copy">
          <span className="step-index">02</span>
          <div>
            <h2 id="test-text-heading">Test text</h2>
            <p>Matches update as you type</p>
          </div>
        </div>
        <div className="source-indicator">
          <span className={`live-dot ${running ? 'is-pending' : ''}`} />
          {running ? 'Updating' : matchLabel}
        </div>
      </div>
      <div className="source-editor-wrap">
        <div className="source-editor-icon"><FileText size={15} /></div>
        <textarea
          id="test-text"
          className="source-textarea"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Paste or type the text you want to test…"
          spellCheck={false}
          aria-label="Text to test against the regular expression"
          rows={8}
        />
      </div>
      <div className="editor-footer">
        <span>{lines.toLocaleString()} {lines === 1 ? 'line' : 'lines'}</span>
        <span className="footer-separator">·</span>
        <span>{characters.toLocaleString()} {characters === 1 ? 'character' : 'characters'}</span>
        <span className="editor-footer-note">Positions use 0-based UTF-16 offsets</span>
      </div>
    </section>
  );
}

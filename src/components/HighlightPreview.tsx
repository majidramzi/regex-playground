import type { ReactNode } from 'react';
import { Highlighter } from 'lucide-react';
import type { RegexMatchRecord } from '../utils/types';

interface HighlightPreviewProps {
  text: string;
  matches: RegexMatchRecord[];
  running: boolean;
}

function renderHighlightedText(text: string, matches: RegexMatchRecord[]): ReactNode[] {
  if (matches.length === 0) return [text];
  const nodes: ReactNode[] = [];
  let cursor = 0;

  matches.forEach((match, index) => {
    const start = Math.max(cursor, Math.min(match.index, text.length));
    const end = Math.max(start, Math.min(match.end, text.length));
    if (start > cursor) nodes.push(text.slice(cursor, start));

    if (match.match.length === 0) {
      nodes.push(<span className="zero-width-marker" key={`empty-${index}`} title={`Zero-width match at ${match.index}`}>│</span>);
      cursor = start;
      return;
    }

    if (end > start) {
      nodes.push(<mark className="match-highlight" key={`match-${index}`} title={`Match ${index + 1} · ${match.index}–${match.end}`}>{text.slice(start, end)}</mark>);
      cursor = end;
    }
  });

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

export function HighlightPreview({ text, matches, running }: HighlightPreviewProps) {
  return (
    <section className="panel highlight-panel" aria-labelledby="highlight-heading">
      <div className="panel-heading compact-heading">
        <div className="heading-copy">
          <span className="highlight-icon"><Highlighter size={16} /></span>
          <div>
            <h2 id="highlight-heading">Highlighted text</h2>
            <p>{matches.length > 0 ? 'Matched spans are marked below' : 'Every match will be highlighted here'}</p>
          </div>
        </div>
        <span className="preview-badge"><span className={`live-dot ${running ? 'is-pending' : ''}`} />{running ? 'Live' : 'Preview'}</span>
      </div>
      <div className="highlighted-output" aria-live="polite" aria-label="Test text with regular expression matches highlighted">
        {text.length === 0 ? (
          <span className="empty-placeholder">Add test text above to see the highlighted preview.</span>
        ) : (
          <pre>{renderHighlightedText(text, matches)}</pre>
        )}
      </div>
      {matches.some((match) => match.match.length === 0) && (
        <div className="zero-width-note"><span className="zero-width-marker">│</span> marks a zero-width match; no characters are consumed.</div>
      )}
    </section>
  );
}

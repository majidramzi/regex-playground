import { AlertCircle, CheckCircle2, Clock3, LoaderCircle, Search } from 'lucide-react';
import { MAX_MATCH_ROWS } from '../utils/regex';
import type { AnalysisState, RegexMatchRecord } from '../utils/types';

interface MatchResultsProps {
  state: AnalysisState;
}

function printable(value: string | undefined) {
  return value === undefined ? 'undefined' : value === '' ? 'empty string' : value;
}

function MatchItem({ match, index }: { match: RegexMatchRecord; index: number }) {
  const namedGroups = Object.entries(match.groups);
  const hasCaptures = match.captures.length > 0 || namedGroups.length > 0;

  return (
    <details className="match-item" open={index === 0}>
      <summary className="match-summary">
        <span className="match-number">{String(index + 1).padStart(2, '0')}</span>
        <code className="match-value">{match.match === '' ? '∅ empty match' : match.match}</code>
        <span className="match-position">{match.index}–{match.end}</span>
      </summary>
      {hasCaptures && (
        <div className="capture-list">
          {match.captures.map((capture, captureIndex) => {
            const range = match.indices?.[captureIndex + 1];
            return (
              <div className="capture-row" key={`capture-${captureIndex}`}>
                <span className="capture-name">Group {captureIndex + 1}</span>
                <code>{printable(capture)}</code>
                {range && <span className="capture-position">{range[0]}–{range[1]}</span>}
              </div>
            );
          })}
          {namedGroups.map(([name, value]) => {
            const range = match.namedIndices?.[name];
            return (
              <div className="capture-row named-capture" key={`named-${name}`}>
                <span className="capture-name">{name}</span>
                <code>{printable(value)}</code>
                {range && <span className="capture-position">{range[0]}–{range[1]}</span>}
              </div>
            );
          })}
        </div>
      )}
      <div className="match-meta">
        <span>Match range</span>
        <code>[{match.index}, {match.end})</code>
        {match.indices?.[0] && <span className="indices-badge">d-indexed</span>}
      </div>
    </details>
  );
}

export function MatchResults({ state }: MatchResultsProps) {
  const isReady = state.status === 'ready';
  const matches = isReady ? state.result.matches : [];
  const visibleMatches = matches.slice(0, MAX_MATCH_ROWS);

  return (
    <section className="panel results-panel" aria-labelledby="results-heading">
      <div className="panel-heading results-heading">
        <div className="heading-copy">
          <span className="results-icon"><Search size={16} /></span>
          <div>
            <h2 id="results-heading">Match results</h2>
            <p>Matches and capture groups</p>
          </div>
        </div>
        <span className={`match-count ${isReady && matches.length > 0 ? 'has-matches' : ''}`} aria-label={isReady ? `${matches.length}${state.result.truncated ? ' or more' : ''} matches` : 'Match count pending'}>
          {isReady ? `${matches.length}${state.result.truncated ? '+' : ''}` : '—'}
        </span>
      </div>

      {state.status === 'running' && (
        <div className="results-state loading-state"><LoaderCircle className="spin" size={18} /><span>Running in a protected worker…</span></div>
      )}

      {state.status === 'error' && (
        <div className="results-state error-state">
          <AlertCircle size={18} />
          <div><strong>Could not analyze</strong><p>{state.error}</p></div>
        </div>
      )}

      {isReady && matches.length === 0 && (
        <div className="results-state empty-results">
          <span className="empty-search-icon"><Search size={18} /></span>
          <strong>No matches yet</strong>
          <p>Try another pattern or add text to the editor.</p>
        </div>
      )}

      {isReady && matches.length > 0 && (
        <>
          <div className="results-list">
            {visibleMatches.map((match, index) => <MatchItem key={`${match.index}-${index}`} match={match} index={index} />)}
          </div>
          {(matches.length > visibleMatches.length || state.result.truncated) && (
            <div className="results-more">
              Showing the first {visibleMatches.length} of {state.result.truncated ? `${matches.length}+` : matches.length} matches.
            </div>
          )}
          <div className="results-footer"><CheckCircle2 size={13} /><span>Completed in {state.result.durationMs.toFixed(2)} ms</span><Clock3 size={13} /></div>
        </>
      )}
    </section>
  );
}

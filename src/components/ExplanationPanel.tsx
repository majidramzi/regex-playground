import { useMemo } from 'react';
import { Braces, Info, Sparkles } from 'lucide-react';
import { explainRegex, FLAG_DESCRIPTIONS } from '../utils/regex';

interface ExplanationPanelProps {
  pattern: string;
  flags: string;
  syntaxError: string | null;
}

export function ExplanationPanel({ pattern, flags, syntaxError }: ExplanationPanelProps) {
  const parts = useMemo(() => explainRegex(pattern), [pattern]);

  return (
    <section className="panel explanation-panel" aria-labelledby="explanation-heading">
      <div className="panel-heading compact-heading">
        <div className="heading-copy">
          <span className="explanation-icon"><Braces size={16} /></span>
          <div>
            <h2 id="explanation-heading">Pattern guide</h2>
            <p>Token-by-token, at a glance</p>
          </div>
        </div>
      </div>

      <div className="explanation-caveat"><Info size={14} /><p>This is a best-effort walkthrough, not a formal parser or guaranteed interpretation. JavaScript’s RegExp engine is the source of truth.</p></div>

      {syntaxError && <div className="explanation-invalid">The pattern is currently invalid. The token notes below may be incomplete.</div>}

      {pattern.length === 0 ? (
        <div className="empty-explanation"><span className="token-chip token-literal">ε</span><p>An empty pattern can match at each position in the input.</p></div>
      ) : (
        <div className="token-guide" aria-label="Best-effort regular expression token guide">
          {parts.slice(0, 48).map((part, index) => (
            <div className="token-row" key={`${index}-${part.token}`}>
              <code className={`token-chip token-${part.kind}`}>{part.token}</code>
              <span>{part.explanation}</span>
            </div>
          ))}
          {parts.length > 48 && <div className="token-overflow">Showing the first 48 tokens.</div>}
        </div>
      )}

      <div className="active-flags-note">
        <div className="active-flags-heading"><Sparkles size={13} />Active flags</div>
        {flags ? (
          <div className="active-flag-list">
            {FLAG_DESCRIPTIONS.filter(({ flag }) => flags.includes(flag)).map(({ flag, label, description }) => (
              <div className="active-flag-row" key={flag}><code>{flag}</code><span><strong>{label}</strong><small>{description}</small></span></div>
            ))}
          </div>
        ) : <p className="no-flags-note">No flags selected; only the first match is returned by default.</p>}
      </div>

      <div className="js-limits">
        <strong>JavaScript flavor</strong>
        <p>This uses the browser’s native ECMAScript RegExp engine, not PCRE or Python syntax. This tool exposes g, i, m, s, u, y, and d (when supported); it does not expose v mode. Recursion, conditional groups, and branch-reset groups are not ECMAScript syntax. Newer features can vary by browser.</p>
      </div>
    </section>
  );
}

import { Check, Info } from 'lucide-react';
import { FLAG_DESCRIPTIONS, supportsIndicesFlag } from '../utils/regex';

interface FlagsPanelProps {
  flags: string;
  onChange: (nextFlags: string) => void;
}

export function FlagsPanel({ flags, onChange }: FlagsPanelProps) {
  const indicesSupported = supportsIndicesFlag();

  function toggleFlag(flag: string) {
    if (flag === 'd' && !indicesSupported) return;
    const selected = new Set(flags);
    if (selected.has(flag)) selected.delete(flag);
    else selected.add(flag);
    onChange(FLAG_DESCRIPTIONS.map(({ flag: value }) => value).filter((value) => selected.has(value)).join(''));
  }

  return (
    <div className="flags-section">
      <div className="subsection-heading">
        <span className="subsection-title">FLAGS</span>
        <span className="flag-summary"><code>{flags || 'none'}</code> selected</span>
      </div>
      <div className="flags-grid" role="group" aria-label="Regular expression flags">
        {FLAG_DESCRIPTIONS.map(({ flag, label, description }) => {
          const checked = flags.includes(flag);
          const disabled = flag === 'd' && !indicesSupported;
          return (
            <label
              key={flag}
              className={`flag-option ${checked ? 'is-checked' : ''} ${disabled ? 'is-disabled' : ''}`}
              title={disabled ? 'The d flag is not supported by this browser.' : `${flag}: ${description}`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggleFlag(flag)}
                aria-label={`${flag} — ${label}`}
              />
              <span className="flag-check" aria-hidden="true">{checked && <Check size={11} strokeWidth={3} />}</span>
              <span className="flag-letter">{flag}</span>
              <span className="flag-copy">
                <strong>{label}</strong>
                <small>{disabled ? 'Not supported here' : description}</small>
              </span>
            </label>
          );
        })}
      </div>
      <div className="flag-footnote"><Info size={13} /> Flags are native JavaScript RegExp options. Duplicate flags are rejected by the engine.</div>
    </div>
  );
}

import { Code2, Moon, ShieldCheck, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  const isDark = theme === 'dark';

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a className="brand" href="#top" aria-label="Regex Playground home">
          <span className="brand-mark"><Code2 size={21} strokeWidth={2.3} /></span>
          <span className="brand-wordmark">regex<span>playground</span></span>
          <span className="brand-version">BROWSER TOOL</span>
        </a>
        <div className="topbar-actions">
          <div className="privacy-pill"><ShieldCheck size={15} /><span>Runs locally</span></div>
          <button
            className="theme-toggle"
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
            aria-pressed={isDark}
            title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
            <span>{isDark ? 'Light' : 'Dark'} mode</span>
          </button>
        </div>
      </div>
    </header>
  );
}

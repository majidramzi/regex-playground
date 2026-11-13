import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X, Zap } from 'lucide-react';
import { ExplanationPanel } from './components/ExplanationPanel';
import { Header } from './components/Header';
import { HighlightPreview } from './components/HighlightPreview';
import { MatchResults } from './components/MatchResults';
import { PatternSidebar, type NoticeKind } from './components/PatternSidebar';
import { RegexEditor } from './components/RegexEditor';
import { ReplacementPanel } from './components/ReplacementPanel';
import { SavePatternDialog } from './components/SavePatternDialog';
import { TestTextEditor } from './components/TestTextEditor';
import { useRegexAnalysis } from './hooks/useRegexAnalysis';
import { useSavedPatterns } from './hooks/useSavedPatterns';
import { getRegExpSyntaxError, MAX_INPUT_LENGTH, MAX_PATTERN_LENGTH } from './utils/regex';
import type { LibraryExample, SavedPattern } from './utils/types';

const DEFAULT_PATTERN = String.raw`(?<term>\bregex\b)`;
const DEFAULT_FLAGS = 'gi';
const DEFAULT_TEXT = 'Regex is powerful.\nTry regex patterns here — and see every match.';
const DEFAULT_REPLACEMENT = '[$&]';
const THEME_STORAGE_KEY = 'regex-playground:theme:v1';

type Theme = 'light' | 'dark';

interface Notice {
  message: string;
  kind: NoticeKind;
}

function readTheme(): Theme {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function App() {
  const [pattern, setPattern] = useState(DEFAULT_PATTERN);
  const [flags, setFlags] = useState(DEFAULT_FLAGS);
  const [testText, setTestText] = useState(DEFAULT_TEXT);
  const [replacement, setReplacement] = useState(DEFAULT_REPLACEMENT);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTarget, setSaveTarget] = useState<SavedPattern | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeTimer = useRef<number | undefined>(undefined);
  const { patterns: savedPatterns, storageError, savePattern, removePattern, importPatterns } = useSavedPatterns();
  const analysis = useRegexAnalysis(pattern, flags, testText, replacement);
  const activeSaved = savedPatterns.find((saved) => saved.id === activeSavedId) ?? null;
  const currentMatches = analysis.status === 'ready' ? analysis.result.matches : [];
  const syntaxError = useMemo(() => getRegExpSyntaxError(pattern, flags), [pattern, flags]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // The selected theme still applies for this visit when storage is blocked.
    }
  }, [theme]);

  useEffect(() => () => {
    if (noticeTimer.current !== undefined) window.clearTimeout(noticeTimer.current);
  }, []);

  function notify(message: string, kind: NoticeKind = 'info') {
    setNotice({ message, kind });
    if (noticeTimer.current !== undefined) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 3_800);
  }

  function loadExample(example: LibraryExample) {
    setPattern(example.pattern);
    setFlags(example.flags);
    setTestText(example.sampleInput);
    setReplacement(DEFAULT_REPLACEMENT);
    setActiveSavedId(null);
    setSaveTarget(null);
    notify(`Loaded “${example.name}”.`, 'success');
  }

  function loadSaved(saved: SavedPattern) {
    setPattern(saved.pattern);
    setFlags(saved.flags);
    setTestText(saved.testText);
    setReplacement(saved.replacement);
    setActiveSavedId(saved.id);
    setSaveTarget(saved);
    notify(`Loaded “${saved.name}”.`, 'success');
  }

  function editSaved(saved: SavedPattern) {
    loadSaved(saved);
    setSaveTarget(saved);
    setSaveDialogOpen(true);
  }

  function openSaveDialog() {
    setSaveTarget(activeSaved);
    setSaveDialogOpen(true);
  }

  function handleSave(name: string, description: string, asNew: boolean) {
    try {
      if (pattern.length > MAX_PATTERN_LENGTH) throw new Error(`Pattern exceeds the ${MAX_PATTERN_LENGTH.toLocaleString()} character safety limit.`);
      if (testText.length > MAX_INPUT_LENGTH) throw new Error(`Test text exceeds the ${MAX_INPUT_LENGTH.toLocaleString()} character safety limit.`);
      if (replacement.length > 2_048) throw new Error('Replacement string exceeds the 2,048 character limit.');
      const saved = savePattern({
        name,
        description,
        pattern,
        flags,
        testText,
        replacement,
      }, asNew ? null : saveTarget?.id ?? activeSavedId);
      setActiveSavedId(saved.id);
      setSaveTarget(saved);
      setSaveDialogOpen(false);
      notify(`“${saved.name}” saved in this browser.`, 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not save this pattern.', 'error');
    }
  }

  function deleteSaved(saved: SavedPattern) {
    removePattern(saved.id);
    if (activeSavedId === saved.id) {
      setActiveSavedId(null);
      setSaveTarget(null);
    }
    notify(`Deleted “${saved.name}”.`, 'success');
  }

  function toggleTheme() {
    setTheme((current) => current === 'dark' ? 'light' : 'dark');
  }

  const count = analysis.status === 'ready' ? analysis.result.matches.length : null;
  const toastIcon = notice?.kind === 'error' ? <AlertCircle size={17} /> : notice?.kind === 'success' ? <CheckCircle2 size={17} /> : <Info size={17} />;

  return (
    <div className="app-root" id="top">
      <Header theme={theme} onToggleTheme={toggleTheme} />

      <main className="app-main">
        <section className="page-intro">
          <div className="page-title-block">
            <div className="eyebrow"><span className="eyebrow-line" />REGULAR EXPRESSIONS, MADE CLEAR</div>
            <h1>Regex <span>Playground</span><span className="title-period">.</span></h1>
            <p>Build a pattern. See what it matches. Understand why.</p>
          </div>
          <div className="engine-card">
            <span className="engine-icon"><Zap size={17} fill="currentColor" /></span>
            <span className="engine-copy"><strong>JavaScript RegExp</strong><small>Native browser engine</small></span>
            <span className="engine-live"><span />Live</span>
          </div>
        </section>

        <div className="workspace-grid">
          <PatternSidebar
            savedPatterns={savedPatterns}
            activeSavedId={activeSavedId}
            storageError={storageError}
            onLoadExample={loadExample}
            onLoadSaved={loadSaved}
            onEditSaved={editSaved}
            onDeleteSaved={deleteSaved}
            onImport={importPatterns}
            onNotify={notify}
          />

          <div className="workspace-main">
            <RegexEditor
              pattern={pattern}
              flags={flags}
              state={analysis}
              savedName={activeSaved?.name}
              onPatternChange={setPattern}
              onFlagsChange={setFlags}
              onSave={openSaveDialog}
            />
            <TestTextEditor
              value={testText}
              onChange={setTestText}
              matchCount={count}
              truncated={analysis.status === 'ready' && analysis.result.truncated}
              running={analysis.status === 'running'}
            />
            <HighlightPreview text={testText} matches={currentMatches} running={analysis.status === 'running'} />
            <ReplacementPanel input={testText} replacement={replacement} state={analysis} onReplacementChange={setReplacement} />
          </div>

          <aside className="inspector-column" aria-label="Regular expression results and explanation">
            <MatchResults state={analysis} />
            <ExplanationPanel pattern={pattern} flags={flags} syntaxError={syntaxError} />
          </aside>
        </div>

        <footer className="app-footer">
          <span><ShieldCheckIcon /> Private by design — patterns and test text stay in your browser.</span>
          <span>Built for the JavaScript RegExp engine</span>
        </footer>
      </main>

      {notice && (
        <div className={`toast toast-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
          {toastIcon}<span>{notice.message}</span>
          <button className="toast-close" type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification"><X size={15} /></button>
        </div>
      )}

      <SavePatternDialog
        open={saveDialogOpen}
        existing={saveTarget}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}

function ShieldCheckIcon() {
  return <span className="footer-shield"><CheckCircle2 size={14} /></span>;
}

export default App;

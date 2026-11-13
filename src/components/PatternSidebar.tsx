import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Bookmark, ChevronRight, Download, FileCode2, Library, Pencil, Search, Trash2, Upload } from 'lucide-react';
import { PATTERN_LIBRARY } from '../utils/patternLibrary';
import { exportSavedPatterns } from '../utils/savedPatterns';
import type { LibraryExample, SavedPattern } from '../utils/types';

export type NoticeKind = 'success' | 'error' | 'info';

interface PatternSidebarProps {
  savedPatterns: SavedPattern[];
  activeSavedId: string | null;
  storageError: string | null;
  onLoadExample: (example: LibraryExample) => void;
  onLoadSaved: (pattern: SavedPattern) => void;
  onEditSaved: (pattern: SavedPattern) => void;
  onDeleteSaved: (pattern: SavedPattern) => void;
  onImport: (json: string) => number;
  onNotify: (message: string, kind?: NoticeKind) => void;
}

type SidebarTab = 'library' | 'saved';

function useExample(example: LibraryExample, onLoad: (example: LibraryExample) => void) {
  onLoad(example);
}

export function PatternSidebar({
  savedPatterns,
  activeSavedId,
  storageError,
  onLoadExample,
  onLoadSaved,
  onEditSaved,
  onDeleteSaved,
  onImport,
  onNotify,
}: PatternSidebarProps) {
  const [tab, setTab] = useState<SidebarTab>('library');
  const [search, setSearch] = useState('');
  const [expandedExample, setExpandedExample] = useState<string | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

  const filteredExamples = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return PATTERN_LIBRARY;
    return PATTERN_LIBRARY.filter((example) => [
      example.name, example.category, example.pattern, example.description,
      ...example.expectedMatches,
    ].some((value) => value.toLowerCase().includes(query)));
  }, [search]);

  const filteredSaved = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return savedPatterns;
    return savedPatterns.filter((pattern) => [pattern.name, pattern.description, pattern.pattern].some((value) => value.toLowerCase().includes(query)));
  }, [savedPatterns, search]);

  const categories = useMemo(() => [...new Set(filteredExamples.map((example) => example.category))], [filteredExamples]);

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    const input = event.currentTarget;
    if (!file) return;
    try {
      const imported = onImport(await file.text());
      onNotify(`Imported ${imported} ${imported === 1 ? 'pattern' : 'patterns'}.`, 'success');
      setTab('saved');
      setSearch('');
    } catch (error) {
      onNotify(error instanceof Error ? error.message : 'Could not import that pattern file.', 'error');
    } finally {
      input.value = '';
    }
  }

  function handleExport() {
    try {
      const data = exportSavedPatterns(savedPatterns);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `regex-playground-patterns-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      onNotify(`Exported ${savedPatterns.length} ${savedPatterns.length === 1 ? 'pattern' : 'patterns'} as JSON.`, 'success');
    } catch {
      onNotify('Could not export patterns in this browser.', 'error');
    }
  }

  function confirmDelete(pattern: SavedPattern) {
    if (window.confirm(`Delete “${pattern.name}” from this browser?`)) onDeleteSaved(pattern);
  }

  return (
    <aside className="panel sidebar-panel" aria-label="Pattern library and saved patterns">
      <div className="sidebar-title-row">
        <div className="heading-copy">
          <span className="sidebar-icon"><Library size={16} /></span>
          <div><h2>Explore</h2><p>Start with a pattern</p></div>
        </div>
        <span className="library-count">{tab === 'library' ? PATTERN_LIBRARY.length : savedPatterns.length}</span>
      </div>

      <div className="sidebar-tabs" role="tablist" aria-label="Pattern collections">
        <button className={`sidebar-tab ${tab === 'library' ? 'active' : ''}`} type="button" role="tab" aria-selected={tab === 'library'} onClick={() => { setTab('library'); setSearch(''); }}>
          <Library size={14} /> Library
        </button>
        <button className={`sidebar-tab ${tab === 'saved' ? 'active' : ''}`} type="button" role="tab" aria-selected={tab === 'saved'} onClick={() => { setTab('saved'); setSearch(''); }}>
          <Bookmark size={14} /> Saved <span className="tab-count">{savedPatterns.length}</span>
        </button>
      </div>

      <label className="sidebar-search">
        <Search size={15} />
        <span className="visually-hidden">Search {tab === 'library' ? 'pattern library' : 'saved patterns'}</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tab === 'library' ? 'Search examples…' : 'Search saved…'} />
        <kbd>/</kbd>
      </label>

      {tab === 'library' ? (
        <div className="sidebar-scroll library-scroll">
          {filteredExamples.length === 0 && <div className="sidebar-empty">No examples match that search.</div>}
          {categories.map((category) => (
            <section className="library-category" key={category}>
              <div className="category-heading">{category}<span>{filteredExamples.filter((example) => example.category === category).length}</span></div>
              {filteredExamples.filter((example) => example.category === category).map((example) => {
                const expanded = expandedExample === example.id;
                return (
                  <article className={`example-card ${expanded ? 'expanded' : ''}`} key={example.id}>
                    <button
                      className="example-summary"
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setExpandedExample(expanded ? null : example.id)}
                    >
                      <span className="example-summary-copy">
                        <strong>{example.name}</strong>
                        <code>/{example.pattern}/{example.flags}</code>
                      </span>
                      <ChevronRight className={expanded ? 'chevron-open' : ''} size={15} />
                    </button>
                    {expanded && (
                      <div className="example-details">
                        <p>{example.description}</p>
                        <div className="example-detail-label">PATTERN</div>
                        <pre><code>/{example.pattern}/{example.flags}</code></pre>
                        <div className="example-detail-label">SAMPLE INPUT</div>
                        <pre className="example-sample">{example.sampleInput}</pre>
                        <div className="example-detail-label">EXPECTED MATCHES</div>
                        <div className="expected-matches">
                          {example.expectedMatches.map((match, index) => <code key={`${index}-${match}`}>{JSON.stringify(match)}</code>)}
                        </div>
                        <button className="button button-small button-primary use-example" type="button" onClick={() => useExample(example, onLoadExample)}>
                          <FileCode2 size={13} /> Use this example
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          ))}
        </div>
      ) : (
        <>
          <div className="saved-actions">
            <button className="button button-small button-outline" type="button" onClick={() => importInput.current?.click()}>
              <Upload size={13} /> Import
            </button>
            <button className="button button-small button-outline" type="button" onClick={handleExport} disabled={savedPatterns.length === 0}>
              <Download size={13} /> Export
            </button>
            <input ref={importInput} className="visually-hidden" type="file" accept="application/json,.json" onChange={handleImport} aria-label="Import saved patterns JSON" />
          </div>
          {storageError && <div className="storage-warning">{storageError}</div>}
          <div className="sidebar-scroll saved-scroll">
            {filteredSaved.length === 0 ? (
              <div className="saved-empty">
                <span className="saved-empty-icon"><Bookmark size={17} /></span>
                <strong>{search ? 'No saved patterns found' : 'No saved patterns yet'}</strong>
                <p>{search ? 'Try a different search.' : 'Save a pattern to keep it in this browser. You can export it as JSON any time.'}</p>
              </div>
            ) : filteredSaved.map((pattern) => (
              <article className={`saved-card ${activeSavedId === pattern.id ? 'is-active' : ''}`} key={pattern.id}>
                <button className="saved-pattern-main" type="button" onClick={() => onLoadSaved(pattern)} title={`Load ${pattern.name}`}>
                  <strong>{pattern.name}</strong>
                  <code>/{pattern.pattern}/{pattern.flags}</code>
                  {pattern.description && <small>{pattern.description}</small>}
                </button>
                <div className="saved-card-actions">
                  <button className="icon-button mini-icon-button" type="button" aria-label={`Edit ${pattern.name}`} title="Edit pattern" onClick={() => onEditSaved(pattern)}><Pencil size={13} /></button>
                  <button className="icon-button mini-icon-button danger-icon" type="button" aria-label={`Delete ${pattern.name}`} title="Delete pattern" onClick={() => confirmDelete(pattern)}><Trash2 size={13} /></button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {tab === 'library' && <div className="sidebar-footnote"><span className="tiny-dot" /> Click an example to inspect it; use it to load the sample.</div>}
      {tab === 'saved' && <div className="sidebar-footnote"><span className="tiny-dot" /> Saved patterns never leave this device unless you export them.</div>}
    </aside>
  );
}

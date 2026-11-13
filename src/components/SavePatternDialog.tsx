import { useEffect, useState, type FormEvent } from 'react';
import { BookmarkPlus, X } from 'lucide-react';
import type { SavedPattern } from '../utils/types';

interface SavePatternDialogProps {
  open: boolean;
  existing: SavedPattern | null;
  onClose: () => void;
  onSave: (name: string, description: string, asNew: boolean) => void;
}

export function SavePatternDialog({ open, existing, onClose, onSave }: SavePatternDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(existing?.name ?? 'Untitled pattern');
    setDescription(existing?.description ?? '');
  }, [open, existing]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function submit(event: FormEvent<HTMLFormElement>, asNew: boolean) {
    event.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), description.trim(), asNew);
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="save-dialog" role="dialog" aria-modal="true" aria-labelledby="save-dialog-heading">
        <div className="dialog-heading">
          <span className="dialog-icon"><BookmarkPlus size={18} /></span>
          <div><h2 id="save-dialog-heading">{existing ? 'Edit saved pattern' : 'Save this pattern'}</h2><p>Stored only in this browser’s local storage.</p></div>
          <button className="icon-button dialog-close" type="button" onClick={onClose} aria-label="Close dialog"><X size={17} /></button>
        </div>
        <form onSubmit={(event) => submit(event, !existing)}>
          <label className="field-label" htmlFor="saved-pattern-name">Name</label>
          <input id="saved-pattern-name" className="dialog-input" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
          <label className="field-label" htmlFor="saved-pattern-description">Description <span className="optional-label">optional</span></label>
          <textarea id="saved-pattern-description" className="dialog-textarea" maxLength={2_000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What does this pattern help you find?" />
          <div className="dialog-actions">
            <button className="button button-quiet" type="button" onClick={onClose}>Cancel</button>
            {existing && <button className="button button-outline" type="button" onClick={(event) => submit(event as unknown as FormEvent<HTMLFormElement>, true)}>Save as new</button>}
            <button className="button button-primary" type="submit">{existing ? 'Save changes' : 'Save pattern'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

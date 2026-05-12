import { observer } from '@rabjs/react';
import { getLanguageList, changeBlockLanguage } from './block-commands';
import type { EditorView } from '@codemirror/view';

interface LanguageSelectorProps {
  view: EditorView | null;
  position: { top: number; left: number };
  onClose: () => void;
}

function LanguageSelector({ view, position, onClose }: LanguageSelectorProps) {
  const languages = getLanguageList();

  const handleSelect = (lang: string) => {
    if (view) {
      changeBlockLanguage(view, lang);
    }
    onClose();
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={onClose} />
      <div
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          zIndex: 1000,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          padding: '4px',
          maxHeight: '200px',
          overflowY: 'auto',
          minWidth: '120px',
        }}
      >
        {languages.map((lang) => (
          <button
            key={lang}
            onClick={() => handleSelect(lang)}
            className="block w-full text-left px-3 py-1.5 text-xs rounded"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-soft)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {lang}
          </button>
        ))}
      </div>
    </>
  );
}

export default observer(LanguageSelector);

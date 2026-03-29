import { useState, useEffect } from 'react';
import type { LanguageProfile } from '../types';
import { T } from '../theme';
import { LANGUAGES, type Language } from '../types';
import { updateProfile } from '../api';

interface SettingsProps {
  profiles: LanguageProfile[];
  onClose: () => void;
  onProfilesUpdate: () => void;
}

export function Settings({ profiles, onClose, onProfilesUpdate }: SettingsProps) {
  const [selectedLang, setSelectedLang] = useState<Language>('Python');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const profile = profiles.find((p) => p.language === selectedLang);
    setDescription(profile?.description || '');
  }, [selectedLang, profiles]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(selectedLang, description);
      onProfilesUpdate();
    } catch (err) {
      console.error('Failed to save:', err);
    }
    setSaving(false);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Profile Settings</h2>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        <div style={styles.content}>
          <label style={styles.label}>Select Language</label>
          <div style={styles.langGrid}>
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLang(lang)}
                style={{
                  ...styles.langBtn,
                  background: selectedLang === lang ? T.accent : T.surface,
                  color: selectedLang === lang ? T.bg : T.text,
                  border: `1px solid ${selectedLang === lang ? T.accent : T.border}`,
                }}
              >
                {lang}
              </button>
            ))}
          </div>

          <label style={styles.label}>Tell AI about your work with {selectedLang}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={`e.g. I use ${selectedLang} for building REST APIs, work with databases, and write unit tests...`}
            rows={4}
            style={styles.textarea}
          />

          <div style={styles.hint}>
            This helps generate code snippets relevant to your actual work.
          </div>
        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={styles.saveBtn}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    background: T.bg,
    borderRadius: 12,
    width: '100%',
    maxWidth: 520,
    maxHeight: '90vh',
    overflow: 'auto',
    border: `1px solid ${T.border}`,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: `1px solid ${T.border}`,
  },
  title: {
    fontFamily: T.font,
    fontSize: 18,
    fontWeight: 600,
    color: T.text,
    margin: 0,
  },
  closeBtn: {
    fontFamily: T.font,
    fontSize: 24,
    background: 'none',
    border: 'none',
    color: T.textDim,
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  },
  content: {
    padding: 20,
  },
  label: {
    display: 'block',
    fontFamily: T.font,
    fontSize: 12,
    color: T.text,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  langGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 20,
  },
  langBtn: {
    fontFamily: T.font,
    fontSize: 12,
    padding: '6px 12px',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  textarea: {
    width: '100%',
    fontFamily: T.font,
    fontSize: 13,
    padding: 12,
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    color: T.text,
    resize: 'vertical',
    outline: 'none',
    lineHeight: 1.5,
    boxSizing: 'border-box',
  },
  hint: {
    fontFamily: T.font,
    fontSize: 11,
    color: T.textDim,
    marginTop: 8,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    padding: '16px 20px',
    borderTop: `1px solid ${T.border}`,
  },
  cancelBtn: {
    fontFamily: T.font,
    fontSize: 13,
    padding: '10px 20px',
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    color: T.text,
    cursor: 'pointer',
  },
  saveBtn: {
    fontFamily: T.font,
    fontSize: 13,
    fontWeight: 600,
    padding: '10px 20px',
    background: T.accent,
    border: 'none',
    borderRadius: 8,
    color: T.bg,
    cursor: 'pointer',
  },
};

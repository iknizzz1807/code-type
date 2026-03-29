import { useState } from 'react';
import type { Profile } from '../types';
import { T } from '../theme';

const LANGUAGES = [
  'Python', 'Rust', 'TypeScript', 'Go', 'Java', 'C++',
  'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Zig'
];

interface ProfileSetupProps {
  onSave: (profile: Profile) => void;
  initial?: Profile | null;
}

export function ProfileSetup({ onSave, initial }: ProfileSetupProps) {
  const [lang, setLang] = useState(initial?.language || '');
  const [desc, setDesc] = useState(initial?.description || '');

  const canSubmit = lang && desc.trim();

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>
            <span style={{ color: T.mauve }}>{"<"}</span>
            Code
            <span style={{ color: T.green }}>Type</span>
            <span style={{ color: T.mauve }}>{"/>"}</span>
          </h1>
          <p style={styles.subtitle}>practice typing real code, tailored to you</p>
        </div>

        <label style={styles.label}>your language</label>
        <div style={styles.langGrid}>
          {LANGUAGES.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                ...styles.langBtn,
                background: lang === l ? T.accent : T.surface,
                color: lang === l ? T.bg : T.textDim,
                border: `1px solid ${lang === l ? T.accent : T.border}`,
                fontWeight: lang === l ? 600 : 400,
              }}
            >
              {l}
            </button>
          ))}
        </div>

        <label style={styles.label}>tell AI about your work</label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="e.g. I build backend APIs with FastAPI, work with PostgreSQL, and train PyTorch models for NLP..."
          rows={4}
          style={styles.textarea}
        />

        <button
          disabled={!canSubmit}
          onClick={() => onSave({ language: lang, description: desc.trim() })}
          style={{
            ...styles.submitBtn,
            background: canSubmit ? T.accent : T.surface2,
            color: canSubmit ? T.bg : T.textDim,
            cursor: canSubmit ? 'pointer' : 'default',
          }}
        >
          generate snippets →
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: 24,
    background: T.bg,
  },
  content: {
    maxWidth: 520,
    width: '100%',
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontFamily: T.font,
    fontSize: 36,
    color: T.accent,
    marginBottom: 4,
    fontWeight: 800,
    letterSpacing: -1.5,
    margin: 0,
  },
  subtitle: {
    fontFamily: T.font,
    color: T.textDim,
    fontSize: 13,
    margin: '8px 0 0',
  },
  label: {
    fontFamily: T.font,
    color: T.text,
    fontSize: 13,
    display: 'block',
    marginBottom: 10,
  },
  langGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
  },
  langBtn: {
    fontFamily: T.font,
    fontSize: 13,
    padding: '8px 16px',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  textarea: {
    width: '100%',
    fontFamily: T.font,
    fontSize: 13,
    padding: 14,
    background: T.surface,
    color: T.text,
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    resize: 'vertical',
    outline: 'none',
    lineHeight: 1.6,
    boxSizing: 'border-box',
  },
  submitBtn: {
    marginTop: 24,
    width: '100%',
    padding: '14px 0',
    fontFamily: T.font,
    fontSize: 15,
    fontWeight: 600,
    border: 'none',
    borderRadius: 10,
    transition: 'all 0.2s',
  },
};

import { T } from '../theme';

interface SnippetDescriptionProps {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  language: string;
  onClose: () => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: T.green,
  medium: T.warning,
  hard: T.error,
};

export function SnippetDescription({
  title,
  description,
  difficulty,
  language,
  onClose,
}: SnippetDescriptionProps) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.titleRow}>
            <h3 style={styles.title}>{title}</h3>
            <span style={styles.langBadge}>{language}</span>
            <span
              style={{
                ...styles.diffBadge,
                background: `${DIFFICULTY_COLORS[difficulty]}22`,
                color: DIFFICULTY_COLORS[difficulty],
              }}
            >
              {difficulty}
            </span>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            ×
          </button>
        </div>
        <div style={styles.content}>
          {description.split('\n\n').map((paragraph, i) => (
            <p key={i} style={styles.paragraph}>
              {paragraph.split('**').map((text, j) =>
                j % 2 === 1 ? (
                  <strong key={j} style={styles.bold}>
                    {text}
                  </strong>
                ) : (
                  text
                )
              )}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: T.surface,
    borderRadius: 16,
    maxWidth: 500,
    width: '90%',
    maxHeight: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    border: `1px solid ${T.border}`,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: `1px solid ${T.border}`,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontFamily: T.font,
    fontSize: 16,
    fontWeight: 600,
    color: T.accent,
    margin: 0,
  },
  langBadge: {
    fontFamily: T.font,
    fontSize: 10,
    color: T.textDim,
    padding: '3px 8px',
    background: T.surface2,
    borderRadius: 6,
    fontWeight: 500,
  },
  diffBadge: {
    fontFamily: T.font,
    fontSize: 9,
    padding: '2px 7px',
    borderRadius: 20,
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: T.textDim,
    fontSize: 24,
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  },
  content: {
    padding: 20,
    overflowY: 'auto',
  },
  paragraph: {
    fontFamily: T.font,
    fontSize: 13,
    color: T.text,
    lineHeight: 1.7,
    margin: '0 0 12px',
  },
  bold: {
    color: T.mauve,
    fontWeight: 600,
  },
};

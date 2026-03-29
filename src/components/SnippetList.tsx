import type { Profile, Snippet, HistoryEntry } from '../types';
import { T } from '../theme';

interface SnippetListProps {
  snippets: Snippet[];
  history: HistoryEntry[];
  profile: Profile;
  generating: boolean;
  onSelect: (snippet: Snippet) => void;
  onGenerate: () => void;
  onBack: () => void;
  onDelete: (id: string) => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: T.green,
  medium: T.warning,
  hard: T.error,
};

export function SnippetList({
  snippets,
  history,
  profile,
  generating,
  onSelect,
  onGenerate,
  onBack,
  onDelete,
}: SnippetListProps) {
  const bestFor = (id: string): number | null => {
    const results = history.filter((h) => h.snippetId === id);
    return results.length ? Math.max(...results.map((r) => r.wpm)) : null;
  };

  const attemptsFor = (id: string): number =>
    history.filter((h) => h.snippetId === id).length;

  const totalSessions = history.length;
  const avgWpm =
    totalSessions > 0
      ? Math.round(history.reduce((s, h) => s + h.wpm, 0) / totalSessions)
      : 0;
  const bestWpm = totalSessions > 0 ? Math.max(...history.map((h) => h.wpm)) : 0;

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>
              <span style={{ color: T.mauve }}>{"<"}</span>
              Code
              <span style={{ color: T.green }}>Type</span>
              <span style={{ color: T.mauve }}>{"/>"}</span>
            </h1>
            <p style={styles.subtitle}>
              {profile.language} · {snippets.length} snippets
            </p>
          </div>
          <div style={styles.headerBtns}>
            <button onClick={onBack} style={styles.editBtn}>
              edit profile
            </button>
            <button
              onClick={onGenerate}
              disabled={generating}
              style={{
                ...styles.genBtn,
                background: generating ? T.surface2 : T.accent,
                color: generating ? T.textDim : T.bg,
                cursor: generating ? 'wait' : 'pointer',
              }}
            >
              {generating ? 'generating...' : '+ generate more'}
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {totalSessions > 0 && (
          <div style={styles.statsBar}>
            {[
              { val: avgWpm, label: 'avg wpm', color: T.accent },
              { val: bestWpm, label: 'best wpm', color: T.green },
              { val: totalSessions, label: 'sessions', color: T.text },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ ...styles.statVal, color: s.color }}>{s.val}</div>
                <div style={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {snippets.length === 0 && (
          <div style={styles.empty}>
            {generating ? (
              <>
                <div style={styles.emptyTitle}>generating snippets...</div>
                AI is writing code tailored to your profile
              </>
            ) : (
              'no snippets yet — hit "+ generate more"'
            )}
          </div>
        )}

        <div style={styles.list}>
          {snippets.map((s) => {
            const best = bestFor(s.id);
            const att = attemptsFor(s.id);
            return (
              <div key={s.id} style={styles.listItem}>
                <button
                  onClick={() => onSelect(s)}
                  style={styles.snippetBtn}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = T.accent;
                    e.currentTarget.style.background = T.surface2;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = T.border;
                    e.currentTarget.style.background = T.surface;
                  }}
                >
                  <div style={styles.snippetInfo}>
                    <div style={styles.snippetHeader}>
                      <span style={styles.snippetTitle}>{s.title}</span>
                      <span
                        style={{
                          ...styles.diffBadge,
                          background: `${DIFFICULTY_COLORS[s.difficulty] || T.textDim}22`,
                          color: DIFFICULTY_COLORS[s.difficulty] || T.textDim,
                        }}
                      >
                        {s.difficulty}
                      </span>
                    </div>
                    <div style={styles.snippetMeta}>
                      {s.code.split('\n').length} lines · {s.code.length} chars
                      {att > 0 && (
                        <span style={{ marginLeft: 8, color: T.accent }}>
                          × {att}
                        </span>
                      )}
                    </div>
                  </div>
                  {best !== null && (
                    <div style={styles.bestWpm}>
                      <div style={styles.bestWpmVal}>{best}</div>
                      <div style={styles.bestWpmLabel}>best wpm</div>
                    </div>
                  )}
                </button>
                <button
                  onClick={() => onDelete(s.id)}
                  title="delete"
                  style={styles.deleteBtn}
                  onMouseEnter={(e) => (e.currentTarget.style.color = T.error)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = T.textDim)}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: T.bg,
    padding: 24,
  },
  content: {
    maxWidth: 640,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontFamily: T.font,
    fontSize: 22,
    color: T.accent,
    fontWeight: 700,
    margin: 0,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: T.font,
    fontSize: 11,
    color: T.textDim,
    margin: '4px 0 0',
  },
  headerBtns: {
    display: 'flex',
    gap: 8,
  },
  editBtn: {
    fontFamily: T.font,
    fontSize: 11,
    padding: '8px 14px',
    background: T.surface,
    color: T.textDim,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    cursor: 'pointer',
  },
  genBtn: {
    fontFamily: T.font,
    fontSize: 11,
    padding: '8px 14px',
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
  },
  statsBar: {
    display: 'flex',
    gap: 24,
    marginBottom: 20,
    padding: '12px 20px',
    background: T.surface,
    borderRadius: 10,
    fontFamily: T.font,
  },
  statVal: {
    fontSize: 18,
    fontWeight: 700,
  },
  statLabel: {
    fontSize: 9,
    color: T.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  empty: {
    textAlign: 'center',
    padding: '60px 0',
    fontFamily: T.font,
    color: T.textDim,
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 18,
    marginBottom: 12,
    color: T.accent,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  listItem: {
    display: 'flex',
    alignItems: 'stretch',
  },
  snippetBtn: {
    flex: 1,
    fontFamily: T.font,
    textAlign: 'left',
    padding: '14px 16px',
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRight: 'none',
    borderRadius: '10px 0 0 10px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  snippetInfo: {
    flex: 1,
    minWidth: 0,
  },
  snippetHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  snippetTitle: {
    fontSize: 13,
    color: T.text,
    fontWeight: 500,
  },
  diffBadge: {
    fontSize: 9,
    padding: '2px 7px',
    borderRadius: 20,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  snippetMeta: {
    fontSize: 11,
    color: T.textDim,
  },
  bestWpm: {
    textAlign: 'right',
    marginLeft: 16,
  },
  bestWpmVal: {
    fontSize: 18,
    color: T.accent,
    fontWeight: 700,
  },
  bestWpmLabel: {
    fontSize: 9,
    color: T.textDim,
  },
  deleteBtn: {
    fontFamily: T.font,
    fontSize: 14,
    padding: '0 12px',
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderLeft: `1px solid ${T.border}`,
    borderRadius: '0 10px 10px 0',
    cursor: 'pointer',
    color: T.textDim,
    transition: 'all 0.15s',
  },
};

import { useState } from 'react';
import type { Snippet, Language, HistoryEntry } from '../types';
import { T } from '../theme';
import { generateSnippets, createSnippet, deleteSnippet } from '../api';
import { SnippetDescription } from './SnippetDescription';

interface SnippetPanelProps {
  snippets: Snippet[];
  history: HistoryEntry[];
  currentLanguage: Language;
  profileDescription: string;
  onSelect: (snippet: Snippet) => void;
  onRefresh: () => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: T.green,
  medium: T.warning,
  hard: T.error,
};

export function SnippetPanel({
  snippets,
  history,
  currentLanguage,
  profileDescription,
  onSelect,
  onRefresh,
}: SnippetPanelProps) {
  const [generating, setGenerating] = useState(false);
  const [viewingDescription, setViewingDescription] = useState<Snippet | null>(null);

  const filteredSnippets = snippets.filter((s) => s.language === currentLanguage);

  // Get best WPM and completion status for a snippet
  const getSnippetStats = (snippetId: string): { bestWpm: number | null; completed: boolean; bestAccuracy: number | null } => {
    const snippetHistory = history.filter(h => h.snippet_id === snippetId);
    if (snippetHistory.length === 0) {
      return { bestWpm: null, completed: false, bestAccuracy: null };
    }
    const best = snippetHistory.reduce((acc, h) => h.wpm > acc.wpm ? h : acc, snippetHistory[0]);
    return { bestWpm: best.wpm, completed: true, bestAccuracy: best.accuracy };
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const newSnippets = await generateSnippets(
        currentLanguage,
        profileDescription,
        snippets
      );
      for (const s of newSnippets) {
        await createSnippet({
          language: s.language,
          title: s.title,
          code: s.code,
          description: s.description,
          difficulty: s.difficulty,
        });
      }
      onRefresh();
    } catch (err) {
      console.error('Generate failed:', err);
      alert('Failed to generate snippets: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
    setGenerating(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSnippet(id);
      onRefresh();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{currentLanguage}</h2>
          <p style={styles.subtitle}>{filteredSnippets.length} snippets</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            ...styles.genBtn,
            opacity: generating ? 0.6 : 1,
          }}
        >
          {generating ? 'Generating...' : '+ Generate'}
        </button>
      </div>

      {/* Snippet list */}
      {filteredSnippets.length === 0 ? (
        <div style={styles.empty}>
          {generating ? (
            'Generating snippets...'
          ) : (
            <>
              No snippets for {currentLanguage} yet.
              <br />
              Click "+ Generate" to create some.
            </>
          )}
        </div>
      ) : (
        <div style={styles.list}>
          {filteredSnippets.map((s) => {
            const stats = getSnippetStats(s.id);
            return (
              <div key={s.id} style={styles.item}>
                <button
                  onClick={() => onSelect(s)}
                  style={{
                    ...styles.itemBtn,
                    borderColor: stats.completed ? T.green + '66' : T.border,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = T.accent;
                    e.currentTarget.style.background = T.surface2;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = stats.completed ? T.green + '66' : T.border;
                    e.currentTarget.style.background = T.surface;
                  }}
                >
                  <div style={styles.itemInfo}>
                    <div style={styles.itemHeader}>
                      <span style={styles.itemTitle}>
                        {stats.completed && <span style={styles.completedIcon}>✓</span>}
                        {s.title}
                      </span>
                      <span
                        style={{
                          ...styles.diffBadge,
                          background: `${DIFFICULTY_COLORS[s.difficulty]}22`,
                          color: DIFFICULTY_COLORS[s.difficulty],
                        }}
                      >
                        {s.difficulty}
                      </span>
                    </div>
                    <div style={styles.itemMeta}>
                      {s.code.split('\n').length} lines · {s.code.length} chars
                      {stats.completed && (
                        <span style={styles.completedMeta}>
                          {' '}· Best: {stats.bestWpm} wpm ({stats.bestAccuracy?.toFixed(0)}%)
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                {s.description && (
                  <button
                    onClick={() => setViewingDescription(s)}
                    style={styles.infoBtn}
                    title="View description"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = T.surface2;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = T.surface;
                    }}
                  >
                    i
                  </button>
                )}
                <button
                  onClick={() => handleDelete(s.id)}
                  style={styles.deleteBtn}
                  title="Delete"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = T.error;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = T.textDim;
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {viewingDescription && (
        <SnippetDescription
          title={viewingDescription.title}
          description={viewingDescription.description}
          difficulty={viewingDescription.difficulty}
          language={viewingDescription.language}
          onClose={() => setViewingDescription(null)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontFamily: T.font,
    fontSize: 24,
    fontWeight: 700,
    color: T.accent,
    margin: 0,
  },
  subtitle: {
    fontFamily: T.font,
    fontSize: 12,
    color: T.textDim,
    margin: '4px 0 0',
  },
  genBtn: {
    fontFamily: T.font,
    fontSize: 12,
    fontWeight: 600,
    padding: '10px 16px',
    background: T.accent,
    color: T.bg,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  empty: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: T.font,
    fontSize: 14,
    color: T.textDim,
    textAlign: 'center',
    lineHeight: 1.6,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    paddingRight: 8,
  },
  item: {
    display: 'flex',
    alignItems: 'stretch',
  },
  itemBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRight: 'none',
    borderRadius: '10px 0 0 10px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'left',
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  itemTitle: {
    fontFamily: T.font,
    fontSize: 13,
    fontWeight: 500,
    color: T.text,
  },
  completedIcon: {
    color: T.green,
    marginRight: 4,
  },
  diffBadge: {
    fontFamily: T.font,
    fontSize: 9,
    padding: '2px 7px',
    borderRadius: 20,
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  itemMeta: {
    fontFamily: T.font,
    fontSize: 11,
    color: T.textDim,
  },
  completedMeta: {
    color: T.green,
  },
  deleteBtn: {
    fontFamily: T.font,
    fontSize: 16,
    padding: '0 14px',
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: '0 10px 10px 0',
    color: T.textDim,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  infoBtn: {
    fontFamily: T.font,
    fontSize: 11,
    fontWeight: 600,
    padding: '0 12px',
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRight: 'none',
    color: T.mauve,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
};

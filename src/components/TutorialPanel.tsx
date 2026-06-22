import { useState } from 'react';
import type { Tutorial, Language } from '../types';
import { T } from '../theme';
import { createTutorialPlan, deleteTutorial } from '../api';

interface TutorialPanelProps {
  tutorials: Tutorial[];
  currentLanguage: Language;
  profileDescription: string;
  onStartTutorial: (id: string) => void;
  onRefresh: () => void;
}

export function TutorialPanel({
  tutorials,
  currentLanguage,
  profileDescription,
  onStartTutorial,
  onRefresh,
}: TutorialPanelProps) {
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [planError, setPlanError] = useState('');

  const filteredTutorials = tutorials.filter((t) => t.language === currentLanguage);
  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return T.green;
      case 'active': return T.accent;
      case 'planning': return T.warning;
      default: return T.textDim;
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setPlanError('');
    setPlan(null);
    setPlanId(null);
    try {
      const result = await createTutorialPlan(currentLanguage, profileDescription);
      setPlan(result);
      setPlanId(result.id);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Failed to generate plan');
    }
    setGenerating(false);
  };

  const handleStartTutorial = async () => {
    if (!planId) return;
    onStartTutorial(planId);
  };

  const handleDeleteTutorial = async (id: string) => {
    try {
      await deleteTutorial(id);
      onRefresh();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const getDifficultyColor = (d: string) => {
    switch (d) {
      case 'easy': return T.green;
      case 'medium': return T.warning;
      case 'hard': return T.error;
      default: return T.textDim;
    }
  };

  const getPartCount = (t: Tutorial): number => {
    return (t as any).completed_parts || 0;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Tutorials</h2>
          <p style={styles.subtitle}>{currentLanguage} · {filteredTutorials.length} tutorials</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{ ...styles.genBtn, opacity: generating ? 0.6 : 1 }}
        >
          {generating ? 'Planning...' : '+ New Tutorial'}
        </button>
      </div>

      {/* Plan review */}
      {plan && planId && (
        <div style={styles.planCard}>
          <div style={styles.planTitle}>{plan.title}</div>
          <div style={styles.planIntro}>{plan.intro}</div>
          <div style={styles.planMeta}>
            <span style={{ color: getDifficultyColor(plan.difficulty) }}>{plan.difficulty}</span>
            <span style={{ color: T.textDim }}> · </span>
            <span style={{ color: T.mauve }}>{plan.techStack}</span>
            <span style={{ color: T.textDim }}> · {plan.parts.length} parts</span>
          </div>
          <div style={styles.planParts}>
            {plan.parts.map((p: any) => (
              <div key={p.partNumber} style={styles.planPart}>
                <div style={styles.planPartHeader}>
                  <span style={styles.planPartNum}>Part {p.partNumber}</span>
                  <span style={{ ...styles.planPartDiff, color: getDifficultyColor(p.difficulty) }}>{p.difficulty}</span>
                </div>
                <div style={styles.planPartTitle}>{p.title}</div>
                <div style={styles.planPartDesc}>{p.description}</div>
                <div style={styles.planPartFiles}>
                  {p.files?.map((f: any) => (
                    <span key={f.path} style={styles.fileBadge}>{f.path}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {planError && <div style={styles.error}>{planError}</div>}
          <button onClick={handleStartTutorial} style={styles.startBtn}>
            Start Tutorial
          </button>
        </div>
      )}

      {planError && !plan && <div style={styles.error}>{planError}</div>}

      {/* Tutorial list */}
      {filteredTutorials.length === 0 && !plan ? (
        <div style={styles.empty}>
          No tutorials for {currentLanguage} yet.<br />
          Click "+ New Tutorial" to create one.
        </div>
      ) : (
        <div style={styles.list}>
          {filteredTutorials.map((t) => (
            <div key={t.id} style={styles.item}>
              <button onClick={() => onStartTutorial(t.id)} style={styles.itemBtn}>
                <div style={styles.itemHeader}>
                  <span style={styles.itemTitle}>{t.title}</span>
                  <span style={{ ...styles.statusBadge, color: statusColor(t.status), borderColor: statusColor(t.status) }}>
                    {t.status}
                  </span>
                </div>
                <div style={styles.itemMeta}>
                  {getPartCount(t)}/{t.total_parts} parts completed
                  {t.tech_stack ? <span> · {t.tech_stack}</span> : null}
                </div>
              </button>
              <button onClick={() => handleDeleteTutorial(t.id)} style={styles.deleteBtn}
                onMouseEnter={(e) => e.currentTarget.style.color = T.error}
                onMouseLeave={(e) => e.currentTarget.style.color = T.textDim}
              >×</button>
            </div>
          ))}
        </div>
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
    marginBottom: 24,
  },
  title: {
    fontFamily: T.font,
    fontSize: 28,
    fontWeight: 700,
    color: T.mauve,
    margin: 0,
  },
  subtitle: {
    fontFamily: T.font,
    fontSize: 13,
    color: T.textDim,
    margin: '4px 0 0',
  },
  genBtn: {
    fontFamily: T.font,
    fontSize: 13,
    fontWeight: 600,
    padding: '12px 20px',
    background: T.mauve,
    color: T.bg,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  planCard: {
    background: T.surface,
    border: `1px solid ${T.mauve}44`,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  planTitle: {
    fontFamily: T.font,
    fontSize: 20,
    fontWeight: 700,
    color: T.accent,
    marginBottom: 8,
  },
  planIntro: {
    fontFamily: T.font,
    fontSize: 13,
    color: T.text,
    lineHeight: 1.6,
    marginBottom: 8,
  },
  planMeta: {
    fontFamily: T.font,
    fontSize: 12,
    marginBottom: 16,
  },
  planParts: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginBottom: 16,
  },
  planPart: {
    background: T.surface2,
    borderRadius: 8,
    padding: '12px 14px',
  },
  planPartHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  planPartNum: {
    fontFamily: T.font,
    fontSize: 11,
    color: T.mauve,
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  planPartDiff: {
    fontFamily: T.font,
    fontSize: 10,
    fontWeight: 600,
  },
  planPartTitle: {
    fontFamily: T.font,
    fontSize: 14,
    color: T.text,
    fontWeight: 500,
    marginBottom: 4,
  },
  planPartDesc: {
    fontFamily: T.font,
    fontSize: 12,
    color: T.textDim,
    marginBottom: 8,
    lineHeight: 1.4,
  },
  planPartFiles: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  fileBadge: {
    fontFamily: T.font,
    fontSize: 10,
    padding: '2px 8px',
    background: T.bg,
    color: T.teal,
    borderRadius: 4,
  },
  startBtn: {
    fontFamily: T.font,
    fontSize: 14,
    fontWeight: 600,
    padding: '12px 24px',
    background: T.mauve,
    color: T.bg,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    width: '100%',
  },
  error: {
    fontFamily: T.font,
    fontSize: 12,
    color: T.error,
    marginBottom: 12,
  },
  empty: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: T.font,
    fontSize: 15,
    color: T.textDim,
    textAlign: 'center',
    lineHeight: 1.6,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  item: {
    display: 'flex',
    alignItems: 'stretch',
  },
  itemBtn: {
    flex: 1,
    padding: '14px 18px',
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRight: 'none',
    borderRadius: '10px 0 0 10px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  itemTitle: {
    fontFamily: T.font,
    fontSize: 14,
    fontWeight: 500,
    color: T.text,
  },
  statusBadge: {
    fontFamily: T.font,
    fontSize: 9,
    padding: '2px 7px',
    borderRadius: 20,
    fontWeight: 600,
    textTransform: 'uppercase',
    border: '1px solid',
  },
  itemMeta: {
    fontFamily: T.font,
    fontSize: 12,
    color: T.textDim,
  },
  deleteBtn: {
    fontFamily: T.font,
    fontSize: 18,
    padding: '0 16px',
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: '0 10px 10px 0',
    color: T.textDim,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
};

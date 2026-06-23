import { useEffect, useState } from 'react';
import type { GamificationData } from '../types';
import { T } from '../theme';
import { getGamification } from '../api';

export function GamificationPanel() {
  const [data, setData] = useState<GamificationData | null>(null);

  useEffect(() => {
    getGamification().then(setData).catch(() => {});
  }, []);

  if (!data) {
    return <div style={{ fontFamily: T.font, color: T.textDim, padding: 32, textAlign: 'center' }}>Loading...</div>;
  }

  const pct = data.next > 0 ? Math.round((data.current / data.next) * 100) : 100;

  return (
    <div style={styles.page}>
      {/* Rank card */}
      <div style={styles.rankCard}>
        <div style={styles.rankNumber}>#{data.rank}</div>
        <div style={styles.rankTitle}>{data.rank_title}</div>
        <div style={styles.expValue}>{data.total_exp} EXP</div>
        <div style={styles.progressWrap}>
          <div style={styles.progressBg}>
            <div style={{ ...styles.progressFill, width: `${pct}%` }} />
          </div>
          <div style={styles.progressLabel}>{data.current} / {data.next} EXP to next rank</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={styles.statsRow}>
        <div style={styles.statBox}>
          <div style={styles.statValue}>{data.streak_count}</div>
          <div style={styles.statLabel}>day streak</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statValue}>{data.snippets_completed}</div>
          <div style={styles.statLabel}>snippets</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statValue}>{data.tutorial_files_completed}</div>
          <div style={styles.statLabel}>files typed</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statValue}>{data.tutorials_completed}</div>
          <div style={styles.statLabel}>tutorials</div>
        </div>
      </div>

      {/* Language EXP */}
      {data.language_exp?.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Language EXP</div>
          {data.language_exp.map((le) => {
            const maxExp = Math.max(...data.language_exp.map((x) => x.exp));
            const barPct = maxExp > 0 ? (le.exp / maxExp) * 100 : 0;
            return (
              <div key={le.language} style={styles.langRow}>
                <span style={styles.langName}>{le.language}</span>
                <div style={styles.langBarBg}>
                  <div style={{ ...styles.langBarFill, width: `${barPct}%` }} />
                </div>
                <span style={styles.langExp}>{le.exp} exp</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tags */}
      {data.tags?.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Badges</div>
          <div style={styles.tagGrid}>
            {data.tags.map((t) => (
              <span key={t.tag} style={styles.tag}>
                {t.tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '32px 40px',
    maxWidth: 700,
    margin: '0 auto',
  },
  rankCard: {
    background: T.surface,
    borderRadius: 16,
    padding: 32,
    textAlign: 'center',
    marginBottom: 24,
    border: `1px solid ${T.border}`,
  },
  rankNumber: {
    fontFamily: T.font,
    fontSize: 48,
    fontWeight: 800,
    color: T.mauve,
    lineHeight: 1,
  },
  rankTitle: {
    fontFamily: T.font,
    fontSize: 18,
    color: T.text,
    fontWeight: 600,
    marginTop: 4,
  },
  expValue: {
    fontFamily: T.font,
    fontSize: 13,
    color: T.textDim,
    marginTop: 8,
  },
  progressWrap: {
    marginTop: 16,
  },
  progressBg: {
    height: 8,
    background: T.surface2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: T.mauve,
    borderRadius: 4,
    transition: 'width 0.3s',
  },
  progressLabel: {
    fontFamily: T.font,
    fontSize: 11,
    color: T.textDim,
    marginTop: 6,
  },
  statsRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    background: T.surface,
    borderRadius: 12,
    padding: 16,
    textAlign: 'center',
    border: `1px solid ${T.border}`,
  },
  statValue: {
    fontFamily: T.font,
    fontSize: 24,
    fontWeight: 700,
    color: T.accent,
  },
  statLabel: {
    fontFamily: T.font,
    fontSize: 10,
    color: T.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: T.font,
    fontSize: 11,
    fontWeight: 600,
    color: T.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  langRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  langName: {
    fontFamily: T.font,
    fontSize: 12,
    color: T.text,
    width: 80,
    flexShrink: 0,
  },
  langBarBg: {
    flex: 1,
    height: 6,
    background: T.surface2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  langBarFill: {
    height: '100%',
    background: T.green,
    borderRadius: 3,
    transition: 'width 0.3s',
  },
  langExp: {
    fontFamily: T.font,
    fontSize: 11,
    color: T.textDim,
    width: 50,
    textAlign: 'right',
  },
  tagGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    fontFamily: T.font,
    fontSize: 11,
    padding: '4px 10px',
    background: T.surface2,
    color: T.teal,
    borderRadius: 20,
    fontWeight: 500,
  },
};

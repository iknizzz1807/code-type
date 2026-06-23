import { useEffect, useState } from 'react';
import type { LeaderboardEntry } from '../types';
import { T } from '../theme';
import { getLeaderboard } from '../api';

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    getLeaderboard().then(setEntries).catch(() => {});
  }, []);

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Leaderboard</h2>
      <p style={styles.sub}>Top typists ranked by total EXP</p>
      <div style={styles.table}>
        {entries.length === 0 && (
          <div style={{ fontFamily: T.font, color: T.textDim, textAlign: 'center', padding: 32 }}>No data yet</div>
        )}
        {entries.map((e, i) => (
          <div key={i} style={styles.row}>
            <span style={{ ...styles.rank, color: i < 3 ? T.mauve : T.textDim }}>#{i + 1}</span>
            <span style={styles.name}>{e.username}</span>
            <span style={styles.badge}>{e.rank_title}</span>
            <span style={styles.exp}>{e.total_exp} EXP</span>
            <span style={styles.meta}>{e.streak_count}d streak</span>
            <span style={styles.meta}>{e.snippets_completed + e.tutorial_files_completed} done</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '32px 40px',
    maxWidth: 700,
    margin: '0 auto',
  },
  title: {
    fontFamily: T.font,
    fontSize: 28,
    fontWeight: 700,
    color: T.mauve,
    margin: 0,
  },
  sub: {
    fontFamily: T.font,
    fontSize: 13,
    color: T.textDim,
    marginTop: 4,
    marginBottom: 24,
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    background: T.surface,
    borderRadius: 10,
    border: `1px solid ${T.border}`,
  },
  rank: {
    fontFamily: T.font,
    fontSize: 14,
    fontWeight: 700,
    width: 32,
  },
  name: {
    fontFamily: T.font,
    fontSize: 13,
    fontWeight: 600,
    color: T.text,
    flex: 1,
  },
  badge: {
    fontFamily: T.font,
    fontSize: 11,
    color: T.mauve,
    background: T.surface2,
    padding: '2px 8px',
    borderRadius: 10,
  },
  exp: {
    fontFamily: T.font,
    fontSize: 12,
    fontWeight: 600,
    color: T.accent,
    minWidth: 70,
    textAlign: 'right',
  },
  meta: {
    fontFamily: T.font,
    fontSize: 10,
    color: T.textDim,
    minWidth: 50,
    textAlign: 'right',
  },
};

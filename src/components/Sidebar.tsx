import { useState } from 'react';
import type { User, LanguageProfile, Stats, Language } from '../types';
import { T } from '../theme';
import { LANGUAGES } from '../types';

interface SidebarProps {
  user: User;
  profiles: LanguageProfile[];
  stats: Stats | null;
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({
  user,
  profiles,
  stats,
  currentLanguage,
  onLanguageChange,
  onOpenSettings,
  onLogout,
  collapsed,
  onToggle,
}: SidebarProps) {
  const [showLogout, setShowLogout] = useState(false);

  const hasProfile = (lang: Language): boolean => {
    return !!(profiles.find((p) => p.language === lang)?.description);
  };

  return (
    <div style={{ ...styles.sidebar, width: collapsed ? 56 : 220 }}>
      {/* Toggle */}
      <button onClick={onToggle} style={styles.toggle}>
        {collapsed ? '→' : '←'}
      </button>

      {!collapsed && (
        <>
          {/* User */}
          <div style={styles.user}>
            <div style={styles.avatar}>{user.username[0].toUpperCase()}</div>
            <div style={styles.username}>{user.username}</div>
          </div>

          {/* Stats */}
          {stats && (
            <div style={styles.stats}>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{Math.round(stats.avg_wpm || 0)}</span>
                <span style={styles.statLabel}>avg</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{Math.round(stats.best_wpm || 0)}</span>
                <span style={styles.statLabel}>best</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{stats.total_sessions || 0}</span>
                <span style={styles.statLabel}>games</span>
              </div>
            </div>
          )}

          {/* Languages */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Languages</div>
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => onLanguageChange(lang)}
                style={{
                  ...styles.langBtn,
                  background: currentLanguage === lang ? T.accent : 'transparent',
                  color: currentLanguage === lang ? T.bg : T.text,
                }}
              >
                <span>{lang}</span>
                {hasProfile(lang) && <span style={styles.profileDot}>●</span>}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button onClick={onOpenSettings} style={styles.actionBtn}>
              ⚙ Settings
            </button>
            <button onClick={() => setShowLogout(!showLogout)} style={styles.actionBtn}>
              {showLogout ? 'Cancel' : 'Logout'}
            </button>
            {showLogout && (
              <button onClick={onLogout} style={styles.logoutConfirm}>
                Confirm Logout
              </button>
            )}
          </div>
        </>
      )}

      {collapsed && (
        <div style={styles.collapsedContent}>
          <div style={styles.avatarSmall}>{user.username[0].toUpperCase()}</div>
          <div style={styles.divider} />
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => onLanguageChange(lang)}
              style={{
                ...styles.langBtnSmall,
                background: currentLanguage === lang ? T.accent : 'transparent',
                color: currentLanguage === lang ? T.bg : T.textDim,
              }}
              title={lang}
            >
              {lang.slice(0, 2)}
            </button>
          ))}
          <div style={styles.divider} />
          <button onClick={onOpenSettings} style={styles.iconBtn} title="Settings">⚙</button>
          <button onClick={onLogout} style={styles.iconBtn} title="Logout">⏻</button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    height: '100vh',
    position: 'sticky',
    top: 0,
    background: T.surface,
    borderRight: `1px solid ${T.border}`,
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.2s',
    overflow: 'hidden',
    flexShrink: 0,
  },
  toggle: {
    fontFamily: T.font,
    fontSize: 14,
    padding: '10px',
    background: 'none',
    border: 'none',
    color: T.textDim,
    cursor: 'pointer',
    textAlign: 'left',
  },
  user: {
    padding: '0 12px 12px',
    borderBottom: `1px solid ${T.border}`,
    marginBottom: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    background: T.accent,
    color: T.bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: T.font,
    fontWeight: 700,
    fontSize: 16,
    marginBottom: 6,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    background: T.accent,
    color: T.bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: T.font,
    fontWeight: 700,
    fontSize: 14,
    margin: '4px auto 12px',
  },
  username: {
    fontFamily: T.font,
    fontSize: 12,
    color: T.text,
    fontWeight: 500,
  },
  stats: {
    display: 'flex',
    gap: 4,
    padding: '0 12px 12px',
    borderBottom: `1px solid ${T.border}`,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    textAlign: 'center',
  },
  statValue: {
    display: 'block',
    fontFamily: T.font,
    fontSize: 14,
    fontWeight: 700,
    color: T.accent,
  },
  statLabel: {
    display: 'block',
    fontFamily: T.font,
    fontSize: 8,
    color: T.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 8px',
  },
  sectionTitle: {
    fontFamily: T.font,
    fontSize: 9,
    color: T.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
    padding: '0 8px 6px',
  },
  langBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 10px',
    fontFamily: T.font,
    fontSize: 12,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all 0.15s',
    marginBottom: 2,
  },
  langBtnSmall: {
    width: 32,
    height: 32,
    margin: '3px auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: T.font,
    fontSize: 10,
    fontWeight: 600,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  profileDot: {
    fontSize: 6,
    color: T.green,
  },
  divider: {
    height: 1,
    background: T.border,
    margin: '8px 8px',
  },
  actions: {
    padding: 12,
    borderTop: `1px solid ${T.border}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  actionBtn: {
    fontFamily: T.font,
    fontSize: 13,
    padding: '8px 12px',
    background: 'none',
    border: 'none',
    color: T.textDim,
    cursor: 'pointer',
    textAlign: 'left',
    borderRadius: 6,
  },
  logoutConfirm: {
    fontFamily: T.font,
    fontSize: 11,
    padding: '6px 10px',
    background: T.red,
    color: T.bg,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  iconBtn: {
    width: 36,
    height: 36,
    margin: '4px auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    background: 'none',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    color: T.textDim,
  },
  collapsedContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '4px 0',
    flex: 1,
    overflowY: 'auto',
  },
};

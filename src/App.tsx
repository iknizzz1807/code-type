import { useState, useEffect, useCallback } from 'react';
import type { User, LanguageProfile, Snippet, Stats, Language } from './types';
import { T } from './theme';
import { Auth } from './components/Auth';
import { Sidebar } from './components/Sidebar';
import { Settings } from './components/Settings';
import { SnippetPanel } from './components/SnippetPanel';
import { TypingSession } from './components/TypingSession';
import {
  getCurrentUser,
  getProfiles,
  getSnippets,
  getStats,
  logout as apiLogout,
} from './api';

type View = 'auth' | 'main' | 'typing';

export default function App() {
  const [view, setView] = useState<View>('auth');
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<LanguageProfile[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<Language>('Python');
  const [activeSnippet, setActiveSnippet] = useState<Snippet | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      const [userData, profilesData, snippetsData, statsData] = await Promise.all([
        getCurrentUser(),
        getProfiles(),
        getSnippets(),
        getStats(),
      ]);
      setUser(userData);
      setProfiles(profilesData);
      setSnippets(snippetsData);
      setStats(statsData);
      setView('main');
    } catch {
      // Not logged in
      setView('auth');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = useCallback(async () => {
    try {
      const [snippetsData, statsData] = await Promise.all([
        getSnippets(),
        getStats(),
      ]);
      setSnippets(snippetsData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to refresh:', err);
    }
  }, []);

  const handleLogin = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const handleLogout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {}
    localStorage.removeItem('token');
    setUser(null);
    setView('auth');
  }, []);

  const getProfileDescription = (lang: Language): string => {
    return profiles.find((p) => p.language === lang)?.description || '';
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingText}>loading...</div>
      </div>
    );
  }

  if (view === 'auth') {
    return <Auth onLogin={handleLogin} />;
  }

  if (view === 'typing' && activeSnippet) {
    return (
      <div style={styles.layout}>
        <Sidebar
          user={user!}
          profiles={profiles}
          stats={stats}
          currentLanguage={currentLanguage}
          onLanguageChange={(lang) => {
            setCurrentLanguage(lang);
            setActiveSnippet(null);
            setView('main');
          }}
          onOpenSettings={() => setShowSettings(true)}
          onLogout={handleLogout}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <TypingSession
          snippet={activeSnippet}
          language={currentLanguage}
          onBack={() => {
            setActiveSnippet(null);
            setView('main');
            refreshData();
          }}
          onHistoryUpdate={refreshData}
        />
      </div>
    );
  }

  return (
    <div style={styles.layout}>
      <Sidebar
        user={user!}
        profiles={profiles}
        stats={stats}
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
        onOpenSettings={() => setShowSettings(true)}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main style={styles.main}>
        <SnippetPanel
          snippets={snippets}
          currentLanguage={currentLanguage}
          profileDescription={getProfileDescription(currentLanguage)}
          onSelect={(s) => {
            setActiveSnippet(s);
            setView('typing');
          }}
          onRefresh={refreshData}
        />
      </main>

      {showSettings && (
        <Settings
          profiles={profiles}
          onClose={() => setShowSettings(false)}
          onProfilesUpdate={async () => {
            const p = await getProfiles();
            setProfiles(p);
          }}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    minHeight: '100vh',
    background: T.bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: T.font,
    color: T.textDim,
  },
  layout: {
    display: 'flex',
    minHeight: '100vh',
    background: T.bg,
  },
  main: {
    flex: 1,
    padding: 24,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
};

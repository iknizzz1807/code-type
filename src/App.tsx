import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useParams, useNavigate, Navigate } from 'react-router-dom';
import type { User, LanguageProfile, Snippet, Stats, Language, HistoryEntry } from './types';
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
  getHistory,
  logout as apiLogout,
} from './api';
import { LANGUAGES } from './types';

function MainView({
  user,
  profiles,
  snippets,
  stats,
  history,
  currentLanguage,
  sidebarCollapsed,
  onSelectSnippet,
  onLanguageChange,
  onToggleSidebar,
  onOpenSettings,
  onLogout,
  onRefresh,
}: {
  user: User;
  profiles: LanguageProfile[];
  snippets: Snippet[];
  stats: Stats | null;
  history: HistoryEntry[];
  currentLanguage: Language;
  sidebarCollapsed: boolean;
  onSelectSnippet: (s: Snippet) => void;
  onLanguageChange: (lang: Language) => void;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onRefresh: () => void;
}) {
  const getProfileDescription = (lang: Language): string => {
    return profiles.find((p) => p.language === lang)?.description || '';
  };

  return (
    <div style={styles.layout}>
      <Sidebar
        user={user}
        profiles={profiles}
        stats={stats}
        currentLanguage={currentLanguage}
        onLanguageChange={onLanguageChange}
        onOpenSettings={onOpenSettings}
        onLogout={onLogout}
        collapsed={sidebarCollapsed}
        onToggle={onToggleSidebar}
      />
      <main style={styles.main}>
        <SnippetPanel
          snippets={snippets}
          history={history}
          currentLanguage={currentLanguage}
          profileDescription={getProfileDescription(currentLanguage)}
          onSelect={onSelectSnippet}
          onRefresh={onRefresh}
        />
      </main>
    </div>
  );
}

function TypingView({
  user,
  profiles,
  stats,
  history,
  snippet,
  language,
  sidebarCollapsed,
  onLanguageChange,
  onToggleSidebar,
  onOpenSettings,
  onLogout,
  onBack,
  onHistoryUpdate,
}: {
  user: User;
  profiles: LanguageProfile[];
  stats: Stats | null;
  history: HistoryEntry[];
  snippet: Snippet;
  language: Language;
  sidebarCollapsed: boolean;
  onLanguageChange: (lang: Language) => void;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onBack: () => void;
  onHistoryUpdate: () => void;
}) {
  return (
    <div style={styles.layout}>
      <Sidebar
        user={user}
        profiles={profiles}
        stats={stats}
        currentLanguage={language}
        onLanguageChange={(lang) => {
          onLanguageChange(lang);
          onBack();
        }}
        onOpenSettings={onOpenSettings}
        onLogout={onLogout}
        collapsed={sidebarCollapsed}
        onToggle={onToggleSidebar}
      />
      <TypingSession
        snippet={snippet}
        language={language}
        history={history}
        onBack={onBack}
        onHistoryUpdate={onHistoryUpdate}
      />
    </div>
  );
}

// Wrapper component to handle language route
function LanguageRoute({
  user,
  profiles,
  snippets,
  stats,
  history,
  sidebarCollapsed,
  onLanguageChange,
  onToggleSidebar,
  onOpenSettings,
  onLogout,
  onRefresh,
  onSelectSnippet,
}: {
  user: User;
  profiles: LanguageProfile[];
  snippets: Snippet[];
  stats: Stats | null;
  history: HistoryEntry[];
  sidebarCollapsed: boolean;
  onLanguageChange: (lang: Language) => void;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onRefresh: () => void;
  onSelectSnippet: (s: Snippet, lang: Language) => void;
}) {
  const { language } = useParams<{ language: string }>();
  const navigate = useNavigate();

  // Validate language
  const validLanguage = LANGUAGES.includes(language as Language)
    ? (language as Language)
    : 'Python';

  useEffect(() => {
    onLanguageChange(validLanguage);
  }, [validLanguage, onLanguageChange]);

  return (
    <MainView
      user={user}
      profiles={profiles}
      snippets={snippets}
      stats={stats}
      history={history}
      currentLanguage={validLanguage}
      sidebarCollapsed={sidebarCollapsed}
      onSelectSnippet={(s) => onSelectSnippet(s, validLanguage)}
      onLanguageChange={(lang) => navigate(`/${lang.toLowerCase()}`)}
      onToggleSidebar={onToggleSidebar}
      onOpenSettings={onOpenSettings}
      onLogout={onLogout}
      onRefresh={onRefresh}
    />
  );
}

// Wrapper for typing route
function TypingRoute({
  user,
  profiles,
  snippets,
  stats,
  history,
  sidebarCollapsed,
  onToggleSidebar,
  onOpenSettings,
  onLogout,
  onBack,
  onHistoryUpdate,
}: {
  user: User;
  profiles: LanguageProfile[];
  snippets: Snippet[];
  stats: Stats | null;
  history: HistoryEntry[];
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onBack: (lang: Language) => void;
  onHistoryUpdate: () => void;
}) {
  const { language, snippetId } = useParams<{ language: string; snippetId: string }>();
  const navigate = useNavigate();

  const normalizeLanguage = (lang: string | undefined): Language => {
    if (!lang) return 'Python';
    const capitalized = lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase();
    return LANGUAGES.includes(capitalized as Language) ? (capitalized as Language) : 'Python';
  };

  const validLanguage = normalizeLanguage(language);
  const snippet = snippets.find(s => s.id === snippetId);

  if (!snippet) {
    navigate(`/${validLanguage.toLowerCase()}`);
    return null;
  }

  return (
    <TypingView
      user={user}
      profiles={profiles}
      stats={stats}
      history={history}
      snippet={snippet}
      language={validLanguage}
      sidebarCollapsed={sidebarCollapsed}
      onLanguageChange={(lang) => navigate(`/${lang.toLowerCase()}`)}
      onToggleSidebar={onToggleSidebar}
      onOpenSettings={onOpenSettings}
      onLogout={onLogout}
      onBack={() => onBack(validLanguage)}
      onHistoryUpdate={onHistoryUpdate}
    />
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<LanguageProfile[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    try {
      const [userData, profilesData, snippetsData, statsData, historyData] = await Promise.all([
        getCurrentUser(),
        getProfiles(),
        getSnippets(),
        getStats(),
        getHistory(),
      ]);
      setUser(userData);
      setProfiles(profilesData);
      setSnippets(snippetsData);
      setStats(statsData);
      setHistory(historyData);
    } catch {
      // Not logged in
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = useCallback(async () => {
    try {
      const [snippetsData, statsData, historyData] = await Promise.all([
        getSnippets(),
        getStats(),
        getHistory(),
      ]);
      setSnippets(snippetsData);
      setStats(statsData);
      setHistory(historyData);
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
  }, []);

  const handleSelectSnippet = useCallback((s: Snippet, lang: Language) => {
    navigate(`/${lang.toLowerCase()}/typing/${s.id}`);
  }, [navigate]);

  const handleBackFromTyping = useCallback((lang: Language) => {
    navigate(`/${lang.toLowerCase()}`);
    refreshData();
  }, [navigate, refreshData]);

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingText}>loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/python" replace />} />
        <Route
          path="/:language"
          element={
            <LanguageRoute
              user={user}
              profiles={profiles}
              snippets={snippets}
              stats={stats}
              history={history}
              sidebarCollapsed={sidebarCollapsed}
              onLanguageChange={() => {}}
              onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
              onOpenSettings={() => setShowSettings(true)}
              onLogout={handleLogout}
              onRefresh={refreshData}
              onSelectSnippet={handleSelectSnippet}
            />
          }
        />
        <Route
          path="/:language/typing/:snippetId"
          element={
            <TypingRoute
              user={user}
              profiles={profiles}
              snippets={snippets}
              stats={stats}
              history={history}
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
              onOpenSettings={() => setShowSettings(true)}
              onLogout={handleLogout}
              onBack={handleBackFromTyping}
              onHistoryUpdate={refreshData}
            />
          }
        />
      </Routes>

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
    </>
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
    padding: '24px 32px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
};

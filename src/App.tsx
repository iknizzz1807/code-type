import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useParams, useNavigate, Navigate } from 'react-router-dom';
import type { User, LanguageProfile, Snippet, Stats, Language, HistoryEntry, Tutorial } from './types';
import { T } from './theme';
import { Auth } from './components/Auth';
import { Sidebar } from './components/Sidebar';
import { Settings } from './components/Settings';
import { SnippetPanel } from './components/SnippetPanel';
import { TutorialPanel } from './components/TutorialPanel';
import { TutorialSession } from './components/TutorialSession';
import { TypingSession } from './components/TypingSession';
import { GamificationPanel } from './components/GamificationPanel';
import { Leaderboard as LeaderboardComp } from './components/Leaderboard';
import {
  getCurrentUser,
  getProfiles,
  getSnippets,
  getStats,
  getHistory,
  getTutorials,
  logout as apiLogout,
} from './api';
import { LANGUAGES } from './types';

function normalizeLanguage(lang: string | undefined): Language {
  if (!lang) return 'Python';
  const lower = lang.toLowerCase();
  if (lower === 'c++') return 'C++';
  if (lower === 'c') return 'C';
  if (lower === 'typescript') return 'TypeScript';
  const capitalized = lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase();
  return LANGUAGES.includes(capitalized as Language) ? (capitalized as Language) : 'Python';
}

// Wrapper component to handle language route
function AppShell({
  user, profiles, stats, currentLanguage, sidebarCollapsed,
  onOpenSettings, onLogout, onToggleSidebar, activeTab, children,
}: {
  user: User; profiles: LanguageProfile[]; stats: Stats | null;
  currentLanguage: Language; sidebarCollapsed: boolean;
  onOpenSettings: () => void; onLogout: () => void;
  onToggleSidebar: () => void; activeTab?: 'snippets' | 'tutorials';
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const lang = currentLanguage.toLowerCase();
  return (
    <div style={styles.layout}>
      <Sidebar
        user={user} profiles={profiles} stats={stats}
        currentLanguage={currentLanguage}
        onLanguageChange={(l) => navigate(`/${l.toLowerCase()}`)}
        onOpenSettings={onOpenSettings} onLogout={onLogout}
        collapsed={sidebarCollapsed} onToggle={onToggleSidebar}
        onNavigate={(path) => navigate(path)}
      />
      <main style={styles.main}>
        {activeTab ? (
          <div style={styles.tabBar}>
            <button
              onClick={() => navigate(`/${lang}`)}
              style={{ ...styles.tab, color: activeTab === 'snippets' ? T.accent : T.textDim, borderBottomColor: activeTab === 'snippets' ? T.accent : 'transparent' }}
            >Snippets</button>
            <button
              onClick={() => navigate(`/${lang}/tutorials`)}
              style={{ ...styles.tab, color: activeTab === 'tutorials' ? T.mauve : T.textDim, borderBottomColor: activeTab === 'tutorials' ? T.mauve : 'transparent' }}
            >Tutorials</button>
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}

function SnippetsPage({
  user, profiles, snippets, stats, history, sidebarCollapsed,
  onRefresh, onToggleSidebar,
  onOpenSettings, onLogout,
}: {
  user: User; profiles: LanguageProfile[]; snippets: Snippet[];
  stats: Stats | null; history: HistoryEntry[]; sidebarCollapsed: boolean;
  onRefresh: () => void;
  onToggleSidebar: () => void; onOpenSettings: () => void; onLogout: () => void;
}) {
  const { language } = useParams<{ language: string }>();
  const navigate = useNavigate();
  const currentLanguage = normalizeLanguage(language);
  const getProfileDescription = (lang: Language) => profiles.find((p) => p.language === lang)?.description || '';
  return (
    <AppShell {...{ user, profiles, stats, currentLanguage, sidebarCollapsed, onOpenSettings, onLogout, onToggleSidebar }} activeTab="snippets">
      <SnippetPanel
        snippets={snippets} history={history} currentLanguage={currentLanguage}
        profileDescription={getProfileDescription(currentLanguage)}
        onSelect={(s) => navigate(`/${currentLanguage.toLowerCase()}/typing/${s.id}`)}
        onRefresh={onRefresh}
      />
    </AppShell>
  );
}

function TutorialsPage({
  user, profiles, tutorials, stats, sidebarCollapsed,
  onRefresh, onToggleSidebar,
  onOpenSettings, onLogout,
}: {
  user: User; profiles: LanguageProfile[]; tutorials: Tutorial[];
  stats: Stats | null; sidebarCollapsed: boolean;
  onRefresh: () => void;
  onToggleSidebar: () => void; onOpenSettings: () => void; onLogout: () => void;
}) {
  const { language } = useParams<{ language: string }>();
  const navigate = useNavigate();
  const currentLanguage = normalizeLanguage(language);
  const getProfileDescription = (lang: Language) => profiles.find((p) => p.language === lang)?.description || '';
  return (
    <AppShell {...{ user, profiles, stats, currentLanguage, sidebarCollapsed, onOpenSettings, onLogout, onToggleSidebar }} activeTab="tutorials">
      <TutorialPanel
        tutorials={tutorials} currentLanguage={currentLanguage}
        profileDescription={getProfileDescription(currentLanguage)}
        onStartTutorial={(id) => navigate(`/${currentLanguage.toLowerCase()}/tutorial/${id}`)}
        onRefresh={onRefresh}
      />
    </AppShell>
  );
}

function RankPage({
  user, profiles, stats, sidebarCollapsed,
  onToggleSidebar, onOpenSettings, onLogout,
}: {
  user: User; profiles: LanguageProfile[]; stats: Stats | null;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void; onOpenSettings: () => void; onLogout: () => void;
}) {
  const { language } = useParams<{ language: string }>();
  const currentLanguage = normalizeLanguage(language);
  return (
    <AppShell {...{ user, profiles, stats, currentLanguage, sidebarCollapsed, onOpenSettings, onLogout, onToggleSidebar }}>
      <GamificationPanel />
    </AppShell>
  );
}

function LeaderboardPage({
  user, profiles, stats, sidebarCollapsed,
  onToggleSidebar, onOpenSettings, onLogout,
}: {
  user: User; profiles: LanguageProfile[]; stats: Stats | null;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void; onOpenSettings: () => void; onLogout: () => void;
}) {
  const { language } = useParams<{ language: string }>();
  const currentLanguage = normalizeLanguage(language);
  return (
    <AppShell {...{ user, profiles, stats, currentLanguage, sidebarCollapsed, onOpenSettings, onLogout, onToggleSidebar }}>
      <LeaderboardComp />
    </AppShell>
  );
}

function TutorialView({
  language,
  tutorialId,
  onBack,
}: {
  language: Language;
  tutorialId: string;
  onBack: () => void;
}) {
  return (
    <div style={{ ...styles.layout, minHeight: '100vh' }}>
      <TutorialSession
        tutorialId={tutorialId}
        language={language}
        onBack={onBack}
      />
    </div>
  );
}

function TypingView({
  user, profiles, stats, history, snippet, language,
  sidebarCollapsed, onLanguageChange, onToggleSidebar,
  onOpenSettings, onLogout, onBack, onHistoryUpdate,
}: {
  user: User; profiles: LanguageProfile[]; stats: Stats | null;
  history: HistoryEntry[]; snippet: Snippet; language: Language;
  sidebarCollapsed: boolean;
  onLanguageChange: (lang: Language) => void;
  onToggleSidebar: () => void; onOpenSettings: () => void; onLogout: () => void;
  onBack: () => void; onHistoryUpdate: () => void;
}) {
  return (
    <div style={styles.layout}>
      <Sidebar
        user={user} profiles={profiles} stats={stats}
        currentLanguage={language}
        onLanguageChange={(lang) => { onLanguageChange(lang); onBack(); }}
        onOpenSettings={onOpenSettings} onLogout={onLogout}
        collapsed={sidebarCollapsed} onToggle={onToggleSidebar}
      />
      <TypingSession
        snippet={snippet} language={language} history={history}
        onBack={onBack} onHistoryUpdate={onHistoryUpdate}
      />
    </div>
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

// Wrapper for tutorial route
function TutorialRoute({
  onBack,
}: {
  onBack: (lang: Language) => void;
}) {
  const { language, tutorialId } = useParams<{ language: string; tutorialId: string }>();
  const navigate = useNavigate();

  const validLanguage = normalizeLanguage(language);

  if (!tutorialId) {
    navigate(`/${validLanguage.toLowerCase()}`);
    return null;
  }

  return (
    <TutorialView
      language={validLanguage}
      tutorialId={tutorialId}
      onBack={() => onBack(validLanguage)}
    />
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<LanguageProfile[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    try {
      const [userData, profilesData, snippetsData, tutorialsData, statsData, historyData] = await Promise.all([
        getCurrentUser(),
        getProfiles(),
        getSnippets(),
        getTutorials(),
        getStats(),
        getHistory(),
      ]);
      setUser(userData);
      setProfiles(profilesData);
      setSnippets(snippetsData);
      setTutorials(tutorialsData);
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
      const [snippetsData, tutorialsData, statsData, historyData] = await Promise.all([
        getSnippets(),
        getTutorials(),
        getStats(),
        getHistory(),
      ]);
      setSnippets(snippetsData);
      setTutorials(tutorialsData);
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

  const handleBackFromTyping = useCallback((lang: Language) => {
    navigate(`/${lang.toLowerCase()}`);
    refreshData();
  }, [navigate, refreshData]);

  const handleBackFromTutorial = useCallback((lang: Language) => {
    navigate(`/${lang.toLowerCase()}/tutorials`);
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
              <SnippetsPage
                user={user}
                profiles={profiles}
                snippets={snippets}
                stats={stats}
                history={history}
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                onOpenSettings={() => setShowSettings(true)}
                onLogout={handleLogout}
                onRefresh={refreshData}
              />
            }
          />
          <Route
            path="/:language/tutorials"
            element={
              <TutorialsPage
                user={user}
                profiles={profiles}
                tutorials={tutorials}
                stats={stats}
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                onOpenSettings={() => setShowSettings(true)}
                onLogout={handleLogout}
                onRefresh={refreshData}
              />
            }
          />
          <Route
            path="/:language/rank"
            element={
              <RankPage
                user={user}
                profiles={profiles}
                stats={stats}
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                onOpenSettings={() => setShowSettings(true)}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/:language/leaderboard"
            element={
              <LeaderboardPage
                user={user}
                profiles={profiles}
                stats={stats}
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                onOpenSettings={() => setShowSettings(true)}
                onLogout={handleLogout}
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
          <Route
            path="/:language/tutorial/:tutorialId"
            element={
              <TutorialRoute
                onBack={handleBackFromTutorial}
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
  tabBar: {
    display: 'flex',
    gap: 0,
    marginBottom: 20,
    borderBottom: `1px solid ${T.border}`,
  },
  tab: {
    fontFamily: T.font,
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 20px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
};

import { useState, useEffect, useCallback } from 'react';
import type { Profile, Snippet, HistoryEntry, Screen } from './types';
import { ProfileSetup } from './components/ProfileSetup';
import { SnippetList } from './components/SnippetList';
import { TypingSession } from './components/TypingSession';
import { safeGet, safeSet, STORAGE_KEYS } from './storage';
import { generateSnippets } from './api';
import { T } from './theme';

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeSnippet, setActiveSnippet] = useState<Snippet | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await safeGet<Profile>(STORAGE_KEYS.profile);
      const s = await safeGet<Snippet[]>(STORAGE_KEYS.snippets);
      const h = await safeGet<HistoryEntry[]>(STORAGE_KEYS.history);
      setProfile(p);
      setSnippets(s || []);
      setHistory(h || []);
      setScreen(p ? 'list' : 'profile');
    })();
  }, []);

  const saveProfile = useCallback(async (p: Profile) => {
    setProfile(p);
    await safeSet(STORAGE_KEYS.profile, p);
    setScreen('list');
  }, []);

  const handleGenerateSnippets = useCallback(async () => {
    const p = profile;
    if (!p) return;
    setGenerating(true);
    try {
      const newSnippets = await generateSnippets(p, snippets.length);
      const all = [...snippets, ...newSnippets];
      setSnippets(all);
      await safeSet(STORAGE_KEYS.snippets, all);
    } catch (e) {
      console.error('Generate failed:', e);
      alert('Failed to generate snippets. Please check your API key.');
    }
    setGenerating(false);
  }, [profile, snippets]);

  const handleFinish = useCallback(
    async (result: Omit<HistoryEntry, 'snippetId' | 'snippetTitle' | 'date'>) => {
      if (!activeSnippet) return;
      const entry: HistoryEntry = {
        snippetId: activeSnippet.id,
        snippetTitle: activeSnippet.title,
        ...result,
        date: new Date().toISOString(),
      };
      const newHistory = [...history, entry];
      setHistory(newHistory);
      await safeSet(STORAGE_KEYS.history, newHistory);
    },
    [activeSnippet, history]
  );

  const deleteSnippet = useCallback(
    async (id: string) => {
      const filtered = snippets.filter((s) => s.id !== id);
      setSnippets(filtered);
      await safeSet(STORAGE_KEYS.snippets, filtered);
    },
    [snippets]
  );

  if (screen === 'loading') {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingText}>loading...</div>
      </div>
    );
  }

  if (screen === 'profile') {
    return <ProfileSetup onSave={saveProfile} initial={profile} />;
  }

  if (screen === 'typing' && activeSnippet) {
    return (
      <TypingSession
        snippet={activeSnippet}
        language={profile?.language || 'Python'}
        onBack={() => setScreen('list')}
        onFinish={handleFinish}
      />
    );
  }

  return (
    <SnippetList
      snippets={snippets}
      history={history}
      profile={profile!}
      generating={generating}
      onSelect={(s) => {
        setActiveSnippet(s);
        setScreen('typing');
      }}
      onGenerate={handleGenerateSnippets}
      onBack={() => setScreen('profile')}
      onDelete={deleteSnippet}
    />
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
};

// API client
import type { User, LanguageProfile, Snippet, HistoryEntry, Stats, Language } from './types';

const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth
export async function register(username: string, password: string): Promise<void> {
  await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function login(username: string, password: string): Promise<{ token: string; userId: string }> {
  const result = await request<{ token: string; userId: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem('token', result.token);
  return result;
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' });
  localStorage.removeItem('token');
}

export async function getCurrentUser(): Promise<User> {
  return request<User>('/auth/me');
}

// Profiles
export async function getProfiles(): Promise<LanguageProfile[]> {
  return request<LanguageProfile[]>('/profiles');
}

export async function updateProfile(language: Language, description: string): Promise<void> {
  await request(`/profiles/${language}`, {
    method: 'PUT',
    body: JSON.stringify({ description }),
  });
}

// Snippets
export async function getSnippets(): Promise<Snippet[]> {
  return request<Snippet[]>('/snippets');
}

export async function createSnippet(snippet: Omit<Snippet, 'id' | 'user_id'>): Promise<Snippet> {
  return request<Snippet>('/snippets', {
    method: 'POST',
    body: JSON.stringify(snippet),
  });
}

export async function deleteSnippet(id: string): Promise<void> {
  await request(`/snippets/${id}`, { method: 'DELETE' });
}

// History
export async function getHistory(): Promise<HistoryEntry[]> {
  return request<HistoryEntry[]>('/history');
}

export async function saveHistory(entry: Omit<HistoryEntry, 'id' | 'user_id' | 'created_at'>): Promise<void> {
  await request('/history', {
    method: 'POST',
    body: JSON.stringify(entry),
  });
}

// Stats
export async function getStats(): Promise<Stats> {
  return request<Stats>('/stats');
}

// Generate snippets with Gemini
export async function generateSnippets(
  language: Language,
  description: string,
  existingCount: number
): Promise<Snippet[]> {
  const prompt = `You are a code snippet generator for a typing practice app.

Language: ${language}
About their work: ${description || 'General programming'}

Generate exactly 5 code snippets for typing practice. Each snippet should be:
- Real, practical code that this developer would actually write
- 8-25 lines long
- No comments
- Meaningful variable/function names
- Mix of easy and hard (symbol-heavy) snippets

Respond ONLY with a JSON array, no markdown, no backticks:
[{"title":"short title","code":"the actual code","difficulty":"easy|medium|hard"}]`;

  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    throw new Error('Gemini API key not configured');
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4000 },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';

  const parsed: Array<{ title: string; code: string; difficulty: 'easy' | 'medium' | 'hard' }> =
    JSON.parse(text.replace(/```json|```/g, '').trim());

  return parsed.map((s, i) => ({
    id: `${Date.now()}-${existingCount + i}`,
    user_id: '',
    language,
    title: s.title,
    code: s.code.replace(/\t/g, '  '),
    difficulty: s.difficulty,
  }));
}

// API client
import type {
  User,
  LanguageProfile,
  Snippet,
  HistoryEntry,
  Stats,
  Language,
} from "./types";

const API_BASE = "/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth
export async function register(
  username: string,
  password: string,
): Promise<void> {
  await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function login(
  username: string,
  password: string,
): Promise<{ token: string; userId: string }> {
  const result = await request<{ token: string; userId: string }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ username, password }),
    },
  );
  localStorage.setItem("token", result.token);
  return result;
}

export async function logout(): Promise<void> {
  await request("/auth/logout", { method: "POST" });
  localStorage.removeItem("token");
}

export async function getCurrentUser(): Promise<User> {
  return request<User>("/auth/me");
}

// Profiles
export async function getProfiles(): Promise<LanguageProfile[]> {
  return request<LanguageProfile[]>("/profiles");
}

export async function updateProfile(
  language: Language,
  description: string,
): Promise<void> {
  await request(`/profiles/${language}`, {
    method: "PUT",
    body: JSON.stringify({ description }),
  });
}

// Snippets
export async function getSnippets(): Promise<Snippet[]> {
  return request<Snippet[]>("/snippets");
}

export async function createSnippet(
  snippet: Omit<Snippet, "id" | "user_id" | "created_at">,
): Promise<Snippet> {
  return request<Snippet>("/snippets", {
    method: "POST",
    body: JSON.stringify(snippet),
  });
}

export async function deleteSnippet(id: string): Promise<void> {
  await request(`/snippets/${id}`, { method: "DELETE" });
}

// History
export async function getHistory(): Promise<HistoryEntry[]> {
  return request<HistoryEntry[]>("/history");
}

export async function saveHistory(
  entry: Omit<HistoryEntry, "id" | "user_id" | "created_at">,
): Promise<void> {
  await request("/history", {
    method: "POST",
    body: JSON.stringify(entry),
  });
}

// Stats
export async function getStats(): Promise<Stats> {
  return request<Stats>("/stats");
}

// ─── Tutorial API ─────────────────────────────────────────────

export async function createTutorialPlan(
  language: Language,
  profileDescription: string,
): Promise<{ id: string } & import('./types').TutorialPlan> {
  return request('/tutorials/plan', {
    method: 'POST',
    body: JSON.stringify({ language, profileDescription }),
  });
}

export async function getTutorials(): Promise<import('./types').Tutorial[]> {
  return request('/tutorials');
}

export async function getTutorial(id: string): Promise<import('./types').Tutorial & { parts: (import('./types').TutorialPart & { files: import('./types').TutorialFile[] })[] }> {
  return request(`/tutorials/${id}`);
}

export async function generateNextPart(id: string): Promise<{ part: import('./types').TutorialPart; files: import('./types').TutorialFile[] }> {
  return request(`/tutorials/${id}/generate-next-part`, { method: 'POST' });
}

export async function completeTutorialPart(
  tutorialId: string,
  partNumber: number,
  data: { wpm: number; accuracy: number; time: number; errors: number; filePath?: string },
): Promise<{ success: boolean; tutorialDone: boolean }> {
  return request(`/tutorials/${tutorialId}/parts/${partNumber}/complete`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteTutorial(id: string): Promise<void> {
  await request(`/tutorials/${id}`, { method: 'DELETE' });
}

// ─── Generate snippets with Gemini ────────────────────────────

export async function generateSnippets(
  language: Language,
  description: string,
  existingSnippets: Snippet[],
): Promise<Snippet[]> {
  // Build list of existing titles to avoid duplicates
  const existingTitles = existingSnippets
    .filter((s) => s.language === language)
    .map((s) => `- ${s.title}`)
    .join("\n");

  const avoidSection = existingTitles
    ? `\n\nIMPORTANT - These snippets already exist, DO NOT create similar ones:\n${existingTitles}`
    : "";

  const prompt = `You are a code snippet generator for a typing practice app.

Language: ${language}
About their work: ${description || "General programming"}
${avoidSection}

Generate exactly 10 code snippets for typing practice. Requirements:

1. CONTENT REQUIREMENTS:
   - Code must be REAL, PRACTICAL, and COMMONLY USED in real projects
   - Prioritize: frequently written code > rare code > boilerplate/init code
   - Examples of GOOD content:
     * Common patterns (error handling, validation, data transformation)
     * API routes, middleware, request handlers
     * Database queries, CRUD operations
     * Utility functions (date formatting, string manipulation)
     * Class/function definitions with typical logic
     * Configuration setup, initialization code
   - Examples of BAD content (avoid):
     * Simple "hello world" or print statements
     * Empty function stubs
     * Trivial one-liners

2. CODE QUALITY:
   - 8-30 lines long
   - Include ONLY NECESSARY comments in the code itself (parameter types, return values, edge cases)
   - DO NOT include purpose/explanation in code comments - that goes in the description field
   - Use realistic variable/function names (not foo, bar, baz)
   - Include type annotations where appropriate for the language

3. DIFFICULTY MIX:
   - 2 easy (simple logic, few symbols)
   - 4 medium (moderate complexity)
   - 4 hard (symbol-heavy, complex syntax, nested structures)

4. DESCRIPTION FIELD (separate from code):
   - purpose: What this code does in 1-2 sentences
   - whenToUse: When/why you would use this pattern
   - projectTypes: What kind of projects typically need this

Respond ONLY with a JSON array, no markdown, no backticks:
[{"title":"short descriptive title","code":"the actual code with only necessary comments","description":{"purpose":"...","whenToUse":"...","projectTypes":"..."},"difficulty":"easy|medium|hard"}]`;

  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) {
    throw new Error("Gemini API key not configured");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 8000 },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status}`);
  }

  const data = await res.json();
  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text || "")
      .join("") || "";

  const parsed: Array<{
    title: string;
    code: string;
    description: { purpose: string; whenToUse: string; projectTypes: string };
    difficulty: "easy" | "medium" | "hard";
  }> = JSON.parse(text.replace(/```json|```/g, "").trim());

  return parsed.map((s, i) => ({
    id: `${Date.now()}-${existingSnippets.length + i}`,
    user_id: "",
    language,
    title: s.title,
    code: s.code.replace(/\t/g, "  "),
    description: `**Purpose:** ${s.description.purpose}\n\n**When to use:** ${s.description.whenToUse}\n\n**Project types:** ${s.description.projectTypes}`,
    difficulty: s.difficulty,
  }));
}

// ─── Gamification ────────────────────────────────────────────

export async function getGamification(): Promise<import('./types').GamificationData> {
  return request('/gamification');
}

export async function getLeaderboard(): Promise<import('./types').LeaderboardEntry[]> {
  return request('/leaderboard');
}

export async function logActivity(): Promise<void> {
  await request('/gamification/activity', { method: 'POST' });
}

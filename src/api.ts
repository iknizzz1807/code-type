// API utilities for generating snippets using Gemini
import type { Profile, Snippet } from "./types";

const buildPrompt = (profile: Profile, count = 5): string =>
  `You are a code snippet generator for a typing practice app.

User profile:
- Language: ${profile.language}
- About their work: ${profile.description}

Generate exactly ${count} code snippets for typing practice. Each snippet should be:
- Real, practical code that this developer would actually write
- 8-25 lines long
- No comments
- Meaningful variable/function names
- Mix of easy and hard (symbol-heavy) snippets

Respond ONLY with a JSON array, no markdown, no backticks:
[{"title":"short title","code":"the actual code","difficulty":"easy|medium|hard"}]`;

interface RawSnippet {
  title: string;
  code: string;
  difficulty: "easy" | "medium" | "hard";
}

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
  error?: {
    message: string;
  };
}

export async function generateSnippets(
  profile: Profile,
  existingCount: number,
  apiKey?: string,
): Promise<Snippet[]> {
  const key = apiKey || import.meta.env.VITE_GEMINI_API_KEY;

  if (!key) {
    throw new Error("API key not configured");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${key}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: buildPrompt(profile, 5) }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 4000,
        },
      }),
    },
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`API error: ${res.status} - ${JSON.stringify(error)}`);
  }

  const data: GeminiResponse = await res.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ||
    "";

  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  const parsed: RawSnippet[] = JSON.parse(
    text.replace(/```json|```/g, "").trim(),
  );

  return parsed.map((s, i) => ({
    ...s,
    id: `${Date.now()}-${existingCount + i}`,
    code: s.code.replace(/\t/g, "  "),
  }));
}

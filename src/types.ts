// Types for CodeType app

export interface User {
  id: string;
  username: string;
}

export interface LanguageProfile {
  id: string;
  user_id: string;
  language: string;
  description: string;
}

export interface Snippet {
  id: string;
  user_id: string;
  language: string;
  title: string;
  code: string;
  difficulty: 'easy' | 'medium' | 'hard';
  created_at?: string;
}

export interface HistoryEntry {
  id: string;
  user_id: string;
  snippet_id: string;
  snippet_title?: string;
  language?: string;
  wpm: number;
  accuracy: number;
  time: number;
  errors: number;
  created_at: string;
}

export interface Stats {
  total_sessions: number;
  avg_wpm: number;
  best_wpm: number;
  avg_accuracy: number;
}

export interface Token {
  type: string;
  text: string;
}

export type Screen = 'auth' | 'main' | 'typing';

export const LANGUAGES = [
  'Python', 'Rust', 'TypeScript', 'Go', 'C++', 'Zig'
] as const;

export type Language = typeof LANGUAGES[number];

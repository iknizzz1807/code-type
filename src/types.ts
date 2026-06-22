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
  description: string; // purpose, when to use, project types - rendered in separate UI
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
  'Python', 'Rust', 'TypeScript', 'Go', 'C', 'C++', 'Zig'
] as const;

export type Language = typeof LANGUAGES[number];

// Tutorial types
export interface Tutorial {
  id: string;
  user_id: string;
  title: string;
  intro: string;
  tech_stack: string;
  summary: string;
  language: Language;
  difficulty: 'easy' | 'medium' | 'hard';
  total_parts: number;
  status: 'planning' | 'generating' | 'active' | 'completed';
  created_at: string;
}

export interface TutorialPart {
  id: string;
  tutorial_id: string;
  part_number: number;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;
  status: 'pending' | 'ready' | 'completed';
  created_at: string;
}

export interface TutorialFile {
  id: string;
  part_id: string;
  file_path: string;
  code: string;
  language: string;
  file_order: number;
}

export interface TutorialHistoryEntry {
  id: string;
  user_id: string;
  tutorial_id: string;
  part_id: string;
  file_path: string;
  wpm: number;
  accuracy: number;
  time: number;
  errors: number;
  created_at: string;
}

// Plan types (from LLM)
export interface TutorialPlan {
  title: string;
  intro: string;
  summary: string;
  techStack: string;
  difficulty: 'easy' | 'medium' | 'hard';
  parts: TutorialPlanPart[];
}

export interface TutorialPlanPart {
  partNumber: number;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  files: TutorialPlanFile[];
}

export interface TutorialPlanFile {
  path: string;
  purpose: string;
}

// Generated part from LLM
export interface GeneratedPart {
  files: GeneratedFile[];
  explanation: string;
}

export interface GeneratedFile {
  path: string;
  code: string;
  language: string;
}

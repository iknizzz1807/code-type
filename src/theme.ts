// Catppuccin Mocha Theme
export const T = {
  bg: '#1e1e2e',
  surface: '#262637',
  surface2: '#2e2e42',
  border: '#3a3a52',
  text: '#cdd6f4',
  textDim: '#585b70',
  accent: '#89b4fa',
  green: '#a6e3a1',
  error: '#f38ba8',
  warning: '#fab387',
  caret: '#f5c2e7',
  mauve: '#cba6f7',
  peach: '#fab387',
  yellow: '#f9e2af',
  teal: '#94e2d5',
  pink: '#f5c2e7',
  sky: '#89dceb',
  red: '#f38ba8',
  lavender: '#b4befe',
  font: "'JetBrains Mono','Fira Code','Cascadia Code','SF Mono',monospace",
} as const;

export const syntaxColors: Record<string, string> = {
  keyword: T.mauve,
  builtin: T.teal,
  function: T.accent,
  type: T.yellow,
  string: T.green,
  number: T.peach,
  comment: T.textDim,
  operator: T.sky,
  bracket: T.lavender,
  punctuation: T.text,
  decorator: T.yellow,
  ident: T.text,
  space: T.text,
  newline: T.text,
  plain: T.text,
};

export const withAlpha = (hex: string, alpha: number): string => {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0');
  return hex.length === 7 ? hex + a : hex;
};

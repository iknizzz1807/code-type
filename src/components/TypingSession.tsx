import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Snippet, Language } from '../types';
import { T, syntaxColors, withAlpha } from '../theme';
import { tokenize } from '../tokenizer';
import { saveHistory } from '../api';

interface TypingSessionProps {
  snippet: Snippet;
  language: Language;
  onBack: () => void;
  onHistoryUpdate: () => void;
}

export function TypingSession({
  snippet,
  language,
  onBack,
  onHistoryUpdate,
}: TypingSessionProps) {
  const target = snippet.code;
  const [input, setInput] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [errors, setErrors] = useState(0);
  const [keystrokes, setKeystrokes] = useState(0);
  const [done, setDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    rootRef.current?.focus();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (startTime && !done) {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 100);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTime, done]);

  const wpm = elapsed > 0 ? Math.round((input.length / 5) / (elapsed / 60000)) : 0;
  const accuracy =
    keystrokes > 0 ? ((keystrokes - errors) / keystrokes) * 100 : 100;

  const tokens = useMemo(() => tokenize(target, language), [target, language]);
  const charColors = useMemo(() => {
    const colors: string[] = [];
    for (const tok of tokens) {
      const col = syntaxColors[tok.type] || T.text;
      for (let i = 0; i < tok.text.length; i++) {
        colors.push(col);
      }
    }
    return colors;
  }, [tokens]);

  const handleFinish = useCallback(async (finalWpm: number, finalAccuracy: number, finalTime: number, finalErrors: number) => {
    try {
      await saveHistory({
        snippetId: snippet.id,
        wpm: finalWpm,
        accuracy: finalAccuracy,
        time: finalTime,
        errors: finalErrors,
      });
      onHistoryUpdate();
    } catch (err) {
      console.error('Failed to save history:', err);
    }
  }, [snippet.id, onHistoryUpdate]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (done) return;
      if (e.key === 'Escape') {
        onBack();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();

      if (e.key === 'Backspace') {
        setInput((prev) => prev.slice(0, -1));
        return;
      }
      if (e.key.length > 1 && e.key !== 'Tab' && e.key !== 'Enter') return;

      let char = e.key;
      if (char === 'Enter') char = '\n';
      if (char === 'Tab') char = '  ';

      const newStartTime = startTime || Date.now();
      if (!startTime) setStartTime(newStartTime);

      const newInput = input + char;
      setKeystrokes((k) => k + char.length);

      let newErrors = 0;
      for (let i = 0; i < char.length; i++) {
        if (
          input.length + i < target.length &&
          char[i] !== target[input.length + i]
        ) {
          newErrors++;
        }
      }
      if (newErrors) setErrors((err) => err + newErrors);
      setInput(newInput);

      if (newInput.length >= target.length) {
        setDone(true);
        if (timerRef.current) clearInterval(timerRef.current);
        const finalElapsed = Date.now() - newStartTime;
        const totalKeystrokes = keystrokes + char.length;
        const totalErrors = errors + newErrors;
        handleFinish(
          Math.round((target.length / 5) / (finalElapsed / 60000)),
          parseFloat((((totalKeystrokes - totalErrors) / totalKeystrokes) * 100).toFixed(1)),
          finalElapsed,
          totalErrors
        );
      }
    },
    [done, startTime, input, target, keystrokes, errors, onBack, handleFinish]
  );

  const restart = useCallback(() => {
    setInput('');
    setStartTime(null);
    setErrors(0);
    setKeystrokes(0);
    setDone(false);
    setElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
    rootRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const lines = input.split('\n').length;
    containerRef.current.scrollTop = Math.max(0, (lines - 5) * 22);
  }, [input]);

  const renderCode = () => {
    const spans: React.ReactNode[] = [];
    for (let i = 0; i < target.length; i++) {
      const sc = charColors[i] || T.text;
      let color: string;
      let bg = 'transparent';
      let textDec = 'none';

      if (i < input.length) {
        color = input[i] === target[i] ? sc : T.error;
        if (input[i] !== target[i]) {
          bg = `${T.error}20`;
          textDec = 'underline wavy';
        }
      } else {
        color = i === input.length ? sc : withAlpha(sc, 0.35);
      }

      const isCaret = i === input.length && !done;
      const ch = target[i] === '\n' ? '↵\n' : target[i];

      spans.push(
        <span
          key={i}
          style={{
            color,
            background: bg,
            textDecoration: textDec,
            textDecorationColor: T.error,
            borderLeft: isCaret ? `2px solid ${T.caret}` : 'none',
            animation: isCaret ? 'caret-blink 1s step-end infinite' : 'none',
            paddingLeft: isCaret ? 1 : 0,
            marginLeft: isCaret ? -1 : 0,
            textUnderlineOffset: '3px',
          }}
        >
          {ch}
        </span>
      );
    }
    if (input.length === target.length && !done) {
      spans.push(
        <span
          key="end-caret"
          style={{
            borderLeft: `2px solid ${T.caret}`,
            animation: 'caret-blink 1s step-end infinite',
          }}
        >
          {' '}
        </span>
      );
    }
    return spans;
  };

  const targetLines = target.split('\n');
  const currentLine = input.split('\n').length - 1;
  const accColor =
    accuracy >= 95 ? T.green : accuracy >= 85 ? T.warning : T.error;
  const progress =
    target.length > 0 ? Math.round((input.length / target.length) * 100) : 0;

  const DIFFICULTY_COLORS: Record<string, string> = {
    easy: T.green,
    medium: T.warning,
    hard: T.error,
  };

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={handleKey}
      style={styles.container}
    >
      <style>{`@keyframes caret-blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>

      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerInfo}>
            <span style={styles.snippetTitle}>{snippet.title}</span>
            <span style={styles.langBadge}>{language}</span>
            <span style={styles.diffBadge}>
              <span style={{ color: DIFFICULTY_COLORS[snippet.difficulty] }}>
                {snippet.difficulty}
              </span>
            </span>
          </div>
          <div style={styles.headerBtns}>
            <button onClick={restart} style={styles.restartBtn}>
              restart
            </button>
            <button onClick={onBack} style={styles.backBtn}>
              esc · back
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={styles.progressContainer}>
          <div
            style={{
              ...styles.progressBar,
              width: `${progress}%`,
              background: done ? T.green : T.accent,
            }}
          />
        </div>

        {/* Stats */}
        <div style={styles.statsBar}>
          {[
            { val: wpm, label: 'wpm', color: T.accent },
            { val: accuracy.toFixed(1) + '%', label: 'accuracy', color: accColor },
            { val: (elapsed / 1000).toFixed(1) + 's', label: 'time', color: T.text },
            { val: errors, label: 'errors', color: errors > 0 ? T.error : T.green },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ ...styles.statVal, color: s.color }}>{s.val}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Code */}
        <div
          ref={containerRef}
          style={{
            ...styles.codeContainer,
            borderColor: done ? T.green + '66' : T.border,
          }}
        >
          {/* Line numbers */}
          <div style={styles.lineNumbers}>
            {targetLines.map((_, i) => (
              <div
                key={i}
                style={{
                  color: i === currentLine ? T.accent : T.textDim,
                  fontWeight: i === currentLine ? 600 : 400,
                  paddingRight: 2,
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>
          {/* Code content */}
          <div style={styles.codeContent}>{renderCode()}</div>
        </div>

        {!startTime && !done && (
          <div style={styles.hint}>
            start typing to begin ·{' '}
            <span style={{ color: T.mauve }}>tab</span> → 2 spaces ·{' '}
            <span style={{ color: T.mauve }}>enter</span> → newline
          </div>
        )}

        {done && (
          <div style={styles.doneSection}>
            <div style={styles.doneMessage}>
              ✓ {wpm} wpm · {accuracy.toFixed(1)}% accuracy ·{' '}
              {(elapsed / 1000).toFixed(1)}s
            </div>
            <div style={styles.doneBtns}>
              <button onClick={restart} style={styles.practiceAgainBtn}>
                practice again
              </button>
              <button onClick={onBack} style={styles.backToListBtn}>
                back to list
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: T.bg,
    padding: 24,
    outline: 'none',
    overflow: 'auto',
  },
  content: {
    maxWidth: 740,
    width: '100%',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  snippetTitle: {
    fontFamily: T.font,
    fontSize: 14,
    color: T.accent,
    fontWeight: 600,
  },
  langBadge: {
    fontFamily: T.font,
    fontSize: 10,
    color: T.textDim,
    padding: '3px 8px',
    background: T.surface,
    borderRadius: 6,
    fontWeight: 500,
  },
  diffBadge: {
    fontFamily: T.font,
    fontSize: 10,
    color: T.textDim,
    padding: '3px 8px',
    background: T.surface,
    borderRadius: 6,
  },
  headerBtns: {
    display: 'flex',
    gap: 8,
  },
  restartBtn: {
    fontFamily: T.font,
    fontSize: 11,
    padding: '6px 12px',
    background: T.surface,
    color: T.textDim,
    border: `1px solid ${T.border}`,
    borderRadius: 6,
    cursor: 'pointer',
  },
  backBtn: {
    fontFamily: T.font,
    fontSize: 11,
    padding: '6px 12px',
    background: T.surface,
    color: T.textDim,
    border: `1px solid ${T.border}`,
    borderRadius: 6,
    cursor: 'pointer',
  },
  progressContainer: {
    height: 3,
    background: T.surface,
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    transition: 'width 0.2s',
    borderRadius: 2,
  },
  statsBar: {
    display: 'flex',
    gap: 32,
    marginBottom: 16,
    padding: '12px 20px',
    background: T.surface,
    borderRadius: 10,
    fontFamily: T.font,
  },
  statVal: {
    fontSize: 20,
    fontWeight: 700,
  },
  statLabel: {
    fontSize: 9,
    color: T.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeContainer: {
    fontFamily: T.font,
    fontSize: 14,
    lineHeight: '22px',
    background: T.surface,
    borderRadius: 12,
    padding: 0,
    whiteSpace: 'pre',
    overflowX: 'auto',
    overflowY: 'auto',
    maxHeight: '55vh',
    border: '1px solid',
    tabSize: 2,
    transition: 'border-color 0.3s',
    display: 'flex',
  },
  lineNumbers: {
    padding: '20px 0',
    minWidth: 48,
    textAlign: 'right',
    paddingRight: 14,
    borderRight: `1px solid ${T.border}`,
    userSelect: 'none',
    flexShrink: 0,
    fontFamily: T.font,
    fontSize: 12,
    lineHeight: '22px',
    color: T.textDim,
  },
  codeContent: {
    padding: '20px 20px',
    flex: 1,
    minWidth: 0,
  },
  hint: {
    textAlign: 'center',
    marginTop: 20,
    fontFamily: T.font,
    fontSize: 12,
    color: T.textDim,
  },
  doneSection: {
    textAlign: 'center',
    marginTop: 24,
  },
  doneMessage: {
    fontFamily: T.font,
    fontSize: 15,
    color: T.green,
    marginBottom: 16,
    fontWeight: 600,
  },
  doneBtns: {
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
  },
  practiceAgainBtn: {
    fontFamily: T.font,
    fontSize: 13,
    padding: '10px 20px',
    background: T.accent,
    color: T.bg,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
  },
  backToListBtn: {
    fontFamily: T.font,
    fontSize: 13,
    padding: '10px 20px',
    background: T.surface,
    color: T.text,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    cursor: 'pointer',
  },
};

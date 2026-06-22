import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { TutorialPart, TutorialFile, Language } from '../types';
import { T, syntaxColors, withAlpha } from '../theme';
import { tokenize } from '../tokenizer';
import { getTutorial, generateNextPart, completeTutorialPart } from '../api';
import { Markdown } from './Markdown';

interface TutorialSessionProps {
  tutorialId: string;
  language: Language;
  onBack: () => void;
}

interface FileState {
  input: string;
  startTime: number | null;
  errors: number;
  keystrokes: number;
  done: boolean;
  elapsed: number;
}

export function TutorialSession({ tutorialId, language, onBack }: TutorialSessionProps) {
  const [tutorial, setTutorial] = useState<any>(null);
  const [parts, setParts] = useState<(TutorialPart & { files: TutorialFile[] })[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [fileStates, setFileStates] = useState<Record<string, FileState>>({});
  const [completedFiles, setCompletedFiles] = useState<Record<string, { wpm: number; accuracy: number; time: number }>>({});
  const [generatingPart, setGeneratingPart] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const activeBlockRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load tutorial
  const loadTutorial = useCallback(async () => {
    try {
      const data = await getTutorial(tutorialId);
      setTutorial(data);
      const allParts = (data as any).parts || [];
      setParts(allParts);

      // Generate ALL pending parts sequentially
      let updated = [...allParts];
      for (const part of updated) {
        if (part.status === 'pending') {
          setGeneratingPart(part.part_number);
          try {
            const result = await generateNextPart(tutorialId);
            const idx = updated.findIndex((p: any) => p.id === result.part.id);
            if (idx >= 0) {
              updated[idx] = { ...result.part, files: result.files };
              setParts([...updated]);
            }
          } catch {}
          setGeneratingPart(null);
        }
      }
    } catch {
      setErr('Failed to load tutorial');
    }
  }, [tutorialId]);

  useEffect(() => { loadTutorial(); }, [loadTutorial]);

  // Typing timer
  useEffect(() => {
    if (!activeFileId) { if (timerRef.current) clearInterval(timerRef.current); return; }
    const state = fileStates[activeFileId];
    if (!state || !state.startTime || state.done) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setFileStates(prev => ({
        ...prev,
        [activeFileId]: { ...prev[activeFileId], elapsed: Date.now() - prev[activeFileId].startTime! }
      }));
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeFileId, fileStates]);

  // Scroll active block into view
  useEffect(() => {
    if (activeFileId && activeBlockRef.current) {
      activeBlockRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeFileId]);

  // Get or init file state
  const getState = useCallback((fileId: string): FileState => {
    return fileStates[fileId] || { input: '', startTime: null, errors: 0, keystrokes: 0, done: false, elapsed: 0 };
  }, [fileStates]);

  // Update file state helper
  const updateState = useCallback((fileId: string, upd: Partial<FileState>) => {
    setFileStates(prev => ({
      ...prev,
      [fileId]: { ...getState(fileId), ...upd }
    }));
  }, [getState]);

  // Handle keyboard
  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (!activeFileId) return;
    const state = getState(activeFileId);
    if (state.done) return;
    if (e.key === 'Escape') { setActiveFileId(null); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();

    if (e.key === 'Backspace') {
      updateState(activeFileId, { input: state.input.slice(0, -1) });
      return;
    }
    if (e.key.length > 1 && e.key !== 'Tab' && e.key !== 'Enter') return;

    let char = e.key;
    if (char === 'Enter') char = '\n';
    if (char === 'Tab') char = '  ';

    const newStartTime = state.startTime || Date.now();
    const newInput = state.input + char;
    const newKeystrokes = state.keystrokes + char.length;

    let newErrors = 0;
    const target = getTargetCode(activeFileId);
    for (let i = 0; i < char.length; i++) {
      if (state.input.length + i < target.length && char[i] !== target[state.input.length + i]) {
        newErrors++;
      }
    }

    const done = newInput.length >= target.length;

    updateState(activeFileId, {
      input: newInput, startTime: newStartTime, keystrokes: newKeystrokes,
      errors: state.errors + newErrors, done,
      elapsed: done ? Date.now() - newStartTime : state.elapsed,
    });

    if (done) {
      const finalElapsed = Date.now() - newStartTime;
      const finalWpm = Math.round((target.length / 5) / (finalElapsed / 60000));
      const finalAccuracy = parseFloat((((newKeystrokes - (state.errors + newErrors)) / newKeystrokes * 100).toFixed(1)));
      // Save
      const filePath = findFilePath(activeFileId);
      if (filePath) {
        const part = findPartByFileId(activeFileId);
        if (part) {
          completeTutorialPart(tutorialId, part.part_number, {
            wpm: finalWpm, accuracy: finalAccuracy, time: finalElapsed, errors: state.errors + newErrors, filePath,
          }).catch(() => {});
        }
      }
      setCompletedFiles(prev => ({
        ...prev,
        [activeFileId]: { wpm: finalWpm, accuracy: finalAccuracy, time: finalElapsed }
      }));
      setActiveFileId(null);
    }
  }, [activeFileId, getState, updateState, tutorialId]);

  // Helpers using closure over parts
  const getTargetCode = useCallback((fileId: string): string => {
    for (const p of parts) {
      for (const f of p.files || []) {
        if (f.id === fileId) return f.code;
      }
    }
    return '';
  }, [parts]);

  const findFilePath = useCallback((fileId: string): string | null => {
    for (const p of parts) {
      for (const f of p.files || []) {
        if (f.id === fileId) return f.file_path;
      }
    }
    return null;
  }, [parts]);

  const findPartByFileId = useCallback((fileId: string): TutorialPart | null => {
    for (const p of parts) {
      for (const f of p.files || []) {
        if (f.id === fileId) return p;
      }
    }
    return null;
  }, [parts]);

  // Click on a file block
  const handleBlockClick = useCallback((fileId: string) => {
    if (completedFiles[fileId]) return;
    setActiveFileId(fileId);
    setTimeout(() => rootRef.current?.focus(), 50);
  }, [completedFiles]);

  return (
    <div ref={rootRef} tabIndex={0} onKeyDown={handleKey} style={styles.root}>
      {/* Top bar — sticky */}
      <div style={styles.topBar}>
        <button onClick={onBack} style={styles.topBtn}>← Back</button>
        <span style={styles.topTitle}>{tutorial?.title || 'Loading...'}</span>
        <span style={styles.topLang}>{language}</span>
        {activeFileId && (
          <span style={styles.typingHint}>· typing...</span>
        )}
        <div style={{ flex: 1 }} />
        {tutorial && (
          <span style={{ fontFamily: T.font, fontSize: 11, color: T.textDim }}>
            {Object.keys(completedFiles).length}/{parts.reduce((s, p) => s + (p.files?.length || 0), 0)} files
          </span>
        )}
      </div>

      {err ? (
        <div style={{ ...styles.center, paddingTop: 48 }}>
          <span style={{ color: T.error, fontFamily: T.font }}>{err}</span>
          <button onClick={onBack} style={styles.topBtn}>Back</button>
        </div>
      ) : !tutorial ? (
        <div style={{ ...styles.center, paddingTop: 48 }}><span style={{ color: T.textDim, fontFamily: T.font }}>Loading...</span></div>
      ) : (
        <div style={styles.scrollArea}>
          {/* Tutorial intro */}
          <div style={styles.introSection}>
            <div style={styles.introMeta}>
              <span style={styles.metaBadge}>{tutorial.language}</span>
              <span style={styles.metaBadge}>{tutorial.difficulty}</span>
              {tutorial.tech_stack && <span style={styles.metaBadge}>{tutorial.tech_stack}</span>}
            </div>
            <p style={styles.introDesc}><Markdown text={tutorial.intro} /></p>
          </div>

          {/* Parts */}
          {parts.map((part) => (
            <div key={part.id} style={styles.partSection}>
              <div style={styles.partHeader}>
                <span style={styles.partBadge}>Part {part.part_number}/{parts.length}</span>
                <span style={{ ...styles.partDiff, color: getDiffColor(part.difficulty) }}>{part.difficulty}</span>
              </div>
              <h2 style={styles.partTitle}>{part.title}</h2>
              <p style={styles.partDesc}><Markdown text={part.description} /></p>

              {generatingPart === part.part_number && (
                <div style={styles.generating}>Generating content...</div>
              )}

              {part.explanation && (
                <div style={styles.explanation}><Markdown text={part.explanation} /></div>
              )}

              {/* Files */}
              {part.files?.map((file) => {
                const state = getState(file.id);
                const completed = completedFiles[file.id];
                const isActive = activeFileId === file.id;

                return (
                  <FileBlock
                    key={file.id}
                    file={file}
                    language={language}
                    state={state}
                    isActive={isActive}
                    completed={completed}
                    clickable={!completed}
                    onClick={() => handleBlockClick(file.id)}
                    blockRef={isActive ? activeBlockRef : undefined}
                  />
                );
              })}
            </div>
          ))}

          {/* All completed */}
          {parts.length > 0 && Object.keys(completedFiles).length === parts.reduce((sum, p) => sum + (p.files?.length || 0), 0) && (
            <div style={styles.completeBanner}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.green, marginBottom: 4 }}>All Files Complete!</div>
              <button onClick={onBack} style={styles.backToListBtn}>Back to Tutorials</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── FileBlock sub-component ──────────────────────────────────

function FileBlock({
  file, language, state, isActive, completed, clickable, onClick, blockRef,
}: {
  file: TutorialFile;
  language: Language;
  state: FileState;
  isActive: boolean;
  completed: { wpm: number; accuracy: number; time: number } | undefined;
  clickable: boolean;
  onClick: () => void;
  blockRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const code = file.code;

  if (!code) {
    return (
      <div style={{ ...styles.fileBlock, borderColor: T.border, padding: 20, textAlign: 'center' }}>
        <span style={{ fontFamily: T.font, fontSize: 12, color: T.textDim }}>Generating...</span>
      </div>
    );
  }

  const tokens = useMemo(() => tokenize(code, language), [code, language]);
  const charColors = useMemo(() => {
    const colors: string[] = [];
    for (const tok of tokens) {
      const col = syntaxColors[tok.type] || T.text;
      for (let i = 0; i < tok.text.length; i++) colors.push(col);
    }
    return colors;
  }, [tokens]);

  const wpm = state.elapsed > 0 ? Math.round((state.input.length / 5) / (state.elapsed / 60000)) : 0;
  const acc = state.keystrokes > 0 ? ((state.keystrokes - state.errors) / state.keystrokes) * 100 : 100;
  const progress = code.length > 0 ? Math.round((state.input.length / code.length) * 100) : 0;

  const renderChar = (i: number) => {
    const sc = charColors[i] || T.text;
    let color: string;
    let bg = 'transparent';
    let textDec = 'none';

    if (i < state.input.length) {
      color = state.input[i] === code[i] ? sc : T.error;
      if (state.input[i] !== code[i]) {
        bg = `${T.error}20`;
        textDec = 'underline wavy';
      }
    } else {
      color = i === state.input.length ? sc : withAlpha(sc, 0.3);
    }

    const isCaret = i === state.input.length && isActive && !state.done;
    const ch = code[i] === '\n' ? '\n' : code[i];

    return (
      <span key={i} style={{
        color, background: bg, textDecoration: textDec,
        textDecorationColor: T.error,
        borderLeft: isCaret ? `2px solid ${T.caret}` : 'none',
        animation: isCaret ? 'caret-blink 1s step-end infinite' : 'none',
        paddingLeft: isCaret ? 1 : 0,
        marginLeft: isCaret ? -1 : 0,
        textUnderlineOffset: '3px',
      }}>{ch}</span>
    );
  };

  const borderColor = completed ? T.green + '66' : isActive ? T.accent : T.border;

  return (
    <div
      ref={blockRef as React.Ref<HTMLDivElement>}
      onClick={clickable ? onClick : undefined}
      style={{
        ...styles.fileBlock,
        borderColor: borderColor,
        cursor: clickable && !isActive ? 'pointer' : 'default',
        opacity: !clickable && !completed ? 0.5 : 1,
      }}
    >
      {/* File header */}
      <div style={styles.fileHeader}>
        <div style={styles.fileHeaderLeft}>
          <span style={styles.fileIcon}>{completed ? '✓' : isActive ? '▶' : '○'}</span>
          <span style={styles.filePath}>{file.file_path}</span>
        </div>
        {completed && (
          <span style={styles.fileStats}>
            {completed.wpm} wpm · {completed.accuracy}% · {(completed.time / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {/* Stats bar (only when active) */}
      {isActive && !state.done && (
        <div style={styles.statsBar}>
          <span style={{ color: T.accent, fontWeight: 700 }}>{wpm}<span style={{ fontWeight: 400, color: T.textDim, fontSize: 10 }}> wpm</span></span>
          <span style={{ color: acc >= 95 ? T.green : acc >= 85 ? T.warning : T.error, fontWeight: 700 }}>{acc.toFixed(1)}%<span style={{ fontWeight: 400, color: T.textDim, fontSize: 10 }}> acc</span></span>
          <span style={{ color: T.text, fontWeight: 700 }}>{(state.elapsed / 1000).toFixed(1)}s</span>
          <span style={{ color: state.errors > 0 ? T.error : T.green, fontWeight: 700 }}>{state.errors}<span style={{ fontWeight: 400, color: T.textDim, fontSize: 10 }}> err</span></span>
        </div>
      )}

      {/* Progress (only when active) */}
      {isActive && !state.done && (
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
      )}

      {/* Code lines */}
      <div style={styles.codeWrapper}>
        <div style={styles.lineNums}>
          {code.split('\n').map((_, i) => (
            <div key={i} style={{ color: T.textDim, fontSize: 12, lineHeight: '22px', textAlign: 'right', paddingRight: 12 }}>
              {i + 1}
            </div>
          ))}
        </div>
        <div style={styles.codeContent}>
          {code.split('').map((_, i) => renderChar(i))}
        </div>
      </div>

      {state.done && !completed && <div style={styles.savingHint}>Saving...</div>}
    </div>
  );
}

function getDiffColor(d: string): string {
  switch (d) {
    case 'easy': return T.green;
    case 'medium': return T.warning;
    case 'hard': return T.error;
    default: return T.textDim;
  }
}

// ─── Styles ───────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: T.bg,
    outline: 'none',
    overflow: 'hidden',
  },
  center: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 20px',
    borderBottom: `1px solid ${T.border}`,
    background: T.surface,
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topBtn: {
    fontFamily: T.font,
    fontSize: 12,
    padding: '4px 10px',
    background: T.bg,
    border: `1px solid ${T.border}`,
    borderRadius: 6,
    color: T.textDim,
    cursor: 'pointer',
  },
  topTitle: {
    fontFamily: T.font,
    fontSize: 14,
    color: T.accent,
    fontWeight: 600,
  },
  topLang: {
    fontFamily: T.font,
    fontSize: 10,
    color: T.textDim,
    padding: '2px 6px',
    background: T.bg,
    borderRadius: 4,
  },
  typingHint: {
    fontFamily: T.font,
    fontSize: 12,
    color: T.caret,
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '48px 40px 32px',
    maxWidth: 900,
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  introSection: {
    marginBottom: 40,
  },
  introTitle: {
    fontFamily: T.font,
    fontSize: 28,
    fontWeight: 700,
    color: T.text,
    margin: '0 0 12px',
  },
  introDesc: {
    fontFamily: T.font,
    fontSize: 14,
    color: T.textDim,
    lineHeight: 1.7,
    margin: '0 0 16px',
  },
  introMeta: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaBadge: {
    fontFamily: T.font,
    fontSize: 11,
    padding: '4px 10px',
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 20,
    color: T.textDim,
  },
  partSection: {
    marginBottom: 40,
  },
  partHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  partBadge: {
    fontFamily: T.font,
    fontSize: 10,
    color: T.mauve,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  partDiff: {
    fontFamily: T.font,
    fontSize: 10,
    fontWeight: 600,
  },
  partTitle: {
    fontFamily: T.font,
    fontSize: 22,
    fontWeight: 700,
    color: T.text,
    margin: '0 0 8px',
  },
  partDesc: {
    fontFamily: T.font,
    fontSize: 13,
    color: T.textDim,
    lineHeight: 1.6,
    margin: '0 0 16px',
  },
  generating: {
    fontFamily: T.font,
    fontSize: 12,
    color: T.warning,
    padding: '8px 12px',
    background: `${T.warning}15`,
    borderRadius: 6,
    marginBottom: 12,
  },
  explanation: {
    fontFamily: T.font,
    fontSize: 14,
    color: T.text,
    lineHeight: 1.7,
    padding: 16,
    background: T.surface,
    borderRadius: 10,
    border: `1px solid ${T.border}`,
    marginBottom: 20,
  },
  fileBlock: {
    border: '1px solid',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    transition: 'border-color 0.2s, opacity 0.2s',
    background: T.surface,
  },
  fileHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px',
    background: T.surface2,
    borderBottom: `1px solid ${T.border}`,
  },
  fileHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  fileIcon: {
    fontFamily: T.font,
    fontSize: 12,
    fontWeight: 700,
    color: T.green,
    width: 16,
    textAlign: 'center',
  },
  filePath: {
    fontFamily: T.font,
    fontSize: 12,
    color: T.teal,
    fontWeight: 500,
  },
  fileStats: {
    fontFamily: T.font,
    fontSize: 10,
    color: T.green,
  },
  statsBar: {
    display: 'flex',
    gap: 16,
    padding: '6px 14px',
    fontFamily: T.font,
    fontSize: 13,
    background: `${T.accent}10`,
    borderBottom: `1px solid ${T.border}`,
  },
  progressTrack: {
    height: 3,
    background: T.bg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: T.accent,
    transition: 'width 0.2s',
  },
  codeWrapper: {
    display: 'flex',
    fontFamily: T.font,
    fontSize: 13,
    lineHeight: '22px',
    overflow: 'auto',
    whiteSpace: 'pre',
  },
  lineNums: {
    padding: '14px 0',
    minWidth: 40,
    userSelect: 'none',
    flexShrink: 0,
    borderRight: `1px solid ${T.border}`,
  },
  codeContent: {
    padding: '14px 18px',
    flex: 1,
    minWidth: 0,
  },
  savingHint: {
    fontFamily: T.font,
    fontSize: 11,
    color: T.textDim,
    padding: '4px 14px',
    textAlign: 'right',
  },
  completeBanner: {
    textAlign: 'center',
    padding: '40px 20px',
  },
  backToListBtn: {
    fontFamily: T.font,
    fontSize: 13,
    fontWeight: 600,
    padding: '10px 20px',
    background: T.green,
    color: T.bg,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    marginTop: 16,
  },
};

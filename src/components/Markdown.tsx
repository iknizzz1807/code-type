import { T } from '../theme';

interface MarkdownProps {
  text: string;
}

export function Markdown({ text }: MarkdownProps) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${elements.length}`} style={styles.codeBlock}>
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    if (line.trim() === '') continue;

    // List items
    if (line.match(/^[\-\*]\s/)) {
      const content = parseInline(line.replace(/^[\-\*]\s/, ''));
      elements.push(<li key={`li-${elements.length}`} style={styles.listItem}>{content}</li>);
      continue;
    }

    if (line.match(/^\d+\.\s/)) {
      const content = parseInline(line.replace(/^\d+\.\s/, ''));
      elements.push(<li key={`li-${elements.length}`} style={styles.listItem}>{content}</li>);
      continue;
    }

    // Paragraph
    elements.push(<p key={`p-${elements.length}`} style={styles.paragraph}>{parseInline(line)}</p>);
  }

  if (inCodeBlock && codeBlockContent.length > 0) {
    elements.push(
      <pre key={`code-${elements.length}`} style={styles.codeBlock}>
        <code>{codeBlockContent.join('\n')}</code>
      </pre>
    );
  }

  return <div style={styles.container}>{elements}</div>;
}

function parseInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    if (!boldMatch && !codeMatch) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    const useBold = boldMatch && (!codeMatch || boldMatch.index! < codeMatch.index!);

    if (useBold) {
      const match = boldMatch!;
      if (match.index! > 0) parts.push(<span key={key++}>{remaining.slice(0, match.index)}</span>);
      parts.push(<strong key={key++} style={{ color: T.mauve, fontWeight: 600 }}>{match[1]}</strong>);
      remaining = remaining.slice(match.index! + match[0].length);
    } else {
      const match = codeMatch!;
      if (match.index! > 0) parts.push(<span key={key++}>{remaining.slice(0, match.index)}</span>);
      parts.push(<code key={key++} style={styles.inlineCode}>{match[1]}</code>);
      remaining = remaining.slice(match.index! + match[0].length);
    }
  }

  return parts;
}

const styles: Record<string, React.CSSProperties> = {
  container: { lineHeight: 1.7 },
  paragraph: {
    fontFamily: T.font, fontSize: 14, color: T.text,
    margin: '0 0 12px', lineHeight: 1.7,
  },
  listItem: {
    fontFamily: T.font, fontSize: 14, color: T.text,
    marginLeft: 20, marginBottom: 4, lineHeight: 1.6,
  },
  codeBlock: {
    fontFamily: T.font, fontSize: 13, background: T.bg,
    padding: '12px 16px', borderRadius: 8, overflow: 'auto',
    lineHeight: 1.5, margin: '0 0 12px',
    border: `1px solid ${T.border}`, whiteSpace: 'pre',
  },
  inlineCode: {
    fontFamily: T.font, fontSize: 13, background: T.surface2,
    padding: '2px 6px', borderRadius: 4, color: T.teal,
  },
};

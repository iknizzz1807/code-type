import { useState } from 'react';
import { T } from '../theme';

interface AuthProps {
  onLogin: (token: string) => void;
}

export function Auth({ onLogin }: AuthProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      localStorage.setItem('token', data.token);
      onLogin(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>
          <span style={{ color: T.mauve }}>{"<"}</span>
          Code<span style={{ color: T.green }}>Type</span>
          <span style={{ color: T.mauve }}>{"/>"}</span>
        </h1>
        <p style={styles.subtitle}>
          {isRegister ? 'Create account' : 'Sign in to continue'}
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            autoFocus
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading || !username || !password}
            style={{
              ...styles.button,
              opacity: loading || !username || !password ? 0.5 : 1,
            }}
          >
            {loading ? '...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <button onClick={() => setIsRegister(!isRegister)} style={styles.switch}>
          {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: T.bg,
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
  },
  title: {
    fontFamily: T.font,
    fontSize: 32,
    color: T.accent,
    fontWeight: 800,
    letterSpacing: -1,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: T.font,
    fontSize: 13,
    color: T.textDim,
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  input: {
    fontFamily: T.font,
    fontSize: 14,
    padding: '14px 16px',
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    color: T.text,
    outline: 'none',
  },
  error: {
    fontFamily: T.font,
    fontSize: 12,
    color: T.error,
    textAlign: 'center',
  },
  button: {
    fontFamily: T.font,
    fontSize: 14,
    fontWeight: 600,
    padding: '14px',
    background: T.accent,
    color: T.bg,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    marginTop: 8,
  },
  switch: {
    fontFamily: T.font,
    fontSize: 12,
    color: T.textDim,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    marginTop: 20,
    textAlign: 'center',
    width: '100%',
  },
};

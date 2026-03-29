import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

const app = express();
const db = new Database('codetype.db');

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    language TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS snippets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    language TEXT NOT NULL,
    title TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    difficulty TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    snippet_id TEXT NOT NULL,
    wpm INTEGER NOT NULL,
    accuracy REAL NOT NULL,
    time INTEGER NOT NULL,
    errors INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Auth middleware
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const session = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token) as { user_id: string } | undefined;
  if (!session) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }

  (req as any).userId = session.user_id;
  next();
};

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    res.status(400).json({ error: 'Username already exists' });
    return;
  }

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);

  db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)').run(id, username, passwordHash);

  // Create default profiles for all languages
  const languages = ['Python', 'Rust', 'TypeScript', 'Go', 'C', 'C++', 'Zig'];
  const insertProfile = db.prepare('INSERT INTO profiles (id, user_id, language, description) VALUES (?, ?, ?, ?)');
  for (const lang of languages) {
    insertProfile.run(uuidv4(), id, lang, '');
  }

  res.json({ success: true });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  const user = db.prepare('SELECT id, password_hash FROM users WHERE username = ?').get(username) as { id: string; password_hash: string } | undefined;

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = uuidv4();
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, user.id);

  res.json({ token, userId: user.id });
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.json({ success: true });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get((req as any).userId) as { id: string; username: string };
  res.json(user);
});

// Profile routes
app.get('/api/profiles', authMiddleware, (req, res) => {
  const profiles = db.prepare('SELECT * FROM profiles WHERE user_id = ?').all((req as any).userId);
  res.json(profiles);
});

app.put('/api/profiles/:language', authMiddleware, (req, res) => {
  const { description } = req.body;
  const { language } = req.params;

  db.prepare('UPDATE profiles SET description = ? WHERE user_id = ? AND language = ?').run(description, (req as any).userId, language);
  res.json({ success: true });
});

// Snippet routes
app.get('/api/snippets', authMiddleware, (req, res) => {
  const snippets = db.prepare('SELECT * FROM snippets WHERE user_id = ? ORDER BY created_at DESC').all((req as any).userId);
  res.json(snippets);
});

app.post('/api/snippets', authMiddleware, (req, res) => {
  const { language, title, code, description, difficulty } = req.body;
  const id = uuidv4();

  db.prepare('INSERT INTO snippets (id, user_id, language, title, code, description, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, (req as any).userId, language, title, code, description || '', difficulty);

  res.json({ id, ...req.body });
});

app.delete('/api/snippets/:id', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM snippets WHERE id = ? AND user_id = ?').run(req.params.id, (req as any).userId);
  res.json({ success: true });
});

// History routes
app.get('/api/history', authMiddleware, (req, res) => {
  const history = db.prepare(`
    SELECT h.*, s.title as snippet_title, s.language
    FROM history h
    JOIN snippets s ON h.snippet_id = s.id
    WHERE h.user_id = ?
    ORDER BY h.created_at DESC
    LIMIT 100
  `).all((req as any).userId);
  res.json(history);
});

app.post('/api/history', authMiddleware, (req, res) => {
  const { snippetId, wpm, accuracy, time, errors } = req.body;
  const id = uuidv4();

  db.prepare('INSERT INTO history (id, user_id, snippet_id, wpm, accuracy, time, errors) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, (req as any).userId, snippetId, wpm, accuracy, time, errors);

  res.json({ id, ...req.body });
});

// Stats
app.get('/api/stats', authMiddleware, (req, res) => {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_sessions,
      AVG(wpm) as avg_wpm,
      MAX(wpm) as best_wpm,
      AVG(accuracy) as avg_accuracy
    FROM history
    WHERE user_id = ?
  `).get((req as any).userId);

  res.json(stats);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

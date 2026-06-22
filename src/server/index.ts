import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

// Load .env for server-side env vars
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=');
      if (eq > 0) process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  }
}

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

  CREATE TABLE IF NOT EXISTS tutorials (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    intro TEXT NOT NULL,
    tech_stack TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL,
    language TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    total_parts INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'planning',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tutorial_parts (
    id TEXT PRIMARY KEY,
    tutorial_id TEXT NOT NULL,
    part_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    explanation TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tutorial_id) REFERENCES tutorials(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tutorial_files (
    id TEXT PRIMARY KEY,
    part_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    code TEXT NOT NULL DEFAULT '',
    language TEXT NOT NULL DEFAULT '',
    file_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (part_id) REFERENCES tutorial_parts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tutorial_summaries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tutorial_id TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    language TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tutorial_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tutorial_id TEXT NOT NULL,
    part_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    wpm INTEGER NOT NULL,
    accuracy REAL NOT NULL,
    time INTEGER NOT NULL,
    errors INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES tutorial_parts(id) ON DELETE CASCADE
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
  const { snippet_id, wpm, accuracy, time, errors } = req.body;
  const id = uuidv4();

  db.prepare('INSERT INTO history (id, user_id, snippet_id, wpm, accuracy, time, errors) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, (req as any).userId, snippet_id, wpm, accuracy, time, errors);

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

// ─── Gemini Helper ─────────────────────────────────────────────

async function callGemini(prompt: string): Promise<string> {
  const key = process.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error('Gemini API key not configured');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 8000 },
      }),
    }
  );
  if (!res.ok) {
    let body = '';
    try { body = await res.text(); } catch {}
    console.error('Gemini API error:', res.status, body.slice(0, 500));
    throw new Error(`Gemini API error: ${res.status} — ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
}

// ─── Prompt Templates ──────────────────────────────────────────

const PLANNER_SYSTEM = `You are an expert technical curriculum designer for CodeType, a platform where developers learn deeply by retyping real code from structured tutorials.

Your tutorials must teach developers THINGS THEY WILL ACTUALLY USE at work — not toy examples, not hello-worlds, not academic exercises.

CORE PRINCIPLES:

1. REAL-WORLD OBSESSION — Every tutorial must solve a real problem developers face:
   - Good: "Build a rate-limited REST API with JWT auth, connection pooling, structured error handling"
   - Bad: "Create a simple calculator" or "Write a CRUD app"
   - Ask yourself: "Would a senior engineer mentor teach this to a junior on their team?"

2. LEARNING DENSITY — Every file, every function, every line must teach something:
   - Don't include boilerplate without explaining why it exists
   - Don't just show "how" — design for "why this way and not that way"
   - Each part should have a clear "aha" moment

3. PROGRESSIVE REVELATION — Start with working foundation, then layer in complexity:
   - Part 1: Get something running fast with proper foundations
   - Middle parts: Add real logic, edge cases, error handling
   - Late parts: Production concerns — testing, security, performance, monitoring

4. TOPIC DIVERSITY — Never repeat past topics. Every tutorial must be fresh.`;

function buildPlannerPrompt(language: string, profileDescription: string, pastSummaries: string): string {
  return `Developer's context:
- Language: ${language}
- Work context: ${profileDescription || 'General programming'}

Past tutorials (DO NOT repeat these topics — choose something completely different):
${pastSummaries || 'None yet'}

Design a NEW project tutorial for this developer.

REQUIREMENTS:
- 4-8 parts, each part = 1-3 files
- Each file: 20-80 lines of real, production-quality code
- Each part teaches MULTIPLE concepts (not just one thing)
- The project must be COMPLETE and FUNCTIONAL by the end
- Progressive difficulty: first part is approachable, last part is challenging
- PICK TOPICS THAT:
  * A developer would encounter in their first week at a real job
  * Demonstrate industry best practices (not just "working code")
  * Include error handling, edge cases, input validation naturally
  * Show architectural patterns (DI, separation of concerns, layered design)

Return ONLY this JSON (no markdown, no backticks, no extra text):
{
  "title": "Clear, specific tutorial title describing exactly what gets built",
  "intro": "2-3 sentences: what problem this solves, what the developer will learn, and why it matters in real projects",
  "summary": "One sentence summarizing this topic for future dedup",
  "techStack": "Technologies used, e.g. 'Python, FastAPI, SQLAlchemy, PostgreSQL'",
  "difficulty": "easy|medium|hard",
  "parts": [
    {
      "partNumber": 1,
      "title": "Part title describing exactly what gets built in this part",
      "description": "What this part achieves AND what specific skill/concept it teaches",
      "difficulty": "easy|medium|hard",
      "files": [
        { "path": "app/schemas.py", "purpose": "Why this file exists and what problem it solves in this part" }
      ]
    }
  ]
}`;
}

const PART_GENERATOR_SYSTEM = (lang: string) => `You are a senior ${lang} engineer and technical mentor. You're writing code for developers who want to level up — they will retype every line you write and read every word of your explanation. Your code IS the curriculum.

EVERY FILE YOU WRITE MUST:

1. BE PRODUCTION-GRADE — This means:
   - Proper type annotations, docstrings, and meaningful names everywhere
   - Error handling that a real API would need (not just try/except wrappers)
   - Input validation that protects against real-world bad data
   - Follow ${lang} community best practices (PEP8, etc.)
   - NO placeholder comments like "# TODO" or "# implement later"
   - NO dead code, NO print/debug remnants

2. TEACH THROUGH CODE — Every line serves a purpose:
   - Use realistic variable/function/class names that reveal intent
   - Show proper separation of concerns (don't put everything in one function)
   - Include defensive programming (check for None, handle edge cases)
   - Demonstrate the "right way" even when it's more verbose

3. BUILD ON PREVIOUS PARTS — This part MUST:
   - Import and extend code from earlier parts
   - NOT redefine what's already defined
   - Maintain consistent naming, patterns, and architecture
   - Result in a project that would actually work end-to-end

4. BE SCOPE-DISCIPLINED — 20-80 lines per file:
   - Each file has ONE clear responsibility
   - Split across files when a concern deserves its own module
   - Don't cram unrelated logic into one file`;

function buildPartPrompt(
  tutorial: any, part: any, filesList: string, previousCode: string
): string {
  return `TUTORIAL: ${tutorial.title}
${tutorial.intro}
Tech: ${tutorial.techStack}

PART ${part.part_number}/${tutorial.total_parts}: ${part.title}
${part.description}

FILES NEEDED FOR THIS PART:
${filesList}

PREVIOUS PARTS CODE (context — this part MUST build on this):
\`\`\`
${previousCode || '// First part — no previous code'}
\`\`\`

YOUR JOB:
Generate the code AND a DEEP educational explanation for this part.

CODE REQUIREMENTS:
- Real, working code that would pass code review
- Proper error handling, input validation, edge cases
- Follows ${tutorial.language} idioms and best practices
- Builds seamlessly on the previous parts shown above
- 20-80 lines per file

EXPLANATION REQUIREMENTS (MOST IMPORTANT — THIS IS WHAT TEACHES THE DEVELOPER):
Your explanation must be 200-500 words and cover each file's code in detail:

For EACH FILE, explain:
1. WHAT this file does in the overall architecture
2. LINE-BY-LINE BREAKDOWN of important sections:
   - What each key line/block does
   - WHY it's written this way (the design decision)
   - What BAD PRACTICE it avoids (e.g., "We use Pydantic instead of raw dicts to get type validation for free")
3. KEY CONCEPTS introduced in this part:
   - What patterns are being demonstrated
   - Why they matter in production
   - Common mistakes developers make with these patterns
4. HOW THIS CONNECTS:
   - How this part builds on previous parts
   - What's being set up for future parts
   - The architectural rationale

Return ONLY this JSON (no markdown, no backticks):
{
  "files": [
    {
      "path": "app/schemas.py",
      "code": "full code content here",
      "language": "${tutorial.language.toLowerCase()}"
    }
  ],
  "explanation": "DETAILED explanation following the requirements above — 200-500 words covering line-by-line breakdown, best practices, bad practices avoided, and architectural context."
}`;
}

// ─── Tutorial Routes ───────────────────────────────────────────

// Agent 1: Planner — design the tutorial structure
app.post('/api/tutorials/plan', authMiddleware, async (req, res) => {
  const { language, profileDescription } = req.body;
  const userId = (req as any).userId;

  try {
    const pastRows = db.prepare('SELECT title, summary FROM tutorial_summaries WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
    const pastSummaries = pastRows.map((r: any) => `- ${r.title}: ${r.summary}`).join('\n');

    const prompt = PLANNER_SYSTEM + '\n\n' + buildPlannerPrompt(language, profileDescription, pastSummaries);
    const text = await callGemini(prompt);
    const plan = JSON.parse(text.replace(/```json|```|```/g, '').trim());

    // Validate plan
    if (!plan.parts || !Array.isArray(plan.parts) || plan.parts.length < 2) {
      throw new Error('Invalid plan from Gemini: insufficient parts');
    }

    // Save tutorial
    const tutorialId = uuidv4();
    db.prepare(`INSERT INTO tutorials (id, user_id, title, intro, tech_stack, summary, language, difficulty, total_parts, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'planning')`)
      .run(tutorialId, userId, plan.title, plan.intro, plan.techStack, plan.summary, language, plan.difficulty, plan.parts.length);

    // Save summary for future dedup
    db.prepare('INSERT INTO tutorial_summaries (id, user_id, tutorial_id, title, summary, language) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), userId, tutorialId, plan.title, plan.summary, language);

    // Save part stubs
    const stmtPart = db.prepare(`INSERT INTO tutorial_parts (id, tutorial_id, part_number, title, description, difficulty, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')`);
    const stmtFile = db.prepare(`INSERT INTO tutorial_files (id, part_id, file_path, code, language, file_order)
      VALUES (?, ?, ?, '', ?, ?)`);

    for (const part of plan.parts) {
      const partId = uuidv4();
      stmtPart.run(partId, tutorialId, part.partNumber, part.title, part.description, part.difficulty);

      for (let fi = 0; fi < (part.files || []).length; fi++) {
        const f = part.files[fi];
        stmtFile.run(uuidv4(), partId, f.path, language, fi);
      }
    }

    res.json({ id: tutorialId, ...plan });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Planner failed' });
  }
});

// List tutorials
app.get('/api/tutorials', authMiddleware, (req, res) => {
  const userId = (req as any).userId;
  const tutorials = db.prepare(`
    SELECT t.*,
      (SELECT COUNT(*) FROM tutorial_parts WHERE tutorial_id = t.id AND status = 'completed') as completed_parts
    FROM tutorials t WHERE t.user_id = ? ORDER BY t.created_at DESC
  `).all(userId);
  res.json(tutorials);
});

// Get full tutorial with parts and files
app.get('/api/tutorials/:id', authMiddleware, (req, res) => {
  const userId = (req as any).userId;
  const tutorial = db.prepare('SELECT * FROM tutorials WHERE id = ? AND user_id = ?').get(req.params.id, userId);
  if (!tutorial) { res.status(404).json({ error: 'Not found' }); return; }

  const parts = db.prepare('SELECT * FROM tutorial_parts WHERE tutorial_id = ? ORDER BY part_number').all(req.params.id);
  for (const part of parts as any[]) {
    (part as any).files = db.prepare('SELECT * FROM tutorial_files WHERE part_id = ? ORDER BY file_order').all(part.id);
  }
  (tutorial as any).parts = parts;

  res.json(tutorial);
});

// Agent 2: Generate the next pending part
app.post('/api/tutorials/:id/generate-next-part', authMiddleware, async (req, res) => {
  const tutorialId = req.params.id;
  const userId = (req as any).userId;

  try {
    const tutorial = db.prepare('SELECT * FROM tutorials WHERE id = ? AND user_id = ?').get(tutorialId, userId) as any;
    if (!tutorial) { res.status(404).json({ error: 'Not found' }); return; }

    // Mark tutorial as generating
    db.prepare('UPDATE tutorials SET status = ? WHERE id = ?').run('active', tutorialId);

    // Get next pending part
    const nextPart = db.prepare('SELECT * FROM tutorial_parts WHERE tutorial_id = ? AND status = ? ORDER BY part_number ASC LIMIT 1').get(tutorialId, 'pending') as any;
    if (!nextPart) { res.status(400).json({ error: 'All parts completed' }); return; }

    // Get previous ready parts' code for context
    const prevParts = db.prepare(`
      SELECT tp.part_number, tp.title, tf.file_path, tf.code
      FROM tutorial_parts tp
      JOIN tutorial_files tf ON tf.part_id = tp.id
      WHERE tp.tutorial_id = ? AND tp.status = 'ready'
      ORDER BY tp.part_number, tf.file_order
    `).all(tutorialId) as any[];

    let previousCode = '';
    if (prevParts.length > 0) {
      let currentPart = 0;
      for (const row of prevParts) {
        if (row.part_number !== currentPart) {
          previousCode += `\n// === Part ${row.part_number}: ${row.title} ===\n`;
          currentPart = row.part_number;
        }
        previousCode += `\n// File: ${row.file_path}\n${row.code}\n`;
      }
    }

    // Get files for this part
    const partFiles = db.prepare('SELECT * FROM tutorial_files WHERE part_id = ? ORDER BY file_order').all(nextPart.id) as any[];
    const filesListStr = partFiles.map((f: any) => `  - ${f.file_path} (${f.language})`).join('\n');

    const prompt = PART_GENERATOR_SYSTEM(tutorial.language) + '\n\n' +
      buildPartPrompt(tutorial, nextPart, filesListStr, previousCode);

    const text = await callGemini(prompt);
    const generated: any = JSON.parse(text.replace(/```json|```|```/g, '').trim());

    // Validate output
    if (!generated.files || !Array.isArray(generated.files) || generated.files.length === 0) {
      throw new Error('Invalid response from Part Generator: no files');
    }

    // Update part
    db.prepare('UPDATE tutorial_parts SET explanation = ?, status = ? WHERE id = ?')
      .run(generated.explanation || 'No explanation provided', 'ready', nextPart.id);

    // Update files
    const stmtUpdateFile = db.prepare('UPDATE tutorial_files SET code = ?, language = ? WHERE part_id = ? AND file_path = ?');
    for (const gf of generated.files) {
      const existing = partFiles.find((pf: any) => pf.file_path === gf.path);
      if (existing) {
        stmtUpdateFile.run(gf.code, gf.language || tutorial.language.toLowerCase(), nextPart.id, gf.path);
      } else {
        // File wasn't in plan but was generated — insert it
        const maxOrder = partFiles.reduce((max: number, pf: any) => Math.max(max, pf.file_order), -1);
        db.prepare('INSERT INTO tutorial_files (id, part_id, file_path, code, language, file_order) VALUES (?, ?, ?, ?, ?, ?)')
          .run(uuidv4(), nextPart.id, gf.path, gf.code, gf.language || tutorial.language.toLowerCase(), maxOrder + 1);
      }
    }

    // Return the generated part with all its files
    const savedPart = db.prepare('SELECT * FROM tutorial_parts WHERE id = ?').get(nextPart.id);
    const savedFiles = db.prepare('SELECT * FROM tutorial_files WHERE part_id = ? ORDER BY file_order').all(nextPart.id);

    res.json({ part: savedPart, files: savedFiles });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Part generation failed' });
  }
});

// Complete a part
app.post('/api/tutorials/:id/parts/:partNumber/complete', authMiddleware, (req, res) => {
  const userId = (req as any).userId;
  const { wpm, accuracy, time, errors, filePath } = req.body;

  const part = db.prepare(`
    SELECT tp.id, tp.tutorial_id FROM tutorial_parts tp
    JOIN tutorials t ON t.id = tp.tutorial_id
    WHERE tp.tutorial_id = ? AND tp.part_number = ? AND t.user_id = ?
  `).get(req.params.id, parseInt(req.params.partNumber), userId) as any;

  if (!part) { res.status(404).json({ error: 'Part not found' }); return; }

  // Save history
  db.prepare('INSERT INTO tutorial_history (id, user_id, tutorial_id, part_id, file_path, wpm, accuracy, time, errors) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(uuidv4(), userId, req.params.id, part.id, filePath || '', wpm, accuracy, time, errors);

  // Mark part completed
  db.prepare('UPDATE tutorial_parts SET status = ? WHERE id = ?').run('completed', part.id);

  // Check if all parts done
  const remaining = db.prepare('SELECT COUNT(*) as cnt FROM tutorial_parts WHERE tutorial_id = ? AND status != ?').get(req.params.id, 'completed') as any;
  if (remaining.cnt === 0) {
    db.prepare('UPDATE tutorials SET status = ? WHERE id = ?').run('completed', req.params.id);
  }

  res.json({ success: true, tutorialDone: remaining.cnt === 0 });
});

// Delete tutorial cascade
app.delete('/api/tutorials/:id', authMiddleware, (req, res) => {
  const userId = (req as any).userId;
  const tutorial = db.prepare('SELECT id FROM tutorials WHERE id = ? AND user_id = ?').get(req.params.id, userId);
  if (!tutorial) { res.status(404).json({ error: 'Not found' }); return; }

  db.prepare('DELETE FROM tutorials WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

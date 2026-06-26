// PHOTACC voting server — Express + lowdb
// One vote per email. Results are admin-only. Serves the voter page and admin page.

import express from 'express';
import { JSONFilePreset } from 'lowdb/node';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- Config (override with environment variables in production) ----
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'photacc2025';
// DB_PATH lets you point the database at a persistent disk (see README).
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'db.json');

// The ballot. IDs here must match the IDs used in public/script.js.
const CANDIDATES = [
  { id: 'brandon',  name: 'Brandon',  role: 'Event Officer' },
  { id: 'miah',     name: 'Miah',     role: 'Technical Officer' },
  { id: 'brittany', name: 'Brittany', role: 'PRO' },
  { id: 'calisa',   name: 'Calisa',   role: 'President' },
];
const CANDIDATE_IDS = CANDIDATES.map((c) => c.id);

// ---- Database ----
const defaultData = { ballots: [], voters: [] };
const db = await JSONFilePreset(DB_PATH, defaultData);

// ---- App ----
const app = express();
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const normEmail = (e) => String(e || '').trim().toLowerCase();
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

app.get('/api/candidates', (_req, res) => res.json({ candidates: CANDIDATES }));

app.get('/api/check-email', (req, res) => {
  const email = normEmail(req.query.email);
  if (!validEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  res.json({ voted: db.data.voters.includes(email) });
});

app.post('/api/vote', async (req, res) => {
  const email = normEmail(req.body?.email);
  const raw = req.body?.choices || {};
  if (!validEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

  const choices = {};
  for (const id of CANDIDATE_IDS) {
    const v = raw[id];
    if (v !== 'yes' && v !== 'no') return res.status(400).json({ error: 'Please vote Yes or No on all four candidates.' });
    choices[id] = v;
  }

  let alreadyVoted = false;
  await db.update((d) => {
    if (d.voters.includes(email)) { alreadyVoted = true; return; }
    d.voters.push(email);
    d.ballots.push({ email, choices, ts: new Date().toISOString() });
  });

  if (alreadyVoted) return res.status(409).json({ error: 'This email has already voted. Each email gets one ballot.' });
  res.json({ ok: true });
});

app.post('/api/admin/results', (req, res) => {
  const password = String(req.body?.password || '');
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Incorrect password.' });

  const counts = {};
  for (const c of CANDIDATES) counts[c.id] = { yes: 0, no: 0 };
  for (const b of db.data.ballots) {
    for (const id of CANDIDATE_IDS) {
      if (b.choices[id] === 'yes') counts[id].yes++;
      else if (b.choices[id] === 'no') counts[id].no++;
    }
  }
  res.json({ totalVoters: db.data.voters.length, candidates: CANDIDATES, counts });
});

// Friendly /admin route -> admin page
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
// Anything else -> voter page
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`PHOTACC voting site running on http://localhost:${PORT}`));

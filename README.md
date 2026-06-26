# PHOTACC — Voting Site (server version)

Express + lowdb. Everyone votes into one shared count, results are admin-only,
and the design is the gold/black "lights, camera, action" build with the real
team photos embedded.

```
photacc/
├── server.js          Express API + lowdb storage
├── package.json
├── db.json            starting database: {"ballots":[],"voters":[]}
└── public/
    ├── index.html     voter page
    ├── admin.html     admin page  (reachable at /admin)
    ├── style.css      shared theme
    └── script.js      shared logic + the embedded photos (base64)
```

The candidate photos and logo are baked into `script.js`, so both pages share
one download and there's no images folder to manage.

## Run locally
Needs Node.js 18+.
```bash
npm install
npm start
```
- Voter site: http://localhost:3000
- Admin: http://localhost:3000/admin  (password `photacc2025`)

## Admin password
Default `photacc2025`. For production, don't ship it in code — set an
environment variable and the server uses it automatically:
```
ADMIN_PASSWORD=YourStrongPassword
```

## Deploy to Render.com (free)
1. Push this folder to a GitHub repo.
2. render.com → New + → Web Service → connect the repo.
3. Build Command `npm install`, Start Command `npm start`, Instance Type Free.
4. Environment → add `ADMIN_PASSWORD`.
5. Create. You get a public URL like `https://photacc.onrender.com`
   (admin at `https://photacc.onrender.com/admin`).

## Keeping votes (read this before the real election)
Render's **free** tier has an ephemeral filesystem, so `db.json` is wiped
whenever the service restarts, redeploys, or spins down (free services sleep
after 15 min idle). For a real vote, pick one:
- **Free, short campaign:** keep the service awake with a free pinger
  (UptimeRobot / cron-job.org hitting your URL every ~10 min) and don't redeploy
  mid-vote.
- **Guaranteed:** upgrade to a paid instance, attach a persistent disk, and set
  `DB_PATH=/data/db.json` (the server already reads `DB_PATH`).
- **Free + durable:** use a free Render Postgres database (it expires after 30
  days, fine for a campaign) — ask and I'll swap the storage layer; the frontend
  stays identical.

Note: committing `db.json` means a redeploy resets it to empty. That's expected
on the free tier; the options above are how you make votes stick.

## Honest notes
- "One vote per email" blocks the same email twice; it doesn't stop someone
  using several different emails. Fine for a club vote — just know what it does.
- Results sit behind the admin password and Render serves HTTPS, so the password
  is encrypted in transit. Use a strong password.

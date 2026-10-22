# Ajinkya Omkar Walvekar – Portfolio + "Ajinkya" Dashboard

Plain HTML/CSS/vanilla JS frontend + a tiny **dependency-free Node.js backend** (Node 18+, no `npm install` needed).
Content is stored in JSON files in `data/` (a persistent disk is required in production – see Deployment).

## Run locally
```bash
node server.js            # or: npm start
# Site:      http://localhost:3000
# Dashboard: http://localhost:3000/admin   (footer link: "Ajinkya dashboard")
npm test                  # end-to-end smoke test (uses a temp data dir)
```
Login with username `Ajinkya` and the initial password you gave me. It is **not** stored anywhere in the code – only a salted
scrypt hash is in `seed/admin.json`, copied to `data/admin.json` on first start. **Change it after first login.**

## Changing the password
* In the dashboard: **Password** tab (min 10 chars), or
* On the server: `NEW_PASSWORD='your-new-password' node scripts/set-password.js` then restart (restart ends all sessions), or
* On a fresh deploy: set env var `ADMIN_INITIAL_PASSWORD` *before the first start* (used only when `data/admin.json` doesn't exist yet).
Note: `data/admin.json` takes priority over `seed/admin.json` – editing the seed later has no effect once the data dir exists.

## What the dashboard manages
Projects, Skills, Achievements, Certificates, Research, Education, Internships (add / edit / delete / publish-unpublish),
Profile (name, about, photo, resume PDF, links), contact-form Messages, and password. Items start as **Draft** until published.
Images/resume are uploaded (max 5 MB; png/jpg/webp/gif/pdf) and saved to `data/uploads/`.

## Security notes
Password hashing: scrypt + per-user salt · sessions: random 256-bit token in an HttpOnly, SameSite=Strict cookie (Secure in
production) · login rate-limit (8 / 15 min / IP) · every write API requires a custom header (CSRF defence) · strict CSP,
output escaped, only http(s)/relative URLs accepted · uploads restricted by extension, served `nosniff`.
Use **HTTPS** in production (all hosts below provide it). Sessions are in memory, so a restart logs you out.

## Images to replace (all in `public/assets/placeholders/`, or just upload through the dashboard)
| File | Used for |
|---|---|
| `profile-photo.svg` | Hero portrait (4:5) – set in Dashboard → Profile |
| `project-flowml-studio.svg`, `project-dataset-cleaner-ai.svg`, `project-chatpdf.svg`, `project-hello-list.svg`, `project-byteprojex.svg`, `project-head-controlled-mouse.svg` | Project cards (16:10) |
| `project-default.svg` | Fallback for projects with no image |
| `research-paper.svg` | Research card |
| `achievement-innovation-2k26.svg`, `achievement-spark-2k26.svg`, `achievement-techvortex-3.svg` | Achievement cards |
| `achievement-default.svg`, `certificate-default.svg` | Fallbacks |
| `../resume.pdf` | **Placeholder PDF** – replace with your real resume (or upload via Dashboard → Profile → Resume) |

## Content you should review (nothing was invented)
Seeded only with facts you gave: name, KIT Kolhapur, CSE (AI & ML), the 6 projects + links, the one research paper + DOI,
and 3 achievements. Short project descriptions are neutral placeholders; project categories (AI/ML vs Web) and the 4 starter
skills are my reasonable guesses from the project types – edit them. Education period, internships, certificates, email,
GitHub and LinkedIn are empty; the public site hides empty links and shows friendly "not added yet" notes.

## Deployment
The app needs a **persistent disk** (content, uploads, messages live in `DATA_DIR`). Serverless hosts like Vercel/Netlify
have no persistent filesystem – do not use them for this backend.

**Render.com (easy):** push to GitHub → New *Web Service* → Runtime Node, Build command empty, Start `node server.js` →
add a **Disk** mounted at `/var/data` → env vars: `NODE_ENV=production`, `DATA_DIR=/var/data` (optional `ADMIN_INITIAL_PASSWORD`).
(Persistent disks need a paid instance; free instances lose data on redeploy.)

**Railway / Fly.io:** same idea – create a volume, mount it, set `DATA_DIR` to the mount path, `NODE_ENV=production`.

**VPS (Ubuntu):**
```bash
git clone <repo> && cd portfolio
NODE_ENV=production PORT=3000 DATA_DIR=/var/portfolio-data node server.js   # run under pm2/systemd
# put Caddy or nginx + Let's Encrypt in front for HTTPS (reverse proxy to :3000)
```
**Back up** `DATA_DIR` regularly (it is just JSON files + `uploads/`).

## Structure
`server.js` (API, auth, static) · `public/` (index, admin, css, js, assets) · `seed/` (initial content + password hash) ·
`scripts/set-password.js`, `scripts/test.js` · `data/` (created at runtime, git-ignored)

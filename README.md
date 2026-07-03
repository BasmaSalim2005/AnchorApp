# ⚓ Anchor — *build habits that hold*

Go beyond the seed. Anchor holds your habits steady through the wobbly early days
so you make it past day two — and watch them bloom across the whole year.

A full-stack habit tracker:

- **Frontend:** Angular 20 (standalone + signals), installable **PWA** (works on mobile
  via the browser, add-to-home-screen, offline app shell — no app store needed)
- **Backend:** Node.js + Express (JavaScript)
- **Database:** PostgreSQL (sessions stored in Postgres, per-user login)

## Features

- 🔐 **Login / sign up** with username + password (email on registration). Sessions
  are per-user and stored in Postgres.
- ➕ **Add / edit / delete habits** with a chosen **color**, **icon (emoji)**, and
  **frequency** (daily / weekly / monthly with a target count).
- 📊 **Measurable habits** — track quantities like water (ml), running (km), reps, etc.
- 🔔 **Optional daily reminders** via browser notifications.
- 🗂️ **One page, four tabs:**
  - **Daily** — today's checklist with progress ring and quantity entry.
  - **Weekly** — a 7-day grid you can tap.
  - **Monthly** — each habit's own month calendar.
  - **Yearly** — the full year as small squares; a square is colored with the
    habit's color on every day you completed it.

---

## Project structure

```
Habits App/
├─ backend/      Express + PostgreSQL API
│  ├─ src/
│  │  ├─ server.js
│  │  ├─ db/         (pool, schema.sql, migrate)
│  │  ├─ routes/     (auth, habits, logs)
│  │  └─ middleware/ utils/
│  └─ .env.example
└─ frontend/     Angular 20 PWA
   └─ src/app/
      ├─ core/    (services, models, guards)
      ├─ pages/   (onboarding, dashboard, tabs)
      └─ shared/  (logo, habit form)
```

---

## Getting started

### 1. Database (Supabase or local Postgres)

You only need a **connection string** — the app creates all the tables for you.

**Supabase:** Project → *Connect* → copy the connection string (URI). It looks like:

```
postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres
```

Supabase requires SSL, so set `DATABASE_SSL=true`.

### 2. Backend

```bash
cd backend
copy .env.example .env      # Windows (use "cp" on macOS/Linux)
# edit .env and paste DATABASE_URL, set DATABASE_SSL, set a SESSION_SECRET
npm install
npm run migrate             # creates all tables (safe to re-run)
npm run dev                 # starts API on http://localhost:3000
```

### 3. Frontend

```bash
cd frontend
npm install
npm start                   # http://localhost:4200  (proxies /api -> :3000)
```

Open <http://localhost:4200>, create an account, and start anchoring habits.

---

## Using it on your phone (no installation)

Because the frontend is a **PWA**:

1. Deploy the frontend (any static host) and backend, **or** browse to your computer's
   local IP on the same Wi-Fi (e.g. `http://192.168.1.x:4200`).
2. Open it in the phone's browser → menu → **Add to Home Screen**.
3. It launches full-screen like an app and caches its shell so it opens instantly,
   even offline. Habit data syncs whenever you have a connection.

> Note: browser push reminders fire while the app is open. For background OS-level
> push you'd add a Web Push service later.

---

## Configuration reference (`backend/.env`)

| Variable         | Description                                            |
| ---------------- | ------------------------------------------------------ |
| `DATABASE_URL`   | Postgres connection string                             |
| `DATABASE_SSL`   | `true` for Supabase / most cloud providers             |
| `PORT`           | API port (default 3000)                                |
| `CLIENT_ORIGIN`  | Allowed frontend origin(s), comma-separated            |
| `SESSION_SECRET` | Long random string for signing the session cookie      |
| `SESSION_SECURE` | `true` when served over HTTPS                           |

## Deployment

In production the **Express backend also serves the built Angular app**, so the
whole thing runs as **one service on one domain** — which keeps login sessions and
the PWA working without any CORS/cookie configuration.

```
Browser ──► https://your-app.onrender.com
             ├─ /            → Angular PWA (served by Express)
             ├─ /app/...     → SPA routes
             └─ /api/...     → Express API ──► Supabase (Postgres)
```

### Deploy to Render (free, recommended)

1. Push this project to a GitHub repo.
2. On [Render](https://render.com): **New ➜ Blueprint**, and select the repo
   (it reads the included `render.yaml`).
3. When prompted, set the one secret env var **`DATABASE_URL`** to your Supabase
   **Session pooler** connection string
   (`postgresql://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:5432/postgres`).
   `SESSION_SECRET` is generated automatically; `NODE_ENV`, `DATABASE_SSL`, and
   `SESSION_SECURE` are already set.
4. Click **Apply**. Render runs `npm run build` (installs both apps + builds the
   PWA) then `npm start`. Your app is live at `https://<name>.onrender.com`.

> The same setup works on Railway/Fly.io: **build** = `npm run build`,
> **start** = `npm start`, plus the env vars above.

### Manual / self-host

```bash
npm run build     # installs backend + frontend deps and builds the PWA
npm start         # starts Express on $PORT, serving API + the built app
```

Set these environment variables on the host: `DATABASE_URL`, `DATABASE_SSL=true`,
`SESSION_SECRET`, `NODE_ENV=production`, `SESSION_SECURE=true`.

### Installing on your phone

Once deployed over HTTPS, open the URL on your phone's browser → **Add to Home
Screen**. It installs like a native app (icon, full-screen, offline shell) with
no app store.

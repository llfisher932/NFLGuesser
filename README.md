# Pick 'Em

An invite-only NFL score-prediction game for a few separate friend groups. Every
week you predict the final score of each game. Points come from calling the
winner, how close you got to each team's score, and how close you got to the
margin. Each friend group ("league", an *organization* in the code) has its own
leaderboard.

Same shape as the strikes app: Express + Prisma on one Vercel function, React +
MUI client, passwords generated and handed out by the admin.

## How it works

- **No sign-up.** The admin creates every account from the admin dashboard and
  gets a username and generated password to send. Users can change their own
  password; doing so signs them out everywhere else.
- **Leagues.** The admin creates leagues and adds people to them. A user can be
  in any number. Each league has an internal ID (`code`) that only the admin
  sees.
- **One slate per person.** Picks belong to the user, not the league, so the
  same picks count on every leaderboard they're on.
- **Locks.** Each game locks at its own kickoff. Everyone in a league can see
  everyone's picks at any time, before kickoff included. That's on purpose.
- **Games** come from ESPN's public scoreboard feed. There's no scheduler: a
  week refreshes itself when someone opens it and its copy is stale (every
  minute while a game is live, every few hours before, daily once it's all
  final). The admin can force a sync or override any result.
- **Scoring** (`server/src/scoring.ts`), out of 40 a game:
  winner 10, each team's score `max(0, 10 − points off)`, differential
  `max(0, 10 − margin off)` with direction. Only finished games count toward the
  leaderboard; live games show provisional points marked with `*`. Nothing is
  stored. Points are recomputed from picks and results on every read, so a
  corrected score re-scores everyone at once.
- **Admin** (seeded account) can do anything: create/rename/delete leagues,
  regenerate their IDs, add/remove members; create, rename, re-username,
  promote/demote and delete accounts; reset any password (generated or chosen);
  edit anyone's picks, locked or not; sync weeks and override results. It can't
  delete itself or remove its own admin.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite, MUI (light/dark) |
| Backend | Node, Express 5, TypeScript |
| ORM | Prisma 7 (`prisma-client` generator, `@prisma/adapter-pg`) |
| Database | PostgreSQL |
| Hosting | Vercel Services (beta): a `client` and a `server` service in one project |

## Setup (local)

```bash
npm install                                   # both workspaces + Prisma client
cp .env.example .env                          # fill in DATABASE_URL + SESSION_SECRET
node --env-file=.env scripts/create-db.mjs    # creates the database if missing
npm run db:migrate                            # prisma migrate deploy
npm run db:seed                               # creates the admin, prints the password ONCE

npm run dev:server                            # http://localhost:3010
npm run dev:client                            # http://localhost:5173 (proxies /api)
```

Checks: `npm run typecheck`, `npm test` (scoring), `npm run lint --workspace client`,
`npm run build --workspace client`.

## Deploying to Vercel

1. Provision a hosted Postgres (Neon, Supabase, Prisma Postgres…). Keep a direct
   (non-pgbouncer) URL for migrations.
2. Import the repo into Vercel with the Root Directory left at the repo root.
   `vercel.json` defines two services and routes the one domain to them:
   `/api/*` goes to `server` (Express, which gets the path with `/api` intact)
   and everything else to `client` (Vite, falling back to `index.html` for
   client-side routes). The browser is the only thing that calls the API, over
   that public path, so there are no service bindings.
3. Set `DATABASE_URL` and `SESSION_SECRET` for Production, Preview and
   Development.
4. From your machine, with `.env` pointing at the hosted database:
   `npm run db:migrate` then `npm run db:seed`. Save the printed password.
5. Push. Smoke test: `curl -i https://<app>.vercel.app/api/auth/me` → 401.

Migrations are never run by the build, so a bad one can't take the site down.

## Project structure

```
vercel.json                the client and server services + public routing
server/
  prisma/schema.prisma     User, Organization, Membership, Week, Game, Prediction, SyncState
  prisma/seed.ts           creates the admin account once
  src/espn.ts              ESPN feed fetch + defensive parsing
  src/scoring.ts           the points formula (+ scoring.test.ts)
  src/models/              all database access; schedule.model.ts holds the lazy sync
  src/controllers/         validation + response shaping
  src/router/              routes
  src/middleware/          session cookie, admin guard, errors
client/src/
  views/                   Login, Picks, OrgView, Account, Rules, Admin
  components/              NavBar, WeekPicker, GameCard, PickSheet, admin/*
  utils/                   api client, types, URL routes, useLoad
scripts/create-db.mjs      local database bootstrap
```

## API

All under `/api`. Everything except `auth/login`, `auth/logout` and `auth/me`
needs the session cookie; `admin/*` also needs an admin.

| Method | Endpoint | |
|---|---|---|
| `POST` | `/auth/login` | `{ username, password }` |
| `POST` | `/auth/logout` | |
| `GET` | `/auth/me` | your record, with your leagues |
| `POST` | `/auth/password` | `{ currentPassword, newPassword }` |
| `GET` | `/weeks` | calendar + current week |
| `GET` | `/games?season&seasonType&week` | a week's games with your picks (omit for current week) |
| `PUT` | `/picks/:gameId` | `{ homeScore, awayScore }`, 409 once locked |
| `DELETE` | `/picks/:gameId` | |
| `GET` | `/organizations/:id` | league + members (members and admin only) |
| `GET` | `/organizations/:id/standings?week…` | season table + that week's points |
| `GET` | `/organizations/:id/picks?week…` | every member's picks for the week |
| `GET` | `/admin` | all users and leagues |
| `POST` / `PATCH` / `DELETE` | `/admin/organizations[/:id]` | create / rename / delete |
| `POST` | `/admin/organizations/:id/code` | new internal ID |
| `PUT` / `DELETE` | `/admin/organizations/:id/members/:userId` | add / remove member |
| `POST` | `/admin/users` | `{ username, displayName, isAdmin, organizationIds }` → password once |
| `PATCH` | `/admin/users/:id` | any of the above |
| `POST` | `/admin/users/:id/password` | `{ password? }`; generated if omitted |
| `DELETE` | `/admin/users/:id` | |
| `GET` | `/admin/users/:id/games?week…` | a user's picks for a week |
| `PUT` / `DELETE` | `/admin/users/:id/picks/:gameId` | ignores the lock |
| `POST` | `/admin/sync` | `{ season, seasonType, week }` or `{}` for current |
| `PUT` | `/admin/games/:id/result` | `{ status, homeScore, awayScore }` pins it; `{ manualResult: false }` hands it back to ESPN |

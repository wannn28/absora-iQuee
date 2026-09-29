# Absora

HR workspace for planned absences, employees, events, and onboarding.

## Stack

React, Vite, TypeScript, Tailwind, Express, SQLite (`better-sqlite3`).

## Scripts

- `npm run dev` — API on port 3016 and Vite on 5173
- `npm run build` — production frontend into `dist/`
- `npm start` — Express serves the API and the built frontend

## Environment

- `PORT` (default `3016`)
- `SQLITE_PATH` (default `./data/absora.db`)

The first registered user is the admin. Demo employees, absences, events, and onboarding tasks are seeded on first launch so the dashboard matches the product reference (December 2025).

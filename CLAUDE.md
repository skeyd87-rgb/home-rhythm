# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Home Rhythm — a mobile-first PWA household operating system for two adults. Not a guilt-trip chore app. The emotional target: *"The house is mostly steady. Two things are slipping. Everything else can wait."*

See [ROADMAP.md](ROADMAP.md) for the full phased build plan and [PROJECT.md](PROJECT.md) for product brief, tone, and feature list.

## Current Phase

The active app is the mobile-first static PWA in `docs/`. It is deployed to
GitHub Pages and Firebase Hosting, with Google Sign-In, Firestore household
sync, member invites, custom zones, and completion history groundwork. Read
`BACKEND.md` before changing authentication, sync, or household data.

The original root-level vanilla prototype remains reference-only. The planned
React + TypeScript migration has not happened. Do not claim the app uses React;
keep data access behind `docs/firebase-repository.js` so a later UI migration
does not require a backend rewrite.

## Commands

### Prototype (reference only — do not extend)
```
node server.js
# or
.\Start-Home-Rhythm.ps1
```
Serves the vanilla JS prototype at `http://localhost:3000`.

### Production app (once scaffolded under `app/`)
```
cd app
npm run dev       # Vite dev server
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # ESLint
```

### Active deployed PWA

```powershell
firebase deploy --only auth
firebase deploy --only firestore
firebase deploy --only hosting
```

- Firebase Hosting: `https://home-rhythm-skeyd87.web.app`
- GitHub Pages: `https://skeyd87-rgb.github.io/home-rhythm/`

## Prototype Reference

Vanilla HTML/CSS/JS single-page app with localStorage persistence (`home-rhythm-v1`). Key logic to port to production:

- `starterTasks` in [app.js](app.js) — full chore data model (id, title, frequency, owner, zone, notes, petCare, lastCompleted). Use as seed data for the mock repository.
- `dueInfo()` in [app.js:378](app.js) — computes status from `lastCompleted` + frequency interval. **Port and rename** in production:

  | Prototype status | Production status |
  |-----------------|------------------|
  | `"complete"` | `"handled"` (done today) |
  | `"due"` | `"slipping"` (at interval boundary) |
  | `"overdue"` | `"slipping"` (past interval) |
  | `"scheduled"` | `"steady"` (within window) |
  | never-completed | `"slipping"` with label "Needs first pass" |

- `sortByUrgency()` sorts by `daysUntil` ascending — tasks most behind surface first.
- `render()` groups by frequency and builds DOM from `<template>` elements — the production Tasks tab replicates this grouping but with Now / Upcoming / Can Wait / Handled sections instead of frequency groups.

## Architecture Rules

- Keep all data access behind a repository/service layer so Firestore can replace mock persistence in Phase 3 without touching UI code.
- The production build starts clean — do not extend the vanilla prototype files.
- Do not expose raw status strings (`"overdue"`, `"due"`) anywhere in production UI or logic. Only use the production status vocabulary.

## App Structure

Five-tab mobile-first layout:

| Tab | Purpose |
|-----|---------|
| Home | House Pulse card, today's 1–3 priorities, 1–3 slipping items, weekly summary |
| Tasks | Sections: Now / Upcoming / Can Wait / Handled |
| House | Zone view: Kitchen, Upstairs, Downstairs, Cats, Garage, Yard, Utility, Exterior, Bathrooms, Laundry |
| Rhythm | Workload balance and drift analytics (relationship-safe, no scoreboard) |
| Calendar | Mock for now; Google Calendar sync in Phase 5 for larger chores only |

## Language System

Never use: `failed`, `missed`, `behind`, `incomplete`, or harsh overdue phrasing.

Always prefer: `steady`, `slipping`, `needs attention`, `worth doing soon`, `can wait`, `handled recently`, `usually you`, `usually partner`, `shared rhythm`, `house pulse`.

This applies to UI copy, code comments, variable names, and status strings.

## Visual Direction

- Warm off-white background, natural green primary accent
- Soft cards, calm spacing, mobile-first
- Personality: home, cats, yard, garage — warm but not childish
- No aggressive red alert system
- Not too purple, not too sterile

## Chore Model (key fields)

- Recurrence: daily / weekly / monthly / quarterly / yearly / custom
- Flexible windows — no rigid due dates
- Status: steady / slipping (never "overdue" in production)
- Owner: me / partner / shared / rotating
- Zone: one of the 10 zones (Kitchen, Bathrooms, Upstairs, Downstairs, Cats, Laundry, Garage, Yard, Utility, Exterior)
- Fields: last completed, next suggested window, notes/standard of done, supplies, estimated time, energy level

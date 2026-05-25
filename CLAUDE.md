# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Home Rhythm — a mobile-first PWA household operating system for two adults. Not a guilt-trip chore app. The emotional target: *"The house is mostly steady. Two things are slipping. Everything else can wait."*

## Current Phase

Phase 1/2 transition — a working vanilla JS/HTML/CSS prototype exists in this folder. The next step is rebuilding as a Vite + React + TypeScript PWA using the prototype as product reference, not as the production foundation.

## What the Prototype Does

Vanilla HTML/CSS/JS single-page app with localStorage persistence (`home-rhythm-v1`). Key implemented features:

- `starterTasks` array in [app.js](app.js) defines the full chore data model (id, title, frequency, owner, zone, notes, petCare, lastCompleted)
- `dueInfo()` computes status (`complete` / `due` / `overdue` / `scheduled`) from lastCompleted + frequency interval — **this logic needs to be ported and renamed** to use `slipping` / `steady` language in the production build
- `render()` groups tasks by frequency, sorts by urgency, and builds DOM from `<template>` elements
- Load balance sidebar shows owner task counts as bars (You / Partner / Shared)
- Filter/search toolbar: frequency pills, owner dropdown, show-completed toggle
- Add chore dialog (`<dialog>` element), export to clipboard/file
- PWA: [manifest.webmanifest](manifest.webmanifest) + [service-worker.js](service-worker.js)
- Dev server: [server.js](server.js) (Node http-server), launch via [Start-Home-Rhythm.ps1](Start-Home-Rhythm.ps1)

To run the prototype locally:
```
node server.js
```
or open `Start-Home-Rhythm.ps1` / `Start-Home-Rhythm.bat`.

## Planned Stack (Production Build)

- Vite + React + TypeScript
- Firebase Hosting, Firestore, Google Auth (Phase 3+)
- PWA manifest + service worker
- Mobile-first responsive UI

## Architecture Rules

- Keep all data access behind a repository/service layer so Firestore can replace mock persistence in Phase 3 without touching UI code.
- The production build starts clean — do not extend the vanilla prototype files.

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

## Visual Direction

- Warm off-white background, natural green primary accent
- Soft cards, calm spacing, mobile-first
- Personality: home, cats, yard, garage — warm but not childish
- No aggressive red alert system
- Not too purple, not too sterile

## Chore Model (key fields)

- Recurrence: daily / weekly / monthly / quarterly / yearly / custom
- Flexible windows — no rigid due dates
- Status: steady / slipping (never "overdue" — the prototype uses `"overdue"` internally; rename to `"slipping"` in production)
- Owner: me / partner / shared / rotating
- Zone: one of the 10 zones above
- Fields: last completed, next suggested window, notes/standard of done, supplies, estimated time, energy level

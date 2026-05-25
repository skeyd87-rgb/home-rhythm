# Home Rhythm Project Brief

## Product Thesis

Home Rhythm is a private household operating system for shared home care. It is not a nagging checklist app. It should help two adults keep a two-story suburban home, garage, yard, and four-cat household feeling steady through recurring upkeep, shared visibility, drift detection, and gentle prioritization.

Emotional target:

> The house is mostly steady. Two things are slipping. Everything else can wait.

## Tone And Language

Avoid productivity-guilt language such as:

- failed
- missed
- behind
- incomplete
- harsh overdue language

Preferred language:

- steady
- slipping
- worth doing soon
- can wait
- needs attention
- handled recently
- usually you
- usually partner
- shared rhythm
- house pulse

## Visual Direction

Target feel:

> A calm household rhythm app: warm enough to feel personal, clean enough to use every day.

Design blend:

- Mostly Warm & Earthy
- Minimal & Calm information discipline
- Small Soft Modern & Playful touches

Visual qualities:

- Warm off-white background
- Natural green primary accent
- Soft cards and calm spacing
- Home, cat, yard, and garage personality
- Mobile-first
- Not too purple
- Not too sterile
- Not too childish
- No aggressive red alert system
- Task screens stay fast, clear, and tappable

## App Structure

Five-tab mobile-first PWA:

1. Home
2. Tasks
3. House
4. Rhythm
5. Calendar

### Home

- House Pulse card
- Today at a glance
- 1-3 things that matter today
- 1-3 things slipping
- Weekly summary
- Calm reassurance such as "Everything else can wait"

### Tasks

Use gentle sections:

- Now
- Upcoming
- Can Wait
- Handled

Avoid giant intimidating lists.

### House

Zone-based view:

- Kitchen
- Upstairs
- Downstairs
- Cats
- Garage
- Yard
- Utility
- Exterior
- Bathrooms
- Laundry

### Rhythm

Analytics without scorekeeping:

- What is slipping
- Which zones need attention
- Recent patterns
- Relationship-safe load balance
- Rebalance prompts

Gentle framing examples:

- Load feels balanced
- You've carried more this week
- Partner has more recurring items lately
- Want to rebalance?
- Usually you
- Usually partner

Avoid harsh scoreboards like "You 72%, Partner 28%."

### Calendar

Home Rhythm remains the source of truth. Google Calendar integration comes later and should sync only larger chores, not every small daily item.

Candidate sync items:

- Weekly bathrooms
- Weekly full-house vacuum/mop
- Monthly HVAC filter check
- Monthly deep clean litter boxes
- Monthly appliance/fridge cleanout
- Quarterly garage reset
- Quarterly rug/upholstery deep clean
- Quarterly yard cleanup
- Yearly HVAC service
- Yearly gutters
- Yearly smoke/CO detector check
- Annual garage purge

## Technical Direction

Build as a Firebase-hosted PWA first, with native iPhone and Android apps possible later using the same backend.

Likely stack:

- Vite
- React
- TypeScript
- Firebase Hosting
- Firebase Auth with Google sign-in
- Firestore database
- Optional Cloud Functions later
- Google Calendar API later for selected chores
- PWA manifest and service worker
- Mobile-first responsive UI

## Architecture Preference

The old static demo should be treated as product reference, not the production foundation.

Recommended path:

- Start clean in this project folder.
- Build a polished clickable prototype using production-friendly structure.
- Use mock/local data first.
- Keep data access behind a repository/service layer so Firestore can replace local persistence later.
- Define the chore model and language system before wiring real backend behavior.

## Core Feature List

- Daily, weekly, monthly, quarterly, yearly chores
- Custom recurrence
- Flexible windows instead of rigid due dates
- One-tap completion
- Last completed date
- Next suggested window
- Slipping status instead of harsh overdue status
- Owners: me, wife/partner, shared, rotating
- Rotating assignments
- Stable ownership
- Zones: kitchen, bathrooms, upstairs, downstairs, cats, laundry, garage, yard, utility, exterior
- Pet care category
- Seasonal maintenance
- Today view
- This week view
- Upcoming view
- Quick add chore
- Notes / standard of done
- Supplies needed
- Estimated time
- Energy level
- Snooze / skip / defer
- Completion history
- Relationship-safe workload balance
- Shared sync across phones
- Household setup/templates

## Product Behavior Principles

Home Rhythm should minimize management burden. Maintaining the app should not become another chore.

Use:

- Recurring task patterns
- Flexible windows
- Done-ish quick logging
- Household areas instead of endless microtasks
- Templates for cats, kitchen, yard, garage, upstairs, downstairs
- Soft resurfacing based on cadence

## Roadmap

### Phase 1: Product And Design Consolidation

- Review final mockups from both household users
- Choose final visual direction
- Finalize chore model and language system
- Decide exact tabs and core screens

### Phase 2: Polished Clickable Prototype

- Mobile-first five-tab app
- Sample household data
- House Pulse
- Now / Upcoming / Can Wait / Handled task sections
- House zones
- Rhythm analytics mock
- Calendar mock
- No backend yet, or local mock data only

### Phase 3: Real Firebase PWA

- Firebase project setup
- Firebase Hosting
- Google sign-in
- Firestore data model
- Shared household
- Real chore CRUD
- Completion history
- Recurrence logic
- Installable PWA

### Phase 4: Smarter Household Features

- Snooze / skip / defer
- Supplies
- Energy and time estimates
- Templates
- Zone detail screens
- Relationship-safe load balance
- Better rhythm and drift detection

### Phase 5: Google Calendar Integration

- Connect Google account
- Create or select "Home Rhythm" calendar
- Sync selected bigger chores only
- Avoid daily chore clutter
- Events link back to Home Rhythm

### Phase 6: Possible Native Apps Later

- Reuse Firebase backend
- Consider React Native, Flutter, or native iOS/Android
- Only pursue native apps for deeper notifications, widgets, or OS integrations

## Old Prototype Reference

Old workspace:

`C:\Users\KeyHo\Documents\Codex\2026-05-17\my-wife-and-i-were-talking`

Reference files:

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `icon.svg`
- `service-worker.js`
- `server.js`
- `Start-Home-Rhythm.ps1`
- `Start-Home-Rhythm.bat`

The old proof of concept included recurring chore groups, due/slipping-ish status, owner filtering, completion, add/delete chores, localStorage persistence, export, and PWA basics. It should inform the new build, but the new project should use a cleaner production-ready architecture.

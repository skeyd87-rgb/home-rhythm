# Home Rhythm Roadmap

Home Rhythm is a calm household operating system for shared home care. The roadmap below keeps the app focused on the core emotional win:

> The house is mostly steady. Two things are slipping. Everything else can wait.

The migrated vanilla JavaScript prototype in this folder is reference material only. Production work should start fresh with React, TypeScript, Vite, and Firebase-ready architecture.

## Current Implementation

The practical build order changed after the roadmap was written. A functional
static PWA now lives in `docs/` and is deployed through both GitHub Pages and
Firebase Hosting. It includes editable chores, task status selection, a weekly
calendar, data-driven House and Rhythm tabs, Settings, custom zones, Google
Sign-In, shared Firestore households, invite codes, and completion events.

The root-level prototype is still reference-only. React + TypeScript remains a
future migration option, not the current runtime. See `BACKEND.md` for the live
Firebase architecture and household onboarding flow.

## Roadmap Principles

- Build the feeling before the backend.
- Keep household care calm, shared, and low-management.
- Prefer flexible windows over rigid due dates.
- Use steady, slipping, worth doing soon, can wait, needs attention, handled recently, usually you, usually partner, shared rhythm, and house pulse.
- Avoid failed, missed, behind, incomplete, and harsh overdue language.
- Keep the app mobile-first, tappable, warm, and clean.
- Do not sync every daily chore to Google Calendar.

## Phase 0: Project Foundation

Goal: make the project safe and easy for humans, Codex, and Claude Code to work in together.

Scope:

- Initialize Git in the official project folder.
- Preserve the migrated vanilla prototype as reference-only.
- Add clear agent/project instructions.
- Decide where the new production app will live, such as `app/` or `home-rhythm/`.
- Scaffold a fresh Vite + React + TypeScript app.
- Add basic formatting and linting.
- Add a Firebase-ready folder structure without requiring Firebase yet.

Acceptance criteria:

- Git history exists.
- Prototype files remain untouched.
- New app runs locally with a clean starter screen.
- Project docs explain the reference prototype and production direction.

Suggested output:

- `ROADMAP.md`
- `AGENTS.md` or updated `CLAUDE.md`
- Fresh React app folder
- Initial commit

## Phase 1: Product And Design Consolidation

Goal: lock the product shape before building too much behavior.

Scope:

- Finalize the five-tab structure: Home, Tasks, House, Rhythm, Calendar.
- Choose the final visual direction: warm earthy, minimal calm, softly friendly.
- Finalize the language system for task status and household feedback.
- Define the first version of the chore model.
- Decide how flexible windows work.
- Decide which chores belong in Calendar later.
- Compare mockups and reference prototypes, then capture what to carry forward.

Key decisions:

- Status labels: steady, worth doing soon, slipping, can wait, handled recently.
- Ownership labels: usually you, usually partner, shared rhythm, rotating.
- Core zones: kitchen, bathrooms, upstairs, downstairs, cats, laundry, garage, yard, utility, exterior.
- Calendar sync is reserved for larger recurring home maintenance.

Acceptance criteria:

- The first version of the domain model is documented.
- Tab responsibilities are clear.
- Product language is documented and used consistently.
- Visual tokens are chosen: background, surface, green, muted accents, text, borders, spacing.

## Phase 2: Polished Clickable Prototype

Goal: build the real app experience with mock/local data before connecting Firebase.

Scope:

- Build the mobile-first five-tab shell.
- Add sample household data for two adults, four cats, and common home zones.
- Implement Home tab with House Pulse.
- Implement Tasks tab with Now, Upcoming, Can Wait, and Handled sections.
- Implement House tab with zone cards and zone detail views.
- Implement Rhythm tab with gentle analytics.
- Implement Calendar tab as a mock planning view.
- Add one-tap completion and done-ish quick logging.
- Add quick add chore flow.
- Keep persistence local or in mock repository only.

Home tab:

- House Pulse card.
- 1-3 things that matter today.
- 1-3 things slipping.
- Weekly summary.
- Calm reassurance: everything else can wait.

Tasks tab:

- Now.
- Upcoming.
- Can Wait.
- Handled.
- Filters for owner, zone, energy, and cadence.
- No intimidating giant lists.

House tab:

- Kitchen.
- Bathrooms.
- Upstairs.
- Downstairs.
- Cats.
- Laundry.
- Garage.
- Yard.
- Utility.
- Exterior.

Rhythm tab:

- What is slipping.
- Which zones need attention.
- Recent patterns.
- Gentle load balance.
- Rebalance prompt without scorekeeping.

Calendar tab:

- Larger selected chores only.
- Show what would eventually sync.
- Keep Home Rhythm as the source of truth.

Acceptance criteria:

- App feels useful without backend setup.
- All five tabs are navigable.
- Sample chores are grouped by calm status.
- Prototype uses Home Rhythm language, not productivity-guilt language.
- UI feels warm, calm, and mobile-ready.

## Phase 3: Real Firebase PWA

Goal: turn the polished prototype into a shared household app.

Scope:

- Set up Firebase project.
- Configure Firebase Hosting.
- Add Firebase Auth with Google sign-in.
- Create Firestore data model.
- Create household setup flow.
- Support shared household membership.
- Replace mock repository with Firestore-backed repository.
- Add real chore CRUD.
- Add completion history.
- Add recurrence calculation.
- Add PWA manifest and service worker for installability.

Firestore model candidates:

- `households`
- `households/{householdId}/members`
- `households/{householdId}/chores`
- `households/{householdId}/completionEvents`
- `households/{householdId}/zones`
- `households/{householdId}/settings`

Acceptance criteria:

- Two users can sign in and see the same household.
- A chore created on one phone appears on the other.
- Completing a chore records history and updates next suggested window.
- The app can be installed as a PWA.
- Firebase rules protect household data.

## Phase 4: Smarter Household Features

Goal: make the app reduce household management burden instead of adding to it.

Scope:

- Snooze, skip, and defer.
- Supplies needed.
- Estimated time.
- Energy level.
- Notes and standard of done.
- Household templates.
- Zone detail screens.
- Seasonal maintenance.
- Rotating assignments.
- Better drift detection.
- Relationship-safe load balance.

Templates:

- Cats.
- Kitchen.
- Bathrooms.
- Laundry.
- Yard.
- Garage.
- Utility.
- Upstairs.
- Downstairs.

Smarter rhythm behavior:

- Surface only a few important things.
- Prefer soft resurfacing over alarm-style reminders.
- Detect recurring zones that are slipping.
- Suggest rebalancing without blame.

Acceptance criteria:

- Users can defer without guilt.
- The app can suggest what is worth doing soon.
- Templates make setup fast.
- Rhythm view gives useful insight without scorekeeping.

## Phase 5: Google Calendar Integration

Goal: connect only the chores that benefit from calendar visibility.

Scope:

- Connect Google account.
- Create or select a Home Rhythm calendar.
- Add sync settings per chore.
- Sync selected larger chores only.
- Link calendar events back to Home Rhythm.
- Avoid daily chore clutter.

Default calendar-sync candidates:

- Weekly bathrooms.
- Weekly full-house vacuum/mop.
- Monthly HVAC filter check.
- Monthly deep clean litter boxes.
- Monthly appliance/fridge cleanout.
- Quarterly garage reset.
- Quarterly rug/upholstery deep clean.
- Quarterly yard cleanup.
- Yearly HVAC service.
- Yearly gutters.
- Yearly smoke/CO detector check.
- Annual garage purge.

Acceptance criteria:

- Daily chores are not synced by default.
- Users can choose which chores sync.
- Calendar events update when chore windows shift.
- Home Rhythm remains the source of truth.

## Phase 6: Notifications And PWA Polish

Goal: make Home Rhythm reliable enough for daily household use.

Scope:

- PWA install polish.
- Offline-friendly shell.
- Better empty states.
- Gentle notification strategy.
- Device testing on iPhone and Android.
- Accessibility review.
- Performance pass.

Notification principles:

- Use gentle nudges.
- Avoid urgency theater.
- Batch reminders when possible.
- Prefer House Pulse summaries over individual chore nagging.

Acceptance criteria:

- App is comfortable on mobile.
- Core screens work with poor connectivity.
- Text remains readable and tappable.
- Notifications feel helpful, not nagging.

## Phase 7: Possible Native Apps Later

Goal: decide whether native apps are worth the extra maintenance.

Only consider native apps if the household wants:

- Widgets.
- Deeper notifications.
- Richer OS integrations.
- Better background behavior.
- Shared shortcuts or voice assistant integrations.

Options:

- React Native.
- Flutter.
- Native iOS and Android.

Acceptance criteria:

- Firebase backend can be reused.
- PWA limitations are clearly documented.
- Native app scope is justified by real household use.

## First Build Recommendation

Start with Phase 0 and Phase 2 together:

1. Initialize Git.
2. Keep prototype files untouched.
3. Scaffold a fresh Vite + React + TypeScript app.
4. Build the five-tab mock-data prototype.
5. Verify the app on mobile viewport.
6. Commit the first polished clickable prototype.

This gives Home Rhythm a clean production path while preserving the useful ideas from the earlier prototypes.

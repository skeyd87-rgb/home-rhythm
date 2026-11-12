# Home Rhythm Backend

## Scheduling and household release (November 12, 2026)

Household sharing is the core workflow: one person creates a household and the
other joins with its invite code. Both members can see and edit every chore.
Assignments now use stable member UIDs, with Everyone / Mine / Partner / Shared
views. Legacy relative-owner labels require explicit reassignment instead of
guessing who "you" means. Take turns rotates through stable member IDs.
History records the member who actually completed each chore. Chore edits use
revision-checked transactions to reject stale concurrent changes.

The active static PWA now uses `schedule.js` for date-based recurrence and
`google-calendar.js` for explicit Google Calendar publishing. The original
root prototype is unchanged. Existing chores are preserved; legacy chores
without dates appear in "Needs a date" rather than acquiring invented history.
The browser retains a pre-scheduling backup at `home-rhythm-before-scheduling`.
Shared household caches are now separated by household ID.

- Chores support editable title, room, ownership, first date, recurrence,
  custom day/month intervals, notes, minutes, energy, and calendar opt-in.
- Completion records history and advances recurrence beyond today. Month-end
  anchors survive short months. Snooze and skip do not record completion.
- Room overrides live in `settings/general.customZones`. Hidden entries hide
  default rooms. Renaming/removing a room atomically reassigns its chores and
  saves room settings. The UI derives room names from this authoritative list.
- Completion and its Firestore event are written in one batch.
- Calendar publishing requires a signed-in, synced household plus incremental
  Google consent for `calendar.events` and `calendar.calendarlist.readonly`.
  Access tokens are memory-only; expired tokens require reconnecting.
- The user chooses a writable calendar and reviews changes before publishing.
  Only the next all-day occurrence per opted-in chore is published. Re-publish
  after schedule/completion changes; there is no background or two-way sync.
  Stable event IDs prevent duplicates. Private household tags scope cleanup
  to this app's events in the selected calendar. Other calendars are untouched.
- Google Calendar API was verified enabled in the existing Firebase project.
  Live Google consent and a signed-in two-device test still require user access.

Validation: `node --test tests/schedule.test.mjs`. Serve `docs/` locally to test
the UI. Local signed-out edits stay on the device; shared offline edits are
blocked until reconnection. Export backup is available in Household settings.

## Firebase project

- Project ID: `home-rhythm-skeyd87`
- Console: <https://console.firebase.google.com/project/home-rhythm-skeyd87/overview>
- Hosting: <https://home-rhythm-skeyd87.web.app>
- Authentication: Google Sign-In
- Database: Cloud Firestore, multi-region `nam5`

The Firebase web configuration is public client configuration and lives in
`docs/firebase-repository.js`. Access control belongs in `firestore.rules`.

## Household onboarding

1. Steven opens Settings and signs in with Google.
2. Steven creates the household. Chores and custom zones saved on that device
   are copied into Firestore.
3. Home Rhythm creates a six-character invite code.
4. Brittany signs in with Google, enters the code, and joins the household.
5. Both devices receive live updates for chores, settings, zones, and members.

Do not create a second household for Brittany. Joining the existing household
is what connects both accounts to the same data.

## Firestore layout

```text
users/{uid}
households/{householdId}
  members/{uid}
  chores/{choreId}
  completionEvents/{eventId}
  invites/{inviteCode}
  settings/general
  zones/{zoneId}
```

All household data is member-only. Invite documents can be read by signed-in
users so a code can be validated, while household content remains inaccessible
until membership is created.

## Deployment

```powershell
firebase deploy --only auth
firebase deploy --only firestore
firebase deploy --only hosting
```

GitHub Pages is also published from `docs/`. Firebase Hosting is the preferred
installed-app URL because it shares the Firebase project's default domain.

## Local development

The app continues in local household mode when signed out. Google Sign-In is
authorized for the deployed HTTPS origins; use a deployed URL for authentication
testing. Local chores remain on the device until a signed-in user creates a
household.

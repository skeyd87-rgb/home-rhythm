# Home Rhythm releases

## 1.2.0 - November 12, 2026

- Optional daily household push notifications in Settings, with separate choices
  for each person and device: delivery time, time zone, own chores, shared
  priorities, and partner completions since yesterday.
- Quiet days are skipped by default. Chore names can be hidden on the lock screen.
  Includes a test notification, device-level off switch, and sign-out cleanup.
- Background delivery uses an isolated Firebase Functions codebase and server-only
  subscription records. One daily attempt per device; expired subscriptions stop.
- iPhone Home Screen guidance, responsive settings, and form refresh protection.
- 26 automated checks pass. Simulated browser enable/save/test/disable flow and
  layout checked at 320, 390, 480, 768, and 1440 pixels. Real phone delivery still
  requires each user's permission and the Send test notification step.

## 1.1.1 - November 12, 2026

- Visible release label in the header on all screens.
- Responsive chore forms: date, repeat, owner, and custom intervals stay within
  their columns; phone forms stack fields for readable native controls.
- Narrow-screen header, room cards, and action rows accommodate small screens.
- Includes household sharing, named assignments, Everyone/Mine/Partner/Shared
  filters, completion attribution, rotating assignment, recurring schedules,
  room management, and explicit Google Calendar publishing from the preceding
  implementation session.
- Nine scheduling, assignment, and calendar tests pass. Layout checked across
  six screens at 320, 390, 480, 768, and 1440 pixels, plus chore/room dialogs.

For each release, update the version label and accessible label in
`docs/index.html` and the cache name in `docs/service-worker.js`. Verify the
deployed page displays that version. Google consent and two signed-in devices
remain live-account verification steps.

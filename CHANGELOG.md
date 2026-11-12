# Home Rhythm releases

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

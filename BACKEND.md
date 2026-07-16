# Home Rhythm Backend

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

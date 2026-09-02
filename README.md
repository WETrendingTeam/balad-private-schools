# BALAD Private Schools — Current Website

This package keeps the existing public BALAD website pages and their visual content unchanged while updating the private Control and Staff systems around the current Firebase project.

## Current Firebase
- Project ID: `projectb-wetrending-space`
- Authentication: Firebase Authentication
- Staff login: `CODE + PASSWORD`
- Internal Firebase email: `<code>@staff.balad.local`
- Firestore staff profile: `staff/{UID}`

## Roles
- `control` — full staff administration
- `management` — staff dashboard access
- `teacher` — staff dashboard + assigned classes/subjects

## Cloudflare Worker variables
Set these in the Worker environment:
- `FIREBASE_API_KEY` — the Web API key from the root `firebase-config.js`
- `FIREBASE_PROJECT_ID` — `projectb-wetrending-space`

Deploy `cloudflare-worker-production.js` as the Worker handling `/staff-admin`.

## Control UID
The existing Control user must have a Firestore document:
`staff/{UID}`
with:
- `role: "control"`
- `active: true`

## Deliberately not included yet
Students, attendance, results publishing, parent messaging, WhatsApp/SMS and other later roadmap modules are not fabricated into this release. The public result pages remain as they were.


## Control access
The private Control entry point is `control-login.html`. The dashboard itself is `control-dashboard.html`. The single private dashboard entry is `control-dashboard.html`; unauthenticated visitors are redirected to `control-login.html`.

The Control flow is: staff code + password → Firebase Authentication → `staff/{UID}` role/active check → Cloudflare `/staff-admin`.

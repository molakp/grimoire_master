<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/01553575-a66d-4ca3-9223-0bb0e7656638

## Run Locally

**Prerequisites:** Node.js


1. Install dependencies:
   `npm install`
2. Create [.env.local](.env.local) from [.env.example](.env.example)
3. Set `GEMINI_API_KEY` in [.env.local](.env.local)
4. Set all `VITE_FIREBASE_*` values in [.env.local](.env.local)
5. Run the app:
   `npm run dev`

Open `http://localhost:3000`.

## Run Locally With Firebase Emulators

1. In [.env.local](.env.local), set:
   `VITE_USE_FIREBASE_EMULATORS="true"`
2. Start emulators:
   `npm run dev:emulators`
3. In another terminal, run frontend:
   `npm run dev`

Emulators:
- Auth: `127.0.0.1:9099`
- Firestore: `127.0.0.1:8080`
- Emulator UI: `127.0.0.1:4000`

## Build And Preview

1. Build:
   `npm run build`
2. Preview:
   `npm run preview`

## Deploy To Firebase Hosting

1. Login:
   `npx firebase login`
2. Deploy Firestore rules:
   `npm run deploy:rules`
3. Deploy hosting:
   `npm run deploy:hosting`

Or run full deploy:
`npm run deploy`

## Google Auth Authorized Domains

Google sign-in requires authorized domains in Firebase Console.

Add at least:
- `localhost`
- your Firebase Hosting domain (`<project-id>.web.app` / `<project-id>.firebaseapp.com`)
- your custom domain when available

## Notes

- Firebase API key in frontend is public by design; protect data with Firestore rules.
- Keep `.env*` files out of git (already covered by [.gitignore](.gitignore)).
- `firebase-applet-config.json` is retained as migration reference only; runtime now uses env vars.

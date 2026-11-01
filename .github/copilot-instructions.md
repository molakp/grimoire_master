# Grimoire Master – Copilot instructions

Grimoire Master is a companion web app for the tabletop RPG **Dungeon World** (Italian translation). Players create and manage character sheets, roll dice, and share characters with the community. A master/admin area handles templates, admins, bans, and in-app mail.

## Repository layout

- All application code lives in `grimoire-master_code/`. Run every npm command from that folder.
- `grimoire-master_code/src/App.tsx`: central state, auth, Firestore listeners, and handlers.
- `grimoire-master_code/src/components/`: React screens (Dashboard, CharacterSheet, CharacterCreationWizard, DiceRoller, AdminCourt, ...).
- `grimoire-master_code/src/lib/gameRules.ts`: pure Dungeon World rules (modifiers, roll outcomes). Put new game logic here and unit-test it.
- `grimoire-master_code/src/types.ts`, `src/data.ts`, `src/data/templates/*.json`: types and game content.
- `grimoire-master_code/firestore.rules`: the only server-side security. There is no backend or Cloud Function.
- `grimoire-master_code/scripts/`: Firebase Admin SDK scripts (set the master claim, seed templates). Never run them in CI.

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, Firebase (Auth with Google sign-in, Firestore, Hosting), Vitest, `@firebase/rules-unit-testing`.

## Commands (from `grimoire-master_code/`)

- `npm ci`: install dependencies.
- `npm run lint`: typecheck (`tsc --noEmit`). Must pass with zero errors.
- `npm test`: unit tests (Vitest, `src/**/*.test.ts`).
- `npm run test:rules`: Firestore rules tests on the emulator (`tests/rules/`). Needs Java 21.
- `npm run build`: production build.

Before you finish a change, run `npm run lint`, `npm test`, and, if you touched `firestore.rules`, `npm run test:rules`.

## Conventions

- The user interface text is in **Italian**. Keep new UI strings in Italian; code, comments, and commit messages are in English.
- Dungeon World rules: attribute modifiers follow the DW table (1–3: −3, 4–5: −2, 6–8: −1, 9–12: 0, 13–15: +1, 16–17: +2, 18: +3), not the D&D formula. Rolls are 2d6 + modifier: 10+ success, 7–9 partial success, 6− miss. Use the helpers in `src/lib/gameRules.ts`.
- The master role is the Firebase Auth custom claim `master: true`. Never hardcode emails or user IDs to grant privileges. Admins are documents in `admins/{email}`; banned users are in `banned_users/{email}`.
- Any change to the data model must be reflected in `firestore.rules` (validation functions) and covered by a test in `tests/rules/firestore.rules.test.ts`.
- Keep Firestore reads low: the project runs on the free Spark plan (50,000 reads/day). Avoid unbounded listeners and queries without `limit()`.
- Never commit secrets, service account keys, or `.env.local`.
- Translated Dungeon World content is licensed CC BY-SA 4.0. Keep attribution intact.

## Bug fixes

When fixing a bug, first add a failing test that reproduces it (unit test or rules test), then fix it. Keep changes small and focused on the issue.

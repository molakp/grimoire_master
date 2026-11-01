# Contributing to Grimoire Master

Thanks for helping! This guide explains how to set up the project and what a good pull request looks like.

## Ways to contribute

- Report bugs or suggest features with the [issue templates](https://github.com/molakp/grimoire_master/issues/new/choose).
- Fix an open issue. Issues labeled `good first issue` are a good place to start.
- Improve translations, game content, or documentation.

## Development setup

The app lives in `grimoire-master_code/`. You need Node.js 22, and Java 21 to run the Firestore emulator.

```bash
cd grimoire-master_code
npm ci
cp .env.example .env.local   # add your own Firebase web config, or use the emulators
npm run dev
```

To work without a Firebase project, set `VITE_USE_FIREBASE_EMULATORS="true"` in `.env.local` and run `npm run dev:emulators` in a second terminal. See the [README](grimoire-master_code/README.md) for details.

## Before you open a pull request

Run these commands from `grimoire-master_code/`:

```bash
npm run lint         # must pass with zero errors
npm test             # unit tests
npm run test:rules   # required if you changed firestore.rules or the data model
npm run build
```

CI runs the same checks on every pull request.

## Guidelines

- Keep pull requests small and focused on one change. Link the issue they fix (`Fixes #123`).
- When you fix a bug, add a test that fails without the fix.
- UI text is in **Italian**. Code, comments, and commit messages are in English.
- Put game logic in `src/lib/` as pure functions with unit tests. Follow the Dungeon World rules (see `src/lib/gameRules.ts`).
- Any change to Firestore data must update `firestore.rules` and `tests/rules/firestore.rules.test.ts`.
- The project runs on the Firebase free plan. Avoid code that reads many documents or keeps unbounded listeners open.
- Never commit secrets, service account keys, or `.env.local` files.

## Application code license

Original application code is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE). By submitting original code, you agree that it may be distributed under that license; you retain copyright in your contribution. This does not grant the project maintainer commercial or relicensing rights to your contribution. A paid product incorporating code you contributed would require a separate written agreement with you.

The PR template asks contributors to confirm this when submitting code changes. Do not submit code or other material unless you have the right to license it on these terms.

## Content license

Dungeon World game text is derived from the [dungeonworld-ita](https://github.com/kernelpanic92/dungeonworld-ita) translation and is licensed under CC BY-SA 4.0. By contributing game content, you agree that it is shared under the same license.

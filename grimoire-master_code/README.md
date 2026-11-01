# Grimoire Master

Grimoire Master is a browser-based companion for **Dungeon World** campaigns. It provides a themed character archive, a guided character creator, editable character sheets, spell preparation, and dice rolling. Google sign-in and Firebase can be enabled to sync characters and use the shared community and administrator features.

The interface combines Italian and English text and uses a dark, fantasy-inspired visual theme.

## What the app does

### Character archive and creation

- **My Heroes** stores and opens your character sheets. Create characters from a four-step wizard, import a template into your own archive, or delete a character after confirming its name.
- The wizard starts from a class template and collects the character's name and appearance, race and alignment, and attribute assignments. It then builds a level-one character using the template's starting stats and equipment. Wizard drafts can be saved in the browser.
- **Library** lets you search class templates and browse shared character entries. Search, class, level, and rating controls are available for the community list.
- Character templates come from Firestore when configured, with built-in templates in `src/data.ts` as a fallback. Administrators can add and remove official templates.

### Character sheets and play aids

Character sheets organize play information into **Stats**, **Spells**, **Moves**, **Gear**, and **Lore**:

- Track attributes, vitality, experience, level, armor, and damage die.
- Record bonds, character appearance, race, alignment, and campaign notes.
- Review class moves and manage carried gear and its weight.
- Prepare spells from the selected template's spell list, or the built-in list when a template has no spell list.
- Publish a character to the community board when signed in.

The floating dice roller supports Dungeon World-style **2d6 + modifier** action rolls, including a preset modifier from a selected character stat. Results are classified as success (10+), mixed (7–9), or miss (6 or less). It also rolls a selected damage die (D4, D6, D8, D10, D12, or D20). Roll history is held in the current app session and can be cleared.

### Accounts, community, and administration

- **Google sign-in** enables a personal Firebase-backed character collection. Without signing in, characters are stored in the browser's `localStorage` and are not available on other devices.
- Signed-in users can publish characters to the shared board and manage their own published entries. Community entries can also be moderated by an administrator.
- The in-app mailbox displays promotion and warning messages and marks messages read when opened.
- The **Court** administration area is shown to the master administrator. It supports user and administrator lists, administrator promotion and removal, user bans and unbans, and warning messages.
- Authorized administrators can manage official character templates from the library.

## Technology

- **React 19** with **TypeScript**
- **Vite 6** for local development and production builds
- **Tailwind CSS 4** for styling
- **Firebase 12**: Google Authentication and Cloud Firestore
- **Lucide React** icons and **Motion** animations
- **Vitest** for unit tests and **@firebase/rules-unit-testing** with the Firestore emulator for security rules tests
- **GitHub Actions** for CI, preview deploys, and production deploys to Firebase

The `@google/genai` package is present in the dependency list, but the current application source does not call Gemini. A Gemini API key is therefore not needed to run the features described here.

## Project layout

```text
src/
  App.tsx                    App state, authentication, and Firebase synchronization
  data.ts                    Built-in character templates and game data
  firebase.ts                Firebase initialization and authentication helpers
  types.ts                   Character, template, spell, and account data types
  lib/gameRules.ts           Dungeon World rules: attribute modifiers, roll outcomes, dice
  hooks/useTemplates.ts      Template loading and local fallback
  components/
    Dashboard.tsx            Character archive, library, mailbox, and admin entry points
    CharacterCreationWizard.tsx
    CharacterSheet.tsx       Character tabs and editing
    Spellbook.tsx
    DiceRoller.tsx
    AdminCourt.tsx
    NotificationSystem.tsx
    Atmosphere.tsx
scripts/                     Firebase Admin SDK scripts (master claim, template seeding)
tests/rules/                 Firestore security rules tests
firestore.rules              Firestore access control and document validation
firebase.json                Firebase Hosting, Firestore, and emulator configuration
```

## Requirements

- Node.js 22 and npm
- Java 21 or later, only to run the Firestore emulator (`npm run dev:emulators`, `npm run test:rules`)
- A Firebase project configured for **Google Authentication** and **Cloud Firestore**

## Run locally

From this directory (`grimoire-master_code`):

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` and supply the Firebase web app configuration. These variables are required by the app:

```dotenv
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_FIRESTORE_DB_ID=
```

`VITE_FIREBASE_FIRESTORE_DB_ID` must identify the Firestore database used by the app and match the database configured in `firebase.json`. Firebase web configuration values are used by the client; Firestore rules, not secrecy of the API key, must protect data.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Google sign-in also requires `localhost` (and each deployed domain) to be listed as an authorized domain in the Firebase Authentication settings.

### Use Firebase emulators

Set the following in `.env.local`:

```dotenv
VITE_USE_FIREBASE_EMULATORS="true"
```

Start the Auth and Firestore emulators in one terminal:

```bash
npm run dev:emulators
```

Then start the app in another terminal with `npm run dev`. The configured endpoints are:

| Service | Address |
| --- | --- |
| Authentication | `127.0.0.1:9099` |
| Firestore | `127.0.0.1:8080` |
| Emulator UI | `127.0.0.1:4000` |

The emulator connection is enabled only during Vite development.

## Build, check, and test

```bash
npm run lint         # TypeScript check (tsc --noEmit)
npm test             # Unit tests (Vitest, src/**/*.test.ts)
npm run test:rules   # Firestore rules tests; starts the Firestore emulator (needs Java)
npm run build        # Production build into dist/
npm run preview      # Preview the production build locally
```

Rules tests run against a local emulator with the `demo-grimoire` project ID, so they never touch production data.

## Continuous integration and deployment

GitHub Actions workflows live in the repository root, in `.github/workflows/`:

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `ci.yml` | Pull requests and pushes to `main` | Typecheck, unit tests, rules tests, and build. For pull requests from branches of this repository, it also deploys a Firebase Hosting preview channel (expires after 7 days) and comments the URL on the PR. |
| `deploy.yml` | Pushes to `main` and manual runs | Runs all checks, builds, and deploys the Firestore rules and Firebase Hosting to production. |
| `codeql.yml` | Pull requests, pushes to `main`, and weekly | CodeQL security analysis. |
| `copilot-setup-steps.yml` | Used by the Copilot coding agent | Installs Node.js, Java, and dependencies before Copilot works on an issue. |

Dependabot (`.github/dependabot.yml`) opens weekly update PRs for npm packages and GitHub Actions.

### One-time GitHub setup

1. In Google Cloud, create a service account for the Firebase project with the **Firebase Hosting Admin** and **Firebase Rules Admin** roles. Create a JSON key for it.
2. In the GitHub repository, open **Settings → Secrets and variables → Actions**:
   - Add the secret `FIREBASE_SERVICE_ACCOUNT` with the full content of the JSON key. Then delete the key file from your computer.
   - Add these variables (the same values as `.env.local`; they are public web configuration): `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_FIRESTORE_DB_ID`.
3. Optional: in **Settings → Environments → production**, add required reviewers to approve each production deploy.
4. Protect the `main` branch and require the **Typecheck, tests, and build** check to pass before merging.

Preview channels use the production Firestore database and Authentication. To sign in on a preview URL, add the `*.web.app` preview domain to the authorized domains in Firebase Authentication.

### Manual deploy

You can still deploy from your computer with the Firebase CLI:

```bash
npx firebase login
npm run deploy
```

`npm run deploy` builds the app and deploys the Firestore rules and Firebase Hosting. To deploy only one part:

```bash
npm run deploy:rules
npm run deploy:hosting
```

Firebase Hosting serves `dist/` and rewrites routes to `index.html`.

## Firebase data and access

The client uses these Firestore collections:

| Collection | Purpose |
| --- | --- |
| `characters` | Signed-in users' character sheets, scoped to the owner's Firebase UID |
| `templates` | Base class templates |
| `official_templates` | Administrator-managed templates |
| `community_characters` | Shared character entries |
| `users` | Signed-in user profiles |
| `admins` | Administrator records |
| `banned_users` | Ban records |
| `mails` | In-app promotion and warning messages |

`firestore.rules` denies access by default, validates document fields, and applies ownership and role checks. Review and deploy the rules alongside the app when changing Firebase behavior, and cover every change with a test in `tests/rules/`.

### Roles

- **Master administrator**: any user whose Firebase Auth token has the custom claim `master: true`. No email is hardcoded in the code or rules.
- **Administrators**: users with a document in `admins/{email}`, managed by the master from the Court area.
- **Banned users**: users with a document in `banned_users/{email}`.

Set or revoke the master claim with the Firebase Admin SDK script. It needs a service account key that is never committed:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
npm run admin:set-master -- you@example.com            # grant
npm run admin:set-master -- you@example.com --revoke   # revoke
```

The script reads `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_FIRESTORE_DB_ID` from `.env.local`. The user must sign out and sign in again for the new claim to take effect.

> **Before deploying these rules for the first time**, grant the master claim to your account. Otherwise no one has master access after the deploy.

`npm run seed:templates` uploads the base class templates in `src/data/templates/` to the `templates` collection with the same credentials.

Character sheets created while signed out and wizard drafts are browser-local. On sign-in, the app attempts to copy local characters to Firestore if that account has no cloud characters yet. If cloud characters already exist, the app does not merge the local list; keep using the original browser to access those local characters.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](../CONTRIBUTING.md) before opening a pull request. Use the issue templates to report bugs or request features.

## Credits and license

- **Dungeon World** is by Sage LaTorra and Adam Koebel.
- The Italian game text (moves, classes, spells, and templates in `src/data.ts` and `src/data/templates/`) is based on the [dungeonworld-ita](https://github.com/kernelpanic92/dungeonworld-ita) translation, licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). That content stays under CC BY-SA 4.0, and changes to it must be shared under the same license.
- Original Grimoire Master application code authored by Silvestro Stefano Frisullo is licensed under the [PolyForm Noncommercial License 1.0.0](../LICENSE). It permits noncommercial use; commercial rights are reserved to the copyright holder. This is a source-available license, not an OSI-approved open-source license.
- Contributions from other authors do not automatically grant the project maintainer commercial or relicensing rights. A paid product that includes third-party code contributions requires separate written permission from those contributors.

Grimoire Master is a fan project and is not affiliated with the authors or publishers of Dungeon World.

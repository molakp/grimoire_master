// Security tests for firestore.rules. Run with `npm run test:rules` (starts the Firestore emulator).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

const ALICE = { uid: 'alice', email: 'alice@example.com' };
const BOB = { uid: 'bob', email: 'bob@example.com' };
const MASTER = { uid: 'master', email: 'master@example.com' };
const ADMIN = { uid: 'admin', email: 'admin@example.com' };
const BANNED = { uid: 'banned', email: 'banned@example.com' };

const asUser = (user: { uid: string; email: string }, claims: Record<string, unknown> = {}) =>
  testEnv.authenticatedContext(user.uid, { email: user.email, ...claims }).firestore();
const asMaster = () => asUser(MASTER, { master: true });
const asGuest = () => testEnv.unauthenticatedContext().firestore();

const character = (id: string, ownerId: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: 'Thalric',
  level: 1,
  class: 'Il Mago',
  experience: 0,
  avatar: '',
  attributes: { INT: 16, FOR: 8, DES: 12, COS: 13, SAG: 15, CAR: 9 },
  vitality: { max: 16, current: 16 },
  armor: 1,
  damageDie: 'D4',
  race: 'ELFO',
  alignment: 'NEUTRALE',
  maxWeight: 8,
  ownerId,
  ...overrides,
});

const mail = (id: string, recipientEmail: string, senderEmail: string) => ({
  id,
  recipientEmail,
  subject: 'Subject',
  content: 'Content',
  senderEmail,
  type: 'warning',
  read: false,
  createdAt: new Date().toISOString(),
});

const communityCharacter = (id: string, authorEmail: string) => ({
  id,
  name: 'Thalric',
  class: 'Il Mago',
  level: 1,
  author: 'alice',
  authorEmail,
  rating: 5,
  description: 'A wizard',
  avatar: '',
  characterData: character('c1', ALICE.uid),
});

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-grimoire',
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8') },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'characters/alice_char'), character('alice_char', ALICE.uid));
    await setDoc(doc(db, 'admins', ADMIN.email), {
      email: ADMIN.email, role: 'admin', promotedBy: MASTER.email, createdAt: '2026-01-01',
    });
    await setDoc(doc(db, 'banned_users', BANNED.email), {
      email: BANNED.email, bannedBy: MASTER.email, reason: 'spam', createdAt: '2026-01-01',
    });
    await setDoc(doc(db, 'mails/m1'), mail('m1', ALICE.email, MASTER.email));
    await setDoc(doc(db, 'templates/t_wizard'), { id: 't_wizard', name: 'Wizard' });
  });
});

describe('characters', () => {
  it('lets the owner create, read, update, and delete their character', async () => {
    const db = asUser(ALICE);
    await assertSucceeds(setDoc(doc(db, 'characters/new_char'), character('new_char', ALICE.uid)));
    await assertSucceeds(getDoc(doc(db, 'characters/alice_char')));
    await assertSucceeds(updateDoc(doc(db, 'characters/alice_char'), { level: 2 }));
    await assertSucceeds(deleteDoc(doc(db, 'characters/alice_char')));
  });

  it('hides characters from other users and guests', async () => {
    await assertFails(getDoc(doc(asUser(BOB), 'characters/alice_char')));
    await assertFails(getDoc(doc(asGuest(), 'characters/alice_char')));
  });

  it('prevents creating characters for someone else', async () => {
    await assertFails(setDoc(doc(asUser(BOB), 'characters/fake'), character('fake', ALICE.uid)));
  });

  it('prevents transferring ownership', async () => {
    await assertFails(updateDoc(doc(asUser(ALICE), 'characters/alice_char'), { ownerId: BOB.uid }));
  });

  it('rejects invalid character data', async () => {
    const db = asUser(ALICE);
    await assertFails(setDoc(doc(db, 'characters/bad_level'), character('bad_level', ALICE.uid, { level: 0 })));
    await assertFails(
      setDoc(doc(db, 'characters/bad_attr'), character('bad_attr', ALICE.uid, {
        attributes: { INT: 99, FOR: 8, DES: 12, COS: 13, SAG: 15, CAR: 9 },
      })),
    );
  });

  it('blocks banned users', async () => {
    await assertFails(setDoc(doc(asUser(BANNED), 'characters/b'), character('b', BANNED.uid)));
  });
});

describe('master role (custom claim)', () => {
  it('allows the master to manage admins and bans', async () => {
    const db = asMaster();
    await assertSucceeds(setDoc(doc(db, 'admins', BOB.email), {
      email: BOB.email, role: 'admin', promotedBy: MASTER.email, createdAt: '2026-01-01',
    }));
    await assertSucceeds(deleteDoc(doc(db, 'banned_users', BANNED.email)));
  });

  it('does not grant master rights based on email alone', async () => {
    await assertFails(setDoc(doc(asUser(MASTER), 'admins', BOB.email), {
      email: BOB.email, role: 'admin', promotedBy: MASTER.email, createdAt: '2026-01-01',
    }));
  });

  it('prevents regular users and admins from managing admins', async () => {
    const payload = { email: BOB.email, role: 'admin', promotedBy: BOB.email, createdAt: '2026-01-01' };
    await assertFails(setDoc(doc(asUser(BOB), 'admins', BOB.email), payload));
    await assertFails(setDoc(doc(asUser(ADMIN), 'admins', BOB.email), payload));
  });

  it('lets only the master read the user directory', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE.uid), { uid: ALICE.uid, email: ALICE.email });
    });
    await assertSucceeds(getDoc(doc(asMaster(), 'users', ALICE.uid)));
    await assertSucceeds(getDoc(doc(asUser(ALICE), 'users', ALICE.uid)));
    await assertFails(getDoc(doc(asUser(BOB), 'users', ALICE.uid)));
  });
});

describe('templates', () => {
  it('allows public read of base templates but restricts writes to admins', async () => {
    await assertSucceeds(getDoc(doc(asGuest(), 'templates/t_wizard')));
    await assertFails(setDoc(doc(asUser(BOB), 'templates/t_x'), { id: 't_x' }));
    await assertSucceeds(setDoc(doc(asUser(ADMIN), 'templates/t_x'), { id: 't_x' }));
  });

  it('allows admins (but not regular users) to write official templates', async () => {
    const template = {
      id: 't_new', name: 'New', class: 'Il Mago', type: 'Arcane Class',
      description: '', icon: 'swords', avatar: '', defaultStats: character('x', ADMIN.uid),
    };
    await assertSucceeds(setDoc(doc(asUser(ADMIN), 'official_templates/t_new'), template));
    await assertFails(setDoc(doc(asUser(BOB), 'official_templates/t_new'), template));
  });
});

describe('community characters', () => {
  it('allows publishing only under your own email', async () => {
    await assertSucceeds(setDoc(doc(asUser(ALICE), 'community_characters/comm_1'), communityCharacter('comm_1', ALICE.email)));
    await assertFails(setDoc(doc(asUser(BOB), 'community_characters/comm_2'), communityCharacter('comm_2', ALICE.email)));
  });

  it('lets the author or an admin delete an entry, but not other users', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'community_characters/comm_1'), communityCharacter('comm_1', ALICE.email));
      await setDoc(doc(ctx.firestore(), 'community_characters/comm_2'), communityCharacter('comm_2', ALICE.email));
    });
    await assertFails(deleteDoc(doc(asUser(BOB), 'community_characters/comm_1')));
    await assertSucceeds(deleteDoc(doc(asUser(ALICE), 'community_characters/comm_1')));
    await assertSucceeds(deleteDoc(doc(asUser(ADMIN), 'community_characters/comm_2')));
  });
});

describe('mails', () => {
  it('lets only the recipient (or master) read a mail', async () => {
    await assertSucceeds(getDoc(doc(asUser(ALICE), 'mails/m1')));
    await assertSucceeds(getDoc(doc(asMaster(), 'mails/m1')));
    await assertFails(getDoc(doc(asUser(BOB), 'mails/m1')));
  });

  it('prevents users from impersonating another sender', async () => {
    await assertFails(setDoc(doc(asUser(BOB), 'mails/m2'), mail('m2', ALICE.email, MASTER.email)));
    await assertSucceeds(setDoc(doc(asMaster(), 'mails/m3'), mail('m3', ALICE.email, MASTER.email)));
  });
});

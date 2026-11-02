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
import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';

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

const party = (id: string, gmUid: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: 'La Spedizione',
  gmUid,
  gmDisplayName: 'Master',
  objective: 'Recuperare il sigillo',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const partyInvitation = (
  id: string,
  partyId: string,
  recipientEmail: string,
  senderUid: string,
  senderEmail: string,
  recipientUid?: string,
) => ({
  id,
  partyId,
  partyName: 'La Spedizione',
  recipientEmail,
  ...(recipientUid ? { recipientUid } : {}),
  senderUid,
  senderEmail,
  status: 'pending',
  createdAt: new Date().toISOString(),
});

const partyCharacterSnapshot = (characterId: string, ownerUid: string) => ({
  characterId,
  ownerUid,
  name: 'Thalric',
  class: 'Il Mago',
  level: 1,
  avatar: '',
  attributes: { INT: 16, FOR: 8, DES: 12, COS: 13, SAG: 15, CAR: 9 },
  vitality: { max: 16, current: 16 },
  armor: 1,
  damageDie: 'D4',
  gear: [{ name: 'Daga', weight: 1 }],
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

describe('parties', () => {
  it('lets the game master create and read their party', async () => {
    const db = asUser(ALICE);
    await assertSucceeds(setDoc(doc(db, 'parties/p1'), party('p1', ALICE.uid)));
    await assertSucceeds(getDoc(doc(db, 'parties/p1')));
  });

  it('lets party members read a party but hides it from other users', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'parties/p1'), party('p1', ALICE.uid));
      await setDoc(doc(db, 'parties/p1/members/bob'), {
        uid: BOB.uid,
        role: 'player',
        status: 'active',
        joinedAt: new Date().toISOString(),
      });
    });

    await assertSucceeds(getDoc(doc(asUser(BOB), 'parties/p1')));
    await assertFails(getDoc(doc(asUser(MASTER), 'parties/p1')));
    await assertFails(getDoc(doc(asGuest(), 'parties/p1')));
  });

  it('rejects invalid party data and prevents changing its game master', async () => {
    await assertFails(setDoc(doc(asUser(ALICE), 'parties/invalid'), party('invalid', ALICE.uid, { name: '' })));
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'parties/p1'), party('p1', ALICE.uid));
    });

    await assertFails(updateDoc(doc(asUser(ALICE), 'parties/p1'), { gmUid: BOB.uid }));
    await assertFails(setDoc(doc(asUser(BOB), 'parties/p2'), party('p2', ALICE.uid)));
  });

  it('lets only the game master pause and delete their campaign', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'parties/p1'), party('p1', ALICE.uid));
    });

    await assertFails(updateDoc(doc(asUser(BOB), 'parties/p1'), { status: 'paused' }));
    await assertSucceeds(updateDoc(doc(asUser(ALICE), 'parties/p1'), { status: 'paused' }));
    await assertFails(deleteDoc(doc(asUser(BOB), 'parties/p1')));
    await assertSucceeds(deleteDoc(doc(asUser(ALICE), 'parties/p1')));
  });

});

describe('party invitations', () => {
  it('lets the game master create an invitation and deliver it through the recipient mailbox', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'parties/p1'), party('p1', ALICE.uid));
    });

    const invitation = partyInvitation('invite1', 'p1', BOB.email, ALICE.uid, ALICE.email);
    await assertSucceeds(setDoc(doc(asUser(ALICE), 'party_invitations/invite1'), invitation));
    await assertSucceeds(setDoc(doc(asUser(ALICE), 'mails/invite_mail'), {
      ...mail('invite_mail', BOB.email, ALICE.email),
      type: 'party_invitation',
      partyId: 'p1',
      partyInvitationId: 'invite1',
    }));

    await assertSucceeds(getDoc(doc(asUser(BOB), 'party_invitations/invite1')));
    await assertFails(getDoc(doc(asUser(MASTER), 'party_invitations/invite1')));
    await assertSucceeds(getDoc(doc(asUser(BOB), 'mails/invite_mail')));
    await assertFails(getDoc(doc(asUser(ALICE), 'mails/invite_mail')));
  });

  it('delivers handle invitations to the recipient UID and permits an atomic response', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'parties/p1'), party('p1', ALICE.uid));
    });

    const invitation = partyInvitation('invite_uid', 'p1', '', ALICE.uid, ALICE.email, BOB.uid);
    const mailData = {
      ...mail('mail_uid', '', ALICE.email),
      recipientUid: BOB.uid,
      type: 'party_invitation',
      partyId: 'p1',
      partyInvitationId: 'invite_uid',
    };
    const senderDb = asUser(ALICE);
    const sendBatch = writeBatch(senderDb);
    sendBatch.set(doc(senderDb, 'party_invitations/invite_uid'), invitation);
    sendBatch.set(doc(senderDb, 'mails/mail_uid'), mailData);
    await assertSucceeds(sendBatch.commit());

    const recipientDb = asUser(BOB);
    await assertSucceeds(getDoc(doc(recipientDb, 'party_invitations/invite_uid')));
    await assertSucceeds(getDoc(doc(recipientDb, 'mails/mail_uid')));
    await assertSucceeds(getDocs(query(
      collection(recipientDb, 'mails'),
      where('recipientUid', '==', BOB.uid),
    )));
    await assertFails(getDoc(doc(asUser(MASTER), 'mails/mail_uid')));
    await assertFails(updateDoc(doc(recipientDb, 'party_invitations/invite_uid'), {
      recipientUid: MASTER.uid,
      status: 'declined',
      respondedAt: new Date().toISOString(),
    }));

    const responseBatch = writeBatch(recipientDb);
    responseBatch.update(doc(recipientDb, 'party_invitations/invite_uid'), {
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });
    responseBatch.update(doc(recipientDb, 'mails/mail_uid'), { read: true });
    responseBatch.set(doc(recipientDb, 'parties/p1/members/bob'), {
      uid: BOB.uid,
      role: 'player',
      status: 'active',
      displayName: 'Bob',
      invitationId: 'invite_uid',
      joinedAt: new Date().toISOString(),
    });
    responseBatch.set(doc(recipientDb, 'users/bob/partyMemberships/p1'), {
      partyId: 'p1',
      role: 'player',
      invitationId: 'invite_uid',
      joinedAt: new Date().toISOString(),
    });
    await assertSucceeds(responseBatch.commit());
  });

  it('accepts an invitation only when the matching party membership is created atomically', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'parties/p1'), party('p1', ALICE.uid));
      await setDoc(doc(db, 'party_invitations/invite1'), partyInvitation('invite1', 'p1', BOB.email, ALICE.uid, ALICE.email));
    });

    const db = asUser(BOB);
    const batch = writeBatch(db);
    batch.update(doc(db, 'party_invitations/invite1'), {
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    });
    batch.set(doc(db, 'parties/p1/members/bob'), {
      uid: BOB.uid,
      role: 'player',
      status: 'active',
      displayName: 'Bob',
      invitationId: 'invite1',
      joinedAt: new Date().toISOString(),
    });
    batch.set(doc(db, 'users/bob/partyMemberships/p1'), {
      partyId: 'p1',
      role: 'player',
      invitationId: 'invite1',
      joinedAt: new Date().toISOString(),
    });
    await assertSucceeds(batch.commit());
    await assertSucceeds(getDoc(doc(db, 'parties/p1')));
  });
});

describe('party character sharing and private notes', () => {
  it('lets the game master remove a player and atomically unlink their character', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'parties/p1'), party('p1', ALICE.uid));
      await setDoc(doc(db, 'parties/p1/members/bob'), {
        uid: BOB.uid,
        role: 'player',
        status: 'active',
        displayName: 'Bob',
        characterId: 'bob_char',
        invitationId: 'invite1',
        joinedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'parties/p1/roster/bob_char'), partyCharacterSnapshot('bob_char', BOB.uid));
      await setDoc(doc(db, 'users/bob/partyMemberships/p1'), {
        partyId: 'p1', role: 'player', invitationId: 'invite1', joinedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'characters/bob_char'), character('bob_char', BOB.uid, { partyId: 'p1' }));
    });

    const db = asUser(ALICE);
    const removal = writeBatch(db);
    removal.update(doc(db, 'characters/bob_char'), { partyId: deleteField() });
    removal.delete(doc(db, 'parties/p1/members/bob'));
    removal.delete(doc(db, 'parties/p1/roster/bob_char'));
    removal.delete(doc(db, 'users/bob/partyMemberships/p1'));
    await assertSucceeds(removal.commit());
    await assertFails(getDoc(doc(asUser(BOB), 'parties/p1')));
    const membership = await getDoc(doc(asUser(BOB), 'users/bob/partyMemberships/p1'));
    if (membership.exists()) throw new Error('Removed player still has a campaign membership.');
  });

  it('shares only the roster projection with party members and keeps master notes private', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'parties/p1'), party('p1', ALICE.uid));
      await setDoc(doc(db, 'parties/p1/members/bob'), {
        uid: BOB.uid,
        role: 'player',
        status: 'active',
        displayName: 'Bob',
        characterId: 'bob_char',
        invitationId: 'invite1',
        joinedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'characters/bob_char'), character('bob_char', BOB.uid, { partyId: 'p1' }));
      await setDoc(doc(db, 'parties/p1/roster/bob_char'), partyCharacterSnapshot('bob_char', BOB.uid));
      await setDoc(doc(db, 'parties/p1/gm_notes/n1'), {
        id: 'n1', title: 'Segreto', content: 'Solo per il master', updatedAt: new Date().toISOString(),
      });
    });

    await assertSucceeds(getDoc(doc(asUser(BOB), 'parties/p1/roster/bob_char')));
    await assertSucceeds(getDoc(doc(asUser(ALICE), 'parties/p1/roster/bob_char')));
    await assertFails(getDoc(doc(asUser(ADMIN), 'parties/p1/roster/bob_char')));
    await assertFails(getDoc(doc(asUser(ALICE), 'characters/bob_char')));
    await assertSucceeds(getDoc(doc(asUser(ALICE), 'parties/p1/gm_notes/n1')));
    await assertFails(getDoc(doc(asUser(BOB), 'parties/p1/gm_notes/n1')));
  });

  it('prevents binding one character to a second campaign', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'parties/p1'), party('p1', ALICE.uid));
      await setDoc(doc(db, 'parties/p2'), party('p2', ALICE.uid));
      await setDoc(doc(db, 'parties/p1/members/bob'), {
        uid: BOB.uid, role: 'player', status: 'active', displayName: 'Bob',
        characterId: 'bob_char', invitationId: 'invite1', joinedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'parties/p2/members/bob'), {
        uid: BOB.uid, role: 'player', status: 'active', displayName: 'Bob',
        invitationId: 'invite2', joinedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'characters/bob_char'), character('bob_char', BOB.uid, { partyId: 'p1' }));
      await setDoc(doc(db, 'parties/p1/roster/bob_char'), partyCharacterSnapshot('bob_char', BOB.uid));
    });

    const db = asUser(BOB);
    const batch = writeBatch(db);
    batch.update(doc(db, 'characters/bob_char'), { partyId: 'p2' });
    batch.update(doc(db, 'parties/p2/members/bob'), { characterId: 'bob_char' });
    batch.set(doc(db, 'parties/p2/roster/bob_char'), partyCharacterSnapshot('bob_char', BOB.uid));
    await assertFails(batch.commit());
  });

  it('lets a player link their own character and publish only its roster projection atomically', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'parties/p1'), party('p1', ALICE.uid));
      await setDoc(doc(db, 'parties/p1/members/bob'), {
        uid: BOB.uid,
        role: 'player',
        status: 'active',
        displayName: 'Bob',
        invitationId: 'invite1',
        joinedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'characters/bob_char'), character('bob_char', BOB.uid));
    });

    const db = asUser(BOB);
    const batch = writeBatch(db);
    batch.update(doc(db, 'parties/p1/members/bob'), { characterId: 'bob_char' });
    batch.update(doc(db, 'characters/bob_char'), { partyId: 'p1' });
    batch.set(doc(db, 'parties/p1/roster/bob_char'), partyCharacterSnapshot('bob_char', BOB.uid));
    await assertSucceeds(batch.commit());
    await assertSucceeds(getDoc(doc(asUser(ALICE), 'parties/p1/roster/bob_char')));
    await assertFails(getDoc(doc(asUser(ALICE), 'characters/bob_char')));
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

describe('public handles', () => {
  it('allows an owner to claim a unique handle atomically without publishing their email', async () => {
    const db = asUser(ALICE);
    const batch = writeBatch(db);
    batch.set(doc(db, 'users/alice'), {
      uid: ALICE.uid,
      email: ALICE.email,
      handle: 'alice_rpg',
    });
    batch.set(doc(db, 'public_handles/alice_rpg'), {
      uid: ALICE.uid,
      handle: 'alice_rpg',
      displayName: 'Alice',
      photoURL: '',
      updatedAt: new Date().toISOString(),
    });
    await assertSucceeds(batch.commit());
    await assertSucceeds(getDoc(doc(asUser(BOB), 'public_handles/alice_rpg')));
    await assertFails(getDoc(doc(asUser(BOB), 'users/alice')));

    const bobDb = asUser(BOB);
    await assertSucceeds(setDoc(doc(bobDb, 'users/bob'), { uid: BOB.uid, email: BOB.email }));
    const conflictingClaim = writeBatch(bobDb);
    conflictingClaim.update(doc(bobDb, 'users/bob'), { handle: 'alice_rpg' });
    conflictingClaim.set(doc(bobDb, 'public_handles/alice_rpg'), {
      uid: BOB.uid,
      handle: 'alice_rpg',
      displayName: 'Bob',
      photoURL: '',
      updatedAt: new Date().toISOString(),
    });
    await assertFails(conflictingClaim.commit());
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

  it('lets a campaign master send a deletion notice to a party member', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'parties/p1'), party('p1', ALICE.uid));
    });

    await assertSucceeds(setDoc(doc(asUser(ALICE), 'mails/campaign_deleted'), {
      id: 'campaign_deleted',
      recipientEmail: '',
      recipientUid: BOB.uid,
      subject: 'La campagna è stata cancellata',
      content: 'Il master ha cancellato la campagna.',
      senderEmail: ALICE.email,
      type: 'party_deleted',
      partyId: 'p1',
      read: false,
      createdAt: new Date().toISOString(),
    }));
    await assertSucceeds(getDoc(doc(asUser(BOB), 'mails/campaign_deleted')));
    await assertFails(getDoc(doc(asUser(ALICE), 'mails/campaign_deleted')));
    await assertFails(setDoc(doc(asUser(BOB), 'mails/fake_campaign_deleted'), {
      id: 'fake_campaign_deleted',
      recipientEmail: '',
      recipientUid: ALICE.uid,
      subject: 'Falso avviso',
      content: 'Non autorizzato.',
      senderEmail: BOB.email,
      type: 'party_deleted',
      partyId: 'p1',
      read: false,
      createdAt: new Date().toISOString(),
    }));
  });
});

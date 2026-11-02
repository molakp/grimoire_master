import { User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  deleteField,
  doc,
  Firestore,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  Character,
  Party,
  PartyCharacterSnapshot,
  PartyInvitation,
  PartyMember,
  PublicUserHandle,
} from '../types';

const now = () => new Date().toISOString();

export async function claimPublicHandle(
  db: Firestore,
  user: FirebaseUser,
  requestedHandle: string,
): Promise<string> {
  const handle = requestedHandle.trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9_-]{3,20}$/.test(handle)) {
    throw new Error('Lo username deve contenere da 3 a 20 caratteri: lettere, numeri, trattini o underscore.');
  }
  const email = user.email?.trim().toLowerCase();
  if (!email) {
    throw new Error('Il tuo account non ha un indirizzo email utilizzabile.');
  }

  const profileRef = doc(db, 'users', user.uid);
  const handleRef = doc(db, 'public_handles', handle);
  await runTransaction(db, async (transaction) => {
    const profileSnapshot = await transaction.get(profileRef);
    const oldHandle = profileSnapshot.exists() ? profileSnapshot.data().handle as string | undefined : undefined;
    const oldHandleRef = oldHandle && oldHandle !== handle
      ? doc(db, 'public_handles', oldHandle)
      : null;
    const [handleSnapshot, oldHandleSnapshot] = await Promise.all([
      transaction.get(handleRef),
      oldHandleRef ? transaction.get(oldHandleRef) : Promise.resolve(null),
    ]);

    if (handleSnapshot.exists() && handleSnapshot.data().uid !== user.uid) {
      throw new Error('Questo username è già occupato. Scegline un altro.');
    }
    if (oldHandleRef && oldHandleSnapshot?.exists() && oldHandleSnapshot.data().uid === user.uid) {
      transaction.delete(oldHandleRef);
    }

    const updatedAt = now();
    const publicHandle: PublicUserHandle = {
      uid: user.uid,
      handle,
      displayName: user.displayName || email.split('@')[0],
      photoURL: user.photoURL || '',
      updatedAt,
    };
    transaction.set(handleRef, publicHandle);
    transaction.set(profileRef, { uid: user.uid, email, handle }, { merge: true });
  });
  return handle;
}

export async function createParty(
  db: Firestore,
  user: FirebaseUser,
  name: string,
  objective: string,
): Promise<Party> {
  const partyRef = doc(collection(db, 'parties'));
  const party: Party = {
    id: partyRef.id,
    name: name.trim(),
    gmUid: user.uid,
    gmDisplayName: user.displayName || user.email?.split('@')[0] || 'Master',
    objective: objective.trim(),
    status: 'active',
    createdAt: now(),
    updatedAt: now(),
  };

  await setDoc(partyRef, party);
  return party;
}

export async function sendPartyInvitation(
  db: Firestore,
  user: FirebaseUser,
  party: Party,
  recipientEmail: string,
): Promise<void> {
  const recipient = recipientEmail.trim();
  let cleanEmail = '';
  let recipientUid: string | undefined;
  let recipientName = '';
  if (recipient.includes('@')) {
    cleanEmail = recipient.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Inserisci un indirizzo email valido o uno username esistente.');
    }
    if (cleanEmail === user.email?.trim().toLowerCase()) {
      throw new Error('Non puoi invitare te stesso al tuo Party.');
    }
  } else {
    const handle = recipient.replace(/^@/, '').toLowerCase();
    if (!/^[a-z0-9_-]{3,20}$/.test(handle)) {
      throw new Error('Inserisci un indirizzo email valido o uno username di almeno 3 caratteri.');
    }
    const handleSnapshot = await getDoc(doc(db, 'public_handles', handle));
    if (!handleSnapshot.exists()) {
      throw new Error('Non esiste un giocatore con questo username.');
    }
    const publicHandle = handleSnapshot.data() as PublicUserHandle;
    recipientUid = publicHandle.uid;
    recipientName = publicHandle.displayName || `@${handle}`;
    if (recipientUid === user.uid) {
      throw new Error('Non puoi invitare te stesso al tuo Party.');
    }
  }
  const invitationRef = doc(collection(db, 'party_invitations'));
  const mailRef = doc(collection(db, 'mails'));
  const createdAt = now();
  const senderEmail = user.email?.trim().toLowerCase();
  if (!senderEmail) {
    throw new Error('Il tuo account non ha un indirizzo email utilizzabile per inviare inviti.');
  }

  const invitation: PartyInvitation = {
    id: invitationRef.id,
    partyId: party.id,
    partyName: party.name,
    recipientEmail: cleanEmail,
    ...(recipientUid ? { recipientUid } : {}),
    senderUid: user.uid,
    senderEmail,
    status: 'pending',
    createdAt,
  };
  const batch = writeBatch(db);
  batch.set(invitationRef, invitation);
  batch.set(mailRef, {
    id: mailRef.id,
    recipientEmail: cleanEmail,
    ...(recipientUid ? { recipientUid } : {}),
    subject: `Invito alla spedizione: ${party.name}`,
    content: `${party.gmDisplayName} invita ${recipientName || cleanEmail} a unirsi alla campagna "${party.name}". Apri questo messaggio per accettare o rifiutare l'invito.`,
    senderEmail,
    type: 'party_invitation',
    partyId: party.id,
    partyInvitationId: invitation.id,
    read: false,
    createdAt,
  });
  await batch.commit();
}

export async function respondToPartyInvitation(
  db: Firestore,
  user: FirebaseUser,
  invitationId: string,
  mailId: string,
  response: 'accepted' | 'declined',
): Promise<void> {
  const invitationRef = doc(db, 'party_invitations', invitationId);
  const mailRef = doc(db, 'mails', mailId);

  await runTransaction(db, async (transaction) => {
    const [invitationSnapshot, mailSnapshot] = await Promise.all([
      transaction.get(invitationRef),
      transaction.get(mailRef),
    ]);
    if (!invitationSnapshot.exists() || !mailSnapshot.exists()) {
      throw new Error('L’invito o il messaggio non esiste più.');
    }

    const invitation = invitationSnapshot.data() as PartyInvitation;
    const mail = mailSnapshot.data();
    if (
      invitation.status !== 'pending'
      || (invitation.recipientUid
        ? invitation.recipientUid !== user.uid
        : invitation.recipientEmail.toLowerCase() !== user.email?.trim().toLowerCase())
      || mail.partyInvitationId !== invitationId
      || (mail.recipientUid
        ? mail.recipientUid !== user.uid
        : mail.recipientEmail.toLowerCase() !== user.email?.trim().toLowerCase())
    ) {
      throw new Error('Questo invito non è più disponibile per il tuo account.');
    }

    const respondedAt = now();
    transaction.update(invitationRef, { status: response, respondedAt });
    transaction.update(mailRef, { read: true });

    if (response === 'accepted') {
      const memberRef = doc(db, 'parties', invitation.partyId, 'members', user.uid);
      transaction.set(memberRef, {
        uid: user.uid,
        role: 'player',
        status: 'active',
        displayName: user.displayName || user.email?.split('@')[0] || 'Avventuriero',
        invitationId,
        joinedAt: respondedAt,
      });
      transaction.set(doc(db, 'users', user.uid, 'partyMemberships', invitation.partyId), {
        partyId: invitation.partyId,
        role: 'player',
        invitationId,
        joinedAt: respondedAt,
      });
    }
  });
}

export function getPartyCharacterSnapshot(
  character: Character,
  ownerUid: string,
): PartyCharacterSnapshot {
  return {
    characterId: character.id,
    ownerUid,
    name: character.name,
    class: character.class,
    level: character.level,
    avatar: character.avatar,
    attributes: character.attributes,
    vitality: character.vitality,
    armor: character.armor,
    damageDie: character.damageDie,
    gear: character.gear,
  };
}

export async function linkCharacterToParty(
  db: Firestore,
  partyId: string,
  userUid: string,
  character: Character,
): Promise<void> {
  if (character.partyId && character.partyId !== partyId) {
    throw new Error('Questo eroe è già vincolato a un’altra campagna. Scollegalo prima di unirlo a un nuovo Party.');
  }

  const batch = writeBatch(db);
  batch.update(doc(db, 'characters', character.id), { partyId });
  batch.update(doc(db, 'parties', partyId, 'members', userUid), { characterId: character.id });
  batch.set(
    doc(db, 'parties', partyId, 'roster', character.id),
    getPartyCharacterSnapshot(character, userUid),
  );
  await batch.commit();
}

export async function unlinkCharacterFromParty(
  db: Firestore,
  partyId: string,
  userUid: string,
  characterId: string,
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'characters', characterId), { partyId: deleteField() });
  batch.update(doc(db, 'parties', partyId, 'members', userUid), { characterId: deleteField() });
  batch.delete(doc(db, 'parties', partyId, 'roster', characterId));
  await batch.commit();
}

export async function removePartyMember(
  db: Firestore,
  partyId: string,
  member: PartyMember,
): Promise<void> {
  const batch = writeBatch(db);
  if (member.characterId) {
    batch.update(doc(db, 'characters', member.characterId), { partyId: deleteField() });
    batch.delete(doc(db, 'parties', partyId, 'roster', member.characterId));
  }
  batch.delete(doc(db, 'parties', partyId, 'members', member.uid));
  batch.delete(doc(db, 'users', member.uid, 'partyMemberships', partyId));
  await batch.commit();
}

export async function setPartyPaused(
  db: Firestore,
  partyId: string,
  paused: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'parties', partyId), {
    status: paused ? 'paused' : 'active',
    updatedAt: now(),
  });
}

export async function deleteParty(
  db: Firestore,
  user: FirebaseUser,
  party: Party,
): Promise<void> {
  const senderEmail = user.email?.trim().toLowerCase();
  if (!senderEmail) {
    throw new Error('Il tuo account non ha un indirizzo email utilizzabile per avvisare i giocatori.');
  }

  const partyRef = doc(db, 'parties', party.id);
  const [membersSnapshot, rosterSnapshot, sessionsSnapshot, diarySnapshot, notesSnapshot, invitationsSnapshot] =
    await Promise.all([
      getDocs(collection(partyRef, 'members')),
      getDocs(collection(partyRef, 'roster')),
      getDocs(collection(partyRef, 'sessions')),
      getDocs(collection(partyRef, 'diary')),
      getDocs(collection(partyRef, 'gm_notes')),
      getDocs(query(collection(db, 'party_invitations'), where('partyId', '==', party.id))),
    ]);

  const attendanceSnapshots = await Promise.all(sessionsSnapshot.docs.map((sessionSnapshot) =>
    getDocs(collection(partyRef, 'sessions', sessionSnapshot.id, 'attendance')),
  ));

  for (const memberSnapshot of membersSnapshot.docs) {
    await removePartyMember(db, party.id, memberSnapshot.data() as PartyMember);
  }

  const references = [
    ...rosterSnapshot.docs.map((snapshot) => snapshot.ref),
    ...sessionsSnapshot.docs.map((snapshot) => snapshot.ref),
    ...attendanceSnapshots.flatMap((snapshot) => snapshot.docs.map((attendance) => attendance.ref)),
    ...diarySnapshot.docs.map((snapshot) => snapshot.ref),
    ...notesSnapshot.docs.map((snapshot) => snapshot.ref),
  ];
  for (let index = 0; index < references.length; index += 400) {
    const batch = writeBatch(db);
    references.slice(index, index + 400).forEach((reference) => batch.delete(reference));
    await batch.commit();
  }

  const pendingInvitations = invitationsSnapshot.docs.filter((snapshot) =>
    (snapshot.data() as PartyInvitation).status === 'pending',
  );
  for (let index = 0; index < pendingInvitations.length; index += 400) {
    const batch = writeBatch(db);
    pendingInvitations.slice(index, index + 400).forEach((snapshot) => {
      batch.update(snapshot.ref, { status: 'revoked', respondedAt: now() });
    });
    await batch.commit();
  }

  const members = membersSnapshot.docs.map((snapshot) => snapshot.data() as PartyMember);
  for (let index = 0; index < members.length; index += 400) {
    const batch = writeBatch(db);
    members.slice(index, index + 400).forEach((member) => {
      const mailRef = doc(collection(db, 'mails'));
      batch.set(mailRef, {
        id: mailRef.id,
        recipientEmail: '',
        recipientUid: member.uid,
        subject: `La campagna "${party.name}" è stata cancellata`,
        content: `Il master ${party.gmDisplayName} ha cancellato la campagna "${party.name}".`,
        senderEmail,
        type: 'party_deleted',
        partyId: party.id,
        read: false,
        createdAt: now(),
      });
    });
    await batch.commit();
  }

  const deleteBatch = writeBatch(db);
  deleteBatch.delete(partyRef);
  await deleteBatch.commit();
}

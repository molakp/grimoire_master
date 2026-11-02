import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { ArrowLeft, CalendarDays, Check, ChevronRight, Crown, LockKeyhole, Mail, Pause, Play, Plus, Send, Settings, Shield, Trash2, UserMinus, Users } from 'lucide-react';
import { db } from '../firebase';
import {
  Character,
  Party,
  PartyAttendance,
  PartyCharacterSnapshot,
  PartyDiaryEntry,
  PartyInvitation,
  PartyMasterNote,
  PartyMember,
  PartySession,
} from '../types';
import {
  createParty,
  deleteParty,
  linkCharacterToParty,
  removePartyMember,
  sendPartyInvitation,
  setPartyPaused,
  unlinkCharacterFromParty,
} from '../lib/partyService';
import { notify } from './NotificationSystem';

interface PartyHubProps {
  currentUser: FirebaseUser | null;
  myCharacters: Character[];
  onSelectCharacter: (characterId: string) => void;
}

interface PartyMemberView {
  member: PartyMember;
  character?: PartyCharacterSnapshot;
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Operazione Party non riuscita. Riprova.';

const invitationStatusLabel: Record<PartyInvitation['status'], string> = {
  pending: 'In attesa',
  accepted: 'Accettato',
  declined: 'Rifiutato',
  revoked: 'Revocato',
};

const sessionStatusLabel: Record<PartySession['status'], string> = {
  planned: 'Pianificata',
  confirmed: 'Confermata',
  cancelled: 'Annullata',
};

export default function PartyHub({ currentUser, myCharacters, onSelectCharacter }: PartyHubProps) {
  const [ownedParties, setOwnedParties] = useState<Party[]>([]);
  const [joinedParties, setJoinedParties] = useState<Party[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [roster, setRoster] = useState<PartyCharacterSnapshot[]>([]);
  const [invitations, setInvitations] = useState<PartyInvitation[]>([]);
  const [sessions, setSessions] = useState<PartySession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<PartyAttendance[]>([]);
  const [diary, setDiary] = useState<PartyDiaryEntry[]>([]);
  const [masterNotes, setMasterNotes] = useState<PartyMasterNote[]>([]);
  const [activeBoard, setActiveBoard] = useState<'party' | 'sessions' | 'settings'>('party');
  const [isPlayerPreview, setIsPlayerPreview] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyObjective, setNewPartyObjective] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [diaryTitle, setDiaryTitle] = useState('');
  const [diaryContent, setDiaryContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  useEffect(() => {
    if (!currentUser) {
      setOwnedParties([]);
      setJoinedParties([]);
      setSelectedPartyId(null);
      return;
    }

    const report = (error: Error) => {
      console.error('Unable to load Party campaigns:', error);
      notify.error('Impossibile caricare le campagne Party.');
    };

    const ownedQuery = query(
      collection(db, 'parties'),
      where('gmUid', '==', currentUser.uid),
      limit(20),
    );
    const ownedUnsubscribe = onSnapshot(ownedQuery, (snapshot) => {
      setOwnedParties(snapshot.docs.map((partyDoc) => ({ ...partyDoc.data(), id: partyDoc.id }) as Party));
    }, report);

    const membershipsQuery = query(
      collection(db, 'users', currentUser.uid, 'partyMemberships'),
      limit(20),
    );
    const membershipsUnsubscribe = onSnapshot(membershipsQuery, (snapshot) => {
      void Promise.all(snapshot.docs.map(async (membershipDoc) => {
        const partySnapshot = await getDoc(doc(db, 'parties', membershipDoc.id));
        return partySnapshot.exists()
          ? { ...partySnapshot.data(), id: partySnapshot.id } as Party
          : null;
      })).then((parties) => {
        setJoinedParties(parties.filter((party): party is Party => party !== null));
      }).catch(report);
    }, report);

    return () => {
      ownedUnsubscribe();
      membershipsUnsubscribe();
    };
  }, [currentUser?.uid]);

  const ownedParty = ownedParties.find((party) => party.id === selectedPartyId);
  const selectedParty = ownedParty || joinedParties.find((party) => party.id === selectedPartyId) || null;
  const isGameMaster = Boolean(ownedParty);
  const joinedPartyIds = new Set(joinedParties.map((party) => party.id));
  const memberCharacterId = members.find((member) => member.uid === currentUser?.uid)?.characterId;
  const activeCharacter = myCharacters.find((character) => character.id === memberCharacterId);
  const previewMember = members.find((member) => member.characterId) || members[0];
  const previewCharacter = roster.find((character) => character.characterId === previewMember?.characterId);
  const nextSession = sessions.find((session) =>
    session.status !== 'cancelled' && new Date(session.startsAt).getTime() >= Date.now());

  const partyMembers = useMemo<PartyMemberView[]>(
    () => members.map((member) => ({
      member,
      character: roster.find((character) => character.characterId === member.characterId),
    })),
    [members, roster],
  );

  useEffect(() => {
    if (!selectedParty) {
      setMembers([]);
      setRoster([]);
      setInvitations([]);
      setSessions([]);
      setDiary([]);
      setMasterNotes([]);
      return;
    }

    const partyId = selectedParty.id;
    const report = (area: string) => (error: Error) => {
      console.error(`Unable to load Party ${area}:`, error);
      notify.error(`Impossibile caricare ${area} del Party.`);
    };
    const unsubscriptions = [
      onSnapshot(query(collection(db, 'parties', partyId, 'members'), limit(12)), (snapshot) => {
        setMembers(snapshot.docs.map((memberDoc) => memberDoc.data() as PartyMember));
      }, report('giocatori')),
      onSnapshot(query(collection(db, 'parties', partyId, 'roster'), limit(12)), (snapshot) => {
        setRoster(snapshot.docs.map((characterDoc) => characterDoc.data() as PartyCharacterSnapshot));
      }, report('personaggi')),
      onSnapshot(query(collection(db, 'parties', partyId, 'sessions'), orderBy('startsAt', 'asc'), limit(10)), (snapshot) => {
        const loadedSessions = snapshot.docs.map((sessionDoc) => sessionDoc.data() as PartySession);
        setSessions(loadedSessions);
        setSelectedSessionId((current) => current && loadedSessions.some((session) => session.id === current)
          ? current
          : loadedSessions[0]?.id || null);
      }, report('sedute')),
      onSnapshot(query(collection(db, 'parties', partyId, 'diary'), orderBy('createdAt', 'desc'), limit(20)), (snapshot) => {
        setDiary(snapshot.docs.map((entryDoc) => entryDoc.data() as PartyDiaryEntry));
      }, report('diario')),
    ];

    if (isGameMaster) {
      unsubscriptions.push(
        onSnapshot(query(collection(db, 'party_invitations'), where('partyId', '==', partyId), limit(20)), (snapshot) => {
          setInvitations(snapshot.docs.map((inviteDoc) => inviteDoc.data() as PartyInvitation));
        }, report('inviti')),
        onSnapshot(query(collection(db, 'parties', partyId, 'gm_notes'), limit(20)), (snapshot) => {
          setMasterNotes(snapshot.docs.map((noteDoc) => noteDoc.data() as PartyMasterNote));
        }, report('note riservate')),
      );
    } else {
      setInvitations([]);
      setMasterNotes([]);
    }

    return () => unsubscriptions.forEach((unsubscribe) => unsubscribe());
  }, [selectedPartyId, isGameMaster]);

  useEffect(() => {
    if (!selectedParty || !selectedSessionId || !currentUser) {
      setAttendance([]);
      return;
    }
    return onSnapshot(
      query(collection(db, 'parties', selectedParty.id, 'sessions', selectedSessionId, 'attendance'), limit(12)),
      (snapshot) => setAttendance(snapshot.docs.map((attendanceDoc) => attendanceDoc.data() as PartyAttendance)),
      (error) => {
        console.error('Unable to load Party attendance:', error);
        notify.error('Impossibile caricare le presenze della seduta.');
      },
    );
  }, [selectedPartyId, selectedSessionId, currentUser?.uid]);

  const handleCreateParty = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser) {
      notify.error('Accedi per creare un Party.');
      return;
    }
    if (!newPartyName.trim()) {
      notify.error('Inserisci il nome della spedizione.');
      return;
    }
    try {
      const party = await createParty(db, currentUser, newPartyName, newPartyObjective);
      setSelectedPartyId(party.id);
      setNewPartyName('');
      setNewPartyObjective('');
      notify.success(`La campagna "${party.name}" è pronta.`);
    } catch (error) {
      console.error('Unable to create Party:', error);
      notify.error(errorMessage(error));
    }
  };

  const handleSendInvitation = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !ownedParty) return;
    try {
      await sendPartyInvitation(db, currentUser, ownedParty, inviteEmail);
      setInviteEmail('');
      notify.success('Invito inviato nella posta del giocatore.');
    } catch (error) {
      console.error('Unable to send Party invitation:', error);
      notify.error(errorMessage(error));
    }
  };

  const handleRemovePartyMember = async (member: PartyMember) => {
    if (!selectedParty || member.uid === currentUser?.uid) return;
    if (!window.confirm(`Rimuovere ${member.displayName} dalla campagna? Per tornare dovrà ricevere un nuovo invito.`)) return;
    try {
      await removePartyMember(db, selectedParty.id, member);
      notify.success(`${member.displayName} è stato rimosso. Per tornare dovrà essere reinvitato.`);
    } catch (error) {
      console.error('Unable to remove Party member:', error);
      notify.error(errorMessage(error));
    }
  };

  const handleTogglePartyPause = async () => {
    if (!ownedParty) return;
    const shouldPause = ownedParty.status !== 'paused';
    try {
      await setPartyPaused(db, ownedParty.id, shouldPause);
      notify.success(shouldPause ? 'La campagna è stata messa in pausa.' : 'La campagna è stata riattivata.');
    } catch (error) {
      console.error('Unable to update Party status:', error);
      notify.error(errorMessage(error));
    }
  };

  const handleDeleteParty = async () => {
    if (!ownedParty || !currentUser) return;
    if (!window.confirm(`Cancellare definitivamente "${ownedParty.name}"? I giocatori riceveranno un avviso nella posta. L’operazione non può essere annullata.`)) return;
    try {
      await deleteParty(db, currentUser, ownedParty);
      setSelectedPartyId(null);
      setActiveBoard('party');
      notify.success(`La campagna "${ownedParty.name}" è stata cancellata.`);
    } catch (error) {
      console.error('Unable to delete Party:', error);
      notify.error(errorMessage(error));
    }
  };

  const handleLinkCharacter = async (character: Character) => {
    if (!currentUser || !selectedParty) return;
    try {
      await linkCharacterToParty(db, selectedParty.id, currentUser.uid, character);
      notify.success(`${character.name} è ora legato a questa campagna.`);
    } catch (error) {
      console.error('Unable to link character to Party:', error);
      notify.error(errorMessage(error));
    }
  };

  const handleUnlinkCharacter = async () => {
    if (!currentUser || !selectedParty || !memberCharacterId) return;
    try {
      await unlinkCharacterFromParty(db, selectedParty.id, currentUser.uid, memberCharacterId);
      notify.success('Il personaggio è stato scollegato dalla campagna.');
    } catch (error) {
      console.error('Unable to unlink character from Party:', error);
      notify.error(errorMessage(error));
    }
  };

  const handleCreateSession = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedParty || !currentUser || !sessionTitle.trim() || !sessionDate) return;
    const sessionRef = doc(collection(db, 'parties', selectedParty.id, 'sessions'));
    const timestamp = new Date().toISOString();
    try {
      await setDoc(sessionRef, {
        id: sessionRef.id,
        title: sessionTitle.trim(),
        startsAt: new Date(sessionDate).toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        status: 'planned',
        createdAt: timestamp,
        updatedAt: timestamp,
      } satisfies PartySession);
      setSessionTitle('');
      setSessionDate('');
      notify.success('La nuova seduta è stata pianificata.');
    } catch (error) {
      console.error('Unable to create Party session:', error);
      notify.error(errorMessage(error));
    }
  };

  const handleAttendance = async (status: PartyAttendance['status']) => {
    if (!selectedParty || !selectedSessionId || !currentUser) return;
    try {
      await setDoc(doc(db, 'parties', selectedParty.id, 'sessions', selectedSessionId, 'attendance', currentUser.uid), {
        uid: currentUser.uid,
        status,
        updatedAt: new Date().toISOString(),
      } satisfies PartyAttendance);
      notify.success(status === 'confirmed' ? 'Presenza confermata.' : 'Presenza aggiornata.');
    } catch (error) {
      console.error('Unable to update Party attendance:', error);
      notify.error(errorMessage(error));
    }
  };

  const handleAddDiaryEntry = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedParty || !currentUser || !diaryTitle.trim() || !diaryContent.trim()) return;
    const entryRef = doc(collection(db, 'parties', selectedParty.id, 'diary'));
    try {
      await setDoc(entryRef, {
        id: entryRef.id,
        authorUid: currentUser.uid,
        authorName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Avventuriero',
        title: diaryTitle.trim(),
        content: diaryContent.trim(),
        createdAt: new Date().toISOString(),
      } satisfies PartyDiaryEntry);
      setDiaryTitle('');
      setDiaryContent('');
      notify.success('La cronaca è stata aggiunta al diario condiviso.');
    } catch (error) {
      console.error('Unable to add Party diary entry:', error);
      notify.error(errorMessage(error));
    }
  };

  const handleAddMasterNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedParty || !noteTitle.trim() || !noteContent.trim()) return;
    const noteRef = doc(collection(db, 'parties', selectedParty.id, 'gm_notes'));
    try {
      await setDoc(noteRef, {
        id: noteRef.id,
        title: noteTitle.trim(),
        content: noteContent.trim(),
        updatedAt: new Date().toISOString(),
      } satisfies PartyMasterNote);
      setNoteTitle('');
      setNoteContent('');
      notify.success('Nota riservata salvata.');
    } catch (error) {
      console.error('Unable to save Party master note:', error);
      notify.error(errorMessage(error));
    }
  };

  const openParty = (party: Party) => {
    setSelectedPartyId(party.id);
    setActiveBoard('party');
  };

  if (!currentUser) {
    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-primary/30 bg-surface-container-low p-8 text-center">
        <Users className="mx-auto mb-4 text-primary" size={32} />
        <h2 className="font-serif text-2xl text-primary">Le Compagnie Arcane</h2>
        <p className="mt-3 text-on-surface-variant">Accedi per creare un Party, ricevere inviti e condividere le tue spedizioni.</p>
      </section>
    );
  }

  if (selectedParty) {
    return (
      <section className="space-y-6">
        <button onClick={() => setSelectedPartyId(null)} className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-fixed">
          <ArrowLeft size={16} /> Torna alle campagne
        </button>
        <header className="rounded-xl border border-primary/30 bg-surface-container-low p-5 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-primary">Dungeon World · Campagna</p>
              <h2 className="mt-2 font-serif text-3xl text-on-surface">{selectedParty.name}</h2>
              <p className="mt-3 max-w-3xl text-on-surface-variant">{selectedParty.objective || 'Nessun obiettivo condiviso.'}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-3 py-1 text-xs uppercase text-primary">
              {isGameMaster ? <Crown size={14} /> : <Shield size={14} />}
              {isGameMaster ? (isPlayerPreview ? 'Anteprima giocatore' : 'Tu sei il master') : 'Avventuriero'}
            </span>
            {selectedParty.status === 'paused' && (
              <span className="rounded-full border border-secondary/40 px-3 py-1 text-xs uppercase text-secondary">Campagna in pausa</span>
            )}
          </div>
          {isGameMaster && (
            <nav className="mt-6 flex flex-wrap gap-2 border-t border-outline-variant pt-4">
              <button onClick={() => setActiveBoard('party')} className={`rounded px-4 py-2 text-sm ${activeBoard === 'party' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
                Tavola &amp; Eroi
              </button>
              <button onClick={() => setActiveBoard('sessions')} className={`rounded px-4 py-2 text-sm ${activeBoard === 'sessions' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
                Calendario &amp; Sessioni
              </button>
              {!isPlayerPreview && (
                <button onClick={() => setActiveBoard('settings')} className={`inline-flex items-center gap-2 rounded px-4 py-2 text-sm ${activeBoard === 'settings' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
                  <Settings size={15} /> Impostazioni
                </button>
              )}
              <button onClick={() => setIsPlayerPreview((preview) => !preview)} className="ml-auto rounded border border-primary/50 px-4 py-2 text-sm text-primary">
                {isPlayerPreview ? 'Torna alla vista master' : 'Anteprima giocatore'}
              </button>
            </nav>
          )}
        </header>

        {isGameMaster && !isPlayerPreview && activeBoard === 'party' ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
            <div className="space-y-6">
              <section className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
                <h3 className="font-serif text-xl text-primary">Avventurieri al falò</h3>
                <p className="mt-1 text-xs text-on-surface-variant">{partyMembers.length} partecipanti · {roster.length} eroi collegati</p>
                <div className="mt-4 space-y-3">
                  {partyMembers.map(({ member, character }) => (
                    <article key={member.uid} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-container p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {character?.avatar ? <img src={character.avatar} alt="" className="h-12 w-12 rounded-lg object-cover" /> : <Users className="text-primary" />}
                        <div className="min-w-0">
                          <h4 className="truncate font-serif text-lg text-on-surface">{character?.name || member.displayName}</h4>
                          <p className="text-xs text-on-surface-variant">{character ? `${character.class} · Lv ${character.level}` : 'In attesa di collegare un eroe'}</p>
                        </div>
                      </div>
                      {character && (
                        <div className="text-right font-mono text-xs text-on-surface-variant">
                          <p>PF {character.vitality.current}/{character.vitality.max}</p>
                          <p>Arm. {character.armor} · {character.damageDie}</p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
              <section className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
                <h3 className="font-serif text-xl text-primary">Prossima seduta</h3>
                {nextSession ? (
                  <div className="mt-3 rounded-lg bg-surface-container p-4">
                    <p className="font-serif text-lg">{nextSession.title}</p>
                    <p className="mt-1 text-sm text-on-surface-variant">{new Date(nextSession.startsAt).toLocaleString('it-IT')}</p>
                    <p className="mt-2 font-mono text-xs text-primary">{attendance.filter((item) => item.status === 'confirmed').length}/{members.length} presenze confermate</p>
                  </div>
                ) : <p className="mt-3 text-sm text-on-surface-variant">Nessuna seduta pianificata.</p>}
                <button onClick={() => setActiveBoard('sessions')} className="mt-4 inline-flex items-center gap-2 text-sm text-primary">
                  <CalendarDays size={16} /> Gestisci calendario
                </button>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-xl border border-primary/30 bg-surface-container-low p-5">
                <div className="flex items-center gap-2">
                  <LockKeyhole size={16} className="text-secondary" />
                  <h3 className="font-serif text-xl text-secondary">Note riservate al master</h3>
                </div>
                <form onSubmit={handleAddMasterNote} className="mt-4 space-y-3">
                  <input required maxLength={120} value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="Titolo della nota" className="w-full rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary" />
                  <textarea required maxLength={5000} value={noteContent} onChange={(event) => setNoteContent(event.target.value)} placeholder="Solo il master può leggere queste note." rows={3} className="w-full rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary" />
                  <button type="submit" className="rounded border border-secondary/50 px-3 py-2 text-sm text-secondary hover:bg-secondary/10">Aggiungi nota segreta</button>
                </form>
                <div className="mt-4 space-y-2">
                  {masterNotes.map((note) => <article key={note.id} className="rounded bg-surface-container p-3"><h4 className="font-serif text-base">{note.title}</h4><p className="mt-1 whitespace-pre-wrap text-xs text-on-surface-variant">{note.content}</p></article>)}
                </div>
              </section>
            </aside>
          </div>
        ) : isGameMaster && !isPlayerPreview && activeBoard === 'sessions' ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
            <section className="rounded-xl border border-primary/30 bg-surface-container-low p-5">
              <h3 className="font-serif text-xl text-primary">Pianifica una seduta</h3>
              <form onSubmit={handleCreateSession} className="mt-4 space-y-3">
                <input required maxLength={120} value={sessionTitle} onChange={(event) => setSessionTitle(event.target.value)} placeholder="Titolo della seduta" className="w-full rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary" />
                <input required type="datetime-local" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} className="w-full rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary" />
                <button type="submit" className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 font-semibold text-on-primary"><Plus size={16} /> Pianifica seduta</button>
              </form>
            </section>
            <SessionsList sessions={sessions} selectedSessionId={selectedSessionId} setSelectedSessionId={setSelectedSessionId} attendance={attendance} members={members} />
          </div>
        ) : isGameMaster && !isPlayerPreview && activeBoard === 'settings' ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
            <div className="space-y-6">
              <section className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
                <h3 className="font-serif text-xl text-primary">Invita un giocatore</h3>
                <p className="mt-1 text-sm text-on-surface-variant">L’invito arriverà nella posta dell’app. Se un giocatore viene rimosso, dovrà ricevere un nuovo invito per tornare.</p>
                <form onSubmit={handleSendInvitation} className="mt-4 flex flex-col gap-3">
                  <label className="text-xs uppercase tracking-wide text-on-surface-variant" htmlFor="party-invite-email">Username o email del giocatore</label>
                  <input id="party-invite-email" type="text" maxLength={100} required value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="@aldor o giocatore@esempio.it" className="rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary" />
                  <button type="submit" className="inline-flex items-center justify-center gap-2 rounded bg-primary px-4 py-2 font-semibold text-on-primary hover:brightness-110">
                    <Send size={15} /> Invia invito
                  </button>
                </form>
                <div className="mt-4 border-t border-outline-variant pt-3">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">Inviti recenti</p>
                  {invitations.length ? invitations.slice(0, 5).map((invitation) => (
                    <p key={invitation.id} className="mt-2 flex justify-between gap-2 text-xs">
                      <span className="truncate">{invitation.recipientEmail || invitation.recipientUid}</span>
                      <span className={invitation.status === 'accepted' ? 'text-emerald-400' : 'text-primary'}>{invitationStatusLabel[invitation.status]}</span>
                    </p>
                  )) : <p className="mt-2 text-xs text-on-surface-variant">Nessun invito inviato.</p>}
                </div>
              </section>
              <section className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
                <h3 className="font-serif text-xl text-primary">Giocatori della campagna</h3>
                <div className="mt-4 space-y-3">
                  {partyMembers.map(({ member, character }) => (
                    <article key={member.uid} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-container p-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-on-surface">{member.displayName}</p>
                        <p className="text-xs text-on-surface-variant">{character ? `${character.name} · ${character.class} · Lv ${character.level}` : 'Nessun personaggio collegato'}</p>
                      </div>
                      <button onClick={() => void handleRemovePartyMember(member)} className="inline-flex items-center gap-2 rounded border border-outline-variant px-3 py-2 text-sm text-on-surface-variant hover:border-error hover:text-error">
                        <UserMinus size={15} /> Rimuovi
                      </button>
                    </article>
                  ))}
                  {partyMembers.length === 0 && <p className="text-sm text-on-surface-variant">Nessun giocatore nella campagna.</p>}
                </div>
              </section>
            </div>
            <aside className="space-y-6">
              <section className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
                <h3 className="font-serif text-xl text-primary">Stato della campagna</h3>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {ownedParty?.status === 'paused'
                    ? 'La campagna è in pausa. Lo stato è informativo: le funzioni restano disponibili.'
                    : 'La campagna è attiva.'}
                </p>
                <button onClick={() => void handleTogglePartyPause()} className="mt-4 inline-flex items-center gap-2 rounded border border-primary/50 px-4 py-2 text-sm text-primary hover:bg-primary/10">
                  {ownedParty?.status === 'paused' ? <Play size={15} /> : <Pause size={15} />}
                  {ownedParty?.status === 'paused' ? 'Riattiva campagna' : 'Metti in pausa'}
                </button>
              </section>
              <section className="rounded-xl border border-error/40 bg-surface-container-low p-5">
                <h3 className="font-serif text-xl text-error">Zona pericolosa</h3>
                <p className="mt-2 text-sm text-on-surface-variant">La cancellazione è definitiva. Ogni giocatore della campagna riceverà un avviso nella posta dell’app.</p>
                <button onClick={() => void handleDeleteParty()} className="mt-4 inline-flex items-center gap-2 rounded border border-error/50 bg-error/10 px-4 py-2 text-sm font-semibold text-error hover:bg-error/20">
                  <Trash2 size={15} /> Cancella campagna
                </button>
              </section>
            </aside>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
            <div className="space-y-6">
              <section className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
                <h3 className="font-serif text-xl text-primary">La tua prossima seduta</h3>
                {nextSession ? (
                  <>
                    <p className="mt-3 font-serif text-lg">{nextSession.title}</p>
                    <p className="text-sm text-on-surface-variant">{new Date(nextSession.startsAt).toLocaleString('it-IT')}</p>
                    {isPlayerPreview ? (
                      <p className="mt-4 rounded bg-surface-container px-3 py-2 text-xs text-on-surface-variant">Anteprima di sola lettura: le azioni del giocatore sono disattivate.</p>
                    ) : (
                      <div className="mt-4 flex gap-2">
                        <button onClick={() => void handleAttendance('confirmed')} className="inline-flex items-center gap-2 rounded bg-primary px-3 py-2 text-sm font-semibold text-on-primary"><Check size={15} /> Conferma presenza</button>
                        <button onClick={() => void handleAttendance('declined')} className="rounded border border-outline-variant px-3 py-2 text-sm text-on-surface-variant">Non ci sarò</button>
                      </div>
                    )}
                  </>
                ) : <p className="mt-3 text-sm text-on-surface-variant">Il master non ha ancora pianificato una seduta.</p>}
              </section>
              <section className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
                <h3 className="font-serif text-xl text-primary">{isPlayerPreview ? 'Eroe del giocatore' : 'Il tuo eroe vincolato'}</h3>
                {isPlayerPreview ? (
                  previewCharacter ? (
                    <div className="mt-4 rounded-lg bg-surface-container p-4">
                      <p className="mb-3 text-xs uppercase tracking-wide text-primary">Anteprima di {previewMember?.displayName}</p>
                      <div className="flex items-center gap-3">
                        {previewCharacter.avatar && <img src={previewCharacter.avatar} alt="" className="h-14 w-14 rounded-lg object-cover" />}
                        <div><h4 className="font-serif text-lg">{previewCharacter.name}</h4><p className="text-sm text-on-surface-variant">{previewCharacter.class} · Livello {previewCharacter.level}</p></div>
                      </div>
                      <p className="mt-3 font-mono text-xs">PF {previewCharacter.vitality.current}/{previewCharacter.vitality.max} · Armatura {previewCharacter.armor} · Danno {previewCharacter.damageDie}</p>
                    </div>
                  ) : <p className="mt-4 text-sm text-on-surface-variant">Nessun giocatore ha ancora collegato un eroe.</p>
                ) : memberCharacterId && activeCharacter ? (
                  <div className="mt-4 rounded-lg bg-surface-container p-4">
                    <div className="flex items-center gap-3">
                      {activeCharacter.avatar && <img src={activeCharacter.avatar} alt="" className="h-14 w-14 rounded-lg object-cover" />}
                      <div><h4 className="font-serif text-lg">{activeCharacter.name}</h4><p className="text-sm text-on-surface-variant">{activeCharacter.class} · Livello {activeCharacter.level}</p></div>
                    </div>
                    <p className="mt-3 font-mono text-xs">PF {activeCharacter.vitality.current}/{activeCharacter.vitality.max} · Armatura {activeCharacter.armor} · Danno {activeCharacter.damageDie}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button onClick={() => onSelectCharacter(activeCharacter.id)} className="rounded bg-surface-container-high px-3 py-2 text-sm text-primary">Scheda completa</button>
                      <button onClick={() => void handleUnlinkCharacter()} className="rounded border border-outline-variant px-3 py-2 text-xs text-on-surface-variant">Scollega eroe</button>
                    </div>
                  </div>
                ) : memberCharacterId ? (
                  <p className="mt-4 text-sm text-on-surface-variant">Caricamento della scheda collegata…</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-on-surface-variant">Scegli un personaggio da legare a questa campagna. Ogni eroe può appartenere a una sola campagna.</p>
                    {myCharacters.map((character) => (
                      <button key={character.id} disabled={Boolean(character.partyId)} onClick={() => void handleLinkCharacter(character)} className="flex w-full items-center justify-between gap-3 rounded-lg bg-surface-container p-3 text-left disabled:cursor-not-allowed disabled:opacity-50">
                        <span><strong>{character.name}</strong><span className="block text-xs text-on-surface-variant">{character.class} · Lv {character.level}{character.partyId ? ' · Già in un Party' : ''}</span></span>
                        <ChevronRight size={16} className="text-primary" />
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
            <div className="space-y-6">
              <section className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
                <h3 className="font-serif text-xl text-primary">Compagni d’avventura</h3>
                <div className="mt-4 space-y-3">
                  {partyMembers.filter(({ member }) => member.uid !== (isPlayerPreview ? previewMember?.uid : currentUser.uid)).map(({ member, character }) => (
                    <article key={member.uid} className="flex items-center justify-between gap-3 rounded-lg bg-surface-container p-3">
                      <div className="flex items-center gap-3">
                        {character?.avatar && <img src={character.avatar} alt="" className="h-11 w-11 rounded object-cover" />}
                        <div><p className="font-serif">{character?.name || member.displayName}</p><p className="text-xs text-on-surface-variant">{character ? `${character.class} · Lv ${character.level}` : 'In arrivo'}</p></div>
                      </div>
                      <span className="text-xs text-primary">{character ? 'Pronto' : 'In attesa'}</span>
                    </article>
                  ))}
                </div>
              </section>
              <section className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
                <h3 className="font-serif text-xl text-primary">Diario condiviso</h3>
                {!isPlayerPreview && (
                  <form onSubmit={handleAddDiaryEntry} className="mt-4 space-y-3">
                    <input required maxLength={120} value={diaryTitle} onChange={(event) => setDiaryTitle(event.target.value)} placeholder="Titolo della cronaca" className="w-full rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary" />
                    <textarea required maxLength={5000} value={diaryContent} onChange={(event) => setDiaryContent(event.target.value)} placeholder="Aggiungi una nota visibile al Party..." rows={3} className="w-full rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-primary" />
                    <button type="submit" className="rounded border border-primary/50 px-3 py-2 text-sm text-primary">Aggiungi al diario</button>
                  </form>
                )}
                <div className="mt-4 space-y-3">
                  {diary.map((entry) => <article key={entry.id} className="rounded-lg bg-surface-container p-3"><h4 className="font-serif text-base">{entry.title}</h4><p className="mt-1 whitespace-pre-wrap text-sm text-on-surface-variant">{entry.content}</p><p className="mt-2 text-[10px] uppercase text-primary">{entry.authorName} · {new Date(entry.createdAt).toLocaleDateString('it-IT')}</p></article>)}
                  {diary.length === 0 && <p className="text-sm text-on-surface-variant">Le cronache della spedizione appariranno qui.</p>}
                </div>
              </section>
            </div>
          </div>
        )}

      </section>
    );
  }

  return (
    <section className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">Dungeon World</p>
          <h2 className="font-serif text-3xl text-on-surface">Compagnie Arcane</h2>
        </div>
        <p className="text-sm text-on-surface-variant">Le campagne che dirigi e quelle in cui giochi.</p>
      </header>

      <section className="space-y-5">
        <div>
          <h3 className="font-serif text-2xl text-on-surface">Le tue campagne</h3>
          <p className="mt-1 text-sm text-on-surface-variant">Apri una spedizione per gestirla o riprendere da dove eri rimasto.</p>
        </div>
        <div className="grid gap-8 xl:grid-cols-2">
          <section>
            <h4 className="mb-4 flex items-center gap-2 font-serif text-xl text-primary"><Crown size={20} /> Campagne che dirigi</h4>
            <PartyList parties={ownedParties} emptyText="Non dirigi ancora nessuna spedizione." onOpen={openParty} badge="MASTER" />
          </section>
          <section>
            <h4 className="mb-4 flex items-center gap-2 font-serif text-xl text-secondary"><Users size={20} /> Campagne in cui giochi</h4>
            <PartyList parties={joinedParties.filter((party) => !ownedParties.some((owned) => owned.id === party.id))} emptyText="Non sei ancora stato arruolato in una spedizione." onOpen={openParty} badge="GIOCATORE" />
            {joinedPartyIds.size === 0 && <p className="mt-3 flex items-center gap-2 text-xs text-on-surface-variant"><Mail size={14} /> Gli inviti ricevuti si gestiscono dalla posta dell’app.</p>}
          </section>
        </div>
      </section>

      <details className="group rounded-xl border border-outline-variant bg-surface-container-low">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-semibold text-on-surface marker:hidden">
          <Plus size={18} className="text-primary" />
          Crea una nuova campagna
        </summary>
        <form onSubmit={handleCreateParty} className="grid gap-3 border-t border-outline-variant p-5 md:grid-cols-[1fr_1.4fr_auto] md:items-end">
          <label className="text-xs uppercase tracking-wide text-on-surface-variant">Nome della spedizione
            <input required maxLength={100} value={newPartyName} onChange={(event) => setNewPartyName(event.target.value)} placeholder="Es. I Custodi della Fiamma" className="mt-1 block w-full rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary" />
          </label>
          <label className="text-xs uppercase tracking-wide text-on-surface-variant">Obiettivo condiviso
            <input maxLength={1000} value={newPartyObjective} onChange={(event) => setNewPartyObjective(event.target.value)} placeholder="Cosa vuole ottenere il Party?" className="mt-1 block w-full rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary" />
          </label>
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded bg-primary px-4 py-2 font-semibold text-on-primary"><Plus size={16} /> Crea Party</button>
        </form>
      </details>

    </section>
  );
}

function PartyList({ parties, emptyText, onOpen, badge }: {
  parties: Party[];
  emptyText: string;
  onOpen: (party: Party) => void;
  badge: string;
}) {
  if (parties.length === 0) return <p className="rounded-xl border border-dashed border-outline-variant p-6 text-sm text-on-surface-variant">{emptyText}</p>;
  return (
    <div className="space-y-3">
      {parties.map((party) => (
        <button key={party.id} onClick={() => onOpen(party)} className="w-full rounded-xl border border-outline-variant bg-surface-container-low p-5 text-left transition hover:border-primary/60 hover:bg-surface-container">
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">{badge}</span>
          <span className="mt-1 flex items-center justify-between gap-3">
            <strong className="font-serif text-xl text-on-surface">{party.name}</strong>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] uppercase ${party.status === 'paused' ? 'bg-secondary/15 text-secondary' : 'bg-primary/15 text-primary'}`}>
              {party.status === 'paused' ? 'In pausa' : 'Attiva'}
            </span>
            <ChevronRight size={18} className="shrink-0 text-primary" />
          </span>
          <span className="mt-2 block text-sm text-on-surface-variant">{party.objective || 'Nessun obiettivo condiviso.'}</span>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">Apri campagna <ChevronRight size={16} /></span>
        </button>
      ))}
    </div>
  );
}

function SessionsList({ sessions, selectedSessionId, setSelectedSessionId, attendance, members }: {
  sessions: PartySession[];
  selectedSessionId: string | null;
  setSelectedSessionId: (sessionId: string) => void;
  attendance: PartyAttendance[];
  members: PartyMember[];
}) {
  return (
    <div>
      <h3 className="font-serif text-xl text-primary">Sedute della campagna</h3>
      {sessions.length === 0 ? <p className="mt-3 text-sm text-on-surface-variant">Nessuna seduta pianificata.</p> : (
        <div className="mt-4 space-y-3">
          {sessions.map((session) => (
            <button key={session.id} onClick={() => setSelectedSessionId(session.id)} className={`w-full rounded-lg border p-4 text-left ${selectedSessionId === session.id ? 'border-primary bg-surface-container' : 'border-outline-variant bg-surface-container-low'}`}>
              <span className="flex items-start justify-between gap-3">
                <span><strong className="font-serif text-lg">{session.title}</strong><span className="mt-1 block text-sm text-on-surface-variant">{new Date(session.startsAt).toLocaleString('it-IT')}</span></span>
                <span className="font-mono text-[10px] uppercase text-primary">{sessionStatusLabel[session.status]}</span>
              </span>
              <span className="mt-2 block text-xs text-on-surface-variant">
                {attendance.filter((item) => item.status === 'confirmed').length}/{members.length} presenti · {attendance.filter((item) => item.status === 'declined').length} assenti
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

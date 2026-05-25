import { useState, useEffect } from 'react';
import { Character, DiceRollLog, Mail, BannedUser, Admin, CharacterTemplate, UserProfile } from './types';
import { INITIAL_CHARACTER_THALRIC } from './data';
import { useTemplates } from './hooks/useTemplates';
import Dashboard from './components/Dashboard';
import CharacterSheet from './components/CharacterSheet';
import Spellbook from './components/Spellbook';
import DiceRoller from './components/DiceRoller';
import Atmosphere from './components/Atmosphere';
import { notify } from './components/NotificationSystem';
import { CloudLightning } from 'lucide-react';

// Firebase imports
import { auth, db, logInWithGoogle, logOut, OperationType, handleFirestoreError } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';

export default function App() {
  const [myCharacters, setMyCharacters] = useState<Character[]>([]);
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);
  const [diceLogs, setDiceLogs] = useState<DiceRollLog[]>([]);
  const [activeStatPreset, setActiveStatPreset] = useState<{ name: string; value: number } | null>(null);
  const [activeCharacterTab, setActiveCharacterTab] = useState<'stats' | 'spells' | 'moves' | 'gear' | 'lore'>('stats');

  // Firebase auth & syncing state
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Admin and ban safety hooks
  const [isAdminState, setIsAdminState] = useState(false);
  const [isBannedState, setIsBannedState] = useState(false);
  const [banReason, setBanReason] = useState('');

  // Sourced active database collections
  const [adminsList, setAdminsList] = useState<Admin[]>([]);
  const [bannedList, setBannedList] = useState<BannedUser[]>([]);
  const [allMails, setAllMails] = useState<Mail[]>([]);
  const [unreadMails, setUnreadMails] = useState<Mail[]>([]);
  const [officialTemplates, setOfficialTemplates] = useState<CharacterTemplate[]>([]);
  const [communityCharacters, setCommunityCharacters] = useState<any[]>([]);
  const [knownUsers, setKnownUsers] = useState<UserProfile[]>([]);
  const { templates: allTemplates } = useTemplates();

  // Recognize Master Admin helper
  const isUserMasterAdmin = (email: string | null | undefined): boolean => {
    if (!email) return false;
    const normalized = email.toLowerCase().trim();
    return normalized === 'silvestrofrisullo@gmail.com' || normalized === 'silvestrofrisullo.gmail.com';
  };

  const upsertUserProfile = (firebaseUser: FirebaseUser) => {
    const email = firebaseUser.email?.toLowerCase().trim();
    if (!email) return;

    const providerIds = firebaseUser.providerData
      .map((provider) => provider.providerId)
      .filter((providerId): providerId is string => Boolean(providerId));

    const nowIso = new Date().toISOString();

    void setDoc(doc(db, 'users', firebaseUser.uid), {
      uid: firebaseUser.uid,
      email,
      emailLower: email,
      displayName: firebaseUser.displayName || '',
      photoURL: firebaseUser.photoURL || '',
      providerIds,
      createdAt: firebaseUser.metadata.creationTime || nowIso,
      lastLoginAt: firebaseUser.metadata.lastSignInTime || nowIso,
    }, { merge: true }).catch((error) => {
      // Non-blocking: user profile tracking must not break app login flow.
      console.error('Unable to sync user profile in Firestore:', error);
      notify.error('Sync utenti fallito: aggiorna e pubblica le regole Firestore per la collection users.');
    });
  };

  // Load characters on mount & sync with Auth/Firestore
  useEffect(() => {
    const activeListeners: (() => void)[] = [];
    const cleanOldListeners = () => {
      activeListeners.forEach((unsub) => {
        try { unsub(); } catch (e) {}
      });
      activeListeners.length = 0;
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setCurrentUser(firebaseUser);
      setIsAuthLoading(false);

      cleanOldListeners();

      if (firebaseUser) {
        const uEmail = (firebaseUser.email || '').toLowerCase().trim();
        const isMaster = isUserMasterAdmin(uEmail);
        setIsAdminState(isMaster);
        upsertUserProfile(firebaseUser);

        // 1. Check ban status
        const banSub = onSnapshot(doc(db, 'banned_users', uEmail), (snapshot) => {
          if (snapshot.exists()) {
            setIsBannedState(true);
            setBanReason(snapshot.data().reason || 'Nessun motivo specificato.');
          } else {
            setIsBannedState(false);
            setBanReason('');
          }
        }, () => {});
        activeListeners.push(banSub);

        // 2. Check individual admin profile document
        const adminSub = onSnapshot(doc(db, 'admins', uEmail), (snapshot) => {
          if (snapshot.exists() || isMaster) {
            setIsAdminState(true);
          } else {
            setIsAdminState(false);
          }
        }, () => {});
        activeListeners.push(adminSub);

        // 3. Playable characters
        const charactersQuery = query(collection(db, 'characters'), where('ownerId', '==', firebaseUser.uid));
        const charsSub = onSnapshot(charactersQuery, (snapshot) => {
          const chars: Character[] = [];
          snapshot.forEach((doc) => {
            chars.push({
              ...(doc.data() as Character),
              id: doc.id
            });
          });
          if (chars.length > 0) {
            setMyCharacters(chars);
          } else {
            const localSaved = localStorage.getItem('grimoire_characters');
            let initialChars: Character[] = [INITIAL_CHARACTER_THALRIC];
            if (localSaved) {
              try {
                initialChars = JSON.parse(localSaved);
              } catch (e) {}
            }
            initialChars.forEach(async (char) => {
              // Ensure we do not overwrite other users' characters with default IDs like 'thalric'
              const uniqueCharId = char.id.endsWith(firebaseUser.uid) ? char.id : `${char.id}_${firebaseUser.uid}`;
              const cloudChar = {
                ...char,
                id: uniqueCharId,
                ownerId: firebaseUser.uid,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              try {
                await setDoc(doc(db, 'characters', uniqueCharId), cloudChar);
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, `characters/${uniqueCharId}`);
              }
            });
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'characters');
        });
        activeListeners.push(charsSub);

        // 4. Letters (Mails) inbox list
        const mailsQuery = query(collection(db, 'mails'), where('recipientEmail', '==', uEmail));
        const mailsSub = onSnapshot(mailsQuery, (snapshot) => {
          const fetchedMails: Mail[] = [];
          snapshot.forEach((doc) => {
            fetchedMails.push({
              ...(doc.data() as Mail),
              id: doc.id
            });
          });
          fetchedMails.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setAllMails(fetchedMails);
          setUnreadMails(fetchedMails.filter((m) => !m.read));
        }, () => {});
        activeListeners.push(mailsSub);

        // 5. Official design patterns (dynamic template blueprints)
        const templatesSub = onSnapshot(collection(db, 'official_templates'), (snapshot) => {
          const list: CharacterTemplate[] = [];
          snapshot.forEach((doc) => {
            list.push({
              ...(doc.data() as CharacterTemplate),
              id: doc.id
            });
          });
          setOfficialTemplates(list);
        }, () => {});
        activeListeners.push(templatesSub);

        // 6. Community characters feed listener
        const communitySub = onSnapshot(collection(db, 'community_characters'), (snapshot) => {
          const list: any[] = [];
          snapshot.forEach((doc) => {
            list.push({
              ...(doc.data() as any),
              id: doc.id
            });
          });
          setCommunityCharacters(list);
        }, () => {});
        activeListeners.push(communitySub);

        // 7. Master Admin special management queries
        if (isMaster) {
          const mUsersSub = onSnapshot(collection(db, 'users'), (snapshot) => {
            const list: UserProfile[] = [];
            snapshot.forEach((userDoc) => {
              const data = userDoc.data() as Partial<UserProfile>;
              if (!data.uid || !data.email) return;

              list.push({
                uid: data.uid,
                email: data.email,
                emailLower: data.emailLower || data.email.toLowerCase().trim(),
                displayName: data.displayName || '',
                photoURL: data.photoURL || '',
                providerIds: Array.isArray(data.providerIds) ? data.providerIds : [],
                createdAt: data.createdAt || '',
                lastLoginAt: data.lastLoginAt || data.createdAt || ''
              });
            });

            list.sort((a, b) => new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime());
            setKnownUsers(list);
          }, () => {});
          activeListeners.push(mUsersSub);

          const mAdminsSub = onSnapshot(collection(db, 'admins'), (snapshot) => {
            const list: Admin[] = [];
            snapshot.forEach((doc) => {
              list.push({
                ...(doc.data() as Admin),
                email: doc.id
              });
            });
            setAdminsList(list);
          }, () => {});
          activeListeners.push(mAdminsSub);

          const mBannedSub = onSnapshot(collection(db, 'banned_users'), (snapshot) => {
            const list: BannedUser[] = [];
            snapshot.forEach((doc) => {
              list.push({
                ...(doc.data() as BannedUser),
                email: doc.id
              });
            });
            setBannedList(list);
          }, () => {});
          activeListeners.push(mBannedSub);
        }

      } else {
        // Logged out structure
        setIsAdminState(false);
        setIsBannedState(false);
        setBanReason('');
        setAllMails([]);
        setUnreadMails([]);
        setOfficialTemplates([]);
        setCommunityCharacters([]);
        setAdminsList([]);
        setBannedList([]);
        setKnownUsers([]);

        const saved = localStorage.getItem('grimoire_characters');
        if (saved) {
          try {
            setMyCharacters(JSON.parse(saved));
          } catch (e) {
            setMyCharacters([INITIAL_CHARACTER_THALRIC]);
          }
        } else {
          setMyCharacters([INITIAL_CHARACTER_THALRIC]);
          localStorage.setItem('grimoire_characters', JSON.stringify([INITIAL_CHARACTER_THALRIC]));
        }
      }
    });

    return () => {
      unsubscribeAuth();
      cleanOldListeners();
    };
  }, []);

  // MASTER ADMIN OPERATION: Promote Admin
  const handlePromoteAdmin = async (targetEmail: string) => {
    if (!currentUser || !isUserMasterAdmin(currentUser.email)) {
      notify.error("Solo l'Admin Master può gestire gli amministratori.");
      return;
    }
    const cleanEmail = targetEmail.toLowerCase().trim();
    if (!cleanEmail) {
      notify.error("Per favore, inserisci un indirizzo mail valido.");
      return;
    }

    try {
      await setDoc(doc(db, 'admins', cleanEmail), {
        email: cleanEmail,
        role: 'admin',
        promotedBy: currentUser.email || 'Master Admin',
        createdAt: new Date().toISOString()
      });

      // Send simulated golden parchment email letter
      const mailId = `mail_${Date.now()}`;
      await setDoc(doc(db, 'mails', mailId), {
        id: mailId,
        recipientEmail: cleanEmail,
        subject: "📜 Nomina a Grimoire Master del Tempio dei Vetri",
        content: `Per la grazia e l'autorità dell'Arcano Master, il tuo spirito accorto e la tua dedizione al Tempio dei Grimorî ti hanno valso il rango ed il titolo ufficiale di Grimoire Master.\n\nTi concediamo solennemente la facoltà di plasmare, archiviare, modificare e censurare le schede personaggio nell'Archivio Sacro.\n\nPossa la fiamma della conoscenza guidare ogni tuo incanto.\n\n— L'Admin Master del Tempio`,
        senderEmail: currentUser.email || 'silvestrofrisullo@gmail.com',
        type: 'promotion',
        read: false,
        createdAt: new Date().toISOString()
      });

      notify.success(`Utente "${cleanEmail}" elevato a Grimoire Master con successo! Lettera di investitura spedita.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `admins/${cleanEmail}`);
    }
  };

  // MASTER ADMIN OPERATION: Remove Admin
  const handleRemoveAdmin = async (targetEmail: string) => {
    if (!currentUser || !isUserMasterAdmin(currentUser.email)) {
      notify.error("Solo l'Admin Master può gestire gli amministratori.");
      return;
    }
    const cleanEmail = targetEmail.toLowerCase().trim();
    if (!cleanEmail) return;

    try {
      await deleteDoc(doc(db, 'admins', cleanEmail));
      notify.warning(`Carica di Grimoire Master revocata per: ${cleanEmail}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `admins/${cleanEmail}`);
    }
  };

  // MASTER ADMIN OPERATION: Ban User
  const handleBanUser = async (targetEmail: string, reason: string) => {
    if (!currentUser || !isUserMasterAdmin(currentUser.email)) {
      notify.error("Solo l'Admin Master può espellere utenti.");
      return;
    }
    const cleanEmail = targetEmail.toLowerCase().trim();
    if (!cleanEmail) {
      notify.error("Inserisci l'indirizzo email dell'utente.");
      return;
    }

    try {
      await setDoc(doc(db, 'banned_users', cleanEmail), {
        email: cleanEmail,
        bannedBy: currentUser.email || 'Master Admin',
        reason: reason || 'Comportamento inadeguato o immondo nel Tempio.',
        createdAt: new Date().toISOString()
      });

      // Send ban alert parchment letter
      const mailId = `mail_${Date.now()}`;
      await setDoc(doc(db, 'mails', mailId), {
        id: mailId,
        recipientEmail: cleanEmail,
        subject: "🚫 Decreto di Esilio Istantaneo dal Tempio",
        content: `Il Tempio dei Grimorî non ammette profanatrici violazioni delle regole della gilda. Sotto ordinanza sigillata dell'Arcano Master, sei esiliato per la seguente fiera accusa:\n\n"${reason || 'Violazione dei sani principi della community'}"\n\nQualsiasi accesso alle scritture sacre ti è proibito.\n\n— Sentenza sigillata dall'Admin Master`,
        senderEmail: currentUser.email || 'silvestrofrisullo@gmail.com',
        type: 'warning',
        read: false,
        createdAt: new Date().toISOString()
      });

      // Auto-remove admin rating if they were admistrator
      await deleteDoc(doc(db, 'admins', cleanEmail));

      notify.warning(`Utente "${cleanEmail}" bandito dal portale. Decreto d'esilio registrato.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `banned_users/${cleanEmail}`);
    }
  };

  // MASTER ADMIN OPERATION: Revoke Ban (Grace)
  const handleUnbanUser = async (targetEmail: string) => {
    if (!currentUser || !isUserMasterAdmin(currentUser.email)) {
      notify.error("Solo l'Admin Master può revocare gli esili.");
      return;
    }
    const cleanEmail = targetEmail.toLowerCase().trim();
    if (!cleanEmail) return;

    try {
      await deleteDoc(doc(db, 'banned_users', cleanEmail));
      notify.success(`Revocato esilio per l'anima redenta: ${cleanEmail}. Benvenuto nuovamente!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `banned_users/${cleanEmail}`);
    }
  };

  // MASTER ADMIN OPERATION: Send Warning Mail
  const handleSendWarnMail = async (targetEmail: string, subject: string, content: string) => {
    if (!currentUser || !isUserMasterAdmin(currentUser.email)) {
      notify.error("Solo l'Admin Master può inviare ammonimenti.");
      return;
    }
    const cleanEmail = targetEmail.toLowerCase().trim();
    if (!cleanEmail || !content.trim()) {
      notify.error("Compila correttamente i campi della lettera di ammonimento.");
      return;
    }

    const mailId = `mail_${Date.now()}`;
    try {
      await setDoc(doc(db, 'mails', mailId), {
        id: mailId,
        recipientEmail: cleanEmail,
        subject: subject || "⚠️ Monito Solenne del Custode del Grimorio",
        content: content,
        senderEmail: currentUser.email || 'silvestrofrisullo@gmail.com',
        type: 'warning',
        read: false,
        createdAt: new Date().toISOString()
      });
      notify.success(`Lettera di ammonimento recapitata con corriere arcano a ${cleanEmail}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `mails/${mailId}`);
    }
  };

  // CUSTOMER OPERATION: Mark Mail Read
  const handleMarkMailRead = async (mailId: string) => {
    const targetMail = allMails.find((m) => m.id === mailId);
    if (!targetMail) return;
    try {
      await setDoc(doc(db, 'mails', mailId), {
        ...targetMail,
        read: true
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `mails/${mailId}`);
    }
  };

  // ADMIN/MASTER OPERATION: Add Official Character Template
  const handleAddOfficialTemplate = async (template: CharacterTemplate) => {
    if (!currentUser || !isAdminState) {
      notify.error("Permesso insufficiente. Solo un amministratore abilitato può creare template.");
      return;
    }
    try {
      await setDoc(doc(db, 'official_templates', template.id), {
        ...template,
        createdBy: currentUser.email || 'Admin',
        createdAt: new Date().toISOString()
      });
      notify.success(`Template ufficiale per "${template.name}" inciso nell'Archivio Sacro!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `official_templates/${template.id}`);
    }
  };

  // ADMIN/MASTER OPERATION: Delete Official Template
  const handleDeleteOfficialTemplate = async (templateId: string) => {
    if (!currentUser || !isAdminState) {
      notify.error("Permesso insufficiente. Solo un amministratore abilitato può rimuovere template.");
      return;
    }
    try {
      await deleteDoc(doc(db, 'official_templates', templateId));
      notify.success("Template ufficiale purificato dall'archivio dinastico.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `official_templates/${templateId}`);
    }
  };

  // STRANGER/MEMBER OPERATION: Publish to community
  const handlePublishCommunityCharacter = async (char: Character, description: string) => {
    if (!currentUser) {
      notify.error("Devi essere connesso per pubblicare i tuoi personaggi.");
      return;
    }
    if (isBannedState) {
      notify.error("Le tue funzioni sono state esiliate per ordine del Tempio.");
      return;
    }

    const commId = `comm_${char.id}`;
    const commPayload = {
      id: commId,
      name: char.name,
      class: char.class,
      level: char.level,
      author: currentUser.displayName || currentUser.email?.split('@')[0] || 'Viandante Silente',
      authorEmail: currentUser.email?.toLowerCase().trim(),
      rating: 5.0,
      description: description || `Un fiero esponente della leggendaria classe ${char.class}`,
      avatar: char.avatar,
      characterData: char,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'community_characters', commId), commPayload);
      notify.success(`L'eroe "${char.name}" è stato proclamato nel tabellone pubblico della community! 🌍`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `community_characters/${commId}`);
    }
  };

  // ADMIN/OWNER OPERATION: Delete Community Character
  const handleDeleteCommunityCharacter = async (commId: string) => {
    if (!currentUser) return;
    const target = communityCharacters.find((c) => c.id === commId);
    if (!target) return;
    const isOwner = target.authorEmail?.toLowerCase() === currentUser.email?.toLowerCase();

    if (!isOwner && !isAdminState) {
      notify.error("Autorizzazione mancante per sfoltire questa scheda.");
      return;
    }

    try {
      await deleteDoc(doc(db, 'community_characters', commId));
      notify.warning("La scheda è stata solennemente cancellata dalla bacheca pubblica.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `community_characters/${commId}`);
    }
  };

  const activeCharacter = myCharacters.find((char) => char.id === activeCharacterId);

  // Triggering test preset rolling
  const handleRollStat = (statName: string, statValue: number) => {
    setActiveStatPreset({ name: statName, value: statValue });
  };

  // CHARACTER OPERATION: Update Character (Local + Cloud Sync)
  const handleUpdateCharacter = async (updatedChar: Character) => {
    if (currentUser) {
      try {
        await setDoc(doc(db, 'characters', updatedChar.id), {
          ...updatedChar,
          ownerId: currentUser.uid,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `characters/${updatedChar.id}`);
      }
    } else {
      const newList = myCharacters.map((c) => c.id === updatedChar.id ? updatedChar : c);
      setMyCharacters(newList);
      localStorage.setItem('grimoire_characters', JSON.stringify(newList));
    }
  };

  // CHARACTER OPERATION: Delete Character (Local + Cloud Sync)
  const handleDeleteCharacter = async (charId: string) => {
    // If the active card is deleted, back to dashboard
    if (activeCharacterId === charId) {
      setActiveCharacterId(null);
    }

    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'characters', charId));
        notify.success("Il personaggio è stato esiliato dal database cloud.");
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `characters/${charId}`);
      }
    } else {
      const newList = myCharacters.filter((c) => c.id !== charId);
      setMyCharacters(newList);
      localStorage.setItem('grimoire_characters', JSON.stringify(newList));
      notify.success("Personaggio rimosso dal Grimorio locale.");
    }
  };

  // CHARACTER OPERATION: Import Template / Character
  const handleImportCharacter = async (imported: Character) => {
    const freshId = `char_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const freshChar: Character = {
      ...imported,
      id: freshId,
      ownerId: currentUser ? currentUser.uid : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (currentUser) {
      try {
        await setDoc(doc(db, 'characters', freshId), freshChar);
        notify.success(`Il template "${freshChar.name}" è fiorito nel tuo Grimorio Cloud! 🌸`);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `characters/${freshId}`);
      }
    } else {
      const newList = [...myCharacters, freshChar];
      setMyCharacters(newList);
      localStorage.setItem('grimoire_characters', JSON.stringify(newList));
      notify.success(`Template "${freshChar.name}" clonato con successo nel browser.`);
    }
  };

  const handleSignIn = async () => {
    try {
      const user = await logInWithGoogle();
      if (user) {
        notify.success(`Sincronizzazione completata! Benvenuto, ${user.displayName || 'Gaudente'}.`);
      }
    } catch (e) {
      notify.error("Accesso con Google annullato o non riuscito.");
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      notify.warning("Disconnesso. Ora stai lavorando offline nel browser.");
    } catch (e) {
      notify.error("Errore durante la disconnessione.");
    }
  };

  if (isBannedState) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center p-4">
        <Atmosphere />
        <div className="max-w-md w-full bg-surface border border-rose-950 shadow-[0_0_50px_rgba(225,29,72,0.12)] rounded-lg p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-600 animate-pulse"></div>
          
          <div className="w-20 h-20 bg-rose-950/45 border border-rose-900 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 shadow-lg animate-pulse">
            <CloudLightning className="w-10 h-10" />
          </div>

          <h1 className="font-sans font-bold text-2xl tracking-tight text-red-500 mb-2">
            ESILIATO DAL TEMPIO
          </h1>
          <p className="text-xs font-mono tracking-widest text-red-800 uppercase mb-6">
            — Sentenza del Custode dei Grimorî —
          </p>

          <div className="bg-rose-950/20 border border-rose-900/30 rounded p-4 text-left mb-6 font-serif leading-relaxed text-sm text-gray-300 relative">
            <span className="text-4xl text-rose-800 absolute top-0 left-2 font-serif select-none">“</span>
            <p className="pl-6 pt-1">
              {banReason || "Il tuo spirito è stato richiamato dall'Admin Master per violazioni delle ordinanze del Tempio."}
            </p>
          </div>

          <p className="text-xs text-gray-400 mb-6">
            Il tuo account (<span className="text-gray-300 font-mono">{currentUser?.email}</span>) è sospeso indefinitamente.
          </p>

          <button
            onClick={handleSignOut}
            className="w-full bg-rose-950/80 hover:bg-rose-900 text-rose-200 hover:text-white font-medium py-3 px-6 rounded border border-rose-800 hover:border-rose-700 transition-all select-none font-sans flex items-center justify-center gap-2 shadow-lg"
          >
            Disconnetti del Regnante
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-surface min-h-screen relative font-sans select-none overflow-x-hidden">
      
      {/* Dynamic ambient float overlays */}
      <Atmosphere />

      {activeCharacter ? (
        /* ACTIVE VIEW - SELECTED RPG EROE SHEET */
        <CharacterSheet
          character={activeCharacter}
          template={allTemplates.find(t => t.class === activeCharacter.class)}
          onUpdateCharacter={handleUpdateCharacter}
          onBackToDashboard={() => setActiveCharacterId(null)}
          onRollStat={handleRollStat}
          activeTab={activeCharacterTab}
          setActiveTab={(tab) => {
            setActiveCharacterTab(tab);
            setActiveStatPreset(null); // clean loaded preset on screen navigating
          }}
          renderSpellsTab={() => (
            <Spellbook
              character={activeCharacter}
              onUpdateCharacter={handleUpdateCharacter}
              spellList={allTemplates.find(t => t.class === activeCharacter.class)?.availableSpells}
            />
          )}
          currentUser={currentUser}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          isAuthLoading={isAuthLoading}
          isAdmin={isAdminState}
          onPublishCommunity={handlePublishCommunityCharacter}
        />
      ) : (
        /* MASTER DIRECTORY - EXPLORE LIBRARY */
        <Dashboard
          myCharacters={myCharacters}
          onImportCharacter={handleImportCharacter}
          onSelectCharacter={(id) => {
            setActiveCharacterId(id);
            setActiveCharacterTab('stats');
          }}
          onDeleteCharacter={handleDeleteCharacter}
          currentUser={currentUser}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          isAuthLoading={isAuthLoading}
          
          isAdmin={isAdminState}
          isMasterAdmin={isUserMasterAdmin(currentUser?.email)}
          officialTemplates={officialTemplates}
          communityCharacters={communityCharacters}
          unreadMails={unreadMails}
          allMails={allMails}
          adminsList={adminsList}
          bannedList={bannedList}
          knownUsers={knownUsers}

          onPromoteAdmin={handlePromoteAdmin}
          onRemoveAdmin={handleRemoveAdmin}
          onBanUser={handleBanUser}
          onUnbanUser={handleUnbanUser}
          onSendWarnMail={handleSendWarnMail}
          onMarkMailRead={handleMarkMailRead}
          onAddOfficialTemplate={handleAddOfficialTemplate}
          onDeleteOfficialTemplate={handleDeleteOfficialTemplate}
          onPublishCommunityCharacter={handlePublishCommunityCharacter}
          onDeleteCommunityCharacter={handleDeleteCommunityCharacter}
        />
      )}

      {/* Global interactive Action and Damage Dice Roller panel */}
      <DiceRoller
        logs={diceLogs}
        onAddLog={(log) => setDiceLogs([log, ...diceLogs])}
        onClearLogs={() => setDiceLogs([])}
        activeStatPreset={activeStatPreset}
        onClearPreset={() => setActiveStatPreset(null)}
      />
    </div>
  );
}

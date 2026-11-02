import { FormEvent, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { ArrowLeft } from 'lucide-react';
import { db } from '../firebase';
import { claimPublicHandle } from '../lib/partyService';
import { notify } from './NotificationSystem';

interface AccountSettingsProps {
  currentUser: FirebaseUser | null;
  onBack: () => void;
}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Impossibile aggiornare le impostazioni. Riprova.';

export default function AccountSettings({ currentUser, onBack }: AccountSettingsProps) {
  const [userHandle, setUserHandle] = useState('');
  const [handleDraft, setHandleDraft] = useState('');
  const [isSavingHandle, setIsSavingHandle] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setUserHandle('');
      setHandleDraft('');
      return;
    }

    return onSnapshot(doc(db, 'users', currentUser.uid), (snapshot) => {
      const handle = snapshot.exists() ? String(snapshot.data().handle || '') : '';
      setUserHandle(handle);
      setHandleDraft(handle);
    }, (error) => {
      console.error('Unable to load public username:', error);
      notify.error('Impossibile caricare le impostazioni account.');
    });
  }, [currentUser?.uid]);

  const handleSavePublicHandle = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser) {
      notify.error('Accedi per modificare le impostazioni account.');
      return;
    }
    setIsSavingHandle(true);
    try {
      const handle = await claimPublicHandle(db, currentUser, handleDraft);
      setUserHandle(handle);
      setHandleDraft(handle);
      notify.success(`Il tuo username pubblico è @${handle}.`);
    } catch (error) {
      console.error('Unable to claim public username:', error);
      notify.error(errorMessage(error));
    } finally {
      setIsSavingHandle(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center gap-4">
        <button type="button" onClick={onBack} aria-label="Torna alla schermata precedente" className="rounded-full border border-outline-variant p-2 text-on-surface-variant transition hover:border-primary hover:text-primary">
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">Account</p>
          <h2 className="font-serif text-3xl text-on-surface">Impostazioni</h2>
        </div>
      </header>

      <section className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
        <h3 className="font-serif text-xl text-primary">Account Google</h3>
        <p className="mt-2 text-sm text-on-surface">{currentUser?.displayName || currentUser?.email}</p>
        {currentUser?.displayName && <p className="text-sm text-on-surface-variant">{currentUser.email}</p>}
      </section>

      <form onSubmit={handleSavePublicHandle} className="space-y-4 rounded-xl border border-outline-variant bg-surface-container-low p-5">
        <div>
          <h3 className="font-serif text-xl text-primary">Username pubblico</h3>
          <p className="mt-1 text-sm text-on-surface-variant">Gli altri giocatori vedranno questo nome per invitarti; la tua email non sarà pubblicata.</p>
        </div>
        <label className="block text-xs uppercase tracking-wide text-on-surface-variant">
          Il tuo username pubblico
          <input required minLength={3} maxLength={20} value={handleDraft} onChange={(event) => setHandleDraft(event.target.value.replace(/^@/, ''))} placeholder="es. aldor_il_saggio" className="mt-1 block w-full rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-primary" />
        </label>
        <button type="submit" disabled={!currentUser || isSavingHandle || handleDraft.trim().toLowerCase() === userHandle} className="rounded border border-primary/50 px-4 py-2 text-sm text-primary disabled:cursor-not-allowed disabled:opacity-50">
          {isSavingHandle ? 'Salvataggio…' : userHandle ? 'Aggiorna username' : 'Scegli username'}
        </button>
      </form>
    </section>
  );
}

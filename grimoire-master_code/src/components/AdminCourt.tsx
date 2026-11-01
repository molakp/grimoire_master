import { useState, useEffect, useMemo, FormEvent } from 'react';
import { Admin, BannedUser, UserProfile } from '../types';
import { UserPlus, ShieldAlert, ShieldCheck, Mail, Trash2, Send, UserX, Users, Search, Filter, ArrowUpDown, CheckCircle } from 'lucide-react';

interface AdminCourtProps {
  adminsList: Admin[];
  bannedList: BannedUser[];
  knownUsers: UserProfile[];
  communityCharacters?: any[];
  onPromoteAdmin: (email: string) => Promise<void>;
  onRemoveAdmin: (email: string) => Promise<void>;
  onBanUser: (email: string, reason: string) => Promise<void>;
  onUnbanUser: (email: string) => Promise<void>;
  onSendWarnMail: (email: string, subject: string, content: string) => Promise<void>;
  onClose: () => void;
  masterEmail?: string | null;
  masterName?: string | null;
}

export default function AdminCourt({
  adminsList,
  bannedList,
  knownUsers,
  communityCharacters = [],
  onPromoteAdmin,
  onRemoveAdmin,
  onBanUser,
  onUnbanUser,
  onSendWarnMail,
  onClose,
  masterEmail: masterEmailProp,
  masterName,
}: AdminCourtProps) {
  const [activeSubTab, setActiveSubTab] = useState<'admins' | 'bans' | 'warnings' | 'users'>('users');

  // Form states
  const [promoteEmail, setPromoteEmail] = useState('');
  const [banEmail, setBanEmail] = useState('');
  const [banReasonInput, setBanReasonInput] = useState('');
  const [warnEmail, setWarnEmail] = useState('');
  const [warnSubject, setWarnSubject] = useState('Lettera di Ammonimento: Contenuto Inappropriato ⚠️');
  const [warnContent, setWarnContent] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounced search queries to avoid laggy performance and simulation of heavy DB overhead on keystroke
  const [debouncedPromote, setDebouncedPromote] = useState('');
  const [debouncedBan, setDebouncedBan] = useState('');
  const [debouncedWarn, setDebouncedWarn] = useState('');

  // Suggestions state
  const [promoteSuggestions, setPromoteSuggestions] = useState<string[]>([]);
  const [banSuggestions, setBanSuggestions] = useState<string[]>([]);
  const [warnSuggestions, setWarnSuggestions] = useState<string[]>([]);

  // Show dropdown triggers
  const [showPromoteSuggestions, setShowPromoteSuggestions] = useState(false);
  const [showBanSuggestions, setShowBanSuggestions] = useState(false);
  const [showWarnSuggestions, setShowWarnSuggestions] = useState(false);

  // Compile all known unique emails in the system
  const allEmails = useMemo(() => {
    const emails = new Set<string>();
    knownUsers.forEach((user) => { if (user.email) emails.add(user.email.toLowerCase().trim()); });
    adminsList.forEach(a => { if (a.email) emails.add(a.email.toLowerCase().trim()); });
    bannedList.forEach(b => { if (b.email) emails.add(b.email.toLowerCase().trim()); });
    communityCharacters?.forEach(c => { if (c.authorEmail) emails.add(c.authorEmail.toLowerCase().trim()); });
    return Array.from(emails);
  }, [knownUsers, adminsList, bannedList, communityCharacters]);

  const formatLoginDate = (value?: string) => {
    if (!value) return 'Data accesso non disponibile';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString('it-IT');
  };

  // Compile a comprehensive list of all known users in the system
  const systemUsers = useMemo(() => {
    const userMap = new Map<string, {
      email: string;
      name: string;
      role: string;
      type: 'master' | 'admin' | 'banned' | 'member';
      createdAt?: string;
      details?: string;
    }>();

    const masterEmail = masterEmailProp?.toLowerCase().trim() || '';

    knownUsers.forEach((user) => {
      const email = user.emailLower || user.email.toLowerCase().trim();
      if (!email) return;

      userMap.set(email, {
        email: user.email,
        name: user.displayName?.trim() || email.split('@')[0],
        role: 'Membro Gilda 📜',
        type: 'member',
        createdAt: user.lastLoginAt || user.createdAt,
        details: `Ultimo accesso: ${formatLoginDate(user.lastLoginAt || user.createdAt)}`
      });
    });

    if (masterEmail) {
      userMap.set(masterEmail, {
        email: masterEmail,
        name: masterName?.trim() || userMap.get(masterEmail)?.name || masterEmail.split('@')[0],
        role: 'Master Admin ⚜️',
        type: 'master',
        createdAt: 'Origine dei Tempi',
        details: 'Sovrano e Creatore del Grembo'
      });
    }

    adminsList.forEach(admin => {
      const email = admin.email.toLowerCase().trim();
      const isMaster = (masterEmail !== '' && email === masterEmail) || admin.role === 'master';
      const existing = userMap.get(email);

      userMap.set(email, {
        email: admin.email,
        name: existing?.name || email.split('@')[0],
        role: isMaster ? 'Master Admin ⚜️' : 'Grimoire Admin 🛡️',
        type: isMaster ? 'master' : 'admin',
        createdAt: admin.createdAt,
        details: existing?.details
          ? `${existing.details} • Nominato da ${admin.promotedBy?.split('@')[0] || 'Sistema'}`
          : `Nominato da ${admin.promotedBy?.split('@')[0] || 'Sistema'}`
      });
    });

    communityCharacters?.forEach(char => {
      const email = char.authorEmail?.toLowerCase().trim();
      if (!email) return;
      
      const existing = userMap.get(email);
      const name = char.author || email.split('@')[0];
      
      if (existing) {
        if (existing.name === email.split('@')[0] && char.author) {
          existing.name = char.author;
        }
        if (existing.details && !existing.details.includes('Scheda')) {
          existing.details += ` • Scheda: "${char.name}"`;
        }
      } else {
        userMap.set(email, {
          email: char.authorEmail,
          name: name,
          role: 'Membro Gilda 📜',
          type: 'member',
          createdAt: char.createdAt,
          details: `Pubblicata: "${char.name}" (${char.class} Lvl ${char.level})`
        });
      }
    });

    bannedList.forEach(ban => {
      const email = ban.email.toLowerCase().trim();
      const existing = userMap.get(email);
      userMap.set(email, {
        email: ban.email,
        name: existing?.name || email.split('@')[0],
        role: 'Anime Esiliata 🚷',
        type: 'banned',
        createdAt: ban.createdAt,
        details: `Bandito: "${ban.reason}" da ${ban.bannedBy?.split('@')[0]}`
      });
    });

    return Array.from(userMap.values());
  }, [knownUsers, adminsList, bannedList, communityCharacters, masterEmailProp, masterName]);

  // Filtered system users based on the search query
  const filteredSystemUsers = useMemo(() => {
    const q = userSearchQuery.toLowerCase().trim();
    if (!q) return systemUsers;
    return systemUsers.filter(u => 
      u.email.toLowerCase().includes(q) || 
      u.name.toLowerCase().includes(q) || 
      u.role.toLowerCase().includes(q) ||
      (u.details && u.details.toLowerCase().includes(q))
    );
  }, [systemUsers, userSearchQuery]);

  // Debounce effect hooks
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPromote(promoteEmail);
    }, 350);
    return () => clearTimeout(handler);
  }, [promoteEmail]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedBan(banEmail);
    }, 350);
    return () => clearTimeout(handler);
  }, [banEmail]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedWarn(warnEmail);
    }, 350);
    return () => clearTimeout(handler);
  }, [warnEmail]);

  // Update suggestions based on the debounced value to mimic a lightweight search
  useEffect(() => {
    if (!debouncedPromote.trim()) {
      setPromoteSuggestions([]);
    } else {
      const q = debouncedPromote.toLowerCase().trim();
      const filtered = allEmails.filter(email => email.includes(q) && email !== q);
      setPromoteSuggestions(filtered);
    }
  }, [debouncedPromote, allEmails]);

  useEffect(() => {
    if (!debouncedBan.trim()) {
      setBanSuggestions([]);
    } else {
      const q = debouncedBan.toLowerCase().trim();
      const filtered = allEmails.filter(email => email.includes(q) && email !== q);
      setBanSuggestions(filtered);
    }
  }, [debouncedBan, allEmails]);

  useEffect(() => {
    if (!debouncedWarn.trim()) {
      setWarnSuggestions([]);
    } else {
      const q = debouncedWarn.toLowerCase().trim();
      const filtered = allEmails.filter(email => email.includes(q) && email !== q);
      setWarnSuggestions(filtered);
    }
  }, [debouncedWarn, allEmails]);

  const handlePromote = async (e: FormEvent) => {
    e.preventDefault();
    if (!promoteEmail.trim()) return;
    setIsSubmitting(true);
    await onPromoteAdmin(promoteEmail);
    setPromoteEmail('');
    setIsSubmitting(false);
  };

  const handleBan = async (e: FormEvent) => {
    e.preventDefault();
    if (!banEmail.trim()) return;
    setIsSubmitting(true);
    await onBanUser(banEmail, banReasonInput);
    setBanEmail('');
    setBanReasonInput('');
    setIsSubmitting(false);
  };

  const handleSendWarning = async (e: FormEvent) => {
    e.preventDefault();
    if (!warnEmail.trim() || !warnContent.trim()) return;
    setIsSubmitting(true);
    await onSendWarnMail(warnEmail, warnSubject, warnContent);
    setWarnEmail('');
    setWarnContent('');
    setIsSubmitting(false);
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto font-sans">

      {/* Ambient radial glow */}
      <div className="absolute top-0 left-0 w-full h-48 pointer-events-none overflow-hidden rounded-2xl">
        <div className="w-full h-full" style={{ background: 'radial-gradient(circle at 20% 50%, rgba(212,175,55,0.18) 0%, transparent 70%)' }} />
      </div>

      {/* ── HERO ── */}
      <div className="relative z-10 pt-2 pb-8 flex items-start justify-between">
        <div>
          <h2 className="font-serif text-3xl md:text-[2.75rem] text-primary font-bold leading-tight mb-1 drop-shadow-[0_0_12px_rgba(242,202,80,0.3)]">
            Consiglio Sacro
          </h2>
          <p className="text-on-surface-variant italic font-serif text-sm md:text-base opacity-80">
            Santuario di Amministrazione
          </p>
        </div>
        <button onClick={onClose}
          className="hidden md:flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-on-surface-variant border border-outline-variant px-3 py-1.5 rounded-lg hover:border-primary/50 hover:text-primary transition-all mt-1">
          Chiudi Portale
        </button>
      </div>

      {/* ── STAT CARDS desktop: 3-col ── */}
      <div className="hidden md:grid grid-cols-3 gap-6 mb-10">
        {([
          { key: 'users' as const,  label: 'Elenco Utenti',   count: systemUsers.length, sub: `${knownUsers.length} Gilda`, Icon: Users,       accent: 'text-secondary' },
          { key: 'admins' as const, label: 'Amministratori',  count: adminsList.length,  sub: 'Inner Circle',               Icon: ShieldCheck, accent: 'text-on-surface-variant' },
          { key: 'bans' as const,   label: 'Membri Esiliati', count: bannedList.length,  sub: 'Purged Souls',               Icon: UserX,       accent: 'text-error' },
        ] as const).map(({ key, label, count, sub, Icon, accent }) => (
          <button key={key} onClick={() => setActiveSubTab(key)}
            className={`p-6 rounded-xl border text-left group transition-all duration-500 ${
              activeSubTab === key
                ? 'bg-primary-container/15 border-primary-container shadow-[0_0_24px_rgba(242,202,80,0.25)]'
                : 'bg-gradient-to-br from-surface-container to-surface-container-low border-outline-variant hover:border-primary-container/60 hover:shadow-[0_0_20px_rgba(242,202,80,0.12)]'
            }`}>
            <div className="flex justify-between items-start mb-4">
              <span className="font-mono text-primary uppercase tracking-[0.2em] text-xs">{label}</span>
              <Icon size={20} className={`${accent} group-hover:scale-110 transition-transform`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-on-surface">{count}</span>
              <span className={`text-xs ${accent}`}>{sub}</span>
            </div>
          </button>
        ))}
      </div>

      {/* ── STAT CARDS mobile: horizontal scroll with 4 items ── */}
      <div className="md:hidden flex gap-3 overflow-x-auto pb-2 mb-6 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {([
          { key: 'users' as const,    label: 'Elenco Utenti',     count: systemUsers.length, Icon: Users },
          { key: 'admins' as const,   label: 'Amministratori',    count: adminsList.length,  Icon: ShieldCheck },
          { key: 'bans' as const,     label: 'Membri Esiliati',   count: bannedList.length,  Icon: UserX },
          { key: 'warnings' as const, label: 'Invia Ammonimento', count: null,               Icon: Send },
        ] as const).map(({ key, label, count, Icon }) => (
          <button key={key} onClick={() => setActiveSubTab(key)}
            className={`flex-shrink-0 w-36 p-4 rounded-xl border transition-all text-left ${
              activeSubTab === key
                ? 'bg-primary-container/20 border-primary-container shadow-[0_0_12px_rgba(212,175,55,0.35)]'
                : 'bg-gradient-to-br from-surface-container to-surface-container-low border-outline-variant'
            }`}>
            <Icon size={20} className={`mb-2 ${activeSubTab === key ? 'text-primary' : 'text-on-surface-variant'}`} />
            <p className={`font-mono text-[10px] uppercase tracking-wide leading-tight ${activeSubTab === key ? 'text-primary' : 'text-on-surface-variant'}`}>{label}</p>
            {count !== null && <p className={`text-xl font-bold mt-1 ${activeSubTab === key ? 'text-primary' : 'text-on-surface'}`}>{count}</p>}
          </button>
        ))}
      </div>

      {/* Desktop: Warnings shortcut */}
      <div className="hidden md:flex justify-end mb-4">
        <button onClick={() => setActiveSubTab('warnings')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border text-xs font-mono uppercase tracking-wider transition-all ${
            activeSubTab === 'warnings'
              ? 'bg-blue-950/60 border-blue-800 text-blue-300'
              : 'border-outline-variant text-on-surface-variant hover:border-blue-800/60 hover:text-blue-400'
          }`}>
          <Send size={12} /> Invia Ammonimento
        </button>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="min-h-[300px]">

        {/* ══ TAB: users ══ */}
        {activeSubTab === 'users' && (
          <div className="space-y-5 animate-[fadeIn_0.2s_ease]">

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
              <input type="text"
                placeholder="Cerca un'anima per email, nome, ruolo..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-3.5 pl-11 pr-4 text-on-background placeholder:text-outline focus:outline-none focus:border-primary transition-all text-sm shadow-inner"
              />
              {userSearchQuery && (
                <button onClick={() => setUserSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-primary hover:text-primary/70 font-mono">
                  Sgombra
                </button>
              )}
            </div>

            {/* Registry header */}
            <div className="flex items-center justify-between py-3 border-b border-primary-container/30">
              <h3 className="font-serif text-on-surface flex items-center gap-3 text-lg md:text-xl">
                <span className="w-6 h-px bg-primary-container hidden md:block" />
                <Users size={18} className="text-primary" />
                Registro delle Anime
                <span className="w-6 h-px bg-primary-container hidden md:block" />
              </h3>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-outline border border-outline-variant px-2 py-0.5 rounded-full">
                  {filteredSystemUsers.length} / {systemUsers.length}
                </span>
                <button className="p-1.5 border border-outline-variant rounded-lg text-on-surface-variant hover:text-primary hover:border-primary/40 transition-all">
                  <Filter size={13} />
                </button>
                <button className="p-1.5 border border-outline-variant rounded-lg text-on-surface-variant hover:text-primary hover:border-primary/40 transition-all">
                  <ArrowUpDown size={13} />
                </button>
              </div>
            </div>

            {/* Member cards */}
            <div className="grid grid-cols-1 gap-4">
              {filteredSystemUsers.length === 0 ? (
                <p className="py-12 text-center text-xs font-serif text-on-surface-variant/50 italic">
                  Nessuna anima registrata risponde al criterio inciso sul papiro.
                </p>
              ) : filteredSystemUsers.map((user) => (
                <div key={user.email}
                  className={`p-5 md:p-6 rounded-xl border flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 group hover:border-primary/60 transition-all duration-300 shadow-[0_0_15px_rgba(242,202,80,0.04)] hover:shadow-[0_0_20px_rgba(242,202,80,0.1)] ${
                    user.type === 'master' ? 'border-primary/40 bg-primary/5' :
                    user.type === 'banned' ? 'border-error/30 bg-error/5' :
                    'border-outline-variant bg-gradient-to-br from-surface-container to-surface-container-low'
                  }`}>

                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl border-2 relative z-10 ${
                      user.type === 'master' ? 'bg-primary-container/20 border-primary text-primary' :
                      user.type === 'admin'  ? 'bg-primary-container/10 border-primary/50 text-primary/80' :
                      user.type === 'banned' ? 'bg-error/10 border-error/40 text-error' :
                      'bg-surface-container-highest border-outline-variant text-on-surface-variant'
                    }`}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-primary blur-xl transition-opacity rounded-full" />
                    {user.type === 'master' && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full border-2 border-surface-container flex items-center justify-center z-20">
                        <CheckCircle size={10} className="text-on-primary" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className={`font-serif text-lg font-bold ${user.type === 'master' ? 'text-primary' : 'text-on-surface'}`}>
                        {user.name}
                      </h4>
                      <span className={`px-2 py-0.5 text-[9px] font-mono rounded border uppercase tracking-widest ${
                        user.type === 'master' ? 'bg-primary-container/20 border-primary/30 text-primary' :
                        user.type === 'admin'  ? 'bg-primary-container/10 border-primary/20 text-primary/80' :
                        user.type === 'banned' ? 'bg-error/10 border-error/30 text-error' :
                        'bg-surface-container-high border-outline-variant text-on-surface-variant'
                      }`}>
                        {user.role.replace(/\p{Emoji}/gu, '').trim()}
                      </span>
                    </div>
                    <p className="text-on-surface-variant text-xs font-mono truncate mb-1 select-all">{user.email}</p>
                    {user.details && (
                      <p className="text-xs italic text-on-surface-variant/70 leading-relaxed">{user.details}</p>
                    )}
                  </div>

                  {/* Actions */}
                  {user.type !== 'master' && (
                    <div className="grid grid-cols-3 md:flex md:flex-row gap-2 w-full md:w-auto self-end md:self-center flex-shrink-0">
                      {user.type !== 'banned' && (
                        <button
                          onClick={() => { setWarnEmail(user.email); setActiveSubTab('warnings'); }}
                          className="flex items-center justify-center gap-1.5 border border-outline-variant py-2 px-3 rounded-lg text-xs font-mono hover:bg-surface-container-high active:scale-95 transition-all"
                          title="Invia Lettera di Ammonimento">
                          <Mail size={13} /> <span>Monito</span>
                        </button>
                      )}
                      {user.type === 'member' && (
                        <button
                          onClick={() => { setPromoteEmail(user.email); setActiveSubTab('admins'); }}
                          className="flex items-center justify-center gap-1.5 border border-primary/50 py-2 px-3 rounded-lg text-xs font-mono text-primary hover:bg-primary/10 active:scale-95 transition-all"
                          title="Nomina Admin">
                          <UserPlus size={13} /> <span>Promuovi</span>
                        </button>
                      )}
                      {user.type === 'admin' && (
                        <button
                          onClick={() => onRemoveAdmin(user.email)}
                          className="flex items-center justify-center gap-1.5 border border-outline-variant py-2 px-3 rounded-lg text-xs font-mono hover:bg-surface-container-high active:scale-95 transition-all col-span-1"
                          title="Rimuovi Admin">
                          <Trash2 size={13} /> <span>Rimuovi</span>
                        </button>
                      )}
                      {user.type !== 'banned' ? (
                        <button
                          onClick={() => { setBanEmail(user.email); setActiveSubTab('bans'); }}
                          className="flex items-center justify-center gap-1.5 border border-error/50 py-2 px-3 rounded-lg text-xs font-mono text-error hover:bg-error/10 active:scale-95 transition-all"
                          title="Esilia">
                          <UserX size={13} /> <span>Esilia</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onUnbanUser(user.email)}
                          className="flex items-center justify-center gap-1.5 border border-teal-500/40 py-2 px-3 rounded-lg text-xs font-mono text-teal-400 hover:bg-teal-500/10 active:scale-95 transition-all col-span-3"
                          title="Grazia">
                          <ShieldCheck size={13} /> <span>Concedi Grazia</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ TAB: admins ══ */}
        {activeSubTab === 'admins' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-[fadeIn_0.2s_ease]">
            <div className="bg-gradient-to-br from-surface-container to-surface-container-low border border-outline-variant rounded-xl p-6">
              <h3 className="font-serif text-lg text-primary mb-5 flex items-center gap-2">
                <UserPlus size={18} /> Nomina Nuovo Admin
              </h3>
              <form onSubmit={handlePromote} className="space-y-4">
                <div className="relative">
                  <label className="block text-xs font-mono text-on-surface-variant mb-1">Indirizzo Email dell'Utente</label>
                  <input type="email" required placeholder="nomeutente@gmail.com" value={promoteEmail}
                    onChange={(e) => setPromoteEmail(e.target.value)}
                    onFocus={() => setShowPromoteSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowPromoteSuggestions(false), 200)}
                    className="w-full bg-surface-container-lowest border border-outline-variant focus:border-primary rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none transition-all placeholder:text-outline"
                  />
                  {showPromoteSuggestions && promoteSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-36 overflow-y-auto bg-surface-container-lowest border border-primary/40 rounded-lg shadow-2xl">
                      {promoteSuggestions.map((email) => (
                        <button key={email} type="button"
                          onMouseDown={(e) => { e.preventDefault(); setPromoteEmail(email); setShowPromoteSuggestions(false); }}
                          className="w-full text-left px-3 py-1.5 text-xs font-mono text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors border-b border-outline-variant/30 last:border-0">
                          {email}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="submit" disabled={isSubmitting}
                  className="w-full bg-primary-container/20 hover:bg-primary-container/30 text-primary py-2.5 px-4 rounded-lg border border-primary/50 hover:border-primary transition-all text-xs uppercase font-mono tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50">
                  {isSubmitting ? 'Inscrizione...' : 'Elevare a Grimoire Admin ⚜️'}
                </button>
              </form>
              <p className="mt-4 text-xs font-serif text-on-surface-variant/50 italic leading-relaxed border-t border-outline-variant/40 pt-3">
                L'utente riceverà una pergamena dorata notificandogli il grado d'onore e l'accesso esclusivo.
              </p>
            </div>

            <div className="bg-gradient-to-br from-surface-container to-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col">
              <h3 className="font-serif text-lg text-on-surface mb-4">Consiglio degli Amministratori</h3>
              <div className="flex-1 overflow-y-auto max-h-64 space-y-2 pr-1">
                {adminsList.length === 0 ? (
                  <p className="text-xs font-serif text-on-surface-variant/50 italic text-center py-8">Nessun amministratore designato.</p>
                ) : adminsList.map((admin) => (
                  <div key={admin.email} className="flex items-center justify-between p-3 rounded-lg border border-outline-variant bg-surface-container-lowest hover:border-primary/30 transition-all">
                    <div>
                      <p className="text-sm font-medium text-on-surface truncate max-w-[200px]">{admin.email}</p>
                      <p className="text-[10px] font-mono text-on-surface-variant mt-0.5">{new Date(admin.createdAt).toLocaleDateString('it-IT')} — {admin.promotedBy?.split('@')[0]}</p>
                    </div>
                    <button onClick={() => onRemoveAdmin(admin.email)}
                      className="text-on-surface-variant hover:text-error transition-colors p-1.5 rounded hover:bg-error/10" title="Rimuovi Admin">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: bans ══ */}
        {activeSubTab === 'bans' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-[fadeIn_0.2s_ease]">
            <div className="bg-gradient-to-br from-surface-container to-surface-container-low border border-outline-variant rounded-xl p-6">
              <h3 className="font-serif text-lg text-error mb-5 flex items-center gap-2">
                <ShieldAlert size={18} /> Decreto d'Esilio
              </h3>
              <form onSubmit={handleBan} className="space-y-4">
                <div className="relative">
                  <label className="block text-xs font-mono text-on-surface-variant mb-1">Email dell'Eretico</label>
                  <input type="email" required placeholder="eretico@gmail.com" value={banEmail}
                    onChange={(e) => setBanEmail(e.target.value)}
                    onFocus={() => setShowBanSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowBanSuggestions(false), 200)}
                    className="w-full bg-surface-container-lowest border border-outline-variant focus:border-error rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none transition-all placeholder:text-outline"
                  />
                  {showBanSuggestions && banSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-36 overflow-y-auto bg-surface-container-lowest border border-error/40 rounded-lg shadow-2xl">
                      {banSuggestions.map((email) => (
                        <button key={email} type="button"
                          onMouseDown={(e) => { e.preventDefault(); setBanEmail(email); setShowBanSuggestions(false); }}
                          className="w-full text-left px-3 py-1.5 text-xs font-mono text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors border-b border-outline-variant/30 last:border-0">
                          {email}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-mono text-on-surface-variant mb-1">Motivo dell'Esilio</label>
                  <textarea required rows={3} placeholder="E.g., Pubblicazione di schede blasfeme o spam ripetuto..."
                    value={banReasonInput} onChange={(e) => setBanReasonInput(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant focus:border-error rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none transition-all placeholder:text-outline resize-none" />
                </div>
                <button type="submit" disabled={isSubmitting}
                  className="w-full bg-error/10 hover:bg-error/20 text-error py-2.5 px-4 rounded-lg border border-error/50 hover:border-error transition-all text-xs uppercase font-mono tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50">
                  {isSubmitting ? 'Inscrizione...' : 'Bandisci dal Regno 🚫'}
                </button>
              </form>
            </div>

            <div className="bg-gradient-to-br from-surface-container to-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col">
              <h3 className="font-serif text-lg text-on-surface mb-4">Anime Bandite dal Grembo</h3>
              <div className="flex-1 overflow-y-auto max-h-64 space-y-2 pr-1">
                {bannedList.length === 0 ? (
                  <p className="text-xs font-serif text-on-surface-variant/50 italic text-center py-8">Nessun utente sotto giudizio d'esilio.</p>
                ) : bannedList.map((ban) => (
                  <div key={ban.email} className="p-3 rounded-lg border border-error/30 bg-error/5 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-error truncate">{ban.email}</p>
                      <p className="text-xs font-serif text-on-surface-variant italic leading-snug mt-0.5">"{ban.reason}"</p>
                      <p className="text-[9px] font-mono text-on-surface-variant/50 mt-1">{new Date(ban.createdAt).toLocaleDateString('it-IT')} — {ban.bannedBy?.split('@')[0]}</p>
                    </div>
                    <button onClick={() => onUnbanUser(ban.email)}
                      className="text-on-surface-variant hover:text-teal-400 transition-colors p-1.5 rounded hover:bg-teal-400/10 flex-shrink-0" title="Concedi Grazia">
                      <ShieldCheck size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: warnings ══ */}
        {activeSubTab === 'warnings' && (
          <div className="max-w-xl mx-auto animate-[fadeIn_0.2s_ease]">
            <div className="bg-gradient-to-br from-surface-container to-surface-container-low border border-outline-variant rounded-xl p-6">
              <h3 className="font-serif text-lg text-blue-400 mb-5 flex items-center gap-2">
                <Send size={18} /> Spedisci Lettera di Monito Arcana
              </h3>
              <form onSubmit={handleSendWarning} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-xs font-mono text-on-surface-variant mb-1">Destinatario (Email)</label>
                    <input type="email" required placeholder="utente@gmail.com" value={warnEmail}
                      onChange={(e) => setWarnEmail(e.target.value)}
                      onFocus={() => setShowWarnSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowWarnSuggestions(false), 200)}
                      className="w-full bg-surface-container-lowest border border-outline-variant focus:border-blue-700 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none transition-all placeholder:text-outline"
                    />
                    {showWarnSuggestions && warnSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 z-50 mt-1 max-h-36 overflow-y-auto bg-surface-container-lowest border border-blue-900/40 rounded-lg shadow-2xl">
                        {warnSuggestions.map((email) => (
                          <button key={email} type="button"
                            onMouseDown={(e) => { e.preventDefault(); setWarnEmail(email); setShowWarnSuggestions(false); }}
                            className="w-full text-left px-3 py-1.5 text-xs font-mono text-on-surface-variant hover:bg-blue-950/60 hover:text-blue-400 transition-colors border-b border-outline-variant/30 last:border-0">
                            {email}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-on-surface-variant mb-1">Soggetto della Pergamena</label>
                    <input type="text" required placeholder="Soggetto" value={warnSubject}
                      onChange={(e) => setWarnSubject(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant focus:border-blue-700 rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none transition-all placeholder:text-outline"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-mono text-on-surface-variant mb-1">Runa di Ammonimento (Messaggio)</label>
                  <textarea required rows={5} placeholder="Il Tempio osserva ogni tua azione..."
                    value={warnContent} onChange={(e) => setWarnContent(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant focus:border-blue-700 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none transition-all placeholder:text-outline resize-none font-serif leading-relaxed"
                  />
                </div>
                <button type="submit" disabled={isSubmitting}
                  className="w-full bg-blue-950/80 hover:bg-blue-900 text-blue-200 hover:text-white py-2.5 px-4 rounded-lg border border-blue-900 hover:border-blue-700 transition-all text-xs uppercase font-mono tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50">
                  {isSubmitting ? 'Inscrizione...' : 'Consegna Messaggio Solenne ✉️'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* ── Decorative footer ── */}
      <div className="mt-16 flex flex-col items-center opacity-20 select-none pointer-events-none">
        <div className="w-24 h-24 border-4 border-dashed border-outline-variant rounded-full flex items-center justify-center animate-[spin_20s_linear_infinite]">
          <span className="text-4xl">⚜</span>
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-on-surface-variant">Grimorio Attivo</p>
      </div>

    </div>
  );
}

import { useState, useEffect, useMemo, FormEvent } from 'react';
import { Admin, BannedUser, UserProfile } from '../types';
import { UserPlus, ShieldAlert, ShieldCheck, Mail, Trash2, Send, Lock, UserX, FileText, Users, Search } from 'lucide-react';

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

    const masterEmail = "silvestrofrisullo@gmail.com";

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

    userMap.set(masterEmail, {
      email: masterEmail,
      name: 'Silvestro Frisullo',
      role: 'Master Admin ⚜️',
      type: 'master',
      createdAt: 'Origine dei Tempi',
      details: 'Sovrano e Creatore del Grembo'
    });

    adminsList.forEach(admin => {
      const email = admin.email.toLowerCase().trim();
      const isMaster = email === masterEmail || admin.role === 'master';
      const existing = userMap.get(email);

      userMap.set(email, {
        email: admin.email,
        name: isMaster ? 'Silvestro Frisullo' : (existing?.name || email.split('@')[0]),
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
  }, [knownUsers, adminsList, bannedList, communityCharacters]);

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
    <div className="bg-surface/95 border border-border shadow-[0_4px_30px_rgba(0,0,0,0.4)] rounded-lg p-6 max-w-4xl w-full mx-auto font-sans relative">
      {/* Decorative top header line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700"></div>

      {/* Title */}
      <div className="flex items-center justify-between mb-6 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-950/40 border border-amber-800 rounded flex items-center justify-center text-amber-500 shadow-lg">
            <Lock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-amber-500 uppercase font-sans">
              Corte del Grimorio
            </h2>
            <p className="text-xs font-mono text-gray-400">
              Pannello dell'Admin Master — Consiglio Sacro
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white bg-surface-dark border border-border hover:border-gray-600 px-3 py-1 rounded transition-all text-xs"
        >
          Chiudi Portale
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border/40 pb-2">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded font-medium border transition-all select-none ${
            activeSubTab === 'users'
              ? 'bg-amber-950/30 text-amber-500 border-amber-800 shadow-md font-bold'
              : 'bg-transparent text-gray-400 border-transparent hover:text-white hover:bg-surface-dark/40'
          }`}
        >
          <Users className="w-4 h-4" />
          Elenco Utenti ({systemUsers.length})
        </button>
        <button
          onClick={() => setActiveSubTab('admins')}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded font-medium border transition-all select-none ${
            activeSubTab === 'admins'
              ? 'bg-amber-950/30 text-amber-500 border-amber-800 shadow-md'
              : 'bg-transparent text-gray-400 border-transparent hover:text-white hover:bg-surface-dark/40'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Amministratori ({adminsList.length})
        </button>
        <button
          onClick={() => setActiveSubTab('bans')}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded font-medium border transition-all select-none ${
            activeSubTab === 'bans'
              ? 'bg-amber-950/30 text-rose-500 border-rose-900 shadow-md'
              : 'bg-transparent text-gray-400 border-transparent hover:text-white hover:bg-surface-dark/40'
          }`}
        >
          <UserX className="w-4 h-4" />
          Membri Esiliati ({bannedList.length})
        </button>
        <button
          onClick={() => setActiveSubTab('warnings')}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded font-medium border transition-all select-none ${
            activeSubTab === 'warnings'
              ? 'bg-amber-950/30 text-blue-400 border-blue-900 shadow-md'
              : 'bg-transparent text-gray-400 border-transparent hover:text-white hover:bg-surface-dark/40'
          }`}
        >
          <Mail className="w-4 h-4" />
          Invia Ammonimento
        </button>
      </div>

      {/* Tabs Body */}
      <div className="min-h-[300px]">
        {/* TAB 0: ALL USERS REGISTRY */}
        {activeSubTab === 'users' && (
          <div className="space-y-4 animate-fade-in">
            {/* Search filter bar */}
            <div className="flex items-center gap-3 bg-slate-950 border border-border/60 hover:border-amber-900/40 rounded-lg px-4 py-2.5 transition-all focus-within:border-amber-800">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca un'anima per indirizzo email, nome, ruolo o scheda stampata..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="bg-transparent border-none text-sm text-white focus:outline-none w-full placeholder-gray-600 font-sans"
              />
              {userSearchQuery && (
                <button 
                  onClick={() => setUserSearchQuery('')} 
                  className="text-xs text-amber-500 hover:text-amber-400 font-mono px-2 py-1 select-none focus:outline-none"
                >
                  Sgombra
                </button>
              )}
            </div>

            {/* Users dynamic table-like feed */}
            <div className="bg-surface-dark/40 border border-border/50 rounded-lg p-5">
              <div className="flex justify-between items-center mb-4 border-b border-border/30 pb-3">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Users className="w-4 h-4 text-amber-500" /> Registro delle Anime del Grembo
                </h3>
                <span className="text-[10px] font-mono text-gray-400 bg-background border border-border/80 px-2 py-1 rounded">
                  {filteredSystemUsers.length} Trovati / {systemUsers.length} Totali
                </span>
              </div>
              
              <div className="overflow-y-auto max-h-[350px] space-y-3 pr-1">
                {filteredSystemUsers.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-xs text-gray-500 font-mono italic">
                      Nessuna anima registrata risponde al criterio inciso sul papiro.
                    </p>
                  </div>
                ) : (
                  filteredSystemUsers.map((user) => (
                    <div
                      key={user.email}
                      className={`p-3.5 rounded border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        user.type === 'master'
                          ? 'border-amber-900/60 bg-amber-950/10 hover:bg-amber-950/15'
                          : user.type === 'admin'
                          ? 'border-yellow-905 bg-yellow-950/5 hover:bg-yellow-950/10'
                          : user.type === 'banned'
                          ? 'border-rose-950 bg-rose-950/10 hover:bg-rose-950/15'
                          : 'border-border/60 bg-background/25 hover:bg-background/40'
                      }`}
                    >
                      <div className="min-w-0 flex-1 flex gap-3 items-start">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 border shadow-sm ${
                          user.type === 'master' ? 'bg-amber-550/10 border-amber-500 text-amber-500 shadow-amber-500/10' :
                          user.type === 'admin' ? 'bg-yellow-550/10 border-yellow-500/80 text-yellow-500' :
                          user.type === 'banned' ? 'bg-rose-500/15 border-rose-800 text-rose-500 shadow-rose-500/10' :
                          'bg-gray-500/10 border-gray-600/80 text-gray-400'
                        }`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-white truncate max-w-[200px]" title={user.name}>
                              {user.name}
                            </span>
                            <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded border leading-none ${
                              user.type === 'master' ? 'bg-amber-950/35 text-amber-550 border-amber-850' :
                              user.type === 'admin' ? 'bg-yellow-950/25 text-yellow-450 border-yellow-850' :
                              user.type === 'banned' ? 'bg-rose-950/45 text-rose-455 border-rose-900' :
                              'bg-blue-950/25 text-blue-400 border-blue-900/40'
                            }`}>
                              {user.role}
                            </span>
                          </div>
                          <p className="text-xs font-mono text-gray-400 truncate mt-0.5 selection:bg-amber-950">
                            {user.email}
                          </p>
                          {user.details && (
                            <p className="text-[11px] font-serif text-gray-300 mt-1 italic leading-relaxed">
                              {user.details}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Quick actions Panel */}
                      <div className="flex items-center gap-2 self-end md:self-center">
                        {user.type !== 'master' && (
                          <>
                            {user.type !== 'banned' && (
                              <button
                                onClick={() => {
                                  setWarnEmail(user.email);
                                  setActiveSubTab('warnings');
                                }}
                                className="px-2.5 py-1.5 bg-blue-955 hover:bg-blue-900 text-blue-200 hover:text-white rounded border border-blue-900/60 transition-all text-xs font-mono flex items-center gap-1.5 shadow"
                                title="Invia Lettera di Ammonimento"
                              >
                                <Mail className="w-3.5 h-3.5 text-blue-400" />
                                <span>Monito</span>
                              </button>
                            )}
                            
                            {user.type === 'member' && (
                              <button
                                onClick={() => {
                                  setPromoteEmail(user.email);
                                  setActiveSubTab('admins');
                                }}
                                className="px-2.5 py-1.5 bg-amber-955 hover:bg-amber-900 text-amber-200 hover:text-white rounded border border-amber-850 transition-all text-xs font-mono flex items-center gap-1.5 shadow"
                                title="Nomina Coordinatore Amministratore"
                              >
                                <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                                <span>Promuovi</span>
                              </button>
                            )}

                            {user.type === 'admin' && (
                              <button
                                onClick={() => onRemoveAdmin(user.email)}
                                className="px-2.5 py-1.5 bg-pink-955 hover:bg-red-950 text-pink-200 hover:text-red-200 rounded border border-pink-905 transition-all text-xs font-mono flex items-center gap-1.5 shadow"
                                title="Rimuovi Carica Amministrativa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Rimuovi</span>
                              </button>
                            )}

                            {user.type !== 'banned' ? (
                              <button
                                onClick={() => {
                                  setBanEmail(user.email);
                                  setActiveSubTab('bans');
                                }}
                                className="px-2.5 py-1.5 bg-rose-955 hover:bg-rose-900 text-rose-200 hover:text-white rounded border border-rose-900 transition-all text-xs font-mono flex items-center gap-1.5 shadow"
                                title="Sfoltisci / Esilia dal Tempio"
                              >
                                <UserX className="w-3.5 h-3.5 text-rose-450" />
                                <span>Esilia</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => onUnbanUser(user.email)}
                                className="px-2.5 py-1.5 bg-teal-955 hover:bg-teal-900 text-teal-200 hover:text-white rounded border border-teal-850 transition-all text-xs font-mono flex items-center gap-1.5 shadow"
                                title="Sospendi Esilio (Concedi Grazia)"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                                <span>Grazia</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: ADMINS */}
        {activeSubTab === 'admins' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {/* Promotion Form */}
            <div className="bg-surface-dark/40 border border-border/50 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-amber-500 mb-4 uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-500" /> Nomina Nuovo Admin Master
              </h3>
              <form onSubmit={handlePromote} className="space-y-4">
                <div className="relative">
                  <label className="block text-xs font-mono text-gray-400 mb-1">
                    Indirizzo Email dell'Utente
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="nomeutente@gmail.com"
                    value={promoteEmail}
                    onChange={(e) => setPromoteEmail(e.target.value)}
                    onFocus={() => setShowPromoteSuggestions(true)}
                    onBlur={() => {
                      setTimeout(() => {
                        setShowPromoteSuggestions(false);
                      }, 200);
                    }}
                    className="w-full bg-background border border-border focus:border-amber-800 rounded px-3 py-2 text-sm text-white focus:outline-none transition-all placeholder-gray-600 font-sans"
                  />
                  {showPromoteSuggestions && promoteSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-36 overflow-y-auto bg-slate-950 border border-amber-900/40 rounded shadow-2xl backdrop-blur-sm animate-[fadeIn_0.15s_ease]">
                      {promoteSuggestions.map((email) => (
                        <button
                          key={email}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setPromoteEmail(email);
                            setShowPromoteSuggestions(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs font-mono text-gray-300 hover:bg-amber-950/60 hover:text-amber-400 transition-colors border-b border-white/5 last:border-b-0 focus:outline-none"
                        >
                          {email}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-amber-950 hover:bg-amber-900 text-amber-200 hover:text-white py-2 px-4 rounded border border-amber-800 hover:border-amber-700 transition-all text-xs uppercase font-mono tracking-wider flex items-center justify-center gap-2 shadow"
                >
                  {isSubmitting ? 'Inscrizione...' : 'Elevare a Grimoire Master ⚜️'}
                </button>
              </form>
              <div className="mt-4 bg-amber-950/10 border border-amber-950/30 p-3 rounded text-xs text-amber-600 leading-relaxed font-serif">
                Nota: L'utente riceverà una pergamena dorata istantanea notificandogli il grado d'onore e l'accesso esclusivo.
              </div>
            </div>

            {/* Admins List */}
            <div className="bg-surface-dark/40 border border-border/50 rounded-lg p-5 flex flex-col">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">
                Consiglio degli Amministratori
              </h3>
              <div className="flex-1 overflow-y-auto max-h-[220px] space-y-3 pr-1">
                {adminsList.length === 0 ? (
                  <p className="text-xs text-gray-500 font-mono italic text-center py-6">
                    Nessun amministratore designato.
                  </p>
                ) : (
                  adminsList.map((admin) => (
                    <div
                      key={admin.email}
                      className="flex items-center justify-between p-3 rounded border border-border bg-background/50 hover:bg-background/80 transition-all"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white truncate max-w-[200px]">
                          {admin.email}
                        </p>
                        <p className="text-[10px] font-mono text-gray-400">
                          {new Date(admin.createdAt).toLocaleDateString()} — {admin.promotedBy?.split('@')[0]}
                        </p>
                      </div>
                      <button
                        onClick={() => onRemoveAdmin(admin.email)}
                        className="text-gray-500 hover:text-red-500 transition-colors p-1"
                        title="Rimuovi Carica Admin"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BANS */}
        {activeSubTab === 'bans' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {/* Ban form */}
            <div className="bg-surface-dark/40 border border-border/50 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-rose-500 mb-4 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" /> Comanda Decreto d'Esilio
              </h3>
              <form onSubmit={handleBan} className="space-y-4">
                <div className="relative">
                  <label className="block text-xs font-mono text-gray-400 mb-1">
                    Indirizzo Email dell'Eretico
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="eretico@gmail.com"
                    value={banEmail}
                    onChange={(e) => setBanEmail(e.target.value)}
                    onFocus={() => setShowBanSuggestions(true)}
                    onBlur={() => {
                      setTimeout(() => {
                        setShowBanSuggestions(false);
                      }, 200);
                    }}
                    className="w-full bg-background border border-border focus:border-rose-900 rounded px-3 py-2 text-sm text-white focus:outline-none transition-all placeholder-gray-600 font-sans"
                  />
                  {showBanSuggestions && banSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 z-50 mt-1 max-h-36 overflow-y-auto bg-slate-950 border border-rose-900/40 rounded shadow-2xl backdrop-blur-sm animate-[fadeIn_0.15s_ease]">
                      {banSuggestions.map((email) => (
                        <button
                          key={email}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setBanEmail(email);
                            setShowBanSuggestions(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs font-mono text-gray-300 hover:bg-rose-950/60 hover:text-rose-400 transition-colors border-b border-white/5 last:border-b-0 focus:outline-none"
                        >
                          {email}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">
                    Atto dell'Accusa / Motivo dell'esilio
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="E.g., Pubblicazione di schede blasfeme o spam ripetuto..."
                    value={banReasonInput}
                    onChange={(e) => setBanReasonInput(e.target.value)}
                    className="w-full bg-background border border-border focus:border-rose-955 rounded px-3 py-2 text-xs text-white focus:outline-none transition-all placeholder-gray-600 font-sans resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-rose-950/80 hover:bg-rose-900 text-rose-200 hover:text-white py-2 px-4 rounded border border-rose-900 hover:border-rose-800 transition-all text-xs uppercase font-mono tracking-wider flex items-center justify-center gap-2 shadow"
                >
                  {isSubmitting ? 'Inscrizione...' : 'Bandisci dal Regno 🚫'}
                </button>
              </form>
            </div>

            {/* Banned list */}
            <div className="bg-surface-dark/40 border border-border/50 rounded-lg p-5 flex flex-col">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">
                Anime Bandite dal Grembo
              </h3>
              <div className="flex-1 overflow-y-auto max-h-[220px] space-y-3 pr-1">
                {bannedList.length === 0 ? (
                  <p className="text-xs text-gray-500 font-mono italic text-center py-6">
                    Nessun utente sotto giudizio d'esilio.
                  </p>
                ) : (
                  bannedList.map((ban) => (
                    <div
                      key={ban.email}
                      className="p-3 rounded border border-rose-950 bg-rose-950/5 hover:bg-rose-950/10 transition-all flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-red-400 truncate">
                          {ban.email}
                        </p>
                        <p className="text-xs font-serif text-gray-300 leading-snug mt-1 italic">
                          " {ban.reason} "
                        </p>
                        <p className="text-[9px] font-mono text-gray-500 mt-2">
                          {new Date(ban.createdAt).toLocaleDateString()} — Bandito da {ban.bannedBy?.split('@')[0]}
                        </p>
                      </div>
                      <button
                        onClick={() => onUnbanUser(ban.email)}
                        className="text-gray-500 hover:text-green-500 transition-colors p-1"
                        title="Concedi Grazia (Revoca Esilio)"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: WARNING COURIER */}
        {activeSubTab === 'warnings' && (
          <div className="max-w-xl mx-auto animate-fade-in">
            <div className="bg-surface-dark/40 border border-border/50 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-blue-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-400" /> Spedisci Lettera di Monito Arcana
              </h3>
              <form onSubmit={handleSendWarning} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-xs font-mono text-gray-400 mb-1">
                      Destinatario (Email)
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="utente@gmail.com"
                      value={warnEmail}
                      onChange={(e) => setWarnEmail(e.target.value)}
                      onFocus={() => setShowWarnSuggestions(true)}
                      onBlur={() => {
                        setTimeout(() => {
                          setShowWarnSuggestions(false);
                        }, 200);
                      }}
                      className="w-full bg-background border border-border focus:border-blue-900 rounded px-3 py-2 text-sm text-white focus:outline-none transition-all placeholder-gray-600 font-sans"
                    />
                    {showWarnSuggestions && warnSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 z-50 mt-1 max-h-36 overflow-y-auto bg-slate-950 border border-blue-900/40 rounded shadow-2xl backdrop-blur-sm animate-[fadeIn_0.15s_ease]">
                        {warnSuggestions.map((email) => (
                          <button
                            key={email}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setWarnEmail(email);
                              setShowWarnSuggestions(false);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs font-mono text-gray-300 hover:bg-blue-950/60 hover:text-blue-400 transition-colors border-b border-white/5 last:border-b-0 focus:outline-none"
                          >
                            {email}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">
                      Sigillo e Soggetto della Pergamena
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Soggetto"
                      value={warnSubject}
                      onChange={(e) => setWarnSubject(e.target.value)}
                      className="w-full bg-background border border-border focus:border-blue-900 rounded px-3 py-2 text-sm text-white focus:outline-none transition-all placeholder-gray-600 font-sans"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">
                    Runa di Ammonimento (Messaggio Corposo)
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Il Tempio osserva ogni tua azione. La scheda da te pubblicata presenta contenuti impropri..."
                    value={warnContent}
                    onChange={(e) => setWarnContent(e.target.value)}
                    className="w-full bg-background border border-border focus:border-blue-900 rounded px-3 py-2 text-xs text-white focus:outline-none transition-all placeholder-gray-600 font-sans resize-none font-serif leading-relaxed"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-950/80 hover:bg-blue-900 text-blue-200 hover:text-white py-2 px-4 rounded border border-blue-900 hover:border-blue-800 transition-all text-xs uppercase font-mono tracking-wider flex items-center justify-center gap-2 shadow"
                >
                  {isSubmitting ? 'Inscrizione...' : 'Consegna Messaggio Solenne ✉️'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

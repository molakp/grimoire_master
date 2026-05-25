import { useState, useMemo, FormEvent } from 'react';
import { CharacterTemplate, Character, Spell, Mail, BannedUser, Admin, UserProfile } from '../types';
import { COMMUNITY_CHARACTERS } from '../data';
import { useTemplates } from '../hooks/useTemplates';
import { LayoutGrid, List, Search, ArrowDown, ClipboardCopy, Bookmark, Star, ArrowRight, UserPlus, Sparkles, LogOut, LogIn, CloudLightning, Shield, Mail as MailIcon, PlusCircle, Trash2, BookOpen, Skull, AlertCircle, Users } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import AdminCourt from './AdminCourt';
import CharacterCreationWizard from './CharacterCreationWizard';

interface DashboardProps {
  onImportCharacter: (character: Character) => void;
  myCharacters: Character[];
  onSelectCharacter: (id: string) => void;
  onDeleteCharacter: (id: string) => void;
  currentUser: FirebaseUser | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isAuthLoading: boolean;

  // Admin / community syncing
  isAdmin?: boolean;
  isMasterAdmin?: boolean;
  officialTemplates: CharacterTemplate[];
  communityCharacters: any[];
  unreadMails: Mail[];
  allMails: Mail[];
  adminsList: Admin[];
  bannedList: BannedUser[];
  knownUsers: UserProfile[];

  onPromoteAdmin: (email: string) => Promise<void>;
  onRemoveAdmin: (email: string) => Promise<void>;
  onBanUser: (email: string, reason: string) => Promise<void>;
  onUnbanUser: (email: string) => Promise<void>;
  onSendWarnMail: (email: string, subject: string, content: string) => Promise<void>;
  onMarkMailRead: (mailId: string) => Promise<void>;
  onAddOfficialTemplate: (template: CharacterTemplate) => Promise<void>;
  onDeleteOfficialTemplate: (templateId: string) => Promise<void>;
  onPublishCommunityCharacter: (char: Character, description: string) => Promise<void>;
  onDeleteCommunityCharacter: (commId: string) => Promise<void>;
}

export default function Dashboard({
  onImportCharacter,
  myCharacters,
  onSelectCharacter,
  onDeleteCharacter,
  currentUser,
  onSignIn,
  onSignOut,
  isAuthLoading,

  isAdmin = false,
  isMasterAdmin = false,
  officialTemplates = [],
  communityCharacters = [],
  unreadMails = [],
  allMails = [],
  adminsList = [],
  bannedList = [],
  knownUsers = [],

  onPromoteAdmin,
  onRemoveAdmin,
  onBanUser,
  onUnbanUser,
  onSendWarnMail,
  onMarkMailRead,
  onAddOfficialTemplate,
  onDeleteOfficialTemplate,
  onPublishCommunityCharacter,
  onDeleteCommunityCharacter,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'my-characters' | 'court'>('my-characters');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All Classes');
  const [minLevelFilter, setMinLevelFilter] = useState('Level 1');
  const [ratingFilter, setRatingFilter] = useState('Top Rated');
  const [isGridView, setIsGridView] = useState(true);

  // Secure deletion states
  const [characterToDelete, setCharacterToDelete] = useState<Character | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  // Correspondence mailbox popup state
  const [isMailboxOpen, setIsMailboxOpen] = useState(false);
  const [selectedMail, setSelectedMail] = useState<Mail | null>(null);

  // New Official Template Creation Modal state
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateClass, setNewTemplateClass] = useState('Il Guerriero');
  const [newTemplateType, setNewTemplateType] = useState<'Core Class' | 'Arcane Class' | 'Shadow Class' | 'Divine Class'>('Core Class');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplateIcon, setNewTemplateIcon] = useState('swords');
  const [newTemplateLayoutBase, setNewTemplateLayoutBase] = useState<'thalric' | 'grom' | 'allister'>('thalric');

  // Character creation wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardTemplateId, setWizardTemplateId] = useState<string | undefined>(undefined);

  // Share character to community card index state
  const [characterToPublish, setCharacterToPublish] = useState<Character | null>(null);
  const [publishDescriptionInput, setPublishDescriptionInput] = useState('');


  const { templates: baseTemplates, loading: templatesLoading } = useTemplates();

  // Filter templates merging Firestore dynamic ones
  const filteredTemplates = useMemo(() => {
    const combined = [...baseTemplates, ...officialTemplates];
    return combined.filter((template) => {
      const matchSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          template.class.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [searchQuery, officialTemplates, baseTemplates]);

  // Filter community characters merging Firestore live ones
  const filteredCommunity = useMemo(() => {
    const combined = [...COMMUNITY_CHARACTERS, ...communityCharacters];
    return combined.filter((char) => {
      const matchSearch = char.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          char.class.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          char.author.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchClass = classFilter === 'All Classes' || char.class.includes(classFilter) || char.class === 'Il ' + classFilter;
      
      const charLvl = char.level;
      let matchLvl = true;
      if (minLevelFilter === 'Level 5') matchLvl = charLvl >= 5;
      else if (minLevelFilter === 'Level 10') matchLvl = charLvl >= 10;

      return matchSearch && matchClass && matchLvl;
    }).sort((a, b) => {
      if (ratingFilter === 'Top Rated') return b.rating - a.rating;
      if (ratingFilter === 'Newest') return b.level - a.level; // Mock proxy
      return 0;
    });
  }, [searchQuery, classFilter, minLevelFilter, ratingFilter, communityCharacters]);

  const handleStartWizard = (template?: CharacterTemplate) => {
    setWizardTemplateId(template?.id);
    setIsWizardOpen(true);
  };

  const handleCreateFromWizard = (character: Character) => {
    onImportCharacter(character);
    setIsWizardOpen(false);
    setWizardTemplateId(undefined);
    setActiveTab('my-characters');
  };

  const handleCreateOfficialTemplateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    // Use baseline defaults derived from Thalric
    const baselineStats: Character = {
      id: `temp_char_${Date.now()}`,
      name: `Eroe ${newTemplateName}`,
      class: newTemplateClass,
      level: 1,
      experience: 0,
      avatar: newTemplateIcon === 'swords' 
        ? 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=300&auto=format&fit=crop'
        : 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=300&auto=format&fit=crop',
      attributes: { INT: 15, FOR: 13, DES: 12, COS: 14, SAG: 10, CAR: 8 },
      vitality: { max: 20, current: 20 },
      armor: 2,
      damageDie: 'D8',
      race: 'UMANO',
      alignment: 'NEUTRALE',
      bonds: [
        { companion: '', statement: 'ricoprirà un ruolo importante.' },
        { companion: '', statement: 'mi sta nascondendo un segreto.' }
      ],
      gear: [
        { name: 'Arma Comune', weight: 1 },
        { name: 'Razioni (3)', weight: 1 }
      ],
      maxWeight: 8,
      locked: false,
      preparedSpellNames: []
    };

    const newTemplate: CharacterTemplate = {
      id: `t_dynamic_${Date.now()}`,
      name: newTemplateName,
      class: newTemplateClass,
      type: newTemplateType,
      description: newTemplateDesc || 'Nessuna descrizione incisa.',
      icon: newTemplateIcon,
      avatar: newTemplateIcon === 'swords' 
        ? 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=300&auto=format&fit=crop'
        : 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=300&auto=format&fit=crop',
      defaultStats: baselineStats
    };

    await onAddOfficialTemplate(newTemplate);
    
    setNewTemplateName('');
    setNewTemplateDesc('');
    setIsCreateTemplateOpen(false);
  };


  const handleCloneCommunity = (commChar: typeof COMMUNITY_CHARACTERS[0]) => {
    // Populate stats matching the community metadata safely
    const newChar: Character = {
      id: `${commChar.id}_clone_${Date.now()}`,
      name: commChar.name,
      level: commChar.level,
      class: commChar.class,
      experience: 0,
      isCustom: true,
      avatar: commChar.avatar,
      attributes: commChar.class.includes('Mago') 
        ? { INT: 16, FOR: 8, DES: 12, COS: 13, SAG: 15, CAR: 9 }
        : commChar.class.includes('Guerriero')
        ? { INT: 9, FOR: 16, DES: 13, COS: 15, SAG: 12, CAR: 8 }
        : commChar.class.includes('Ladro')
        ? { INT: 13, FOR: 9, DES: 16, COS: 12, SAG: 15, CAR: 8 }
        : { INT: 12, FOR: 15, DES: 9, COS: 13, SAG: 16, CAR: 8 }, // Paladin
      vitality: {
        max: commChar.class.includes('Guerriero') ? 24 : commChar.class.includes('Ladro') ? 18 : 20,
        current: commChar.class.includes('Guerriero') ? 24 : commChar.class.includes('Ladro') ? 18 : 20
      },
      armor: commChar.class.includes('Guerriero') ? 3 : commChar.class.includes('Paladino') ? 4 : 1,
      damageDie: commChar.class.includes('Guerriero') ? 'D10' : commChar.class.includes('Ladro') ? 'D8' : 'D4',
      race: 'UMANO',
      alignment: 'NEUTRALE',
      bonds: [
        { companion: '', statement: 'ricoprirà un ruolo importante.' },
        { companion: '', statement: 'mi sta nascondendo un segreto.' }
      ],
      gear: [
        { name: 'Spada Antica', weight: 1 },
        { name: 'Razioni (5)', weight: 1 }
      ],
      maxWeight: 8,
      locked: false,
      preparedSpellNames: commChar.class.includes('Mago') ? ['Luce', 'Prestidigitazione'] : []
    };
    onImportCharacter(newChar);
  };

  return (
    <div className="min-h-screen text-on-background bg-background parchment-bg selection:bg-primary-container selection:text-on-primary-container font-sans">
      
      {/* Search Header for Mobile / Desktop filter routing */}
      <header className="sticky top-0 z-[60] bg-surface-container-low/95 backdrop-blur-md border-b border-outline-variant shadow-md flex justify-between items-center px-4 md:px-12 py-4">
        <div className="flex items-center gap-12">
          <h1 className="font-serif text-3xl text-primary font-bold tracking-tight drop-shadow-[0_0_12px_rgba(242,202,80,0.3)]">
            Grimoire Master
          </h1>
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => setActiveTab('my-characters')}
              className={`font-semibold pb-1 border-b-2 font-sans transition-all ${
                activeTab === 'my-characters'
                  ? 'text-primary border-primary'
                  : 'text-on-surface-variant border-transparent hover:text-primary'
              }`}
            >
              My Characters ({myCharacters.length})
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`font-semibold pb-1 border-b-2 font-sans transition-all ${
                activeTab === 'library'
                  ? 'text-primary border-primary'
                  : 'text-on-surface-variant border-transparent hover:text-primary'
              }`}
            >
              Library &amp; Templates
            </button>
            {isMasterAdmin && (
              <button
                onClick={() => setActiveTab('court')}
                className={`font-semibold pb-1 border-b-2 font-sans transition-all flex items-center gap-1.5 ${
                  activeTab === 'court'
                    ? 'text-amber-500 border-amber-500 font-bold'
                    : 'text-on-surface-variant border-transparent hover:text-amber-500'
                }`}
              >
                <Shield size={14} className="text-amber-500 animate-pulse" />
                <span>Corte del Grimorio</span>
              </button>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <input
              type="text"
              placeholder="Search the archive..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface-container-lowest border border-outline-variant rounded-full pl-4 pr-10 py-1.5 text-on-surface focus:outline-none focus:border-primary transition-all w-64 text-sm"
            />
            <Search className="absolute right-3 top-2 w-4 h-4 text-outline" />
          </div>

          {/* Envelope Letters Mailbox Icon */}
          {currentUser && (
            <button
              onClick={() => setIsMailboxOpen(true)}
              className="relative p-2 rounded-full border border-outline-variant hover:border-amber-500 hover:shadow-[0_0_10px_rgba(242,202,80,0.12)] bg-surface-container-low hover:bg-surface-container transition-all"
              title="Pergamene & Lettere di Gilda"
            >
              <MailIcon size={16} className={unreadMails.length > 0 ? "text-amber-500 animate-pulse" : "text-outline"} />
              {unreadMails.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-600 text-[8px] font-mono font-bold text-white px-1 py-0.5 rounded-full animate-bounce">
                  {unreadMails.length}
                </span>
              )}
            </button>
          )}



          {/* Firebase Authentication UI Badge */}
          <div className="flex items-center gap-2 border-l border-outline-variant pl-4">
            {isAuthLoading ? (
              <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            ) : currentUser ? (
              <div className="flex items-center gap-3">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-[10px] uppercase font-mono text-primary font-bold tracking-wider">Gilda Cloud</span>
                  <span className="text-xs text-on-surface max-w-[120px] truncate" title={currentUser.email || ''}>
                    {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-full border border-primary/40 overflow-hidden shadow-[0_0_8px_rgba(242,202,80,0.15)]">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="User Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/25 flex items-center justify-center font-bold text-xs text-primary">
                      {currentUser.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  title="Disconnetti"
                  className="p-1.5 rounded hover:bg-surface-container-highest text-on-surface-variant hover:text-red-400 transition-colors"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                className="px-3.5 py-1.5 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-background text-xs font-bold uppercase tracking-wider rounded shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5"
              >
                <LogIn size={14} />
                <span className="hidden sm:inline">Accedi</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-16 pb-24 md:pb-12">
        
        {activeTab === 'court' && isMasterAdmin ? (
          <div className="animate-[fadeIn_0.32s_ease]">
            <AdminCourt
              adminsList={adminsList}
              bannedList={bannedList}
              knownUsers={knownUsers}
              communityCharacters={communityCharacters}
              onPromoteAdmin={onPromoteAdmin}
              onRemoveAdmin={onRemoveAdmin}
              onBanUser={onBanUser}
              onUnbanUser={onUnbanUser}
              onSendWarnMail={onSendWarnMail}
              onClose={() => setActiveTab('my-characters')}
            />
          </div>
        ) : activeTab === 'my-characters' ? (
          /* PERSONAL CREATIVE SHEET / ACTIVE CHARACTERS */
          <section className="space-y-8">
            {/* Elegant Call to Action for Firestore syncing */}
            {!currentUser && !isAuthLoading && (
              <div className="p-5 rounded-xl border-2 border-dashed border-primary/20 bg-surface-container-low/50 shadow-inner flex flex-col md:flex-row items-center justify-between gap-6 animate-[fadeIn_0.32s_ease]">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10 border border-primary/20 text-primary">
                    <CloudLightning className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-primary font-bold tracking-tight">Sincronizzazione Remota Cloud</h3>
                    <p className="text-on-surface-variant text-xs mt-1">
                      Salva i tuoi eroi nel Database Tempio Firebase per non perderli mai e caricarli su qualsiasi browser o smartphone.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={onSignIn}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-background font-mono font-bold text-xs uppercase tracking-wider rounded shadow-md hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-1.5 flex-shrink-0"
                >
                  <LogIn size={15} /> Sincronizza Ora via Google
                </button>
              </div>
            )}

            {currentUser && (
              <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-center gap-2.5 text-xs text-primary/90 font-mono animate-[fadeIn_0.3s_ease]">
                <CloudLightning size={16} className="text-primary animate-pulse" />
                <span>Eroi memorizzati in sicurezza nel cloud di `{currentUser.email}`.</span>
              </div>
            )}

            <div className="border-b-2 border-outline-variant pb-4 flex justify-between items-center">
              <div>
                <h2 className="font-serif text-3xl text-primary tracking-wide uppercase">I Miei Eroi</h2>
                <p className="text-on-surface-variant text-sm italic mt-1">
                  Draft sheets, templates, and active characters currently saved on this device.
                </p>
              </div>
              <button
                onClick={() => handleStartWizard()}
                className="px-4 py-2 bg-gradient-to-r from-primary-container to-primary text-on-primary font-mono text-xs font-bold rounded shadow-lg flex items-center gap-1.5 hover:scale-105 transition-all"
              >
                <UserPlus size={16} /> AVVIA RITUALE PERSONAGGIO
              </button>
            </div>

            {myCharacters.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-outline-variant/30 rounded-xl max-w-2xl mx-auto space-y-4">
                <Sparkles className="mx-auto text-primary w-12 h-12 animate-pulse" />
                <h3 className="font-serif text-2xl text-on-surface">Nessun personaggio attivo</h3>
                <p className="text-on-surface-variant text-sm max-w-md mx-auto">
                  Importa un template ufficiale della gilda o clona i personaggi pubblicati dalla community per iniziare a giocare!
                </p>
                <button
                  onClick={() => setActiveTab('library')}
                  className="px-6 py-2 border border-primary text-primary hover:bg-primary/10 rounded font-mono text-xs"
                >
                  Sfoglia Archivio Classi
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myCharacters.map((char) => (
                  <div
                    key={char.id}
                    onClick={() => onSelectCharacter(char.id)}
                    className="parchment-texture border border-outline-variant hover:border-primary p-6 rounded-lg relative cursor-pointer group flex flex-col justify-between transition-all duration-300 shadow-md hover:shadow-primary/10"
                  >
                    <div>
                      <div className="flex gap-4 items-start mb-4">
                        <div className="w-16 h-16 rounded-full border border-primary/50 overflow-hidden bg-surface-container shadow-inner">
                          <img src={char.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h3 className="font-serif text-xl text-primary font-bold hover:underline transition-colors">
                            {char.name}
                          </h3>
                          <span className="font-mono text-xs text-on-surface-variant uppercase">
                            Livello {char.level} • {char.class}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-3 bg-surface-container-lowest/50 rounded-md border border-outline-variant/20 mb-4 px-2 text-center text-xs">
                        <div>
                          <span className="font-mono text-[9px] text-outline block block">VITA</span>
                          <span className="font-mono font-bold text-red-400">
                            {char.vitality.current} / {char.vitality.max}
                          </span>
                        </div>
                        <div>
                          <span className="font-mono text-[9px] text-outline block">INT</span>
                          <span className="font-mono font-bold text-primary">{char.attributes.INT}</span>
                        </div>
                        <div>
                          <span className="font-mono text-[9px] text-outline block">FOR</span>
                          <span className="font-mono font-bold text-primary">{char.attributes.FOR}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-4 border-t border-outline-variant/30 pt-4 justify-between items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCharacter(char.id);
                        }}
                        className="text-xs font-mono text-primary flex items-center gap-1 hover:underline"
                      >
                        Apri Scheda <ArrowRight size={12} />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCharacterToDelete(char);
                          setDeleteConfirmName('');
                        }}
                        className="text-xs font-mono text-red-400/80 hover:text-red-500 hover:font-bold hover:scale-110 active:scale-95 px-2.5 py-1 rounded hover:bg-red-500/10 hover:shadow-[0_0_8px_rgba(239,68,68,0.2)] border border-transparent hover:border-red-500/30 transition-all duration-300"
                      >
                        Elimina
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          /* STANDARD DIRECTORY - TEMPLATES & COMUNITY CONTENT */
          <>
            {/* Official Templates Section */}
            <section className="space-y-8 animate-[fadeIn_0.3s_ease]">
              <div className="flex md:items-end justify-between flex-col md:flex-row gap-4 border-b-2 border-outline-variant pb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="font-serif text-3xl text-primary uppercase tracking-widest">
                      Official Dungeon World Templates
                    </h2>
                    {isAdmin && (
                      <button
                        onClick={() => setIsCreateTemplateOpen(true)}
                        className="px-3 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-800 hover:border-amber-700 text-amber-500 hover:text-white rounded font-mono text-xs flex items-center gap-1.5 transition-all shadow-md"
                        title="Inscrivi un nuovo modello di classe nel grimorio"
                      >
                        <PlusCircle size={14} />
                        <span>Crea Template ⚜️</span>
                      </button>
                    )}
                  </div>
                  <p className="text-on-surface-variant text-sm italic">
                    Sacred blueprints etched by the first architects.
                  </p>
                </div>
                <div className="flex gap-2 self-end">
                  <button
                    onClick={() => setIsGridView(true)}
                    className={`p-2 border transition-colors ${
                      isGridView ? 'border-primary bg-primary/20 text-primary' : 'border-outline-variant text-outline hover:border-primary/50'
                    }`}
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button
                    onClick={() => setIsGridView(false)}
                    className={`p-2 border transition-colors ${
                      !isGridView ? 'border-primary bg-primary/20 text-primary' : 'border-outline-variant text-outline hover:border-primary/50'
                    }`}
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>

              <div className={isGridView ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6' : 'flex flex-col gap-4'}>
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`parchment-texture border border-outline-variant relative group overflow-hidden hover:border-primary transition-all duration-500 ${
                      isGridView ? 'p-6 flex flex-col justify-between' : 'p-4 flex items-center justify-between gap-6'
                    }`}
                  >
                    <div className={isGridView ? '' : 'flex items-center gap-4 flex-1'}>
                      <div className="mb-4 flex justify-between items-start">
                        <div className="p-3 bg-surface-container-lowest border border-primary/30 rounded-lg text-primary">
                          <span className="font-mono text-sm uppercase block max-w-[28px] overflow-hidden text-center font-bold">
                            {template.icon === 'swords' ? '⚔️' : template.icon === 'auto_stories' ? '📖' : template.icon === 'comedy_mask' ? '🎭' : '🛡️'}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {isGridView && (
                            <span className="font-mono text-[10px] text-primary-fixed uppercase tracking-tighter">
                              {template.type}
                            </span>
                          )}
                          {isAdmin && template.id.startsWith('t_dynamic_') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteOfficialTemplate(template.id);
                              }}
                              className="text-[9px] font-mono font-bold text-red-400 hover:text-red-500 transition-colors flex items-center gap-1 bg-red-950/20 px-2 py-0.5 rounded border border-red-900/40"
                              title="Rimuovi per sempre questo template"
                            >
                              <Trash2 size={10} /> Rimuovi
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-serif text-2xl text-on-background mb-2 mt-2">{template.name}</h3>
                        <p className="text-on-surface-variant text-sm mb-6 leading-relaxed max-w-sm">
                          {template.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleStartWizard(template)}
                        className={`py-3 px-4 bg-gradient-to-r from-tertiary-container to-primary flex items-center justify-center gap-2 text-on-tertiary-container text-xs font-mono font-bold rounded-sm hover:scale-[1.03] active:scale-95 duration-200 shadow-md ${
                          isGridView ? 'w-full' : 'w-48'
                        }`}
                      >
                        <span>AVVIA WIZARD</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Community Section */}
            <section className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-outline-variant/30 pb-4">
                <div className="space-y-2">
                  <h2 className="font-serif text-3xl text-on-background tracking-wide">
                    Community Published Characters
                  </h2>
                  <p className="text-on-surface-variant text-sm">
                    Tales of heroism and tragedy shared by fellow wanderers.
                  </p>
                </div>

                {/* Micro search filter widget */}
                <div className="flex flex-wrap gap-4 items-center bg-surface-container rounded-xl p-4 border border-outline-variant shadow-inner">
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[9px] text-outline uppercase px-1">Class</label>
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="bg-surface-container-lowest border border-outline-variant rounded px-2 py-1 text-xs text-on-surface focus:ring-1 focus:ring-primary w-28 font-mono outline-none"
                    >
                      <option>All Classes</option>
                      <option>Fighter</option>
                      <option>Wizard</option>
                      <option>Thief</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[9px] text-outline uppercase px-1">Min Level</label>
                    <select
                      value={minLevelFilter}
                      onChange={(e) => setMinLevelFilter(e.target.value)}
                      className="bg-surface-container-lowest border border-outline-variant rounded px-2 py-1 text-xs text-on-surface focus:ring-1 focus:ring-primary w-24 font-mono outline-none"
                    >
                      <option>Level 1</option>
                      <option>Level 5</option>
                      <option>Level 10</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-[9px] text-outline uppercase px-1">Rating</label>
                    <select
                      value={ratingFilter}
                      onChange={(e) => setRatingFilter(e.target.value)}
                      className="bg-surface-container-lowest border border-outline-variant rounded px-2 py-1 text-xs text-on-surface focus:ring-1 focus:ring-primary w-32 font-mono outline-none"
                    >
                      <option>Top Rated</option>
                      <option>Newest</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Character Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredCommunity.map((char) => (
                  <div
                    key={char.id}
                    className="bg-surface-container p-1 rounded-xl shadow-lg hover:shadow-primary/10 transition-all duration-300"
                  >
                    <div className="bg-surface-container-low border border-outline-variant rounded-lg p-6 flex flex-col md:flex-row gap-6 h-full">
                      <div className="w-full md:w-36 h-36 flex-shrink-0 bg-surface-container-lowest rounded-lg border-2 border-outline-variant overflow-hidden shadow-inner">
                        <img
                          className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                          src={char.avatar}
                          alt={char.name}
                        />
                      </div>

                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <h4 className="font-serif text-xl text-primary font-bold">{char.name}</h4>
                              <p className="text-[10px] text-outline uppercase font-mono tracking-widest">
                                Level {char.level} • {char.class} • Contributo di {char.author}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 bg-surface-container-highest px-2 py-0.5 rounded text-xs">
                              <Star size={12} className="text-primary fill-current" />
                              <span className="font-mono font-bold text-primary">{char.rating}</span>
                            </div>
                          </div>
                          <p className="text-on-surface-variant text-xs line-clamp-2 italic text-sm mt-2 font-mono">
                            {char.description}
                          </p>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-outline-variant/10 mt-4 justify-between">
                          <button
                            onClick={() => handleCloneCommunity(char)}
                            className="flex-1 py-2 bg-surface-container-highest border border-outline-variant hover:border-primary text-on-surface rounded font-bold transition-all text-xs font-mono flex items-center justify-center gap-1.5"
                          >
                            <ClipboardCopy size={13} className="text-outline" /> Clone Character
                          </button>
                          {(isAdmin || (currentUser && currentUser.email === char.author)) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteCommunityCharacter(char.id);
                              }}
                              className="px-3 py-2 text-red-400 hover:text-red-500 hover:bg-red-950/25 border border-red-900/30 hover:border-red-500 rounded font-bold text-xs font-mono flex items-center gap-1 transition-all"
                              title="Modera ed elimina questa scheda dalla community"
                            >
                              <Trash2 size={13} />
                              <span className="hidden sm:inline">Rimuovi</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination/Revealing elements */}
              <div className="flex justify-center mt-12 bg-surface-container/20 p-2 rounded">
                <button
                  type="button"
                  onClick={() => alert("Tutte le schede disponibili caricatosi correttamente.")}
                  className="px-8 py-3 border-2 border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-all font-bold tracking-widest bg-surface-container-low flex items-center gap-3 text-xs font-mono rounded"
                >
                  REVEAL MORE ENTRIES
                  <ArrowDown size={14} />
                </button>
              </div>
            </section>
          </>
        )}
      </main>

      {/* SECURE DELETE CONFIRMATION MODAL */}
      {characterToDelete && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-[fadeIn_0.2s_ease]"
          onClick={() => setCharacterToDelete(null)}
        >
          <div 
            className="parchment-bg border-2 border-red-500/50 rounded-xl max-w-md w-full overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.3)] flex flex-col p-6 relative gap-5 animate-[scaleUp_0.2s_ease]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-red-500/20 pb-3">
              <h3 className="font-serif text-lg text-red-500 uppercase tracking-widest font-bold flex items-center gap-2">
                ⚠️ Zona di Eliminazione
              </h3>
              <button 
                type="button"
                onClick={() => setCharacterToDelete(null)}
                className="text-on-surface-variant hover:text-primary font-mono text-md transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* Content text */}
            <div className="space-y-3">
              <p className="text-sm text-on-surface leading-relaxed">
                Stai per eliminare definitivamente l'eroe dal Grimorio e dal database cloud. Questa azione è irreversibile.
              </p>
              <p className="text-xs font-mono text-primary bg-surface-container-low p-3 rounded border border-outline-variant/30">
                Scrivi il nome del personaggio che vuoi eliminare <strong>{characterToDelete.name}</strong>? (per sicurezza)
              </p>
            </div>

            {/* Input field */}
            <div className="space-y-2">
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="Digita il nome esatto del personaggio"
                className="w-full bg-surface-container-lowest border border-red-500/30 focus:border-red-500 rounded p-3 text-sm font-mono text-on-surface outline-none transition-all placeholder:text-on-surface-variant/40"
                autoFocus
              />
              {deleteConfirmName && deleteConfirmName.trim() !== characterToDelete.name && (
                <p className="text-red-400 font-mono text-[10px] mt-1 animate-pulse">
                  Il nome inserito non corrisponde ancora.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="border-t border-outline-variant/20 pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCharacterToDelete(null)}
                className="px-4 py-2 border border-outline-variant/40 hover:bg-surface-container text-on-surface-variant text-xs font-mono font-bold uppercase tracking-wider rounded transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={deleteConfirmName.trim() !== characterToDelete.name}
                onClick={() => {
                  if (deleteConfirmName.trim() === characterToDelete.name) {
                    onDeleteCharacter(characterToDelete.id);
                    setCharacterToDelete(null);
                  }
                }}
                className={`px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider rounded shadow-md transition-all ${
                  deleteConfirmName.trim() === characterToDelete.name
                    ? 'bg-red-600 text-white cursor-pointer hover:bg-red-500 active:scale-95 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                    : 'bg-red-950/40 text-on-surface-variant/40 border border-outline-variant/20 cursor-not-allowed opacity-50'
                }`}
              >
                elimina dal grimorio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📬 LA BUCHETTA DELLE CORRISPONDENZE (MAILBOX MODAL) */}
      {isMailboxOpen && (
        <div 
          className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-[fadeIn_0.2s_ease]"
          onClick={() => {
            setIsMailboxOpen(false);
            setSelectedMail(null);
          }}
        >
          <div 
            className="parchment-bg border border-amber-800 shadow-[0_0_50px_rgba(242,202,80,0.25)] rounded-lg max-w-3xl w-full p-6 flex flex-col relative gap-4 max-h-[90vh] overflow-hidden animate-[scaleUp_0.2s_ease]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top gold seal line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-700"></div>

            <div className="flex justify-between items-center border-b border-amber-900/20 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">✉️</span>
                <h3 className="font-serif text-lg text-amber-900 uppercase font-black tracking-widest">
                  Epistolario del Grimorio
                </h3>
              </div>
              <button 
                onClick={() => {
                  setIsMailboxOpen(false);
                  setSelectedMail(null);
                }}
                className="text-amber-950 font-mono text-xs hover:underline uppercase font-bold"
              >
                Chiudi Dispacci
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[350px] overflow-hidden">
              {/* Letters list */}
              <div className="border-r border-amber-950/20 pr-4 flex flex-col gap-3 overflow-y-auto max-h-[350px]">
                <h4 className="text-xs font-mono text-amber-800 uppercase tracking-widest font-black mb-2">
                  Rune Recenti
                </h4>
                {allMails.length === 0 ? (
                  <div className="text-center py-12 text-xs italic font-serif text-amber-900/60">
                    Nessuna pergamena recapitata in questa buchetta.
                  </div>
                ) : (
                  allMails.map((mail) => {
                    const isUnread = !mail.read;
                    return (
                      <div
                        key={mail.id}
                        onClick={() => {
                          setSelectedMail(mail);
                          if (isUnread) {
                            onMarkMailRead(mail.id);
                          }
                        }}
                        className={`p-3 rounded border text-left cursor-pointer transition-all ${
                          selectedMail?.id === mail.id
                            ? 'bg-amber-950/20 border-amber-800 shadow-md'
                            : isUnread
                            ? 'bg-amber-100/40 border-amber-600 font-bold'
                            : 'bg-warm-gray-100/20 border-amber-900/10 hover:bg-amber-100/10'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <p className="text-xs font-serif text-amber-950 truncate max-w-[170px]">
                            {mail.subject}
                          </p>
                          {isUnread && (
                            <span className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-ping flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-amber-900/60 truncate mt-1">
                          {mail.content}
                        </p>
                        <p className="text-[8px] font-mono text-amber-900/50 mt-2">
                          {new Date(mail.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Letter details */}
              <div className="flex flex-col justify-between bg-[#fcf9eb] border border-amber-900/10 p-5 rounded relative overflow-y-auto max-h-[350px]">
                {selectedMail ? (
                  <div className="flex flex-col gap-4">
                    {/* Decorative wax seal symbol */}
                    <div className="absolute right-4 top-4 select-none opacity-20 transform rotate-12">
                      <span className="text-5xl text-red-800">⚜️</span>
                    </div>

                    <div>
                      <h4 className="font-serif text-md text-amber-900 font-extrabold select-all">
                        {selectedMail.subject}
                      </h4>
                      <p className="text-[9px] font-mono text-amber-700 mt-1 uppercase">
                        Mittente: Consiglio Arcante • {new Date(selectedMail.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="border-t border-amber-900/10 pt-3">
                      <p className="font-serif text-sm text-amber-950 leading-relaxed italic whitespace-pre-line select-all">
                        {selectedMail.content}
                      </p>
                    </div>

                    <div className="pt-6 text-right font-serif text-xs text-amber-900/70 border-t border-amber-900/10 border-dashed mt-auto">
                      Spesso a Te consacrato,<br />
                      <span className="font-bold">Gilda del Grimorio</span>
                    </div>
                  </div>
                ) : (
                  <div className="my-auto text-center py-6">
                    <span className="text-3xl text-amber-900/30">📜</span>
                    <p className="text-xs font-serif text-amber-900/60 italic mt-2">
                      Spezza il sigillo di ceralacca di una pergamena per leggerne i mandati celesti.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ⚜️ FUCINA DEI TEMPLATE UFFICIALI (CREATE MODAL) */}
      {isCreateTemplateOpen && isAdmin && (
        <div 
          className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-[fadeIn_0.2s_ease]"
          onClick={() => setIsCreateTemplateOpen(false)}
        >
          <div 
            className="parchment-bg border border-amber-800 shadow-[0_0_50px_rgba(242,202,80,0.25)] rounded-lg max-w-md w-full p-6 flex flex-col relative gap-4 animate-[scaleUp_0.2s_ease]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700"></div>

            <div className="flex justify-between items-center border-b border-amber-900/20 pb-3">
              <h3 className="font-serif text-lg text-amber-900 uppercase font-black tracking-widest">
                Nuova Classe di Gilda
              </h3>
              <button 
                onClick={() => setIsCreateTemplateOpen(false)}
                className="text-amber-950 font-mono text-sm hover:underline"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOfficialTemplateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-amber-800 mb-1">
                  Nome della Classe Archetipo
                </label>
                <input
                  type="text"
                  required
                  placeholder="E.g., Negromante, Cavaliere Nero..."
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full bg-white/60 border border-amber-900/30 rounded px-3 py-2 text-sm text-amber-950 focus:outline-none focus:border-amber-700 placeholder-amber-900/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-amber-800 mb-1">
                    Nome della Classe DW
                  </label>
                  <select
                    value={newTemplateClass}
                    onChange={(e) => setNewTemplateClass(e.target.value)}
                    className="w-full bg-white/60 border border-amber-900/30 rounded px-3 py-1.5 text-xs text-amber-950"
                  >
                    <option value="Il Guerriero">Il Guerriero</option>
                    <option value="Il Mago">Il Mago</option>
                    <option value="Il Ladro">Il Ladro</option>
                    <option value="Il Paladino">Il Paladino</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-amber-800 mb-1">
                    Categoria d'Origine
                  </label>
                  <select
                    value={newTemplateType}
                    onChange={(e) => setNewTemplateType(e.target.value as any)}
                    className="w-full bg-white/60 border border-amber-900/30 rounded px-3 py-1.5 text-xs text-amber-950"
                  >
                    <option value="Core Class">Core Class</option>
                    <option value="Arcane Class">Arcane Class</option>
                    <option value="Shadow Class">Shadow Class</option>
                    <option value="Divine Class">Divine Class</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-amber-800 mb-1">
                  Icona Rappresentativa
                </label>
                <select
                  value={newTemplateIcon}
                  onChange={(e) => setNewTemplateIcon(e.target.value)}
                  className="w-full bg-white/60 border border-amber-900/30 rounded px-3 py-1.5 text-xs text-amber-950"
                >
                  <option value="swords">⚔️ Spade Incrociate</option>
                  <option value="auto_stories">📖 Libro di Magia</option>
                  <option value="comedy_mask">🎭 Maschera Invisibile</option>
                  <option value="shield">🛡️ Scudo Araldico</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-amber-800 mb-1">
                  Leggenda di Descrizione
                </label>
                <textarea
                  rows={3}
                  placeholder="Annota qui il pedigree arcaico o l'ispirazione della nuova dottrina..."
                  value={newTemplateDesc}
                  onChange={(e) => setNewTemplateDesc(e.target.value)}
                  className="w-full bg-white/60 border border-amber-900/30 rounded px-3 py-2 text-xs text-amber-950 focus:outline-none focus:border-amber-700 placeholder-amber-900/40 resize-none font-serif leading-relaxed"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-950 hover:bg-amber-900 text-amber-100 hover:text-white rounded py-2 text-xs uppercase font-mono tracking-wider transition-all duration-200 border border-amber-800/80 shadow"
              >
                Inscrivi negli Annali d'Oro ⚜️
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV (mobile only) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-[70] bg-surface-container-highest border-t border-primary/20 shadow-[0_-4px_16px_rgba(0,0,0,0.6)] rounded-t-xl flex justify-around items-center h-16">
        <button
          onClick={() => setActiveTab('my-characters')}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all active:scale-90 ${
            activeTab === 'my-characters' ? 'text-primary drop-shadow-[0_0_8px_rgba(242,202,80,0.5)]' : 'text-on-surface-variant opacity-60'
          }`}
        >
          <Users size={22} />
          <span className="text-[10px] font-mono uppercase tracking-wider">Personaggi</span>
        </button>

        <button
          onClick={() => setActiveTab('library')}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all active:scale-90 ${
            activeTab === 'library' ? 'text-primary drop-shadow-[0_0_8px_rgba(242,202,80,0.5)]' : 'text-on-surface-variant opacity-60'
          }`}
        >
          <BookOpen size={22} />
          <span className="text-[10px] font-mono uppercase tracking-wider">Libreria</span>
        </button>

        {isMasterAdmin && (
          <button
            onClick={() => setActiveTab('court')}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all active:scale-90 ${
              activeTab === 'court' ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-on-surface-variant opacity-60'
            }`}
          >
            <Shield size={22} />
            <span className="text-[10px] font-mono uppercase tracking-wider">Corte</span>
          </button>
        )}
      </nav>

      {isWizardOpen && (
        <CharacterCreationWizard
          templates={[...baseTemplates, ...officialTemplates]}
          initialTemplateId={wizardTemplateId}
          onClose={() => {
            setIsWizardOpen(false);
            setWizardTemplateId(undefined);
          }}
          onCreateCharacter={handleCreateFromWizard}
        />
      )}
    </div>
  );
}

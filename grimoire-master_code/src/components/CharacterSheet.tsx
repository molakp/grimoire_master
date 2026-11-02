import { useState, useEffect, ReactNode, FormEvent, ChangeEvent } from 'react';
import { AttributeKey, Character, CharacterTemplate, StatModifier } from '../types';
import { Sparkles, Plus, Minus, Lock, Unlock, Trash2, ArrowLeft, CloudLightning, X } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { formatModifier, getAttributeModifier } from '../lib/gameRules';

const ATTRIBUTE_KEYS: AttributeKey[] = ['INT', 'FOR', 'DES', 'COS', 'SAG', 'CAR'];
const ATTRIBUTE_NAMES: Record<AttributeKey, string> = {
  INT: 'Intelligenza',
  FOR: 'Forza',
  DES: 'Destrezza',
  COS: 'Costituzione',
  SAG: 'Saggezza',
  CAR: 'Carisma',
};

const getDefaultLore = (character: Character) => character.class.includes('Mago')
  ? 'Thalric della foresta d\'argento. Un tempo scolaro brillante della prestigiosa accademia di Grimorio Master, bandito per aver cercato i segreti nascosti della necromanzia arcana. Ora vaga per i sotterranei alla ricerca della gemma d\'anima perfetta...'
  : 'Un combattente coraggioso fuggito dalla morsa della distruzione di Redwall, brandisce un pesante spadone spezzatombe...';

interface CharacterSheetProps {
  character: Character;
  onUpdateCharacter: (character: Character) => void;
  onBackToDashboard: () => void;
  onRollStat: (
    statName: string,
    statValue: number,
    additionalModifier: number,
    appliedModifiers: Pick<StatModifier, 'name' | 'icon' | 'value'>[],
  ) => void;
  activeTab: 'stats' | 'spells' | 'moves' | 'gear' | 'lore';
  setActiveTab: (tab: 'stats' | 'spells' | 'moves' | 'gear' | 'lore') => void;
  renderSpellsTab: () => ReactNode;
  currentUser?: FirebaseUser | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
  isAuthLoading?: boolean;
  onPublishCommunity?: (char: Character, description: string) => Promise<void>;
  template?: CharacterTemplate;
  isAdmin?: boolean;
}

export default function CharacterSheet({
  character,
  onUpdateCharacter,
  onBackToDashboard,
  onRollStat,
  activeTab,
  setActiveTab,
  renderSpellsTab,
  currentUser,
  onSignIn,
  onSignOut,
  isAuthLoading,
  onPublishCommunity,
  template,
  isAdmin,
}: CharacterSheetProps) {
  const isSpellcaster = template
    ? (template.availableSpells?.length ?? 0) > 0
    : character.class.toLowerCase().includes('mago') || character.class.toLowerCase().includes('chierico');

  const [loreDraft, setLoreDraft] = useState(character.lore ?? getDefaultLore(character));
  useEffect(() => {
    setLoreDraft(character.lore ?? getDefaultLore(character));
  }, [character.id]);

  const [selectedAttribute, setSelectedAttribute] = useState<AttributeKey>('INT');
  const [newGearName, setNewGearName] = useState('');
  const [newGearWeight, setNewGearWeight] = useState(1);
  const [newGearQuantity, setNewGearQuantity] = useState(1);
  const [newGearConsumable, setNewGearConsumable] = useState(false);
  const [isModifierModalOpen, setIsModifierModalOpen] = useState(false);
  const [newModifierName, setNewModifierName] = useState('');
  const [newModifierValue, setNewModifierValue] = useState('-1');
  const [newModifierIcon, setNewModifierIcon] = useState('🌙');
  const [newModifierAttributes, setNewModifierAttributes] = useState<AttributeKey[]>([]);

  // Community publishing state
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishDescription, setPublishDescription] = useState('Un intrepido viandante alla ricerca di glorie arcaiche nel profondo delle rovine.');
  const [isPublishing, setIsPublishing] = useState(false);


  // Avatar edit states
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [originalAvatar, setOriginalAvatar] = useState(character.avatar || '');
  const [avatarUrlInput, setAvatarUrlInput] = useState(character.avatar || '');
  const [uploadError, setUploadError] = useState('');

  const AVATAR_PRESETS = [
    {
      name: 'Mago Elfico',
      url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=300&auto=format&fit=crop',
    },
    {
      name: 'Guerriero Nano',
      url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=300&auto=format&fit=crop',
    },
    {
      name: 'Furfante della Notte',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&auto=format&fit=crop',
    },
    {
      name: 'Mistico Astrale',
      url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=300&auto=format&fit=crop',
    }
  ];

  const handleAvatarSubmit = (url: string) => {
    if (!url.trim()) return;
    onUpdateCharacter({
      ...character,
      avatar: url
    });
    setIsAvatarModalOpen(false);
    setUploadError('');
  };

  const handleAvatarCancel = () => {
    onUpdateCharacter({
      ...character,
      avatar: originalAvatar
    });
    setIsAvatarModalOpen(false);
    setUploadError('');
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Per favore, seleziona un file immagine valido (PNG, JPG, etc).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('L\'immagine è troppo pesante (limite di 2MB). Scegli un file inferiore.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      if (base64String) {
        onUpdateCharacter({
          ...character,
          avatar: base64String
        });
        setIsAvatarModalOpen(false);
        setUploadError('');
      } else {
        setUploadError('Errore durante la lettura del file.');
      }
    };
    reader.onerror = () => {
      setUploadError('Errore durante il caricamento del file.');
    };
    reader.readAsDataURL(file);
  };

  // Health vial helper calculations
  const hpPercentage = Math.max(0, Math.min(100, (character.vitality.current / character.vitality.max) * 100));

  // Change health safely
  const adjustHP = (amount: number) => {
    const updated = { ...character };
    updated.vitality.current = Math.max(0, Math.min(character.vitality.max, character.vitality.current + amount));
    onUpdateCharacter(updated);
  };

  // Change experience safely
  const adjustXP = (amount: number) => {
    if (character.locked) return;
    const updated = { ...character };
    updated.experience = Math.max(0, character.experience + amount);
    onUpdateCharacter(updated);
  };

  // Level up ritual
  const [isLevelUpModalOpen, setIsLevelUpModalOpen] = useState(false);
  const [levelUpAttribute, setLevelUpAttribute] = useState<AttributeKey>('INT');
  const handleLevelUp = () => {
    if (character.locked || character.attributes[levelUpAttribute] >= 18) return;
    onUpdateCharacter({
      ...character,
      level: character.level + 1,
      experience: 0,
      attributes: {
        ...character.attributes,
        [levelUpAttribute]: character.attributes[levelUpAttribute] + 1,
      },
    });
    setIsLevelUpModalOpen(false);
  };

  const openLevelUpModal = () => {
    const availableAttributes = ATTRIBUTE_KEYS.filter((attribute) => character.attributes[attribute] < 18);
    setLevelUpAttribute(
      availableAttributes.includes(selectedAttribute) ? selectedAttribute : availableAttributes[0] || 'INT',
    );
    setIsLevelUpModalOpen(true);
  };

  const getModifiersForAttribute = (attribute: AttributeKey) =>
    (character.statModifiers || []).filter((modifier) => modifier.attributes.includes(attribute));
  const getCircumstanceModifier = (attribute: AttributeKey) =>
    getModifiersForAttribute(attribute).reduce((total, modifier) => total + modifier.value, 0);
  const selectedAttributeModifiers = getModifiersForAttribute(selectedAttribute);
  const selectedCircumstanceModifier = selectedAttributeModifiers.reduce((total, modifier) => total + modifier.value, 0);

  const openModifierModal = () => {
    setNewModifierName('');
    setNewModifierValue('-1');
    setNewModifierIcon('🌙');
    setNewModifierAttributes([selectedAttribute]);
    setIsModifierModalOpen(true);
  };

  const handleAddStatModifier = (event: FormEvent) => {
    event.preventDefault();
    const value = Number(newModifierValue);
    if (
      character.locked ||
      !newModifierName.trim() ||
      !Number.isInteger(value) ||
      value === 0 ||
      newModifierAttributes.length === 0
    ) return;

    const modifier: StatModifier = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: newModifierName.trim(),
      icon: newModifierIcon,
      value,
      attributes: newModifierAttributes,
    };
    onUpdateCharacter({ ...character, statModifiers: [...(character.statModifiers || []), modifier] });
    setNewModifierName('');
    setNewModifierValue('-1');
  };

  const handleRemoveStatModifier = (id: string) => {
    if (character.locked) return;
    onUpdateCharacter({
      ...character,
      statModifiers: (character.statModifiers || []).filter((modifier) => modifier.id !== id),
    });
  };

  const handleBondChange = (index: number, field: 'companion' | 'statement', value: string) => {
    const bonds = character.bonds.map((bond, bondIndex) =>
      bondIndex === index ? { ...bond, [field]: value } : bond,
    );
    onUpdateCharacter({ ...character, bonds });
  };

  const handleAddBond = () => {
    if (character.locked) return;
    onUpdateCharacter({
      ...character,
      bonds: [...character.bonds, { companion: '', statement: '' }],
    });
  };

  const handleDeleteBond = (index: number) => {
    if (character.locked) return;
    onUpdateCharacter({
      ...character,
      bonds: character.bonds.filter((_, bondIndex) => bondIndex !== index),
    });
  };

  // Toggle character locking status
  const toggleLock = () => {
    const updated = { ...character };
    updated.locked = !character.locked;
    onUpdateCharacter(updated);
  };

  // Add custom weapon/gear item
  const handleAddGear = (e: FormEvent) => {
    e.preventDefault();
    if (!newGearName.trim()) return;

    onUpdateCharacter({
      ...character,
      gear: [...character.gear, {
        name: newGearName.trim(),
        weight: newGearWeight,
        quantity: newGearConsumable ? newGearQuantity : 1,
        consumable: newGearConsumable,
      }],
    });
    setNewGearName('');
    setNewGearWeight(1);
    setNewGearQuantity(1);
    setNewGearConsumable(false);
  };

  const isGearConsumable = (item: Character['gear'][number]) =>
    item.consumable ?? (item.quantity !== undefined && item.quantity > 1);
  const getGearQuantity = (item: Character['gear'][number]) =>
    isGearConsumable(item) ? item.quantity ?? 1 : 1;

  const handleAdjustGearQuantity = (index: number, amount: number) => {
    if (character.locked || !character.gear[index] || !isGearConsumable(character.gear[index])) return;
    const gear = character.gear.map((item, itemIndex) =>
      itemIndex === index
        ? { ...item, quantity: Math.max(0, (item.quantity ?? 1) + amount) }
        : item,
    );
    onUpdateCharacter({ ...character, gear });
  };

  // Delete inventory item
  const handleDeleteGear = (index: number) => {
    const updated = { ...character };
    const newGear = [...updated.gear];
    newGear.splice(index, 1);
    updated.gear = newGear;
    onUpdateCharacter(updated);
  };

  // Total calculated active equipment weight
  const activeWeightSum = character.gear.reduce(
    (total, item) => total + item.weight * getGearQuantity(item),
    0,
  );

  // Helper attribute modifier labels for UI previews
  const getModSymbol = (val: number) => formatModifier(getAttributeModifier(val));

  // Dynamic race description finder
  const getRaceDescription = (raceName: string, charClassStr: string) => {
    const r = raceName.toUpperCase();
    const c = charClassStr.toLowerCase();
    
    if (r === 'ELFO') {
      if (c.includes('mago')) {
        return "La magia per te è naturale come il respiro. Individuazione del Magico per te è un trucchetto.";
      }
      return "La tua vista e udito acuti ti avvertono dei pericoli prima degli altri.";
    }
    if (r === 'UMANO') {
      if (c.includes('mago')) {
        return "Scegli un incantesimo da chierico. Puoi lanciarlo come se fosse un incantesimo da mago.";
      }
      if (c.includes('ladro')) {
        return "Quando marchi qualcuno per fargli le tasche, ottieni +1 continuato.";
      }
      if (c.includes('paladino')) {
        return "Quando preghi per la guida divina, ricevi una visione del tuo cammino.";
      }
      return "Una mossa o competenza extra adatta al tuo background versatile.";
    }
    if (r === 'NANO') {
      return "Quando condividi una bevuta con qualcuno, puoi scambiare segreti della terra o storie d'armi.";
    }
    if (r === 'MEZZUOMO' || r === 'HALFLING') {
      return "Sei piccolo e sfuggente. Con la tua fionda infliggi +1 danno.";
    }
    return "Sei un membro fiero del tuo lignaggio.";
  };

  // Dynamic alignment description finder
  const getAlignmentDescription = (alignmentName: string) => {
    const a = alignmentName.toUpperCase();
    if (a === 'BUONO') return "Usa la magia per aiutare direttamente qualcun'altro.";
    if (a === 'NEUTRALE') return "Scopri qualcosa riguardo a un mistero della magia.";
    if (a === 'CATASTROFICO' || a === 'CAOTICO') return "Rompere un legame o creare disordine magico artificiale.";
    if (a === 'MALVAGIO' || a === 'MALEVOLO') return "Usa la magia per nuocere o asservire gli altri.";
    return "Agisci in armonia con le tue convinzioni profonde.";
  };

  // Advanced Moves static specification
  const ADVANCED_MOVES = [
    {
      id: 'PRODIGIO',
      name: 'PRODIGIO',
      description: "Scegli un incantesimo. Lo prepari sempre come fosse di un livello più basso."
    },
    {
      id: 'MAGIAPOTENZIATA',
      name: 'MAGIA POTENZIATA',
      description: "Quando lanci con 10+, scegli un'opzione extra dalla lista 7-9."
    },
    {
      id: 'POZZODISCIENZA',
      name: 'POZZO DI SCIENZA',
      description: "Quando dichiari conoscenze su qualcosa di cui nessuno ha un'idea precisa, prendi +1."
    },
    {
      id: 'CONTROINCANTESIMO',
      name: 'CONTROINCANTESIMO',
      description: "Quando subisci danni da un effetto magico avversario, puoi spezzarlo come scudo arcano."
    }
  ];

  const isMoveSelected = (moveId: string) => {
    const selected = character.selectedMoves || (character.id === 'thalric' ? ['PRODIGIO'] : []);
    return selected.includes(moveId);
  };

  const toggleMove = (moveId: string) => {
    if (character.locked) return;
    const selected = character.selectedMoves ? [...character.selectedMoves] : (character.id === 'thalric' ? ['PRODIGIO'] : []);
    const idx = selected.indexOf(moveId);
    if (idx >= 0) {
      selected.splice(idx, 1);
    } else {
      selected.push(moveId);
    }
    onUpdateCharacter({
      ...character,
      selectedMoves: selected
    });
  };

  return (
    <div className="min-h-screen text-on-surface bg-background scroll-smooth">
      {/* Top Banner Navigation matching Mockup 1 and 3 */}
      <header className="sticky top-0 z-50 bg-surface-container-highest/60 backdrop-blur-md border-b border-outline-variant/30 flex justify-between items-center w-full px-4 md:px-12 py-4 shadow-[0_4px_20px_rgba(242,202,80,0.15)]">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToDashboard}
            className="p-1 rounded hover:bg-surface-variant text-primary transition-colors flex items-center gap-1 font-mono text-xs"
          >
            <ArrowLeft size={16} /> <span className="hidden sm:inline">VAULT</span>
          </button>
          <h1 className="font-serif text-xl md:text-2xl text-primary font-bold tracking-tight">
            {character.name}
          </h1>
        </div>

        <nav className="hidden md:flex gap-8">
          {(['stats', 'spells', 'moves', 'gear', 'lore'] as const).filter(tab => tab !== 'spells' || isSpellcaster).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`font-mono text-xs uppercase tracking-widest pb-1 transition-all border-b-2 hover:text-primary ${
                activeTab === tab
                  ? 'text-primary border-primary font-bold'
                  : 'text-on-surface-variant border-transparent'
              }`}
            >
              {tab === 'stats'
                ? 'Stats'
                : tab === 'spells'
                ? 'Spells'
                : tab === 'moves'
                ? 'Moves'
                : tab === 'gear'
                ? 'Gear'
                : 'Lore'}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {currentUser && onPublishCommunity && (
            <button
              onClick={() => setIsPublishModalOpen(true)}
              className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900/90 border border-amber-800 hover:border-amber-600 text-amber-500 hover:text-white rounded font-mono text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              title="Condividi questo personaggio con la gilda"
            >
              <Sparkles size={12} className="text-amber-500" />
              <span>Pubblica ⚜️</span>
            </button>
          )}
          {currentUser && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary/10 border border-primary/20 text-[10px] font-mono text-primary font-bold uppercase tracking-wider" title="Salvataggio automatico cloud attivo">
              <CloudLightning size={12} className="animate-pulse" />
              <span>Cloud Sync</span>
            </div>
          )}
          <button
            onClick={toggleLock}
            className={`p-1.5 rounded-full hover:bg-surface-container-highest transition-colors ${
              character.locked ? 'text-red-400' : 'text-primary'
            }`}
          >
            {character.locked ? <Lock size={18} /> : <Unlock size={18} />}
          </button>
          <div 
            onClick={() => {
              setOriginalAvatar(character.avatar || '');
              setIsAvatarModalOpen(true);
              setAvatarUrlInput(character.avatar || '');
            }}
            title="Cambia Ritratto"
            className="w-10 h-10 rounded-full border border-primary/50 overflow-hidden shadow-[0_0_10px_rgba(242,202,80,0.3)] bg-surface-container cursor-pointer hover:scale-105 hover:border-primary hover:shadow-[0_0_15px_rgba(242,202,80,0.6)] transition-all relative group"
          >
            <img src={character.avatar} alt="Character Portrait" className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[9px] font-mono text-primary font-bold">EDIT</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main layout container split in Sidebar / Content workspace */}
      <main className="max-w-[1400px] mx-auto px-4 md:px-12 py-8 grid grid-cols-1 md:grid-cols-12 gap-6 pb-24 lg:pb-8">
        
        {/* CHARACTER ATTRIBUTE SIDEBAR (Col span 3) */}
        <aside className="md:col-span-3 flex flex-col gap-6">
          
          {/* Card Class, Level, and Statistics Grid */}
          <div className="bg-surface-container-low deckle-edge p-6 flex flex-col gap-6">
            <div className="flex flex-col">
              <span className="font-serif text-xl text-primary tracking-widest uppercase font-bold">
                {character.class.toUpperCase()}
              </span>
              <div className="flex justify-between items-end mt-1">
                <span className="font-sans text-xs text-on-surface-variant font-semibold">
                  Livello {character.level}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-primary text-xs font-semibold">PE {character.experience}</span>
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => adjustXP(-1)}
                      disabled={character.locked}
                      className="w-4 h-4 bg-surface-container hover:bg-primary/20 text-outline text-[10px] rounded flex items-center justify-center font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <button
                      onClick={() => adjustXP(1)}
                      disabled={character.locked}
                      className="w-4 h-4 bg-surface-container hover:bg-primary/20 text-primary text-[10px] rounded flex items-center justify-center font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                  {!character.locked && character.experience > 0 && (
                    <button
                      onClick={openLevelUpModal}
                      title="Avanza di Livello"
                      className="w-5 h-5 bg-primary/20 hover:bg-primary/40 text-primary text-[10px] rounded flex items-center justify-center font-bold transition-colors"
                    >
                      ▲
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Grid of Interactive attributes */}
            <div className="space-y-4">
              {/* Highlight active stat */}
              <div className="group flex items-center justify-between p-3 bg-surface-container-high/60 border-l-4 border-primary shadow-inner rounded-r">
                <div className="text-left">
                  <p className="font-mono text-[9px] text-on-surface-variant uppercase tracking-wider">
                    {selectedAttribute}
                  </p>
                  <p className="font-serif text-md font-bold text-on-surface">
                    {ATTRIBUTE_NAMES[selectedAttribute]}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-serif text-3xl font-bold text-primary drop-shadow-[0_0_8px_rgba(242,202,80,0.4)]">
                    {character.attributes[selectedAttribute]}
                  </span>
                  <span className="font-mono text-[10px] text-primary-container-variant">
                    Mod: {getModSymbol(character.attributes[selectedAttribute])}
                  </span>
                  {selectedCircumstanceModifier !== 0 && (
                    <span className="font-mono text-[9px] text-tertiary">
                      Circostanze {formatModifier(selectedCircumstanceModifier)} · totale{' '}
                      {formatModifier(getAttributeModifier(character.attributes[selectedAttribute]) + selectedCircumstanceModifier)}
                    </span>
                  )}
                </div>
              </div>
              {selectedAttributeModifiers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedAttributeModifiers.map((modifier) => (
                    <span
                      key={modifier.id}
                      className="rounded bg-surface-container-high px-2 py-1 text-[10px] text-on-surface-variant"
                      title={`${modifier.name}: ${formatModifier(modifier.value)}`}
                    >
                      {modifier.icon} {modifier.name} {formatModifier(modifier.value)}
                    </span>
                  ))}
                </div>
              )}

              {/* Smaller attribute picker grid */}
              <div className="grid grid-cols-2 gap-2">
                {ATTRIBUTE_KEYS.map((attr) => (
                  <button
                    key={attr}
                    type="button"
                    onClick={() => setSelectedAttribute(attr)}
                    className={`p-2 border rounded text-center transition-all ${
                      selectedAttribute === attr
                        ? 'bg-surface-container border-primary shadow-inner text-primary'
                        : 'bg-surface-container-high/30 border-outline-variant/30 text-on-surface-variant hover:bg-surface-variant/20 hover:border-outline'
                    }`}
                  >
                    <span className="font-mono text-[10px] block opacity-70 font-semibold">{attr}</span>
                    <span className="font-serif text-lg font-bold block">{character.attributes[attr]}</span>
                    <span className="font-mono text-[9px] block text-primary">
                      {getModSymbol(character.attributes[attr])}
                      {getCircumstanceModifier(attr) !== 0 && ` (${formatModifier(getCircumstanceModifier(attr))})`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={openModifierModal}
              disabled={character.locked}
              className="w-full py-2 border border-outline-variant/50 rounded text-xs font-mono text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Gestisci modificatori ({character.statModifiers?.length || 0})
            </button>

            {/* Preset roll triggering button */}
            <button
              onClick={() => onRollStat(
                ATTRIBUTE_NAMES[selectedAttribute],
                character.attributes[selectedAttribute],
                selectedCircumstanceModifier,
                selectedAttributeModifiers.map(({ name, icon, value }) => ({ name, icon, value })),
              )}
              className="w-full py-4 bg-gradient-to-r from-on-tertiary-container to-primary-container text-on-primary font-bold rounded shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:scale-105 active:scale-95 transition-all font-mono text-sm uppercase tracking-wider"
            >
              Tira + {selectedAttribute}
            </button>
          </div>

          {/* VITALITY GLASS VIAL HP CARD */}
          <div className="bg-surface-container-low border border-outline-variant/20 p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex justify-between items-center">
              <span className="font-mono text-xs text-primary font-bold tracking-widest uppercase">VITALITÀ</span>
              <span className="font-mono text-xs text-on-surface-variant font-semibold">
                PF {character.vitality.current} / {character.vitality.max}
              </span>
            </div>

            {/* Custom high-fantasy liquid glass vial bar */}
            <div className="h-6 w-full glass-vial-health rounded-full overflow-hidden border border-red-900/30 relative shadow-inner">
              <div
                className="h-full bg-red-700 relative transition-all duration-500 rounded-full"
                style={{ width: `${hpPercentage}%` }}
              >
                <div className="absolute top-0 left-0 w-full h-1/3 bg-white/15 blur-[1px]"></div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => adjustHP(-1)}
                disabled={character.locked}
                className="flex-1 py-1.5 rounded bg-surface-container-highest border border-outline-variant/40 text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
              >
                -
              </button>
              <button
                onClick={() => adjustHP(1)}
                disabled={character.locked}
                className="flex-1 py-1.5 rounded bg-surface-container-highest border border-outline-variant/40 text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
              >
                +
              </button>
            </div>

            {/* Armor and damage characteristics */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="text-center p-2.5 border border-outline-variant/30 bg-surface-container-lowest rounded">
                <span className="font-mono text-[9px] block opacity-50 font-bold uppercase">ARMATURA</span>
                <span className="font-serif text-2xl font-bold text-primary">{character.armor}</span>
              </div>
              <div className="text-center p-2.5 border border-outline-variant/30 bg-surface-container-lowest rounded">
                <span className="font-mono text-[9px] block opacity-50 font-bold uppercase">DANNI</span>
                <span className="font-serif text-2xl font-bold text-primary">{character.damageDie}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* INTERACTIVE WORKSPACE FOR TAB CORES (Col span 9) */}
        <section className="md:col-span-9 flex flex-col gap-6">
          
          {/* MOBILE DETAILED TAB NAVIGATION BAR */}
          <nav className="flex md:hidden justify-around items-center py-2 bg-surface-container-high rounded-lg border border-outline-variant/30">
            {(['stats', 'spells', 'moves', 'gear', 'lore'] as const).filter(tab => tab !== 'spells' || isSpellcaster).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`font-mono text-[10px] uppercase font-bold px-2 py-1 ${
                  activeTab === tab ? 'text-primary bg-primary/15 rounded' : 'text-on-surface-variant'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          {/* Core STATS TAB View */}
          {activeTab === 'stats' && (
            <div className="space-y-6 animate-[fadeIn_0.3s_ease]">
              
              {/* Race & Alignment selections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface-container-high deckle-edge p-6">
                  <h3 className="font-serif text-xl font-bold text-primary border-b border-primary/20 pb-2 mb-4 flex items-center gap-2">
                    🛡️ RAZZA
                  </h3>
                  <div className="space-y-4 text-left">
                    {template?.races ? (
                      template.races.map((race) => {
                        const isSelected = character.race.toUpperCase() === race.name.toUpperCase();
                        if (character.locked && !isSelected) return null;
                        return (
                          <label key={race.id} className="flex gap-4 cursor-pointer group">
                            <input
                              type="radio"
                              name="race"
                              disabled={character.locked}
                              checked={isSelected}
                              onChange={() => onUpdateCharacter({ ...character, race: race.name.toUpperCase() })}
                              className="mt-1 text-primary-container focus:ring-primary border-outline-variant bg-surface-dim"
                            />
                            <div className="flex flex-col">
                              <span className="font-bold text-primary group-hover:text-primary-fixed transition-colors text-sm">
                                {race.name.toUpperCase()}
                              </span>
                              <span className="text-on-surface-variant text-xs">
                                {race.moveDescription}
                              </span>
                            </div>
                          </label>
                        );
                      })
                    ) : (
                      <label className="flex gap-4 cursor-pointer group">
                        <input
                          type="radio"
                          name="race"
                          disabled={character.locked}
                          checked={true}
                          readOnly
                          className="mt-1 text-primary-container focus:ring-primary border-outline-variant bg-surface-dim"
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-primary text-sm uppercase">
                            {character.race}
                          </span>
                          <span className="text-on-surface-variant text-xs">
                            {getRaceDescription(character.race, character.class)}
                          </span>
                        </div>
                      </label>
                    )}
                  </div>
                </div>

                <div className="bg-surface-container-high deckle-edge p-6">
                  <h3 className="font-serif text-xl font-bold text-primary border-b border-primary/20 pb-2 mb-4 flex items-center gap-2">
                    ⚖️ ALLINEAMENTO
                  </h3>
                  <div className="space-y-3 text-left">
                    {template?.alignments ? (
                      template.alignments.map((alignment) => {
                        const isSelected = character.alignment.toUpperCase() === alignment.name.toUpperCase();
                        if (character.locked && !isSelected) return null;
                        return (
                          <div key={alignment.id} className={`flex items-start gap-3 p-2 rounded border transition-all ${isSelected ? 'bg-surface-dim/40 border-primary/10' : 'hover:bg-surface-dim/40 border-transparent'}`}>
                            <input
                              type="radio"
                              name="alignment"
                              disabled={character.locked}
                              checked={isSelected}
                              onChange={() => onUpdateCharacter({ ...character, alignment: alignment.name.toUpperCase(), alignmentDesc: alignment.description })}
                              className="mt-1 rounded-full border-outline-variant bg-surface-dim text-primary"
                            />
                            <div className="text-xs">
                              <p className={`font-mono font-bold ${isSelected ? 'text-primary' : 'text-on-surface-variant'}`}>{alignment.name.toUpperCase()}</p>
                              <p className="text-on-surface-variant italic">{alignment.description}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex items-start gap-3 p-2 bg-surface-dim/40 rounded border border-primary/10">
                        <input
                          type="radio"
                          name="alignment"
                          disabled={character.locked}
                          checked={true}
                          readOnly
                          className="mt-1 rounded-full border-outline-variant bg-surface-dim text-primary"
                        />
                        <div className="text-xs">
                          <p className="font-mono text-primary font-bold">{character.alignment}</p>
                          <p className="text-on-surface-variant italic">
                            {character.alignmentDesc || getAlignmentDescription(character.alignment)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Initial active moves */}
              <div className="bg-surface-container deckle-edge p-6 md:p-8 overflow-hidden relative">
                <div className="absolute -right-16 -top-16 opacity-5 pointer-events-none text-9xl">
                  🪄
                </div>
                <h2 className="font-serif text-2xl text-primary tracking-tight mb-6 flex items-center gap-3">
                  ⚔️ MOSSE INIZIALI
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  {template?.classMoves ? (
                    template.classMoves.filter(m => m.isStarting).map((move) => (
                      <article key={move.name} className="space-y-2">
                        <h4 className="font-serif font-bold text-primary mb-1">{move.name.toUpperCase()}</h4>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          {move.description}
                        </p>
                      </article>
                    ))
                  ) : (
                    <p className="text-xs text-on-surface-variant italic col-span-2">Caricamento mosse iniziali...</p>
                  )}
                </div>
              </div>

              {/* Bonds and equipment inventory block */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
                {/* Bonds Box */}
                <div className="lg:col-span-8 bg-surface-container-high deckle-edge p-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="font-serif text-xl font-bold text-primary flex items-center gap-2">
                      👥 LEGAMI
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddBond}
                      disabled={character.locked}
                      className="flex items-center gap-1 rounded border border-outline-variant/50 px-2.5 py-1.5 text-xs font-mono text-primary hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus size={14} />
                      Aggiungi
                    </button>
                  </div>
                  <div className="space-y-4">
                    {character.bonds.length === 0 && (
                      <p className="text-xs text-on-surface-variant italic">Nessun legame. Aggiungine uno.</p>
                    )}
                    {character.bonds.map((bond, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-outline-variant/20 pb-3 last:border-0 last:pb-0">
                        <input
                          type="text"
                          disabled={character.locked}
                          placeholder="Nome compagno"
                          aria-label={`Nome compagno legame ${index + 1}`}
                          value={bond.companion}
                          onChange={(event) => handleBondChange(index, 'companion', event.target.value)}
                          className="w-full sm:w-36 shrink-0 bg-surface-container border border-outline-variant/30 text-on-surface text-xs font-mono rounded px-2.5 py-2 focus:ring-1 focus:ring-primary focus:border-primary outline-none disabled:opacity-50"
                        />
                        <input
                          type="text"
                          disabled={character.locked}
                          placeholder="Descrivi il legame..."
                          aria-label={`Testo legame ${index + 1}`}
                          value={bond.statement}
                          onChange={(event) => handleBondChange(index, 'statement', event.target.value)}
                          className="w-full min-w-0 flex-1 bg-surface-container border border-outline-variant/30 text-on-surface text-xs rounded px-2.5 py-2 focus:ring-1 focus:ring-primary focus:border-primary outline-none disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteBond(index)}
                          disabled={character.locked}
                          aria-label={`Elimina legame ${index + 1}`}
                          title="Elimina legame"
                          className="self-end sm:self-auto shrink-0 rounded p-2 text-red-400 hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Equipment / Item Weight Box */}
                <div className="lg:col-span-4 bg-surface-container-low border border-outline-variant/20 p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-serif text-lg font-bold text-primary">EQUIPAGGIAMENTO</h3>
                      <span className="font-mono text-[10px] text-on-surface-variant font-bold">
                        PESO {activeWeightSum} / {character.maxWeight}
                      </span>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {character.gear.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between p-2 bg-surface-container-highest/30 border border-outline-variant/10 rounded group text-xs items-center hover:bg-surface-container"
                        >
                          <div className="min-w-0">
                            <span className="block truncate font-sans font-medium text-on-surface hover:text-primary">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-outline font-mono">
                              Peso: {item.weight * getGearQuantity(item)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isGearConsumable(item) && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleAdjustGearQuantity(idx, -1)}
                                  disabled={character.locked || (item.quantity ?? 1) <= 0}
                                  aria-label={`Riduci quantità di ${item.name}`}
                                  className="rounded p-1 text-on-surface-variant hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="min-w-5 text-center font-mono text-on-surface-variant font-bold">
                                  {item.quantity ?? 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAdjustGearQuantity(idx, 1)}
                                  disabled={character.locked}
                                  aria-label={`Aumenta quantità di ${item.name}`}
                                  className="rounded p-1 text-on-surface-variant hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Plus size={12} />
                                </button>
                              </>
                            )}
                            {!character.locked && (
                              <button
                                type="button"
                                onClick={() => handleDeleteGear(idx)}
                                aria-label={`Elimina ${item.name}`}
                                className="text-red-400 hover:text-red-300 p-0.5"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Dashed placeholder for empty inventory slots */}
                      {character.gear.length < 5 &&
                        Array.from({ length: 5 - character.gear.length }).map((_, idx) => (
                          <div
                            key={idx}
                            className="h-8 border border-dashed border-outline-variant/20 rounded flex items-center justify-center opacity-30 text-[10px] font-mono uppercase"
                          >
                            Slot vuoto
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Add item form within sidebar boundaries */}
                  {!character.locked && (
                    <form onSubmit={handleAddGear} className="mt-4 border-t border-outline-variant/20 pt-4 space-y-2">
                      <div className={`grid gap-2 ${newGearConsumable ? 'grid-cols-[minmax(0,1fr)_3.25rem_3.25rem]' : 'grid-cols-[minmax(0,1fr)_3.25rem]'}`}>
                        <input
                          type="text"
                          required
                          placeholder="Nuovo Oggetto"
                          value={newGearName}
                          onChange={(e) => setNewGearName(e.target.value)}
                          className="flex-1 bg-surface-container-lowest border border-outline-variant/30 text-xs px-2 py-1 text-on-surface rounded outline-none"
                        />
                        <input
                          type="number"
                          required
                          min="0"
                          step="1"
                          value={newGearWeight}
                          onChange={(e) => setNewGearWeight(parseInt(e.target.value) || 0)}
                          aria-label="Peso unitario"
                          placeholder="Peso"
                          className="w-full bg-surface-container-lowest border border-outline-variant/30 text-xs text-center px-1 py-1 text-on-surface rounded outline-none font-mono"
                        />
                        {newGearConsumable && (
                          <input
                            type="number"
                            required
                            min="1"
                            step="1"
                            value={newGearQuantity}
                            onChange={(e) => setNewGearQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            aria-label="Quantità"
                            placeholder="Qtà"
                            className="w-full bg-surface-container-lowest border border-outline-variant/30 text-xs text-center px-1 py-1 text-on-surface rounded outline-none font-mono"
                          />
                        )}
                      </div>
                      <label className="flex items-center gap-2 text-[10px] font-mono text-on-surface-variant">
                        <input
                          type="checkbox"
                          checked={newGearConsumable}
                          onChange={(event) => {
                            setNewGearConsumable(event.target.checked);
                            if (!event.target.checked) setNewGearQuantity(1);
                          }}
                          className="accent-primary"
                        />
                        Consumabile (quantità modificabile)
                      </label>
                      <button
                        type="submit"
                        className="w-full py-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 hover:scale-95 duration-200 transition-all font-mono text-[10px] font-bold uppercase rounded"
                      >
                        Aggiungi Oggetto
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Core INVENTORY TAB DIRECT SPECI ALIST */}
          {activeTab === 'gear' && (
            <div className="bg-surface-container border border-outline-variant/20 p-6 md:p-8 rounded-lg animate-[fadeIn_0.3s_ease] text-left space-y-6">
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-4">
                <div>
                  <h3 className="font-serif text-2xl text-primary font-bold">Zaino &amp; Equipaggiamento</h3>
                  <p className="text-xs text-on-surface-variant font-mono">
                    Total current payload: {activeWeightSum} / {character.maxWeight} stones
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {character.gear.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-surface-container-lowest border border-outline-variant/30 rounded flex justify-between items-center"
                  >
                    <div className="min-w-0">
                      <h4 className="font-serif text-md text-primary font-bold">{item.name}</h4>
                      <p className="text-xs text-outline font-mono">
                        Peso unitario: {item.weight}
                        {isGearConsumable(item) && <> · Quantità: {item.quantity ?? 1}</>}
                      </p>
                    </div>
                    <div className="ml-3 flex shrink-0 items-center gap-1">
                      {isGearConsumable(item) && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAdjustGearQuantity(idx, -1)}
                            disabled={character.locked || (item.quantity ?? 1) <= 0}
                            aria-label={`Riduci quantità di ${item.name}`}
                            className="rounded p-2 text-on-surface-variant hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="min-w-6 text-center font-mono text-sm text-on-surface">
                            {item.quantity ?? 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdjustGearQuantity(idx, 1)}
                            disabled={character.locked}
                            aria-label={`Aumenta quantità di ${item.name}`}
                            className="rounded p-2 text-on-surface-variant hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus size={14} />
                          </button>
                        </>
                      )}
                      {!character.locked && (
                        <button
                          type="button"
                          onClick={() => handleDeleteGear(idx)}
                          aria-label={`Elimina ${item.name}`}
                          className="rounded p-2 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!character.locked && (
                <div className="bg-surface-container-low border border-outline-variant/30 p-4 rounded max-w-md">
                  <h4 className="font-mono text-xs font-bold text-primary uppercase mb-2">Equipaggia un Nuovo Strumento</h4>
                  <form onSubmit={handleAddGear} className="space-y-3">
                    <div className={`grid gap-3 ${newGearConsumable ? 'grid-cols-4' : 'grid-cols-3'}`}>
                      <input
                        type="text"
                        required
                        placeholder="Nome Oggetto"
                        value={newGearName}
                        onChange={(e) => setNewGearName(e.target.value)}
                        className="col-span-2 bg-surface-container-lowest border border-outline-variant/30 text-xs px-3 py-2 text-on-surface rounded outline-none"
                      />
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="Peso"
                        value={newGearWeight}
                        onChange={(e) => setNewGearWeight(parseInt(e.target.value) || 0)}
                        className="bg-surface-container-lowest border border-outline-variant/30 text-xs text-center px-2 py-2 text-on-surface rounded outline-none font-mono"
                      />
                      {newGearConsumable && (
                        <input
                          type="number"
                          required
                          min="1"
                          step="1"
                          placeholder="Quantità"
                          aria-label="Quantità nuovo oggetto"
                          value={newGearQuantity}
                          onChange={(e) => setNewGearQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="bg-surface-container-lowest border border-outline-variant/30 text-xs text-center px-2 py-2 text-on-surface rounded outline-none font-mono"
                        />
                      )}
                    </div>
                    <label className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <input
                        type="checkbox"
                        checked={newGearConsumable}
                        onChange={(event) => {
                          setNewGearConsumable(event.target.checked);
                          if (!event.target.checked) setNewGearQuantity(1);
                        }}
                        className="accent-primary"
                      />
                      Consumabile (quantità modificabile)
                    </label>
                    <button
                      type="submit"
                      className="w-full py-2 bg-gradient-to-r from-primary-container to-primary text-on-primary font-mono text-xs font-bold rounded"
                    >
                      Aggiungi all'Inventario
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* SPELLS TAB COMPOSITIONS */}
          {activeTab === 'spells' && (
            <div className="animate-[fadeIn_0.3s_ease] text-left">
              {isSpellcaster ? renderSpellsTab() : (
                <div className="bg-surface-container border border-outline-variant/20 p-12 rounded-lg text-center">
                  <p className="font-serif text-3xl text-primary mb-3">⚔️ Nessuna Magia</p>
                  <p className="text-sm text-on-surface-variant">{character.class} non è un incantatore.</p>
                </div>
              )}
            </div>
          )}

          {/* MOVES ADVANCD TAB PIECES */}
          {activeTab === 'moves' && (
            <div className="bg-surface-container p-6 md:p-8 rounded-lg animate-[fadeIn_0.3s_ease] text-left space-y-6">
              <h3 className="font-serif text-2xl text-primary tracking-widest uppercase">MOSSE AVANZATE DISPONIBILI</h3>
              <p className="text-xs text-on-surface-variant font-mono">
                {character.locked 
                  ? "Mosse avanzate apprese e attive." 
                  : "Clicca su una mossa per selezionarla e attivarla."}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {(template?.classMoves ? template.classMoves.filter(m => !m.isStarting) : ADVANCED_MOVES).map((move) => {
                  const moveKey = move.name;
                  const isSelected = isMoveSelected(moveKey);
                  if (character.locked && !isSelected) return null;

                  return (
                    <button
                      type="button"
                      key={moveKey}
                      disabled={character.locked}
                      onClick={() => toggleMove(moveKey)}
                      className={`p-4 bg-surface-container-low border rounded text-left transition-all w-full flex flex-col justify-between ${
                        isSelected 
                          ? 'border-primary shadow-[inset_0_0_10px_rgba(242,202,80,0.1)]' 
                          : 'border-outline-variant/30 opacity-60 hover:opacity-100 hover:border-primary/40'
                      } ${character.locked ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-2.5 h-2.5 rounded-full border border-primary transition-all ${
                            isSelected ? 'bg-primary' : 'bg-transparent'
                          }`} />
                          <h4 className="font-serif text-md text-primary font-bold">{move.name}</h4>
                        </div>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          {move.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* LORE CAPABILITIES TAB */}
          {activeTab === 'lore' && (
            <div className="bg-surface-container border border-outline-variant/20 p-6 md:p-8 rounded-lg animate-[fadeIn_0.3s_ease] text-left space-y-6">
              <h3 className="font-serif text-2xl text-primary font-bold">Biografia &amp; Note sulla Campagna</h3>
              <div className="space-y-4">
                <div>
                  <label className="font-mono text-xs text-primary block mb-2">Retroterra &amp; Diario del Viaggio</label>
                  <textarea
                    rows={8}
                    readOnly={character.locked}
                    value={loreDraft}
                    onChange={(event) => {
                      const lore = event.target.value;
                      setLoreDraft(lore);
                      onUpdateCharacter({ ...character, lore });
                    }}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded p-4 text-xs font-mono text-on-surface disabled:text-on-surface disabled:opacity-90 outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* AVATAR EXPANSION & SELECTION MODAL */}
      {isAvatarModalOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-[fadeIn_0.2s_ease]"
          onClick={handleAvatarCancel}
        >
          <div 
            className="bg-surface-container-highest border-2 border-primary/40 rounded-xl max-w-md w-full overflow-hidden shadow-[0_0_50px_rgba(242,202,80,0.25)] flex flex-col p-6 relative gap-5 animate-[scaleUp_0.2s_ease]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
              <h3 className="font-serif text-lg text-primary uppercase tracking-widest font-bold">Ritratto del Personaggio</h3>
              <button 
                type="button"
                onClick={handleAvatarCancel}
                className="text-on-surface-variant hover:text-primary font-mono text-md transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* Expanded Avatar Display inside premium parchment frame */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-40 h-40 rounded-lg overflow-hidden border-2 border-primary shadow-[0_0_20px_rgba(242,202,80,0.2)] bg-surface-container flex items-center justify-center">
                <img 
                  src={character.avatar} 
                  alt="Expanded Portrait" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=300&auto=format&fit=crop';
                  }}
                />
              </div>
              <p className="text-[10px] uppercase font-mono text-on-surface-variant tracking-wider">Anteprima Ritratto</p>
            </div>

            {/* Inputs & presets */}
            <div className="space-y-4">
              {/* Option 1: File Uploader */}
              <div>
                <label className="block text-[10px] font-mono text-primary uppercase tracking-wider mb-2">Carica Immagine Locale</label>
                <div className="flex flex-col gap-2">
                  <label className="flex flex-col items-center justify-center w-full h-20 border border-dashed border-primary/25 rounded-lg cursor-pointer bg-surface-container hover:bg-surface-container-low hover:border-primary transition-all">
                    <div className="flex flex-col items-center justify-center py-2">
                      <p className="text-xs text-on-surface-variant font-mono">Trascina o clicca per caricare</p>
                      <p className="text-[9px] text-on-surface-variant/60 font-mono mt-0.5">PNG, JPG, WEBP (Max 2MB)</p>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileUpload} 
                    />
                  </label>
                  {uploadError && (
                    <p className="text-red-400 font-mono text-[10px] mt-1">{uploadError}</p>
                  )}
                </div>
              </div>

              {/* Option 2: Image URL input */}
              <div>
                <label className="block text-[10px] font-mono text-primary uppercase tracking-wider mb-1.5">Incolla URL Immagine</label>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAvatarSubmit(avatarUrlInput);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="url"
                    value={avatarUrlInput}
                    onChange={(e) => {
                      setAvatarUrlInput(e.target.value);
                      onUpdateCharacter({
                        ...character,
                        avatar: e.target.value
                      });
                    }}
                    placeholder="https://esempio.com/ritratto.jpg"
                    className="flex-1 bg-surface-container border border-outline-variant/30 rounded p-2 text-xs font-mono text-on-surface outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-primary to-primary/80 text-background text-xs font-bold uppercase tracking-wider rounded shadow-md hover:opacity-95 active:scale-95 transition-all"
                  >
                    Salva
                  </button>
                </form>
              </div>

              {/* Option 3: Presets selection */}
              <div>
                <label className="block text-[10px] font-mono text-primary uppercase tracking-wider mb-2">Modelli Tempio Fantasy</label>
                <div className="grid grid-cols-4 gap-2">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setAvatarUrlInput(preset.url);
                        onUpdateCharacter({
                          ...character,
                          avatar: preset.url
                        });
                      }}
                      className={`h-12 border rounded overflow-hidden transition-all relative group ${
                        character.avatar === preset.url 
                          ? 'border-primary ring-1 ring-primary' 
                          : 'border-outline-variant/30 hover:border-primary/50'
                      }`}
                      title={preset.name}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/70 text-[8px] font-mono py-0.5 text-center text-on-surface opacity-0 group-hover:opacity-100 transition-opacity">
                        {preset.name.split(' ')[0]}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="border-t border-outline-variant/25 pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleAvatarCancel}
                className="px-4 py-2 border border-outline-variant/40 hover:bg-surface-container text-on-surface-variant hover:text-on-surface text-xs font-bold uppercase tracking-wider rounded transition-colors"
               >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => handleAvatarSubmit(character.avatar || '')}
                className="px-4 py-2 bg-primary text-background hover:bg-primary/90 text-xs font-bold uppercase tracking-wider rounded shadow-md transition-colors"
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {isModifierModalOpen && (
        <div
          className="fixed inset-0 z-[10020] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setIsModifierModalOpen(false)}
        >
          <div
            className="bg-surface-container-high border border-outline-variant rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl text-primary font-bold">Modificatori di circostanza</h2>
                <p className="text-xs text-on-surface-variant mt-1">
                  Si sommano al tiro senza cambiare il punteggio. Restano attivi finché non li rimuovi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModifierModalOpen(false)}
                aria-label="Chiudi gestione modificatori"
                className="p-1 text-on-surface-variant hover:text-on-surface"
              >
                <X size={18} />
              </button>
            </div>

            <section className="space-y-2">
              <h3 className="font-mono text-xs uppercase tracking-wider text-on-surface-variant">
                Effetti attivi
              </h3>
              {(character.statModifiers || []).length === 0 ? (
                <p className="text-xs text-on-surface-variant/70 italic">Nessun modificatore attivo.</p>
              ) : (
                <ul className="space-y-2">
                  {(character.statModifiers || []).map((modifier) => (
                    <li
                      key={modifier.id}
                      className="flex items-center justify-between gap-3 rounded border border-outline-variant/40 bg-surface-container p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-on-surface">
                          {modifier.icon} {modifier.name}{' '}
                          <span className={modifier.value < 0 ? 'text-red-400' : 'text-green-400'}>
                            {formatModifier(modifier.value)}
                          </span>
                        </p>
                        <p className="text-[10px] text-on-surface-variant">
                          {modifier.attributes.map((attribute) => attribute).join(', ')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveStatModifier(modifier.id)}
                        disabled={character.locked}
                        aria-label={`Rimuovi ${modifier.name}`}
                        title="Rimuovi modificatore"
                        className="shrink-0 p-2 text-red-400 hover:bg-red-400/10 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <form onSubmit={handleAddStatModifier} className="space-y-4 border-t border-outline-variant/40 pt-4">
              <h3 className="font-mono text-xs uppercase tracking-wider text-on-surface-variant">
                Aggiungi un effetto
              </h3>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <label className="text-xs text-on-surface-variant">
                  Nome
                  <input
                    value={newModifierName}
                    onChange={(event) => setNewModifierName(event.target.value)}
                    disabled={character.locked}
                    maxLength={50}
                    placeholder="Es. Notte insonne"
                    className="mt-1 w-full rounded border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary disabled:opacity-40"
                  />
                </label>
                <label className="text-xs text-on-surface-variant">
                  Icona
                  <select
                    value={newModifierIcon}
                    onChange={(event) => setNewModifierIcon(event.target.value)}
                    disabled={character.locked}
                    className="mt-1 block rounded border border-outline-variant bg-surface-container px-3 py-2 text-lg text-on-surface outline-none focus:border-primary disabled:opacity-40"
                  >
                    {['🌙', '💤', '🩹', '✨', '🧪', '🔥', '❄️', '👑'].map((icon) => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-xs text-on-surface-variant">
                Modificatore al tiro
                <input
                  type="number"
                  step="1"
                  value={newModifierValue}
                  onChange={(event) => setNewModifierValue(event.target.value)}
                  disabled={character.locked}
                  className="mt-1 block w-28 rounded border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary disabled:opacity-40"
                />
              </label>
              <fieldset disabled={character.locked} className="space-y-2 disabled:opacity-40">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant">Attributi interessati</span>
                  <button
                    type="button"
                    onClick={() => setNewModifierAttributes(ATTRIBUTE_KEYS)}
                    className="text-[10px] font-mono text-primary hover:underline"
                  >
                    Seleziona tutti
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ATTRIBUTE_KEYS.map((attribute) => (
                    <label
                      key={attribute}
                      className="flex items-center gap-2 rounded border border-outline-variant/40 bg-surface-container px-2 py-2 text-xs text-on-surface"
                    >
                      <input
                        type="checkbox"
                        checked={newModifierAttributes.includes(attribute)}
                        onChange={() => setNewModifierAttributes((current) =>
                          current.includes(attribute)
                            ? current.filter((item) => item !== attribute)
                            : [...current, attribute],
                        )}
                        className="accent-primary"
                      />
                      {attribute} · {ATTRIBUTE_NAMES[attribute]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <button
                type="submit"
                disabled={
                  character.locked ||
                  !newModifierName.trim() ||
                  !Number.isInteger(Number(newModifierValue)) ||
                  Number(newModifierValue) === 0 ||
                  newModifierAttributes.length === 0
                }
                className="w-full rounded bg-primary px-4 py-2 text-sm font-bold text-on-primary hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Aggiungi modificatore
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ⭐ RITUALE DEL LIVELLO SUPERIORE */}
      {isLevelUpModalOpen && (
        <div
          className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-[fadeIn_0.2s_ease]"
          onClick={() => setIsLevelUpModalOpen(false)}
        >
          <div
            className="parchment-bg border-2 border-primary shadow-[0_0_60px_rgba(242,202,80,0.4)] rounded-lg max-w-sm w-full p-8 flex flex-col items-center gap-5 animate-[scaleUp_0.2s_ease] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl">⭐</div>
            <h2 className="font-serif text-2xl text-primary uppercase tracking-widest font-bold">
              Rituale del Livello Superiore
            </h2>
            <p className="text-sm text-on-surface-variant font-mono leading-relaxed">
              Il Master ha decretato che la tua gesta merita riconoscimento.<br />
              <span className="text-primary font-bold">{character.name}</span> avanza al{' '}
              <span className="text-primary font-bold">Livello {character.level + 1}</span>.
            </p>
            <label className="w-full text-left text-xs font-mono text-on-surface-variant">
              Scegli l'attributo da aumentare di 1
              <select
                value={levelUpAttribute}
                onChange={(event) => setLevelUpAttribute(event.target.value as AttributeKey)}
                className="mt-2 w-full rounded border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface"
              >
                {ATTRIBUTE_KEYS.map((attribute) => (
                  <option
                    key={attribute}
                    value={attribute}
                    disabled={character.attributes[attribute] >= 18}
                  >
                    {attribute} · {ATTRIBUTE_NAMES[attribute]} ({character.attributes[attribute]} → {character.attributes[attribute] + 1})
                  </option>
                ))}
              </select>
            </label>
            {ATTRIBUTE_KEYS.every((attribute) => character.attributes[attribute] >= 18) && (
              <p className="text-xs text-red-400 font-mono">
                Tutti gli attributi hanno già raggiunto il massimo di 18.
              </p>
            )}
            <p className="text-xs text-on-surface-variant/60 font-mono italic">
              Il punteggio scelto aumenta di 1 e i Punti Esperienza saranno azzerati. Il rito non potrà essere disfatto.
            </p>
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => setIsLevelUpModalOpen(false)}
                className="flex-1 py-2 rounded border border-outline-variant text-on-surface-variant text-sm font-mono hover:bg-surface-container transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleLevelUp}
                disabled={character.locked || character.attributes[levelUpAttribute] >= 18}
                className="flex-1 py-2 rounded bg-primary text-on-primary text-sm font-serif font-bold uppercase tracking-widest hover:bg-primary/80 transition-colors shadow-[0_0_20px_rgba(242,202,80,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Compi il Rito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚜️ CONDIVIDI LA TUA LEGGENDA (COMMUNITY PUBLISH MODAL) */}
      {isPublishModalOpen && onPublishCommunity && (
        <div 
          className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-[fadeIn_0.2s_ease]"
          onClick={() => setIsPublishModalOpen(false)}
        >
          <div 
            className="parchment-bg border border-amber-800 shadow-[0_0_50px_rgba(242,202,80,0.25)] rounded-lg max-w-md w-full p-6 flex flex-col relative gap-4 animate-[scaleUp_0.2s_ease]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700"></div>

            <div className="flex justify-between items-center border-b border-amber-900/20 pb-3">
              <h3 className="font-serif text-lg text-amber-900 uppercase font-black tracking-widest flex items-center gap-1.5">
                <span>⚜️ Pubblica nella Gilda</span>
              </h3>
              <button 
                onClick={() => setIsPublishModalOpen(false)}
                className="text-amber-950 font-mono text-sm hover:underline"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-serif italic text-sm text-amber-950/80 leading-relaxed text-center">
              <p>
                " Ogni eroe merita che le sue gesta vengano cantate dai bardi nelle locande. "
              </p>
              <p className="text-xs text-amber-900/60 font-sans not-italic">
                Pubblicando questa scheda, gli altri giocatori potranno clonare e consultare il tuo personaggio.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono text-amber-800">
                La Leggenda dell'Eroe (Breve Descrizione)
              </label>
              <textarea
                rows={3}
                value={publishDescription}
                onChange={(e) => setPublishDescription(e.target.value)}
                placeholder="Narra una mossa folle, il destino dell'eroe o le sue epiche reliquie..."
                className="w-full bg-white/60 border border-amber-900/30 rounded px-3 py-2 text-xs text-amber-950 focus:outline-none focus:border-amber-700 placeholder-amber-900/40 resize-none font-serif leading-relaxed"
              />
            </div>

            <button
              onClick={async () => {
                if (!onPublishCommunity) return;
                setIsPublishing(true);
                await onPublishCommunity(character, publishDescription);
                setIsPublishing(false);
                setIsPublishModalOpen(false);
              }}
              disabled={isPublishing}
              className="w-full bg-amber-950 hover:bg-amber-900 text-amber-100 hover:text-white rounded py-2.5 text-xs uppercase font-mono tracking-wider transition-all duration-200 border border-amber-800 shadow flex items-center justify-center gap-1.5"
            >
              {isPublishing ? 'Inscrizione dei Bardi...' : 'Condividi Leggenda nel Tempio ⚜️'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

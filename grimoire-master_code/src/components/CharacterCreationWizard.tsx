// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Eye, Save, Scale, Sparkles, Star, User, X } from 'lucide-react';
import { Character, CharacterTemplate } from '../types';

type AttributeKey = keyof Character['attributes'];

interface CharacterCreationWizardProps {
  templates: CharacterTemplate[];
  initialTemplateId?: string;
  onClose: () => void;
  onCreateCharacter: (character: Character) => void;
}

interface RaceOption {
  id: string;
  name: string;
  description: string;
  trait: string;
  bonusAttribute: AttributeKey;
  bonusValue: number;
}

interface AlignmentOption {
  id: string;
  name: string;
  description: string;
}

interface TemplateWizardConfig {
  raceOptions: RaceOption[];
  alignmentOptions: AlignmentOption[];
  classBonus: {
    attribute: AttributeKey;
    value: number;
    label: string;
  };
  appearanceOptions: {
    eyes: string[];
    head: string[];
    clothes: string[];
    body: string[];
  };
  fragments: number[];
}

const DRAFT_STORAGE_KEY = 'grimoire_character_wizard_draft';

const ATTRIBUTE_KEYS: AttributeKey[] = ['FOR', 'DES', 'COS', 'INT', 'SAG', 'CAR'];

const ATTRIBUTE_LABELS: Record<AttributeKey, { it: string; en: string }> = {
  FOR: { it: 'Forza', en: 'Strength' },
  DES: { it: 'Destrezza', en: 'Dexterity' },
  COS: { it: 'Costituzione', en: 'Constitution' },
  INT: { it: 'Intelligenza', en: 'Intelligence' },
  SAG: { it: 'Saggezza', en: 'Wisdom' },
  CAR: { it: 'Carisma', en: 'Charisma' }
};

const DEFAULT_APPEARANCE = {
  eyes: '',
  head: '',
  clothes: '',
  body: ''
};

const toClassKey = (className: string): 'wizard' | 'fighter' | 'thief' | 'paladin' | 'generic' => {
  const normalized = className.toLowerCase();
  if (normalized.includes('mago') || normalized.includes('wizard')) return 'wizard';
  if (normalized.includes('guerriero') || normalized.includes('fighter')) return 'fighter';
  if (normalized.includes('ladro') || normalized.includes('thief')) return 'thief';
  if (normalized.includes('paladino') || normalized.includes('paladin')) return 'paladin';
  return 'generic';
};

const getAttributeMod = (score: number): string => {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
};

const getTemplateConfig = (template: CharacterTemplate): TemplateWizardConfig => {
  const classKey = toClassKey(template.class);

  if (classKey === 'wizard') {
    return {
      raceOptions: [
        {
          id: 'elfo',
          name: 'Elfo',
          description: 'La magia per te e naturale come il respiro. Ottieni una connessione innata ai flussi arcan i.',
          trait: 'Senso Arcano',
          bonusAttribute: 'SAG',
          bonusValue: 1
        },
        {
          id: 'umano',
          name: 'Umano',
          description: 'La tua versatilita non conosce limiti: puoi innestare dottrine esterne nel tuo grimorio.',
          trait: 'Erudito Divino',
          bonusAttribute: 'INT',
          bonusValue: 1
        }
      ],
      alignmentOptions: [
        {
          id: 'buono',
          name: 'Buono',
          description: 'Agisci per il bene altrui, anche a costo personale. La tua magia e un faro nella tempesta.'
        },
        {
          id: 'neutrale',
          name: 'Neutrale',
          description: 'Cerchi l equilibrio universale. La magia e uno strumento per leggere il disegno nascosto.'
        },
        {
          id: 'malvagio',
          name: 'Malvagio',
          description: 'Pieghi il potere ai tuoi scopi. La morale e un velo che i segreti piu oscuri dissolvono.'
        }
      ],
      classBonus: {
        attribute: 'INT',
        value: 2,
        label: '+2 Intelligenza'
      },
      appearanceOptions: {
        eyes: ['Occhi tormentati', 'Occhi vispi', 'Occhi vitrei'],
        head: ['Cappello a punta', 'Testa calva', 'Capelli arruffati'],
        clothes: ['Toga logora', 'Toga raffinata', 'Vesti astrali'],
        body: ['Corpo atletico', 'Corpo gracile', 'Portamento regale']
      },
      fragments: [16, 15, 13, 12, 10, 8]
    };
  }

  if (classKey === 'fighter') {
    return {
      raceOptions: [
        {
          id: 'nano',
          name: 'Nano',
          description: 'Forgiato nella roccia e nella guerra. Resisti dove altri crollano.',
          trait: 'Sangue di Ferro',
          bonusAttribute: 'COS',
          bonusValue: 1
        },
        {
          id: 'umano',
          name: 'Umano',
          description: 'Versatile e imprevedibile. Ogni battaglia diventa terreno favorevole.',
          trait: 'Disciplina Marziale',
          bonusAttribute: 'FOR',
          bonusValue: 1
        }
      ],
      alignmentOptions: [
        {
          id: 'buono',
          name: 'Buono',
          description: 'Difendi i deboli e affronta la prima linea quando la tempesta arriva.'
        },
        {
          id: 'neutrale',
          name: 'Neutrale',
          description: 'Onora il patto del gruppo e scegli la vittoria con mente fredda.'
        },
        {
          id: 'malvagio',
          name: 'Malvagio',
          description: 'Conquista cio che desideri con il filo della lama e la paura dei nemici.'
        }
      ],
      classBonus: {
        attribute: 'FOR',
        value: 2,
        label: '+2 Forza'
      },
      appearanceOptions: {
        eyes: ['Sguardo di guerra', 'Occhi cicatrizzati', 'Occhi di brace'],
        head: ['Treccia da battaglia', 'Elmo scheggiato', 'Capelli rasati'],
        clothes: ['Corazza vissuta', 'Manto da campagna', 'Piastre cerimoniali'],
        body: ['Corpo massiccio', 'Corpo temprato', 'Corpo robusto']
      },
      fragments: [16, 15, 13, 12, 10, 8]
    };
  }

  if (classKey === 'thief') {
    return {
      raceOptions: [
        {
          id: 'umano',
          name: 'Umano',
          description: 'Ti confondi ovunque. Un volto in mezzo alla folla e gia una maschera.',
          trait: 'Passo Felpato',
          bonusAttribute: 'DES',
          bonusValue: 1
        },
        {
          id: 'halfling',
          name: 'Mezzuomo',
          description: 'Piccolo e imprendibile. Nessuna serratura ama averti vicino.',
          trait: 'Mani Leggere',
          bonusAttribute: 'CAR',
          bonusValue: 1
        }
      ],
      alignmentOptions: [
        {
          id: 'buono',
          name: 'Buono',
          description: 'Ruba ai predatori e proteggi chi non ha voce nelle ombre della citta.'
        },
        {
          id: 'neutrale',
          name: 'Neutrale',
          description: 'Lascia che l opportunita decida. Ti muovi tra le linee senza appartenergli.'
        },
        {
          id: 'malvagio',
          name: 'Malvagio',
          description: 'La fiducia e una moneta e tu sai esattamente come spendere quella altrui.'
        }
      ],
      classBonus: {
        attribute: 'DES',
        value: 2,
        label: '+2 Destrezza'
      },
      appearanceOptions: {
        eyes: ['Occhi diffidenti', 'Occhi rapidi', 'Occhi d ombra'],
        head: ['Cappuccio scuro', 'Capelli spettinati', 'Taglio asimmetrico'],
        clothes: ['Cuoio flessibile', 'Mantello opaco', 'Abiti da strada'],
        body: ['Corpo agile', 'Corpo asciutto', 'Corpo nervoso']
      },
      fragments: [16, 15, 13, 12, 10, 8]
    };
  }

  if (classKey === 'paladin') {
    return {
      raceOptions: [
        {
          id: 'umano',
          name: 'Umano',
          description: 'Porti il peso del giuramento con fermezza e misericordia.',
          trait: 'Voto Solenne',
          bonusAttribute: 'SAG',
          bonusValue: 1
        },
        {
          id: 'nano',
          name: 'Nano',
          description: 'Antico custode di voti e fortezze. La tua fede e un bastione.',
          trait: 'Cuore Incudine',
          bonusAttribute: 'FOR',
          bonusValue: 1
        }
      ],
      alignmentOptions: [
        {
          id: 'buono',
          name: 'Buono',
          description: 'Proteggi il giusto, anche quando il prezzo e alto e la strada impervia.'
        },
        {
          id: 'neutrale',
          name: 'Neutrale',
          description: 'Mantieni l ordine e la parola data, senza piegare il voto ai capricci.'
        },
        {
          id: 'malvagio',
          name: 'Malvagio',
          description: 'Strumentalizza il giuramento per imporre dominio e obbedienza assoluta.'
        }
      ],
      classBonus: {
        attribute: 'SAG',
        value: 2,
        label: '+2 Saggezza'
      },
      appearanceOptions: {
        eyes: ['Occhi severi', 'Occhi compassionevoli', 'Occhi d oro'],
        head: ['Elmo consacrato', 'Capigliatura nobile', 'Volto segnato'],
        clothes: ['Vesti da crociato', 'Mantello sacro', 'Armatura lucente'],
        body: ['Corpo disciplinato', 'Corpo imponente', 'Corpo saldo']
      },
      fragments: [16, 15, 13, 12, 10, 8]
    };
  }

  return {
    raceOptions: [
      {
        id: 'umano',
        name: 'Umano',
        description: 'Adattabile e determinato, pronto a tracciare il proprio destino.',
        trait: 'Versatilita Innata',
        bonusAttribute: 'INT',
        bonusValue: 1
      },
      {
        id: 'elfo',
        name: 'Elfo',
        description: 'Sensi acuti e antica memoria arcana risuonano nel sangue.',
        trait: 'Vista Primordiale',
        bonusAttribute: 'SAG',
        bonusValue: 1
      }
    ],
    alignmentOptions: [
      {
        id: 'buono',
        name: 'Buono',
        description: 'Agisci per il bene comune e difendi la tua compagnia.'
      },
      {
        id: 'neutrale',
        name: 'Neutrale',
        description: 'Cerca equilibrio tra necessita, dovere e curiosita.'
      },
      {
        id: 'malvagio',
        name: 'Malvagio',
        description: 'Piega il mondo alla tua volonta quando serve sopravvivere.'
      }
    ],
    classBonus: {
      attribute: 'INT',
      value: 1,
      label: '+1 Caratteristica Primaria'
    },
    appearanceOptions: {
      eyes: ['Occhi freddi', 'Occhi curiosi', 'Occhi antichi'],
      head: ['Cappuccio', 'Capelli lunghi', 'Calotta rasata'],
      clothes: ['Vesti da viaggio', 'Tunica elegante', 'Abiti consumati'],
      body: ['Corpo agile', 'Corpo robusto', 'Corpo asciutto']
    },
    fragments: [16, 15, 13, 12, 10, 8]
  };
};

export default function CharacterCreationWizard({
  templates,
  initialTemplateId,
  onClose,
  onCreateCharacter
}: CharacterCreationWizardProps) {
  const uniqueTemplates = useMemo(() => {
    const seen = new Set<string>();
    return templates.filter((template) => {
      if (seen.has(template.id)) return false;
      seen.add(template.id);
      return true;
    });
  }, [templates]);

  const fallbackTemplateId = uniqueTemplates[0]?.id || '';
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId || fallbackTemplateId);
  const [characterName, setCharacterName] = useState('');
  const [appearance, setAppearance] = useState(DEFAULT_APPEARANCE);
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [selectedAlignmentId, setSelectedAlignmentId] = useState('');
  const [selectedStat, setSelectedStat] = useState<AttributeKey>('FOR');
  const [attributeAssignments, setAttributeAssignments] = useState<Partial<Record<AttributeKey, number>>>({});

  const selectedTemplate = useMemo(
    () => uniqueTemplates.find((template) => template.id === selectedTemplateId) || uniqueTemplates[0],
    [selectedTemplateId, uniqueTemplates]
  );

  const config = useMemo(() => {
    if (!selectedTemplate) return null;
    return getTemplateConfig(selectedTemplate);
  }, [selectedTemplate]);

  useEffect(() => {
    if (!selectedTemplate || !config) return;

    setCharacterName((prev) => prev || selectedTemplate.defaultStats.name || '');

    const firstRace = config.raceOptions[0]?.id || '';
    const firstAlignment = config.alignmentOptions[0]?.id || '';

    setSelectedRaceId((prev) => {
      const exists = config.raceOptions.some((option) => option.id === prev);
      return exists ? prev : firstRace;
    });

    setSelectedAlignmentId((prev) => {
      const exists = config.alignmentOptions.some((option) => option.id === prev);
      return exists ? prev : firstAlignment;
    });

    setSelectedStat(config.classBonus.attribute);
  }, [selectedTemplate, config]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        step?: 1 | 2 | 3 | 4;
        selectedTemplateId?: string;
        characterName?: string;
        appearance?: typeof DEFAULT_APPEARANCE;
        selectedRaceId?: string;
        selectedAlignmentId?: string;
        selectedStat?: AttributeKey;
        attributeAssignments?: Partial<Record<AttributeKey, number>>;
      };

      if (draft.selectedTemplateId && uniqueTemplates.some((template) => template.id === draft.selectedTemplateId)) {
        setSelectedTemplateId(draft.selectedTemplateId);
      }
      if (draft.step) setStep(draft.step);
      if (draft.characterName) setCharacterName(draft.characterName);
      if (draft.appearance) setAppearance({ ...DEFAULT_APPEARANCE, ...draft.appearance });
      if (draft.selectedRaceId) setSelectedRaceId(draft.selectedRaceId);
      if (draft.selectedAlignmentId) setSelectedAlignmentId(draft.selectedAlignmentId);
      if (draft.selectedStat) setSelectedStat(draft.selectedStat);
      if (draft.attributeAssignments) setAttributeAssignments(draft.attributeAssignments);
    } catch {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, [uniqueTemplates]);

  const selectedRace = useMemo(() => config?.raceOptions.find((race) => race.id === selectedRaceId), [config, selectedRaceId]);
  const selectedAlignment = useMemo(
    () => config?.alignmentOptions.find((alignment) => alignment.id === selectedAlignmentId),
    [config, selectedAlignmentId]
  );

  const finalAttributes = useMemo(() => {
    if (!config) {
      return { FOR: 0, DES: 0, COS: 0, INT: 0, SAG: 0, CAR: 0 };
    }

    const result = { FOR: 0, DES: 0, COS: 0, INT: 0, SAG: 0, CAR: 0 };
    ATTRIBUTE_KEYS.forEach((attribute) => {
      const base = attributeAssignments[attribute] || 0;
      const classBonus = attribute === config.classBonus.attribute ? config.classBonus.value : 0;
      const raceBonus = selectedRace && attribute === selectedRace.bonusAttribute ? selectedRace.bonusValue : 0;
      result[attribute] = base + classBonus + raceBonus;
    });
    return result;
  }, [attributeAssignments, config, selectedRace]);

  const allAttributesAssigned = ATTRIBUTE_KEYS.every((attribute) => typeof attributeAssignments[attribute] === 'number');

  const canGoNext = useMemo(() => {
    if (!selectedTemplate || !config) return false;
    if (step === 1) {
      return (
        characterName.trim().length > 1 &&
        appearance.eyes.trim().length > 0 &&
        appearance.head.trim().length > 0 &&
        appearance.clothes.trim().length > 0 &&
        appearance.body.trim().length > 0
      );
    }
    if (step === 2) {
      return Boolean(selectedRace && selectedAlignment);
    }
    if (step === 3) {
      return allAttributesAssigned;
    }
    return true;
  }, [selectedTemplate, config, step, characterName, appearance, selectedRace, selectedAlignment, allAttributesAssigned]);

  const saveDraft = () => {
    localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        step,
        selectedTemplateId,
        characterName,
        appearance,
        selectedRaceId,
        selectedAlignmentId,
        selectedStat,
        attributeAssignments,
        savedAt: new Date().toISOString()
      })
    );
  };

  const assignFragment = (fragment: number) => {
    setAttributeAssignments((prev) => {
      const next = { ...prev };
      const occupiedBy = ATTRIBUTE_KEYS.find((attribute) => next[attribute] === fragment);

      if (occupiedBy) {
        delete next[occupiedBy];
      }

      if (next[selectedStat] === fragment) {
        delete next[selectedStat];
      } else {
        next[selectedStat] = fragment;
      }

      return next;
    });
  };

  const removeAssignment = (attribute: AttributeKey) => {
    setAttributeAssignments((prev) => {
      const next = { ...prev };
      delete next[attribute];
      return next;
    });
  };

  const handleCreate = () => {
    if (!selectedTemplate || !config || !canGoNext || !selectedRace || !selectedAlignment) return;

    const baseCharacter = JSON.parse(JSON.stringify(selectedTemplate.defaultStats)) as Character;
    const constitutionDelta = finalAttributes.COS - baseCharacter.attributes.COS;
    const newVitalityMax = Math.max(4, baseCharacter.vitality.max + constitutionDelta);

    const character: Character = {
      ...baseCharacter,
      id: `${selectedTemplate.id}_${Date.now()}`,
      name: characterName.trim(),
      class: selectedTemplate.class,
      level: 1,
      experience: 0,
      avatar: selectedTemplate.avatar || baseCharacter.avatar,
      race: selectedRace.name.toUpperCase(),
      alignment: selectedAlignment.name.toUpperCase(),
      alignmentDesc: selectedAlignment.description,
      attributes: finalAttributes,
      vitality: {
        max: newVitalityMax,
        current: newVitalityMax
      },
      appearance,
      originTrait: selectedRace.trait,
      isCustom: true,
      locked: false,
      updatedAt: new Date().toISOString()
    };

    localStorage.removeItem(DRAFT_STORAGE_KEY);
    onCreateCharacter(character);
  };

  if (!selectedTemplate || !config) {
    return null;
  }

  const stepItems = [
    { id: 1, label: 'Identity' },
    { id: 2, label: 'Race & Alignment' },
    { id: 3, label: 'Attributes' },
    { id: 4, label: 'Finalize' }
  ] as const;

  return (
    <div className="fixed inset-0 z-[12000] bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen wizard-ritual-bg text-on-surface">
        <header className="sticky top-0 z-20 border-b border-outline-variant/40 bg-surface-container-low/90 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary transition-colors"
                title="Chiudi il rituale"
              >
                <X size={16} />
              </button>
              <div className="min-w-0">
                <p className="text-primary font-mono text-[10px] uppercase tracking-[0.2em]">Wizard Template</p>
                <h2 className="font-serif text-xl sm:text-2xl text-primary font-bold truncate">Creazione Personaggio</h2>
              </div>
            </div>

            <button
              type="button"
              onClick={saveDraft}
              className="hidden sm:flex px-4 py-2 border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary rounded items-center gap-2 font-mono text-xs uppercase tracking-wider"
            >
              <Save size={14} /> Salva Draft
            </button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-5 pt-6 sm:pt-8 pb-6 space-y-6 sm:space-y-8">
          <ol className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stepItems.map((item) => {
              const isActive = step === item.id;
              const isDone = step > item.id;
              return (
                <li
                  key={item.id}
                  className={`p-3 border rounded-sm transition-all ${
                    isActive
                      ? 'border-primary bg-primary/10 shadow-[0_0_18px_rgba(242,202,80,0.2)]'
                      : isDone
                      ? 'border-primary/50 bg-surface-container-low'
                      : 'border-outline-variant/40 bg-surface-container-lowest/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-7 h-7 rounded-full border text-xs font-mono flex items-center justify-center ${
                        isActive ? 'border-primary text-primary' : isDone ? 'border-primary/60 text-primary/90' : 'border-outline text-outline'
                      }`}
                    >
                      {item.id}
                    </span>
                    <span className={`font-mono text-[11px] uppercase tracking-wider ${isActive || isDone ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                      {item.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            <aside className="lg:col-span-4 space-y-4 sm:space-y-6 order-2 lg:order-1">
              <div className="wizard-parchment-card p-6 space-y-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Template Selezionato</p>
                <div className="flex items-start gap-4">
                  <img src={selectedTemplate.avatar} alt={selectedTemplate.name} className="w-20 h-20 rounded border border-primary/40 object-cover" />
                  <div>
                    <h3 className="font-serif text-2xl text-primary leading-tight">{selectedTemplate.name}</h3>
                    <p className="text-on-surface-variant text-sm">{selectedTemplate.class}</p>
                  </div>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">{selectedTemplate.description}</p>
              </div>

              <div className="wizard-parchment-card p-6 space-y-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Progressione</p>
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2"><User size={14} className="text-primary" /> Nome: {characterName || 'Non definito'}</p>
                  <p className="flex items-center gap-2"><Scale size={14} className="text-primary" /> Stirpe: {selectedRace?.name || 'Non scelta'}</p>
                  <p className="flex items-center gap-2"><Sparkles size={14} className="text-primary" /> Allineamento: {selectedAlignment?.name || 'Non scelto'}</p>
                  <p className="flex items-center gap-2"><BookOpen size={14} className="text-primary" /> Attributi assegnati: {Object.keys(attributeAssignments).length}/6</p>
                </div>
              </div>
            </aside>

            <section className="lg:col-span-8 space-y-4 sm:space-y-6 order-1 lg:order-2">
              {step === 1 && (
                <>
                  <div className="wizard-parchment-card p-4 sm:p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-3">
                      <BookOpen className="text-primary" />
                      <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl text-primary leading-tight">Character Identity</h3>
                    </div>

                    <div>
                      <label className="block font-mono text-xs uppercase tracking-[0.2em] text-on-surface-variant mb-2">Template del Rituale</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {uniqueTemplates.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => setSelectedTemplateId(template.id)}
                            className={`p-3 border text-left rounded-sm transition-all ${
                              selectedTemplateId === template.id
                                ? 'border-primary bg-primary/10 shadow-[0_0_14px_rgba(242,202,80,0.15)]'
                                : 'border-outline-variant hover:border-primary/70 bg-surface-container-lowest/60'
                            }`}
                          >
                            <p className="font-serif text-lg text-primary">{template.name}</p>
                            <p className="text-xs text-on-surface-variant">{template.class}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block font-mono text-xs uppercase tracking-[0.2em] text-on-surface-variant mb-2">Character Name</label>
                      <input
                        type="text"
                        value={characterName}
                        onChange={(event) => setCharacterName(event.target.value)}
                        placeholder="Enter a name that shakes the heavens..."
                        className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-sm px-4 py-3 text-lg text-on-surface focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  <div className="wizard-parchment-card p-4 sm:p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-3">
                      <Eye className="text-primary" />
                      <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl text-primary leading-tight">Look &amp; Appearance</h3>
                    </div>

                    {([
                      { key: 'eyes', title: 'Eyes (Occhi)' },
                      { key: 'head', title: 'Head (Testa)' },
                      { key: 'clothes', title: 'Clothes (Abiti)' },
                      { key: 'body', title: 'Body (Corpo)' }
                    ] as const).map((appearanceKey) => (
                      <div key={appearanceKey.key} className="space-y-2">
                        <p className="font-mono text-xs uppercase tracking-[0.2em] text-on-surface-variant">{appearanceKey.title}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {config.appearanceOptions[appearanceKey.key].map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setAppearance((prev) => ({ ...prev, [appearanceKey.key]: option }))}
                              className={`px-4 py-3 text-left border rounded-sm transition-all ${
                                appearance[appearanceKey.key] === option
                                  ? 'border-primary bg-primary/10 text-on-surface'
                                  : 'border-outline-variant/60 bg-surface-container-lowest/50 text-on-surface-variant hover:border-primary/70'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="wizard-parchment-card p-4 sm:p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-3">
                      <Sparkles className="text-primary" />
                      <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl text-primary leading-tight">Scegli la tua Stirpe</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {config.raceOptions.map((race) => (
                        <button
                          key={race.id}
                          type="button"
                          onClick={() => setSelectedRaceId(race.id)}
                          className={`p-5 border rounded-sm text-left transition-all h-full ${
                            selectedRaceId === race.id
                              ? 'border-primary bg-primary/10 shadow-[0_0_14px_rgba(242,202,80,0.15)]'
                              : 'border-outline-variant/60 bg-surface-container-lowest/60 hover:border-primary/60'
                          }`}
                        >
                          <h4 className="font-serif text-3xl text-primary mb-2">{race.name}</h4>
                          <p className="text-sm text-on-surface-variant mb-4 leading-relaxed">{race.description}</p>
                          <p className="font-mono text-xs uppercase tracking-wider text-primary">Tratto: {race.trait}</p>
                          <p className="font-mono text-xs text-on-surface-variant mt-1">
                            Bonus: +{race.bonusValue} {ATTRIBUTE_LABELS[race.bonusAttribute].it}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="wizard-parchment-card p-4 sm:p-6 md:p-8 space-y-5">
                    <div className="flex items-center gap-3">
                      <Scale className="text-primary" />
                      <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl text-primary leading-tight">Allineamento</h3>
                    </div>

                    <div className="space-y-3">
                      {config.alignmentOptions.map((alignment) => (
                        <button
                          key={alignment.id}
                          type="button"
                          onClick={() => setSelectedAlignmentId(alignment.id)}
                          className={`w-full p-4 border rounded-sm text-left transition-all ${
                            selectedAlignmentId === alignment.id
                              ? 'border-primary bg-primary/10'
                              : 'border-outline-variant/60 bg-surface-container-lowest/50 hover:border-primary/70'
                          }`}
                        >
                          <p className="font-serif text-2xl text-primary mb-1">{alignment.name}</p>
                          <p className="text-sm text-on-surface-variant">{alignment.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <div className="wizard-parchment-card p-4 sm:p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <Star className="text-primary" />
                    <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl text-primary leading-tight">Weave Thy Essence</h3>
                  </div>

                  <p className="text-on-surface-variant italic">
                    Assegna i frammenti di potere a ogni caratteristica. Il bonus di classe e quello di stirpe verranno applicati automaticamente.
                  </p>

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {ATTRIBUTE_KEYS.map((attribute) => {
                        const raw = attributeAssignments[attribute];
                        const final = finalAttributes[attribute];
                        const isPrimary = attribute === config.classBonus.attribute;
                        return (
                          <div
                            key={attribute}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedStat(attribute)}
                            onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? setSelectedStat(attribute) : undefined}
                            className={`p-4 border rounded-sm text-left transition-all cursor-pointer ${
                              selectedStat === attribute
                                ? 'border-primary bg-primary/10'
                                : 'border-outline-variant/60 bg-surface-container-lowest/60 hover:border-primary/60'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-serif text-2xl text-on-surface">{ATTRIBUTE_LABELS[attribute].it}</p>
                                <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
                                  {ATTRIBUTE_LABELS[attribute].en}
                                </p>
                                {isPrimary && <p className="font-mono text-[10px] text-primary mt-1">PRIMARY</p>}
                              </div>
                              <div className="text-right">
                                <p className="font-mono text-[10px] uppercase text-on-surface-variant">Frammento</p>
                                <p className="font-serif text-3xl text-primary">{typeof raw === 'number' ? raw : '-'}</p>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    removeAssignment(attribute);
                                  }}
                                  className="text-[10px] text-on-surface-variant hover:text-primary font-mono"
                                >
                                  svuota
                                </button>
                              </div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-outline-variant/30 flex items-center justify-between text-xs">
                              <span className="text-on-surface-variant">Finale</span>
                              <span className="font-mono text-primary">
                                {final} ({getAttributeMod(final)} MOD)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="xl:col-span-4 space-y-4">
                      <div className="border border-outline-variant/60 bg-surface-container-lowest/60 p-4 rounded-sm">
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary mb-3">Score Fragments</p>
                        <div className="grid grid-cols-2 gap-2">
                          {config.fragments.map((fragment) => {
                            const owner = ATTRIBUTE_KEYS.find((attribute) => attributeAssignments[attribute] === fragment);
                            const isOwnedBySelected = owner === selectedStat;
                            return (
                              <button
                                key={fragment}
                                type="button"
                                onClick={() => assignFragment(fragment)}
                                className={`p-3 border rounded-sm transition-all ${
                                  owner
                                    ? isOwnedBySelected
                                      ? 'border-primary bg-primary/20 text-primary'
                                      : 'border-outline-variant bg-surface-container-highest/50 text-on-surface-variant'
                                    : 'border-outline-variant/60 bg-surface-container hover:border-primary/60 text-on-surface'
                                }`}
                              >
                                <p className="font-serif text-3xl leading-none">{fragment}</p>
                                <p className="font-mono text-[10px] mt-1">{owner ? `in ${owner}` : 'libero'}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="border border-outline-variant/60 bg-surface-container-lowest/60 p-4 rounded-sm space-y-2">
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Bonus Attivi</p>
                        <p className="text-sm text-on-surface-variant">Classe: <span className="text-primary">{config.classBonus.label}</span></p>
                        <p className="text-sm text-on-surface-variant">
                          Stirpe: <span className="text-primary">+{selectedRace?.bonusValue || 0} {selectedRace ? ATTRIBUTE_LABELS[selectedRace.bonusAttribute].it : '-'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="wizard-parchment-card p-4 sm:p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <Sparkles className="text-primary" />
                    <h3 className="font-serif text-2xl sm:text-3xl md:text-4xl text-primary leading-tight">Finalize Character</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3 border border-outline-variant/40 bg-surface-container-lowest/60 p-4 rounded-sm">
                      <h4 className="font-serif text-2xl text-primary">Profilo</h4>
                      <p><span className="text-on-surface-variant">Nome:</span> {characterName}</p>
                      <p><span className="text-on-surface-variant">Classe:</span> {selectedTemplate.class}</p>
                      <p><span className="text-on-surface-variant">Stirpe:</span> {selectedRace?.name}</p>
                      <p><span className="text-on-surface-variant">Allineamento:</span> {selectedAlignment?.name}</p>
                      <p><span className="text-on-surface-variant">Tratto di Origine:</span> {selectedRace?.trait}</p>
                    </div>

                    <div className="space-y-3 border border-outline-variant/40 bg-surface-container-lowest/60 p-4 rounded-sm">
                      <h4 className="font-serif text-2xl text-primary">Aspetto</h4>
                      <p><span className="text-on-surface-variant">Occhi:</span> {appearance.eyes}</p>
                      <p><span className="text-on-surface-variant">Testa:</span> {appearance.head}</p>
                      <p><span className="text-on-surface-variant">Abiti:</span> {appearance.clothes}</p>
                      <p><span className="text-on-surface-variant">Corpo:</span> {appearance.body}</p>
                    </div>
                  </div>

                  <div className="border border-outline-variant/40 bg-surface-container-lowest/60 p-4 rounded-sm">
                    <h4 className="font-serif text-2xl text-primary mb-3">Attributi Finali</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {ATTRIBUTE_KEYS.map((attribute) => (
                        <div key={attribute} className="p-3 border border-outline-variant/30 rounded-sm bg-surface-container">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">{ATTRIBUTE_LABELS[attribute].it}</p>
                          <p className="font-serif text-3xl text-primary">{finalAttributes[attribute]}</p>
                          <p className="font-mono text-xs text-on-surface-variant">{getAttributeMod(finalAttributes[attribute])} MOD</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        <footer className="sticky bottom-0 z-20 border-t border-outline-variant/40 bg-surface-container-low/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                if (step === 1) {
                  onClose();
                  return;
                }
                setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
              }}
              className="w-full sm:w-auto px-4 py-2 border border-outline-variant rounded-sm text-on-surface-variant hover:text-primary hover:border-primary transition-colors font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <ArrowLeft size={14} /> {step === 1 ? 'Scarta Profilo' : 'Indietro'}
            </button>

            <div className="w-full sm:w-auto grid grid-cols-1 sm:flex items-center gap-2">
              <button
                type="button"
                onClick={saveDraft}
                className="w-full sm:w-auto px-4 py-2 border border-outline-variant rounded-sm text-on-surface-variant hover:text-primary hover:border-primary transition-colors font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Save size={14} /> Save Draft
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep((prev) => (prev + 1) as 1 | 2 | 3 | 4)}
                  disabled={!canGoNext}
                  className={`w-full sm:w-auto px-5 py-2 rounded-sm font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    canGoNext
                      ? 'bg-primary text-on-primary border border-primary hover:brightness-105'
                      : 'bg-surface-container-high text-on-surface-variant border border-outline-variant/40 cursor-not-allowed opacity-60'
                  }`}
                >
                  Continue <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!canGoNext}
                  className={`w-full sm:w-auto px-5 py-2 rounded-sm font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    canGoNext
                      ? 'bg-primary text-on-primary border border-primary hover:brightness-105'
                      : 'bg-surface-container-high text-on-surface-variant border border-outline-variant/40 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Sparkles size={14} /> Crea nel Grimorio
                </button>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

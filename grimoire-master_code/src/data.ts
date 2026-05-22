import { Character, CharacterTemplate, Spell } from './types';

export const SPELL_LIST: Spell[] = [
  // Trucchetti
  {
    id: 't1',
    name: 'Servitore Inosservato',
    level: 'Trucchetto',
    school: 'Invisibile',
    description: 'Evochi un semplice costrutto invisibile che può solo trasportare oggetti. Ha Carico 2 e trasporta tutto ciò che gli affidi personalmente. Non può raccogliere oggetti da solo.'
  },
  {
    id: 't2',
    name: 'Luce',
    level: 'Trucchetto',
    school: 'Arcano',
    description: 'Un oggetto che tocchi brilla di luce arcana, intensa più o meno come una torcia. Non emette né calore né suono e non richiede combustibile.'
  },
  {
    id: 't3',
    name: 'Prestidigitazione',
    level: 'Trucchetto',
    school: 'Illusione',
    description: 'Puoi fare dei piccoli trucchi di autentica magia. Pulirlo, sporcarlo, raffreddarlo, riscaldarlo, dargli un sapore, cambiargli colore.'
  },
  // Livello 1
  {
    id: 'l1_1',
    name: 'Contattare Spiriti',
    level: 'Livello 1',
    school: 'Convocazione',
    description: 'Attiri la creatura contattandola... risponderà a una tua domanda al meglio delle proprie capacità.'
  },
  {
    id: 'l1_2',
    name: 'Dardo Incantato',
    level: 'Livello 1',
    school: 'Evocazione',
    description: 'Scagli un proiettile di pura magia dalle tue dita. Infliggi 2d4 danni al bersaglio.'
  },
  {
    id: 'l1_3',
    name: 'Invisibilità',
    level: 'Livello 1',
    school: 'Illusione',
    description: 'Tocca un alleato: nessuno può vederlo. È diventato invisibile!'
  },
  {
    id: 'l1_4',
    name: 'Telepatia',
    level: 'Livello 1',
    school: 'Divinazione',
    description: 'Formi un legame telepatico con una singola persona toccata.'
  },
  // Livello 3
  {
    id: 'l3_1',
    name: 'Palla di Fuoco',
    level: 'Livello 3',
    school: 'Evocazione',
    description: "Evochi una potente sfera di fiamme che avvolge il tuo bersaglio e tutti coloro che gli sono vicini, infliggendo 2d6 danni che ignorano l'armatura."
  },
  {
    id: 'l3_2',
    name: 'Dissolvi Magie',
    level: 'Livello 3',
    school: 'Generale',
    description: 'Scegli un incantesimo o un effetto magico in tua presenza: questo incantesimo lo fa a pezzi.'
  },
  {
    id: 'l3_3',
    name: 'Visioni attraverso il Tempo',
    level: 'Livello 3',
    school: 'Divinazione',
    description: 'Lancia questo incantesimo e osserva una superficie riflettente per avere visioni dalle profondità del tempo.'
  },
  // Potere del Quinto Livello
  {
    id: 'l5_1',
    name: 'Gabbia',
    level: 'Potere del Quinto Livello',
    school: 'Evocazione Continuato',
    description: 'Genera una gabbia impenetrabile di pura forza arcana che intrappola un bersaglio.',
    continuous: true
  },
  {
    id: 'l5_2',
    name: 'Evocare Mostri',
    level: 'Potere del Quinto Livello',
    school: 'Convocazione Continuato',
    description: 'Evochi una o più creature arcane che eseguono i tuoi ordini fino a quando perdi la concentrazione.',
    continuous: true
  },
  {
    id: 'l5_3',
    name: 'Metamorfosi',
    level: 'Potere del Quinto Livello',
    school: 'Incantamento',
    description: 'Modifichi la forma di una creatura consenziente in una forma animale o elementale di tua scelta.'
  },
  // Supremazia del Nono Livello
  {
    id: 'l9_1',
    name: "Gemma dell'Anima",
    level: 'Supremazia del Nono Livello',
    school: "Intrappone l'anima di una creatura morente",
    description: "Gemma dell'Anima intrappola l'essenza vitale di un nemico morente per alimentare la tua riserva magica."
  },
  {
    id: 'l9_2',
    name: 'Rifugio',
    level: 'Supremazia del Nono Livello',
    school: 'Crea una struttura fatta di pura energia',
    description: 'Innalzi un santuario sicuro di forza solida impermeabile alle intemperie e alle minacce arcane.'
  }
];

export const INITIAL_CHARACTER_THALRIC: Character = {
  id: 'thalric',
  name: 'Thalric the Bold',
  level: 1,
  class: 'Il Mago',
  experience: 0,
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBFfpe2H6MyZ4QnxEf0WLBGmyV5spTrtQ7wJrNaVNww3EBEeCgvp35MXxLywP69ypKhXCuhZA3yvKjr2UaFkw8x8RziqPgYopg2PnN4Gpi2vzkbe96pIVXowzL77Ms-bvUUqZMQch6009Qp6HM7Z89-yjTtw7gnRM2YXHC8jHed3YS51-6okjbb3ldtF1_n21FBORJ3U82m385UNiUZQWxYHnLePjsIs-mWmISeswkq3BqwFilSSe-tsWR_Piaro3mJ2oqKqKB2Wco',
  attributes: {
    INT: 16,
    FOR: 8,
    DES: 12,
    COS: 13,
    SAG: 15,
    CAR: 9
  },
  vitality: {
    max: 16,
    current: 16
  },
  armor: 1,
  damageDie: 'D4',
  race: 'ELFO',
  alignment: 'NEUTRALE',
  alignmentDesc: 'Scopri qualcosa riguardo a un mistero della magia.',
  bonds: [
    { companion: '', statement: 'ricoprirà un ruolo importante negli eventi a venire. L\'ho previsto!' },
    { companion: '', statement: 'mi sta nascondendo un segreto importante.' },
    { companion: '', statement: 'è disinformato riguardo al mondo; insegnerò tutto ciò che posso.' }
  ],
  gear: [
    { name: 'Libro Incantesimi', weight: 1 },
    { name: 'Bastone (D4)', weight: 1 },
    { name: 'Razioni (5)', weight: 1 }
  ],
  maxWeight: 8,
  locked: false,
  preparedSpellNames: ['Servitore Inosservato', 'Luce', 'Prestidigitazione'],
  selectedMoves: ['PRODIGIO']
};

export const CHARACTER_TEMPLATES: CharacterTemplate[] = [
  {
    id: 't_fighter',
    name: 'The Fighter',
    class: 'Il Guerriero',
    type: 'Core Class',
    description: 'Master of steel and strategy. Perfect for those who seek to lead the vanguard and endure the unendurable.',
    icon: 'swords',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC43FnQT9NwNllZwbHEBy81pCxJUeKAWRQQoUsEB8KA7csanR-4OkNI7SOFdlr3r0Imp4MvosyunNooQuBLnq-j0T-A0x-brKPDTDU0-vsqyYcA3ydEnMnbfylEWmvNp2benhyQRi4Y6DoWJv-S2a9bOhGW6bOY2Y46BdxMzUTYHqW2boEJbaAsY-N8k_3rJ4eFUNIWBeUpvQA0lWlEBBMi1ZM2pQV8D09lk-Dmt6eeBAOMg4dA6Dplx6jsy0UZOdDntn7s-jyAnEg',
    defaultStats: {
      id: '',
      name: 'Grom the Unyielding',
      level: 1,
      class: 'Il Guerriero',
      experience: 0,
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC43FnQT9NwNllZwbHEBy81pCxJUeKAWRQQoUsEB8KA7csanR-4OkNI7SOFdlr3r0Imp4MvosyunNooQuBLnq-j0T-A0x-brKPDTDU0-vsqyYcA3ydEnMnbfylEWmvNp2benhyQRi4Y6DoWJv-S2a9bOhGW6bOY2Y46BdxMzUTYHqW2boEJbaAsY-N8k_3rJ4eFUNIWBeUpvQA0lWlEBBMi1ZM2pQV8D09lk-Dmt6eeBAOMg4dA6Dplx6jsy0UZOdDntn7s-jyAnEg',
      attributes: {
        INT: 9,
        FOR: 16,
        DES: 13,
        COS: 15,
        SAG: 12,
        CAR: 8
      },
      vitality: {
        max: 24,
        current: 24
      },
      armor: 3,
      damageDie: 'D10',
      race: 'NANO',
      alignment: 'BUONO',
      alignmentDesc: 'Difendi i deboli e aiuta chi non può farlo da solo.',
      bonds: [
        { companion: '', statement: 'ha dimostrato debolezza, devo tenerlo d\'occhio per evitare tragedie.' },
        { companion: '', statement: 'combatte con onore; sarei fiero di morire al suo fianco.' }
      ],
      gear: [
        { name: 'Spadone d\'Acciaio', weight: 2 },
        { name: 'Armatura di Piastre', weight: 4 },
        { name: 'Razioni (5)', weight: 1 }
      ],
      maxWeight: 12,
      locked: false,
      preparedSpellNames: []
    }
  },
  {
    id: 't_wizard',
    name: 'The Wizard',
    class: 'Il Mago',
    type: 'Arcane Class',
    description: 'Wielder of cosmic truths and reality-bending spells. Requires a sharp mind and a thirst for ancient lore.',
    icon: 'auto_stories',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCm7mDiOqz_VQzrgII7TaU3dlKrW02rxSV2tvLnrVhjAV51ygV21dsEWMchCF92CKGjL-QRY41uvUjbvAl82I-TY6YmW5iK181D4muUkb9WFPcS2RwcHQSlTiUAf5aPI39M5gXnUxqEOETm6wLhnfRp-nb8KRjr0Myw1O2mdcVls5-SRZSCukbf2nF5THD1xSfPDiXMI6PzaiTBewyeBYV8lKNIZXU82RuSiJ2E8nPihgA5TQ9LtvjsOcrAtWzP1QhfkbWsJHSzANg',
    defaultStats: INITIAL_CHARACTER_THALRIC
  },
  {
    id: 't_thief',
    name: 'The Thief',
    class: 'Il Ladro',
    type: 'Shadow Class',
    description: 'Expert in shadows, traps, and the art of the sudden exit. Essential for any delve into the unknown.',
    icon: 'comedy_mask',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAmWmqW0blRvCSY8GAli7Oh7I-iSSfphSeH6Q-GO4DOqYlhOJs6GjjYf9MvZoSfR07Ju-pJsveRMhWEUIlLmjiNt273-x-bFZ3EGq2OJJljCLeicJ_9P9pVhsx8QThoQXoqCX122bEPpwDvJclaC-Nv-q0ZI3jo6jV3qnykRHV5DzJZ5cikAFPOneybVe5vY0d3zLmAqCO85InW8NvRp10uXeBrLanfBuEB93O3V7y5HUsQDRpxT1itZAOHSJpi3V-Q0ICYRkgRov8',
    defaultStats: {
      id: '',
      name: 'Vala Blackrose',
      level: 1,
      class: 'Il Ladro',
      experience: 0,
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAmWmqW0blRvCSY8GAli7Oh7I-iSSfphSeH6Q-GO4DOqYlhOJs6GjjYf9MvZoSfR07Ju-pJsveRMhWEUIlLmjiNt273-x-bFZ3EGq2OJJljCLeicJ_9P9pVhsx8QThoQXoqCX122bEPpwDvJclaC-Nv-q0ZI3jo6jV3qnykRHV5DzJZ5cikAFPOneybVe5vY0d3zLmAqCO85InW8NvRp10uXeBrLanfBuEB93O3V7y5HUsQDRpxT1itZAOHSJpi3V-Q0ICYRkgRov8',
      attributes: {
        INT: 13,
        FOR: 9,
        DES: 16,
        COS: 12,
        SAG: 15,
        CAR: 8
      },
      vitality: {
        max: 18,
        current: 18
      },
      armor: 1,
      damageDie: 'D8',
      race: 'UMANO',
      alignment: 'NEUTRALE',
      alignmentDesc: 'Scopri qualcosa riguardo a un furto epocale o a un mistero nascosto.',
      bonds: [
        { companion: '', statement: 'ha un portafoglio troppo gonfio; dovrei alleggerirgli il carico.' },
        { companion: '', statement: 'mi copre quando sono nei guai; posso fidarmi di lui, forse.' }
      ],
      gear: [
        { name: 'Pugnali da Lancio (3)', weight: 1 },
        { name: 'Attrezzi da Scasso', weight: 1 },
        { name: 'Razioni (5)', weight: 1 }
      ],
      maxWeight: 9,
      locked: false,
      preparedSpellNames: []
    }
  },
  {
    id: 't_paladin',
    name: 'The Paladin',
    class: 'Il Paladino',
    type: 'Divine Class',
    description: 'A beacon of holy light in the dark. Bound by sacred vows and blessed with divine intervention.',
    icon: 'shield_with_heart',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBb36eg0pqWzTpSZVpiqCXaeg8zVR1CyZOtkS7XvWDmo2oAnV3ONDDNI5Lbe-UQfONeordKPD-dwt5TiBwkJ2COhfxh0__YuTXDSJybwNcU5LH-uxKMExGdRwbVhRIg6s-H5lCIycLetr5mokBNzooytBGezY274DyrqgXJFzsPhdxLzHVLbZYUbztsKatY_0-5kD66Hwxgy9qPeZ0XO3Xe6eoUyjHLzV456YxRztS6gBm_-KM0wjz1BTIEV3YOSGt1ynjs8p0betI',
    defaultStats: {
      id: '',
      name: 'Alaric the Golden',
      level: 1,
      class: 'Il Paladino',
      experience: 0,
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBb36eg0pqWzTpSZVpiqCXaeg8zVR1CyZOtkS7XvWDmo2oAnV3ONDDNI5Lbe-UQfONeordKPD-dwt5TiBwkJ2COhfxh0__YuTXDSJybwNcU5LH-uxKMExGdRwbVhRIg6s-H5lCIycLetr5mokBNzooytBGezY274DyrqgXJFzsPhdxLzHVLbZYUbztsKatY_0-5kD66Hwxgy9qPeZ0XO3Xe6eoUyjHLzV456YxRztS6gBm_-KM0wjz1BTIEV3YOSGt1ynjs8p0betI',
      attributes: {
        INT: 12,
        FOR: 15,
        DES: 9,
        COS: 13,
        SAG: 16,
        CAR: 8
      },
      vitality: {
        max: 22,
        current: 22
      },
      armor: 4,
      damageDie: 'D10',
      race: 'UMANO',
      alignment: 'BUONO',
      alignmentDesc: 'Combatti il male e preserva la giustizia a costo della tua stessa vita.',
      bonds: [
        { companion: '', statement: 'gira in via tortuosa; devo indicargli il cammino illuminato.' },
        { companion: '', statement: 'ha visto la mia debolezza ma ha mantenuto l\'onorevole riserbo.' }
      ],
      gear: [
        { name: 'Martello Sacro', weight: 2 },
        { name: 'Scudo di Fede', weight: 2 },
        { name: 'Armatura di Piastre Dorata', weight: 4 }
      ],
      maxWeight: 10,
      locked: false,
      preparedSpellNames: []
    }
  }
];

export const COMMUNITY_CHARACTERS = [
  {
    id: 'kaelen',
    name: 'Kaelen the Iron-Bound',
    level: 12,
    class: 'Il Guerriero',
    author: 'EldritchKing',
    rating: 4.9,
    description: '"A survivor of the Siege of Redwall, Kaelen carries the weight of his fallen brothers in his cursed shield."',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC43FnQT9NwNllZwbHEBy81pCxJUeKAWRQQoUsEB8KA7csanR-4OkNI7SOFdlr3r0Imp4MvosyunNooQuBLnq-j0T-A0x-brKPDTDU0-vsqyYcA3ydEnMnbfylEWmvNp2benhyQRi4Y6DoWJv-S2a9bOhGW6bOY2Y46BdxMzUTYHqW2boEJbaAsY-N8k_3rJ4eFUNIWBeUpvQA0lWlEBBMi1ZM2pQV8D09lk-Dmt6eeBAOMg4dA6Dplx6jsy0UZOdDntn7s-jyAnEg'
  },
  {
    id: 'sylas',
    name: 'Sylas the Void-Walker',
    level: 8,
    class: 'Il Mago',
    author: 'ShadowCaster',
    rating: 4.7,
    description: '"He gazed too long into the abyss between planes, and now the abyss walks with him in the form of violet flame."',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCm7mDiOqz_VQzrgII7TaU3dlKrW02rxSV2tvLnrVhjAV51ygV21dsEWMchCF92CKGjL-QRY41uvUjbvAl82I-TY6YmW5iK181D4muUkb9WFPcS2RwcHQSlTiUAf5aPI39M5gXnUxqEOETm6wLhnfRp-nb8KRjr0Myw1O2mdcVls5-SRZSCukbf2nF5THD1xSfPDiXMI6PzaiTBewyeBYV8lKNIZXU82RuSiJ2E8nPihgA5TQ9LtvjsOcrAtWzP1QhfkbWsJHSzANg'
  },
  {
    id: 'vex',
    name: 'Vex Whisperfoot',
    level: 15,
    class: 'Il Ladro',
    author: 'RogueOne',
    rating: 5.0,
    description: '"They say she can steal the breath from your lungs without you even noticing. The queen of the underground."',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAmWmqW0blRvCSY8GAli7Oh7I-iSSfphSeH6Q-GO4DOqYlhOJs6GjjYf9MvZoSfR07Ju-pJsveRMhWEUIlLmjiNt273-x-bFZ3EGq2OJJljCLeicJ_9P9pVhsx8QThoQXoqCX122bEPpwDvJclaC-Nv-q0ZI3jo6jV3qnykRHV5DzJZ5cikAFPOneybVe5vY0d3zLmAqCO85InW8NvRp10uXeBrLanfBuEB93O3V7y5HUsQDRpxT1itZAOHSJpi3V-Q0ICYRkgRov8'
  },
  {
    id: 'alaric_golden',
    name: 'Alaric the Golden',
    level: 10,
    class: 'Il Paladino',
    author: 'HolyBringer',
    rating: 4.8,
    description: '"He does not fear the night, for he carries the sun in his heart and justice in his blade."',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBb36eg0pqWzTpSZVpiqCXaeg8zVR1CyZOtkS7XvWDmo2oAnV3ONDDNI5Lbe-UQfONeordKPD-dwt5TiBwkJ2COhfxh0__YuTXDSJybwNcU5LH-uxKMExGdRwbVhRIg6s-H5lCIycLetr5mokBNzooytBGezY274DyrqgXJFzsPhdxLzHVLbZYUbztsKatY_0-5kD66Hwxgy9qPeZ0XO3Xe6eoUyjHLzV456YxRztS6gBm_-KM0wjz1BTIEV3YOSGt1ynjs8p0betI'
  }
];

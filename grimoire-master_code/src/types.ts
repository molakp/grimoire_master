export interface Character {
  id: string;
  name: string;
  level: number;
  class: string;
  experience: number;
  isCustom?: boolean;
  avatar: string;
  attributes: {
    INT: number;
    FOR: number;
    DES: number;
    COS: number;
    SAG: number;
    CAR: number;
  };
  statModifiers?: StatModifier[];
  vitality: {
    max: number;
    current: number;
  };
  armor: number;
  damageDie: string;
  race: string;
  alignment: string;
  alignmentDesc?: string;
  partyId?: string;
  bonds: { companion: string; statement: string }[];
  gear: { name: string; weight: number; quantity?: number; consumable?: boolean }[];
  maxWeight: number;
  locked?: boolean;
  preparedSpellNames?: string[];
  selectedMoves?: string[];
  appearance?: {
    eyes?: string;
    head?: string;
    clothes?: string;
    body?: string;
  };
  originTrait?: string;
  lore?: string;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Spell {
  id: string;
  name: string;
  level: string; // 'Trucchetto', 'Livello 1', 'Livello 3', 'Potere di Quinto Livello', etc.
  school: string; // 'Invisibile', 'Arcano', 'Illusione', 'Convocazione', etc.
  description: string;
  continuous?: boolean;
}

export interface DiceRollLog {
  id: string;
  statName: string;
  modifier: number;
  diceResult: [number, number];
  total: number;
  outcome: 'Success' | 'Mixed' | 'Miss';
  timestamp: string;
}

export type AttributeKey = 'INT' | 'FOR' | 'DES' | 'COS' | 'SAG' | 'CAR';

export interface StatModifier {
  id: string;
  name: string;
  icon: string;
  value: number;
  attributes: AttributeKey[];
}

export interface TemplateRace {
  id: string;
  name: string;
  bonusAttribute?: AttributeKey;
  bonusValue?: number;
  moveDescription?: string; // flavour text for the racial move
}

export interface TemplateAlignment {
  id: string;
  name: string;
  description: string;
}

export interface TemplateAppearanceOptions {
  eyes: string[];
  head: string[];
  clothes: string[];
  body: string[];
}

export interface ClassMove {
  name: string;
  description: string;
  isStarting?: boolean; // true = auto-acquired at level 1
}

export interface CharacterTemplate {
  id: string;
  name: string;
  class: string;
  type: 'Core Class' | 'Arcane Class' | 'Shadow Class' | 'Divine Class' | 'Primal Class' | 'Wilderness Class' | 'Arcane-Martial Class';
  description: string;
  icon: string;
  avatar: string;
  defaultStats: Character;

  // Wizard config. Optional: legacy fallback templates and admin-created templates only define defaultStats.
  races?: TemplateRace[];
  alignments?: TemplateAlignment[];
  appearanceOptions?: TemplateAppearanceOptions;
  originTrait?: string;
  classBonus?: { attribute: AttributeKey; value: number };
  startingHp?: number;        // base HP before Constitution bonus
  damageDie?: string;         // e.g. 'D10'
  startingArmor?: number;
  startingLoad?: number;
  classMoves?: ClassMove[];
  gearChoices?: { options: { name: string; weight: number }[] }[];  // each group = one choice
  bonds?: string[];           // bond statement templates (companion left blank)
  availableSpells?: Spell[]; // only for Mago and Chierico
}

export interface Mail {
  id: string;
  recipientEmail: string;
  subject: string;
  content: string;
  senderEmail: string;
  type: 'promotion' | 'warning' | 'party_invitation';
  partyInvitationId?: string;
  partyId?: string;
  recipientUid?: string;
  read: boolean;
  createdAt: string;
}

export interface Party {
  id: string;
  name: string;
  gmUid: string;
  gmDisplayName: string;
  objective: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartyMember {
  uid: string;
  role: 'player';
  status: 'active';
  displayName: string;
  characterId?: string;
  invitationId: string;
  joinedAt: string;
}

export interface PartyInvitation {
  id: string;
  partyId: string;
  partyName: string;
  recipientEmail: string;
  recipientUid?: string;
  senderUid: string;
  senderEmail: string;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  createdAt: string;
  respondedAt?: string;
}

export interface PartyCharacterSnapshot {
  characterId: string;
  ownerUid: string;
  name: string;
  class: string;
  level: number;
  avatar: string;
  attributes: Character['attributes'];
  vitality: Character['vitality'];
  armor: number;
  damageDie: string;
  gear: Character['gear'];
}

export interface PartySession {
  id: string;
  title: string;
  startsAt: string;
  timezone: string;
  status: 'planned' | 'confirmed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface PartyAttendance {
  uid: string;
  status: 'pending' | 'confirmed' | 'declined';
  updatedAt: string;
}

export interface PartyDiaryEntry {
  id: string;
  authorUid: string;
  authorName: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface PartyMasterNote {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface BannedUser {
  email: string;
  bannedBy: string;
  reason: string;
  createdAt: string;
}

export interface Admin {
  email: string;
  role: 'master' | 'admin';
  promotedBy: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  emailLower: string;
  handle?: string;
  displayName?: string;
  photoURL?: string;
  providerIds: string[];
  createdAt: string;
  lastLoginAt: string;
}

export interface PublicUserHandle {
  uid: string;
  handle: string;
  displayName: string;
  photoURL: string;
  updatedAt: string;
}

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
  vitality: {
    max: number;
    current: number;
  };
  armor: number;
  damageDie: string;
  race: string;
  alignment: string;
  alignmentDesc?: string;
  bonds: { companion: string; statement: string }[];
  gear: { name: string; weight: number }[];
  maxWeight: number;
  locked?: boolean;
  preparedSpellNames?: string[];
  selectedMoves?: string[];
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

export interface CharacterTemplate {
  id: string;
  name: string;
  class: string;
  type: 'Core Class' | 'Arcane Class' | 'Shadow Class' | 'Divine Class';
  description: string;
  icon: string;
  avatar: string;
  defaultStats: Character;
}

export interface Mail {
  id: string;
  recipientEmail: string;
  subject: string;
  content: string;
  senderEmail: string;
  type: 'promotion' | 'warning';
  read: boolean;
  createdAt: string;
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
  displayName?: string;
  photoURL?: string;
  providerIds: string[];
  createdAt: string;
  lastLoginAt: string;
}


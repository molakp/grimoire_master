// Pure Dungeon World rule helpers shared by the UI and covered by unit tests.

export type RollOutcome = 'Success' | 'Mixed' | 'Miss';

/** Dungeon World attribute modifier table (1-3: -3, 4-5: -2, 6-8: -1, 9-12: 0, 13-15: +1, 16-17: +2, 18: +3). */
export function getAttributeModifier(score: number): number {
  if (score <= 3) return -3;
  if (score <= 5) return -2;
  if (score <= 8) return -1;
  if (score <= 12) return 0;
  if (score <= 15) return 1;
  if (score <= 17) return 2;
  return 3;
}

export function getRollModifier(score: number, additionalModifier = 0): number {
  return getAttributeModifier(score) + additionalModifier;
}

export function formatModifier(modifier: number): string {
  return modifier > 0 ? `+${modifier}` : `${modifier}`;
}

/** Outcome of a 2d6 + modifier move: 10+ full success, 7-9 partial success, 6- miss. */
export function getRollOutcome(total: number): RollOutcome {
  if (total >= 10) return 'Success';
  if (total >= 7) return 'Mixed';
  return 'Miss';
}

export function rollDie(sides: number, random: () => number = Math.random): number {
  return Math.floor(random() * sides) + 1;
}

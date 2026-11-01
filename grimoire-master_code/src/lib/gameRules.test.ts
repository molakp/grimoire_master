import { describe, expect, it } from 'vitest';
import { formatModifier, getAttributeModifier, getRollModifier, getRollOutcome, rollDie } from './gameRules';

describe('getAttributeModifier', () => {
  it.each([
    [1, -3], [3, -3],
    [4, -2], [5, -2],
    [6, -1], [8, -1],
    [9, 0], [12, 0],
    [13, 1], [15, 1],
    [16, 2], [17, 2],
    [18, 3],
  ])('score %i gives modifier %i (Dungeon World table)', (score, expected) => {
    expect(getAttributeModifier(score)).toBe(expected);
  });

  it('does not use the D&D formula floor((score - 10) / 2)', () => {
    expect(getAttributeModifier(16)).toBe(2);
    expect(getAttributeModifier(14)).toBe(1);
  });
});

describe('formatModifier', () => {
  it('prefixes positive values with a plus sign', () => {
    expect(formatModifier(2)).toBe('+2');
    expect(formatModifier(0)).toBe('0');
    expect(formatModifier(-1)).toBe('-1');
  });
});

describe('getRollModifier', () => {
  it('adds circumstance modifiers to the Dungeon World attribute modifier', () => {
    expect(getRollModifier(16, -1)).toBe(1);
    expect(getRollModifier(8, 2)).toBe(1);
    expect(getRollModifier(12)).toBe(0);
  });
});

describe('getRollOutcome', () => {
  it.each([
    [2, 'Miss'], [6, 'Miss'],
    [7, 'Mixed'], [9, 'Mixed'],
    [10, 'Success'], [15, 'Success'],
  ] as const)('total %i is %s', (total, expected) => {
    expect(getRollOutcome(total)).toBe(expected);
  });
});

describe('rollDie', () => {
  it('maps the random source onto 1..sides', () => {
    expect(rollDie(6, () => 0)).toBe(1);
    expect(rollDie(6, () => 0.9999)).toBe(6);
    expect(rollDie(20, () => 0.5)).toBe(11);
  });
});

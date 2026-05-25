import { useState } from 'react';
import { Spell, Character } from '../types';
import { SPELL_LIST } from '../data';
import { ChevronDown } from 'lucide-react';

interface SpellbookProps {
  character: Character;
  onUpdateCharacter: (character: Character) => void;
  spellList?: Spell[];
}

type SectionKey = 'cantrips' | 'level1' | 'level3' | 'level5' | 'level7' | 'level9';

export default function Spellbook({ character, onUpdateCharacter, spellList }: SpellbookProps) {
  const isLocked = character.locked ?? false;

  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    cantrips: true,
    level1: true,
    level3: true,
    level5: true,
    level7: true,
    level9: true,
  });

  const toggleSection = (key: SectionKey) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSpellToggle = (spellName: string) => {
    if (isLocked) return;
    const prepared = character.preparedSpellNames ? [...character.preparedSpellNames] : [];
    const index = prepared.indexOf(spellName);
    if (index >= 0) {
      prepared.splice(index, 1);
    } else {
      prepared.push(spellName);
    }
    onUpdateCharacter({ ...character, preparedSpellNames: prepared });
  };

  const isPrepared = (spellName: string) =>
    character.preparedSpellNames?.includes(spellName) ?? false;

  const spells = spellList && spellList.length > 0 ? spellList : SPELL_LIST;
  const cantrips = spells.filter((s) => s.level === 'Trucchetto');
  const level1 = spells.filter((s) => s.level === 'Livello 1');
  const level3 = spells.filter((s) => s.level === 'Livello 3');
  const level5 = spells.filter((s) => s.level === 'Livello 5' || s.level === 'Potere del Quinto Livello');
  const level7 = spells.filter((s) => s.level === 'Livello 7');
  const level9 = spells.filter((s) => s.level === 'Livello 9' || s.level === 'Supremazia del Nono Livello');

  const filteredLevel1 = isLocked ? level1.filter((s) => isPrepared(s.name)) : level1;
  const filteredLevel3 = isLocked ? level3.filter((s) => isPrepared(s.name)) : level3;
  const filteredLevel5 = isLocked ? level5.filter((s) => isPrepared(s.name)) : level5;
  const filteredLevel7 = isLocked ? level7.filter((s) => isPrepared(s.name)) : level7;
  const filteredLevel9 = isLocked ? level9.filter((s) => isPrepared(s.name)) : level9;

  const renderSectionHeader = (label: string, key: SectionKey, subtitle?: string) => (
    <button
      onClick={() => toggleSection(key)}
      className="w-full flex items-center justify-between pl-4 mb-6 border-l-4 border-primary bg-gradient-to-r from-primary/10 to-transparent py-2 rounded-r text-left touch-manipulation select-none"
      aria-expanded={openSections[key]}
    >
      <div>
        <h2 className="font-serif text-2xl text-primary uppercase tracking-widest font-bold">{label}</h2>
        {subtitle && (
          <p className="text-xs text-on-surface-variant italic mt-1 font-mono">{subtitle}</p>
        )}
      </div>
      <ChevronDown
        size={22}
        className={`text-primary mr-2 flex-shrink-0 transition-transform duration-300 ${
          openSections[key] ? 'rotate-0' : '-rotate-90'
        }`}
      />
    </button>
  );

  const renderSpellGrid = (spellsToRender: Spell[], levelLabel: string, cantripMode = false) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-[fadeIn_0.2s_ease]">
      {spellsToRender.map((spell) => {
        const isFireball = spell.name === 'Palla di Fuoco';
        return (
          <div
            key={spell.id}
            className={`parchment-card p-6 rounded-lg text-left flex flex-col justify-between transition-all ${
              isFireball
                ? 'border-2 border-primary-container shadow-[inset_0_0_15px_rgba(212,175,55,0.2)] glow-gold scale-[1.01]'
                : ''
            }`}
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-serif text-xl text-primary font-bold flex items-center gap-1.5">
                  {spell.name}
                  {isFireball && <span className="text-red-500 text-sm">🔥</span>}
                </h3>
                <input
                  type="checkbox"
                  disabled={cantripMode || isLocked}
                  checked={cantripMode ? true : isPrepared(spell.name)}
                  onChange={cantripMode ? undefined : () => handleSpellToggle(spell.name)}
                  className={`w-5 h-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary-container ${
                    cantripMode
                      ? 'pointer-events-none opacity-80'
                      : 'cursor-pointer disabled:opacity-50'
                  }`}
                />
              </div>
              <div className="flex justify-between text-[11px] text-on-surface-variant opacity-70 mb-3 uppercase font-mono tracking-widest">
                <span>{levelLabel}</span>
                <span>{spell.school}</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {spell.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-12 animate-[fadeIn_0.3s_ease]">

      {/* TRUCCHETTI */}
      <section>
        {renderSectionHeader(
          'Trucchetti',
          'cantrips',
          'Prepari tutti i tuoi trucchetti ogni volta che prepari incantesimi senza doverli scegliere.'
        )}
        {openSections.cantrips && renderSpellGrid(cantrips, 'Trucchetto', true)}
      </section>

      {/* LIVELLO 1 */}
      {(!isLocked || filteredLevel1.length > 0) && (
        <section>
          {renderSectionHeader('Incantesimi di Primo Livello', 'level1')}
          {openSections.level1 && renderSpellGrid(filteredLevel1, 'Livello 1')}
        </section>
      )}

      {/* LIVELLO 3 */}
      {(!isLocked || filteredLevel3.length > 0) && (
        <section>
          {renderSectionHeader('Incantesimi di Terzo Livello', 'level3')}
          {openSections.level3 && renderSpellGrid(filteredLevel3, 'Livello 3')}
        </section>
      )}

      {/* LIVELLO 5 */}
      {(!isLocked || filteredLevel5.length > 0) && (
        <section>
          {renderSectionHeader('Incantesimi di Quinto Livello', 'level5')}
          {openSections.level5 && renderSpellGrid(filteredLevel5, 'Livello 5')}
        </section>
      )}

      {/* LIVELLO 7 */}
      {(!isLocked || filteredLevel7.length > 0) && (
        <section>
          {renderSectionHeader('Incantesimi di Settimo Livello', 'level7')}
          {openSections.level7 && renderSpellGrid(filteredLevel7, 'Livello 7')}
        </section>
      )}

      {/* LIVELLO 9 */}
      {(!isLocked || filteredLevel9.length > 0) && (
        <section>
          {renderSectionHeader('Incantesimi di Nono Livello', 'level9')}
          {openSections.level9 && renderSpellGrid(filteredLevel9, 'Livello 9')}
        </section>
      )}

    </div>
  );
}

import { Spell, Character } from '../types';
import { SPELL_LIST } from '../data';
import { Sparkles, Castle, Lock, Unlock, Zap, Eye, Globe } from 'lucide-react';

interface SpellbookProps {
  character: Character;
  onUpdateCharacter: (character: Character) => void;
}

export default function Spellbook({ character, onUpdateCharacter }: SpellbookProps) {
  const isLocked = character.locked ?? false;

  // Toggle preparation of a spell safely
  const handleSpellToggle = (spellName: string) => {
    if (isLocked) return;

    const prepared = character.preparedSpellNames ? [...character.preparedSpellNames] : [];
    const index = prepared.indexOf(spellName);

    if (index >= 0) {
      prepared.splice(index, 1);
    } else {
      prepared.push(spellName);
    }

    onUpdateCharacter({
      ...character,
      preparedSpellNames: prepared,
    });
  };

  const isPrepared = (spellName: string) => {
    return character.preparedSpellNames?.includes(spellName) ?? false;
  };

  // Group spells by level categories
  const cantrips = SPELL_LIST.filter((spell) => spell.level === 'Trucchetto');
  const level1 = SPELL_LIST.filter((spell) => spell.level === 'Livello 1');
  const level3 = SPELL_LIST.filter((spell) => spell.level === 'Livello 3');
  const level5 = SPELL_LIST.filter((spell) => spell.level === 'Potere del Quinto Livello');
  const level9 = SPELL_LIST.filter((spell) => spell.level === 'Supremazia del Nono Livello');

  const filteredLevel1 = isLocked ? level1.filter(spell => isPrepared(spell.name)) : level1;
  const filteredLevel3 = isLocked ? level3.filter(spell => isPrepared(spell.name)) : level3;
  const filteredLevel5 = isLocked ? level5.filter(spell => isPrepared(spell.name)) : level5;
  const filteredLevel9 = isLocked ? level9.filter(spell => isPrepared(spell.name)) : level9;

  return (
    <div className="space-y-12 animate-[fadeIn_0.3s_ease]">
      
      {/* TRUCCHETTI SECTION */}
      <section>
        <div className="pl-4 mb-6 border-l-4 border-primary bg-gradient-to-r from-primary/10 to-transparent py-2 rounded-r">
          <h2 className="font-serif text-2xl text-primary uppercase tracking-widest font-bold">Trucchetti</h2>
          <p className="text-xs text-on-surface-variant italic mt-1 font-mono">
            Prepari tutti i tuoi trucchetti ogni volta che prepari incantesimi senza doverli scegliere.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cantrips.map((spell) => (
            <div key={spell.id} className="parchment-card p-6 rounded-lg group text-left">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-serif text-xl text-primary font-bold">{spell.name}</h3>
                <input
                  type="checkbox"
                  disabled={true} // Cantrips are always prepared automatically
                  checked={true}
                  className="w-5 h-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary-container pointer-events-none opacity-80"
                />
              </div>
              <div className="flex justify-between text-[11px] text-on-surface-variant opacity-70 mb-3 uppercase font-mono tracking-widest">
                <span>Trucchetto</span>
                <span>{spell.school}</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed font-mono">
                {spell.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* LEVEL 1 SECTION */}
      {(!isLocked || filteredLevel1.length > 0) && (
        <section>
          <div className="pl-4 mb-6 border-l-4 border-primary bg-gradient-to-r from-primary/10 to-transparent py-2 rounded-r">
            <h2 className="font-serif text-2xl text-primary uppercase tracking-widest font-bold">
              Incantesimi di Primo Livello
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredLevel1.map((spell) => (
              <div key={spell.id} className="parchment-card p-6 rounded-lg text-left flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-serif text-lg text-primary font-bold">{spell.name}</h3>
                    <input
                      type="checkbox"
                      disabled={isLocked}
                      checked={isPrepared(spell.name)}
                      onChange={() => handleSpellToggle(spell.name)}
                      className="w-5 h-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary-container cursor-pointer disabled:opacity-50"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-on-surface-variant opacity-70 mb-3 uppercase font-mono tracking-widest">
                    <span>Livello 1</span>
                    <span>{spell.school}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed font-sans">
                    {spell.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* LEVEL 3 SECTION (Includes highlighted card) */}
      {(!isLocked || filteredLevel3.length > 0) && (
        <section>
          <div className="pl-4 mb-6 border-l-4 border-primary bg-gradient-to-r from-primary/10 to-transparent py-2 rounded-r">
            <h2 className="font-serif text-2xl text-primary uppercase tracking-widest font-bold">
              Incantesimi di Terzo Livello
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLevel3.map((spell) => {
              // "Palla di Fuoco" gets a special premium gold glow border as represented in Mockup 3
              const isFireball = spell.name === 'Palla di Fuoco';

              return (
                <div
                  key={spell.id}
                  className={`parchment-card p-6 rounded-lg text-left flex flex-col justify-between transition-all ${
                    isFireball
                      ? 'border-2 border-primary-container shadow-[inset_0_0_15px_rgba(212,175,55,0.2)] scroll-m-20 glow-gold scale-[1.01]'
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
                        disabled={isLocked}
                        checked={isPrepared(spell.name)}
                        onChange={() => handleSpellToggle(spell.name)}
                        className="w-5 h-5 rounded border-outline-variant bg-surface-container text-primary focus:ring-primary-container cursor-pointer disabled:opacity-50"
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant opacity-70 mb-3 uppercase font-mono tracking-widest">
                      <span>Livello 3</span>
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
        </section>
      )}

      {/* LEVEL 5 & 9 CORES GRID */}
      {(!isLocked || filteredLevel5.length > 0 || filteredLevel9.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEVEL 5 PANEL */}
          {(!isLocked || filteredLevel5.length > 0) && (
            <div className="bg-surface-container-high rounded-xl border border-outline-variant p-6 text-left">
              <h2 className="font-serif text-xl text-primary mb-6 uppercase tracking-widest border-b border-outline-variant pb-2 font-bold select-none">
                Potere del Quinto Livello
              </h2>
              <div className="space-y-4">
                {filteredLevel5.map((spell) => (
                  <div
                    key={spell.id}
                    className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border border-outline-variant hover:border-primary transition-all duration-300"
                  >
                    <div>
                      <p className="text-primary font-bold text-sm font-serif">{spell.name}</p>
                      <p className="text-[10px] text-on-surface-variant font-mono uppercase mt-0.5">
                        {spell.school}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      disabled={isLocked}
                      checked={isPrepared(spell.name)}
                      onChange={() => handleSpellToggle(spell.name)}
                      className="w-5 h-5 rounded border-outline-variant bg-surface-container-low text-primary focus:ring-primary cursor-pointer disabled:opacity-50"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LEVEL 9 PANEL */}
          {(!isLocked || filteredLevel9.length > 0) && (
            <div className="bg-surface-container-high rounded-xl border border-outline-variant p-6 text-left">
              <h2 className="font-serif text-xl text-primary mb-6 uppercase tracking-widest border-b border-outline-variant pb-2 font-bold select-none">
                Supremazia del Nono Livello
              </h2>
              <div className="space-y-4">
                {filteredLevel9.map((spell) => {
                  const isGemma = spell.name.includes('Gemma');
                  return (
                    <div
                      key={spell.id}
                      className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border border-outline-variant hover:border-primary transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        {isGemma ? (
                          <Sparkles className="text-primary animate-pulse w-5 h-5 flex-shrink-0" />
                        ) : (
                          <Castle className="text-primary w-5 h-5 flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-primary font-bold text-sm font-serif">{spell.name}</p>
                          <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">
                            {spell.school}
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        disabled={isLocked}
                        checked={isPrepared(spell.name)}
                        onChange={() => handleSpellToggle(spell.name)}
                        className="w-5 h-5 rounded border-outline-variant bg-surface-container-low text-primary focus:ring-primary cursor-pointer disabled:opacity-50"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

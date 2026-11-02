import { useState } from 'react';
import { DiceRollLog } from '../types';
import { Sparkles, History, Trash2, X, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useNotification, NotificationCard } from './NotificationSystem';
import { formatModifier, getAttributeModifier, getRollModifier, getRollOutcome, rollDie } from '../lib/gameRules';

interface DiceRollerProps {
  onAddLog?: (log: DiceRollLog) => void;
  logs: DiceRollLog[];
  onClearLogs: () => void;
  activeStatPreset?: {
    name: string;
    value: number;
    additionalModifier: number;
    appliedModifiers: { name: string; icon: string; value: number }[];
  } | null;
  onClearPreset?: () => void;
}

export default function DiceRoller({
  logs,
  onAddLog,
  onClearLogs,
  activeStatPreset,
  onClearPreset,
}: DiceRollerProps) {
  const { notifications, removeNotification } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const [customModifier, setCustomModifier] = useState(0);
  const [damageDieType, setDamageDieType] = useState<'D4' | 'D6' | 'D8' | 'D10' | 'D12' | 'D20'>('D4');
  const [isRolling, setIsRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<DiceRollLog | null>(null);

  const calculateModifier = getAttributeModifier;

  const rollDice = (type: 'action' | 'damage') => {
    if (isRolling) return;
    setIsRolling(true);

    setTimeout(() => {
      let finalLog: DiceRollLog;
      const timestamp = new Date().toLocaleTimeString();

      if (type === 'action') {
        const d1 = rollDie(6);
        const d2 = rollDie(6);
        const mod = activeStatPreset
          ? getRollModifier(activeStatPreset.value, activeStatPreset.additionalModifier)
          : customModifier;
        const total = d1 + d2 + mod;
        const outcome = getRollOutcome(total);

        finalLog = {
          id: Math.random().toString(),
          statName: activeStatPreset?.name || 'Azione Generica',
          modifier: mod,
          diceResult: [d1, d2],
          total,
          outcome,
          timestamp,
        };
      } else {
        // Damage die roll
        const dieSides = parseInt(damageDieType.replace('D', ''));
        const r1 = rollDie(dieSides);
        
        finalLog = {
          id: Math.random().toString(),
          statName: `Danno (${damageDieType})`,
          modifier: 0,
          diceResult: [r1, 0],
          total: r1,
          outcome: r1 >= 8 ? 'Success' : r1 >= 4 ? 'Mixed' : 'Miss', // mock purely for visual decoration of damage levels
          timestamp,
        };
      }

      setLastRoll(finalLog);
      if (onAddLog) onAddLog(finalLog);
      setIsRolling(false);
      setIsOpen(true); // Open panel to show results
    }, 600);
  };

  const getPresetModifier = () => {
    if (!activeStatPreset) return 0;
    return getRollModifier(activeStatPreset.value, activeStatPreset.additionalModifier);
  };

  const getPresetBaseModifier = () => activeStatPreset ? calculateModifier(activeStatPreset.value) : 0;

  return (
    <>
      {/* Mini trigger floating status display */}
      <div className="fixed bottom-20 right-6 md:bottom-6 md:right-6 z-[80] flex flex-col gap-2 items-end pointer-events-none">
        {/* Dynamic global notification systems */}
        <AnimatePresence>
          {notifications.map((notif) => (
            <NotificationCard
              key={notif.id}
              notif={notif}
              onClose={() => removeNotification(notif.id)}
            />
          ))}
        </AnimatePresence>

        {activeStatPreset && (
          <div className="bg-surface-container border border-primary/40 rounded-lg p-3 shadow-lg max-w-xs animate-bounce flex items-center gap-3 pointer-events-auto">
            <div className="text-left">
              <p className="text-[10px] text-primary font-mono tracking-wider">ROLL PRESET CARICATO</p>
              <p className="text-sm font-bold text-on-surface">
                {activeStatPreset.name} ({activeStatPreset.value}) → Mod: {formatModifier(getPresetModifier())}
              </p>
              {activeStatPreset.appliedModifiers.length > 0 && (
                <p className="text-[10px] text-on-surface-variant mt-1">
                  {activeStatPreset.appliedModifiers.map((modifier) => `${modifier.icon} ${modifier.name} ${formatModifier(modifier.value)}`).join(' · ')}
                </p>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onClearPreset) onClearPreset();
              }}
              className="p-1 rounded hover:bg-surface-variant text-red-400"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 p-4 rounded-full border border-primary/50 text-on-primary bg-gradient-to-r from-primary-container to-primary font-bold shadow-[0_0_15px_rgba(242,202,80,0.4)] hover:scale-105 active:scale-95 transition-all z-[80] pointer-events-auto ${
            activeStatPreset ? 'border-2 border-red-500 animate-pulse' : ''
          }`}
        >
          <Sparkles className="w-5 h-5 animate-spin-slow" />
          <span className="font-mono text-sm">LANCIATORE DADI</span>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-surface-container-high/95 backdrop-blur-md border-l border-outline-variant/40 z-[90] p-6 shadow-[-4px_0_24px_rgba(0,0,0,0.6)] flex flex-col">
          <div className="flex justify-between items-center border-b border-outline-variant pb-4 mb-6">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles size={20} />
              <h3 className="font-serif text-xl tracking-wider">Tiro dei Dadi</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-surface-variant text-outline rounded">
              <X size={20} />
            </button>
          </div>

          {/* Core Rolling interface */}
          <div className="space-y-6 flex-1 overflow-y-auto pr-2">
            {activeStatPreset ? (
              <div className="p-4 bg-surface-container border-2 border-primary/40 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-[10px] text-primary uppercase tracking-widest">
                    Azione con Statistica
                  </span>
                  <button
                    onClick={onClearPreset}
                    className="text-xs text-red-400 font-mono underline hover:text-red-300"
                  >
                    Resetta
                  </button>
                </div>
                <h4 className="text-lg font-serif font-bold text-on-surface">{activeStatPreset.name}</h4>
                <p className="text-sm text-on-surface-variant mt-1">
                  Valore Stat: <span className="font-mono text-primary">{activeStatPreset.value}</span> | Modificatore:{' '}
                  <span className="font-mono font-bold text-primary">
                    {formatModifier(getPresetBaseModifier())}
                    {activeStatPreset.additionalModifier !== 0 && (
                      <> {formatModifier(activeStatPreset.additionalModifier)} circostanze</>
                    )}
                    {activeStatPreset.additionalModifier !== 0 && <> = {formatModifier(getPresetModifier())}</>}
                  </span>
                </p>
                {activeStatPreset.appliedModifiers.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-on-surface-variant">
                    {activeStatPreset.appliedModifiers.map((modifier, index) => (
                      <li key={`${modifier.name}-${modifier.value}-${index}`}>
                        {modifier.icon} {modifier.name}: {formatModifier(modifier.value)}
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  onClick={() => rollDice('action')}
                  disabled={isRolling}
                  className="w-full mt-4 py-3 bg-gradient-to-r from-primary-container to-primary text-on-primary font-bold rounded shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all text-sm font-mono"
                >
                  {isRolling ? 'Lancio in corso...' : `Tira 2D6 ${formatModifier(getPresetModifier())}`}
                </button>
              </div>
            ) : (
              <div className="space-y-4 p-4 bg-surface-container/60 border border-outline-variant/30 rounded-lg">
                <span className="font-mono text-[10px] text-outline uppercase tracking-widest block mb-2">
                  Tiro Generico 2D6
                </span>
                <div>
                  <label className="text-xs text-on-surface-variant block mb-1">Modificatore Personalizzato</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCustomModifier(Math.max(-5, customModifier - 1))}
                      className="w-8 h-8 rounded bg-surface-container-low border border-outline-variant hover:border-primary text-primary text-sm font-bold flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-lg w-12 text-center text-primary">
                      {customModifier >= 0 ? `+${customModifier}` : customModifier}
                    </span>
                    <button
                      onClick={() => setCustomModifier(Math.min(5, customModifier + 1))}
                      className="w-8 h-8 rounded bg-surface-container-low border border-outline-variant hover:border-primary text-primary text-sm font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => rollDice('action')}
                  disabled={isRolling}
                  className="w-full py-3 bg-gradient-to-r from-surface-variant to-primary-container text-on-primary font-bold rounded shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all text-sm font-mono"
                >
                  {isRolling ? 'Lancio...' : `Tira 2D6 ${customModifier >= 0 ? `+${customModifier}` : customModifier}`}
                </button>
              </div>
            )}

            {/* Damage Roller Block */}
            <div className="p-4 bg-surface-container/60 border border-outline-variant/30 rounded-lg">
              <span className="font-mono text-[10px] text-outline uppercase tracking-widest block mb-2">
                Dardi &amp; Armi: Tiro Danni
              </span>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(['D4', 'D6', 'D8', 'D10', 'D12', 'D20'] as const).map((die) => (
                  <button
                    key={die}
                    onClick={() => setDamageDieType(die)}
                    className={`p-2 rounded border font-mono text-xs transition-colors ${
                      damageDieType === die
                        ? 'border-primary bg-primary/20 text-primary font-bold'
                        : 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant hover:border-primary/50'
                    }`}
                  >
                    {die}
                  </button>
                ))}
              </div>
              <button
                onClick={() => rollDice('damage')}
                disabled={isRolling}
                className="w-full py-3 bg-gradient-to-r from-on-tertiary-container to-primary-container text-on-primary font-bold rounded shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all text-sm font-mono"
              >
                {isRolling ? 'Lancio...' : `Tira Danni ${damageDieType}`}
              </button>
            </div>

            {/* Simulated Live result with gorgeous state flares */}
            {lastRoll && (
              <div className="p-4 bg-surface-container border border-outline-variant/40 rounded-xl relative overflow-hidden animate-[fadeIn_0.3s_ease]">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-[10px] text-primary">{lastRoll.timestamp}</span>
                  <span className="font-mono text-xs text-on-surface-variant">{lastRoll.statName}</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    {lastRoll.diceResult[1] > 0 ? (
                      <>
                        <div className="w-12 h-12 bg-surface-container-low border-2 border-outline-variant rounded-lg flex items-center justify-center font-serif text-xl font-bold text-primary">
                          {lastRoll.diceResult[0]}
                        </div>
                        <div className="w-12 h-12 bg-surface-container-low border-2 border-outline-variant rounded-lg flex items-center justify-center font-serif text-xl font-bold text-primary">
                          {lastRoll.diceResult[1]}
                        </div>
                        {lastRoll.modifier !== 0 && (
                          <div className="font-mono text-sm self-center text-on-surface-variant">
                            {lastRoll.modifier >= 0 ? `+${lastRoll.modifier}` : lastRoll.modifier}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-16 h-12 bg-surface-container-low border-2 border-outline-variant rounded-lg flex items-center justify-center font-serif text-2xl font-bold text-red-500">
                        {lastRoll.diceResult[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="font-mono text-[10px] text-outline text-right block uppercase">Totale</span>
                    <span className="font-serif text-3xl font-bold text-primary block">{lastRoll.total}</span>
                  </div>
                </div>

                {/* Outcome descriptions mapped exactly to DW gameplay */}
                {lastRoll.statName.includes('Danno') ? (
                  <div className="p-2 rounded bg-surface-container-low border border-outline-variant/30 flex items-center gap-2">
                    <ShieldCheck size={16} className="text-primary" />
                    <p className="text-xs text-on-surface">Hai inflitto {lastRoll.total} danni al bersaglio!</p>
                  </div>
                ) : lastRoll.outcome === 'Success' ? (
                  <div className="p-3 rounded bg-green-950/40 border border-green-700/50 flex items-start gap-2">
                    <ShieldCheck size={16} className="text-green-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-green-400">Successo Totale (10+)</p>
                      <p className="text-[11px] text-on-surface-variant leading-tight">
                        Lanciato brillantemente! L'effetto si risolve esattamente come programmato senza alcuna controindicazione.
                      </p>
                    </div>
                  </div>
                ) : lastRoll.outcome === 'Mixed' ? (
                  <div className="p-3 rounded bg-yellow-950/40 border border-yellow-700/50 flex items-start gap-2">
                    <AlertTriangle size={16} className="text-yellow-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-yellow-400">Successo Parziale (7-9)</p>
                      <p className="text-[11px] text-on-surface-variant leading-tight">
                        L'incantesimo funziona, ma devi scendere a compromessi o scegliere un'opzione dolorosa dalla lista!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded bg-red-950/40 border border-red-700/50 flex items-start gap-2">
                    <HelpCircle size={16} className="text-red-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-red-400 font-mono">Sventura / Fallimento (6-)</p>
                      <p className="text-[11px] text-on-surface-variant leading-tight">
                        La magia svanisce o attira complicazioni drammatiche. Il Master effettua una mossa contro di te!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Historical logs */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="font-serif text-sm flex items-center gap-1.5 text-outline">
                  <History size={14} /> Cronologia Tiri
                </span>
                {logs.length > 0 && (
                  <button
                    onClick={onClearLogs}
                    className="text-[10px] text-red-400 hover:text-red-300 font-mono flex items-center gap-1"
                  >
                    <Trash2 size={10} /> Cancella
                  </button>
                )}
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-outline-variant/20 rounded text-xs text-outline font-mono">
                  Senza tiri eseguiti in questa sessione.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2 rounded bg-surface-container-low border border-outline-variant/20 flex justify-between items-center text-xs"
                    >
                      <div>
                        <span className="font-bold text-on-surface">{log.statName}</span>
                        <span className="text-[10px] text-outline ml-2">
                          ({log.diceResult[1] > 0 ? `${log.diceResult[0]}+${log.diceResult[1]}` : log.diceResult[0]}
                          {log.modifier !== 0 && (log.modifier > 0 ? `+${log.modifier}` : log.modifier)})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono px-1.5 py-0.5 rounded text-[9px] ${
                            log.statName.includes('Danno')
                              ? 'bg-primary/10 text-primary'
                              : log.outcome === 'Success'
                              ? 'bg-green-500/10 text-green-400'
                              : log.outcome === 'Mixed'
                              ? 'bg-yellow-500/10 text-yellow-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {log.statName.includes('Danno')
                            ? 'Danno'
                            : log.outcome === 'Success'
                            ? 'Successo'
                            : log.outcome === 'Mixed'
                            ? 'Parziale'
                            : 'Miss'}
                        </span>
                        <span className="font-serif font-bold text-primary">{log.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

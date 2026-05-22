import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  left: number;
  size: number;
  delay: number;
  duration: number;
}

export default function Atmosphere() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Generate a fixed number of particles to breathe life into the UI, without bloating performance.
    const initialParticles = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 5,
      duration: Math.random() * 6 + 6,
    }));
    setParticles(initialParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] opacity-25">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute bottom-0 bg-primary rounded-full animate-[float_linear_infinite]"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: Math.random() * 0.5 + 0.3,
            boxShadow: '0 0 8px #ff5625',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes float {
          0% {
            transform: translateY(105vh) translateX(0px);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.2;
          }
          100% {
            transform: translateY(-5vh) translateX(50px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

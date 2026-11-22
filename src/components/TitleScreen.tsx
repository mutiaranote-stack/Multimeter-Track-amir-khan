import React from 'react';
import { ChallengeTier } from '../game/types';
import { Play, ShieldCheck, Compass, Flame } from 'lucide-react';

interface TitleScreenProps {
  tier: ChallengeTier;
  onSelectTier: (tier: ChallengeTier) => void;
  onStart: () => void;
}

const TIERS: {
  id: ChallengeTier;
  title: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'guided',
    title: 'Terbimbing',
    desc: 'Langkah terarah & rekomendasi skala aman untuk pemula.',
    icon: <Compass className="w-4 h-4 text-emerald-400" />,
  },
  {
    id: 'challenge',
    title: 'Tantangan',
    desc: 'Pilih mode AC/DC/mA/Ω, posisi probe, dan baca skala mandiri.',
    icon: <ShieldCheck className="w-4 h-4 text-amber-400" />,
  },
  {
    id: 'expert',
    title: 'Ahli (Analog)',
    desc: 'Wajib kalibrasi 0 Ω & baca jarum analog pada rangkaian acak.',
    icon: <Flame className="w-4 h-4 text-rose-400" />,
  },
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  tier,
  onSelectTier,
  onStart,
}) => {
  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-5 sm:p-8 lg:p-12 pointer-events-none">
      {/* Top quiet unboxed descriptor */}
      <div className="flex items-center justify-between">
        <div className="text-xs sm:text-sm text-slate-300 font-medium tracking-wide">
          <span>Lab Elektronika 3D</span>
          <span className="mx-2 text-slate-500">·</span>
          <span>Model Track Mapping</span>
          <span className="mx-2 text-slate-500">·</span>
          <span>Prinsip UDL</span>
        </div>
        <div className="hidden sm:block text-xs text-slate-400">
          Laptop · Tablet · HP · Papan Interaktif Digital
        </div>
      </div>

      {/* Left/Center Title Lockup with 35%+ calm space for 3D scene behind */}
      <div className="my-auto max-w-xl pointer-events-auto bg-slate-950/88 border border-slate-700/60 rounded-2xl p-6 sm:p-8 shadow-2xl">
        {/* Bespoke inline SVG Lockup */}
        <div className="flex items-center gap-3.5 mb-4">
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect x="3" y="3" width="42" height="42" rx="10" fill="#0F172A" stroke="#F59E0B" strokeWidth="2.5" />
            <path d="M12 24C12 17.3726 17.3726 12 24 12C30.6274 12 36 17.3726 36 24" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M24 28L31 16" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
            <circle cx="24" cy="28" r="3.5" fill="#F59E0B" />
            <path d="M11 36H37" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 4" />
          </svg>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-none">
              VoltTrack 3D
            </h1>
            <p className="text-sm sm:text-base text-amber-400 font-semibold mt-1">
              Misi Multimeter Analog &amp; Digital
            </p>
          </div>
        </div>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6">
          Telusuri 5 stasiun lintasan sirkuit 3D untuk menguasai pengukuran{' '}
          <strong className="text-white font-semibold">Tahanan Resistor (Ω)</strong>,{' '}
          <strong className="text-white font-semibold">Tegangan DC &amp; AC</strong>, dan{' '}
          <strong className="text-white font-semibold">Arus Listrik Seri (mA)</strong> dengan prosedur aman.
        </p>

        {/* Tier Selector */}
        <div className="mb-6">
          <div className="text-xs font-semibold text-slate-400 mb-2">
            Pilih Tingkat Tantangan UDL
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {TIERS.map((t) => {
              const active = tier === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTier(t.id)}
                  className={`text-left p-3 rounded-xl border transition-colors min-h-[44px] cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400 ${
                    active
                      ? 'bg-slate-800 border-amber-400 text-white'
                      : 'bg-slate-900/80 border-slate-700/70 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-sm mb-1">
                    {t.icon}
                    <span>{t.title}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-snug">{t.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-bold text-base transition-transform cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>Mulai Misi Track</span>
          </button>
          <span className="text-xs text-slate-400">
            Tekan <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">Enter</kbd> atau ketuk untuk mulai
          </span>
        </div>
      </div>

      {/* Single flat control-hint line */}
      <div className="text-xs sm:text-sm text-slate-400 text-center sm:text-left">
        Klik/Sentuh 3D · Seret Putar Kamera · Cubit/Gulir Zoom · Esc Jeda
      </div>
    </div>
  );
};

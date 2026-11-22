import React from 'react';
import { GamePhase } from '../game/types';
import { Award, RotateCcw, Play, Home, AlertTriangle } from 'lucide-react';

interface ResultModalProps {
  phase: GamePhase;
  score: number;
  maxStreak: number;
  safetyMistakes: number;
  completedCount: number;
  totalMissions: number;
  onResume: () => void;
  onRestartRun: () => void;
  onBackToTitle: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  phase,
  score,
  maxStreak,
  safetyMistakes,
  completedCount,
  totalMissions,
  onResume,
  onRestartRun,
  onBackToTitle,
}) => {
  if (phase !== 'paused' && phase !== 'victory') return null;

  const isVictory = phase === 'victory';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
      <div className="w-full max-w-md bg-slate-950 border border-slate-700 rounded-2xl p-6 sm:p-7 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          {isVictory ? (
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <Award className="w-7 h-7 text-emerald-400" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Play className="w-6 h-6 text-amber-400" />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-extrabold text-white">
              {isVictory ? 'Misi Track Selesai!' : 'Simulasi Dijeda'}
            </h2>
            <p className="text-sm text-slate-400">
              {isVictory
                ? 'Seluruh 5 stasiun pengukuran multimeter berhasil dituntaskan.'
                : `Progres saat ini: ${completedCount} dari ${totalMissions} stasiun selesai.`}
            </p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <div className="text-xs text-slate-400">Skor Total</div>
            <div className="text-xl font-mono font-bold text-amber-400 tabular-nums mt-0.5">
              {score}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <div className="text-xs text-slate-400">Streak Terbaik</div>
            <div className="text-xl font-mono font-bold text-cyan-400 tabular-nums mt-0.5">
              {maxStreak}×
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <div className="text-xs text-slate-400">Peringatan Aman</div>
            <div className="text-xl font-mono font-bold text-rose-400 tabular-nums mt-0.5">
              {safetyMistakes}
            </div>
          </div>
        </div>

        {isVictory && safetyMistakes === 0 && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm mb-5">
            <Award className="w-5 h-5 shrink-0" />
            <span>Sempurna! Nol pelanggaran batas ukur &amp; keselamatan alat!</span>
          </div>
        )}

        {isVictory && safetyMistakes > 0 && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs sm:text-sm mb-5">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Coba ulangi dengan soal acak baru untuk meraih 0 kesalahan keselamatan!</span>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {!isVictory && (
            <button
              type="button"
              onClick={onResume}
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Lanjutkan Misi</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRestartRun}
            className={`w-full min-h-[48px] px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer ${
              isVictory
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isVictory ? 'Main Lagi (Nilai Acak Baru)' : 'Ulangi dari Stasiun 1'}</span>
          </button>
          <button
            type="button"
            onClick={onBackToTitle}
            className="w-full min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Kembali ke Layar Awal</span>
          </button>
        </div>
      </div>
    </div>
  );
};

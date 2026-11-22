import React from 'react';
import { ANALOG_OHM_CENTER, DIAL_MAP } from '../game/physics';
import { DialId } from '../game/types';
import { X } from 'lucide-react';

interface AnalogZoomLoupeProps {
  dialId: DialId;
  normalizedDeflection: number;
  zeroOhmOffset: number;
  onChangeZeroOhm: (val: number) => void;
  onClose: () => void;
}

export const AnalogZoomLoupe: React.FC<AnalogZoomLoupeProps> = ({
  dialId,
  normalizedDeflection,
  zeroOhmOffset,
  onChangeZeroOhm,
  onClose,
}) => {
  const dial = DIAL_MAP[dialId];
  const clamped = Math.max(-0.09, Math.min(1.09, normalizedDeflection));
  const angleDeg = -44 + clamped * 88; // -44 deg (left) to +44 deg (right)

  const cx = 180;
  const cy = 195;

  const normToXY = (t: number, r: number) => {
    const rad = ((-90 - 44 + t * 88) * Math.PI) / 180;
    return {
      x: cx + Math.cos(rad) * r,
      y: cy + Math.sin(rad) * r,
    };
  };

  const ohmMarks = [
    { v: 0, label: '0' },
    { v: 2, label: '2' },
    { v: 5, label: '5' },
    { v: 10, label: '10' },
    { v: 20, label: '20' },
    { v: 50, label: '50' },
    { v: 100, label: '100' },
    { v: 500, label: '500' },
  ];

  return (
    <div className="bg-slate-950/95 border border-amber-500/50 rounded-2xl p-3.5 shadow-2xl w-[320px] sm:w-[360px] pointer-events-auto">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold text-white">Pembesar Skala Analog</h3>
          <p className="text-xs text-slate-400">
            Selektor: <span className="text-amber-400 font-mono font-semibold">{dial.label}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup pembesar skala"
          className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* High-contrast crisp SVG scale */}
      <div className="bg-[#faf7ef] rounded-xl p-2 border border-slate-600">
        <svg viewBox="0 0 360 205" className="w-full h-auto block">
          {/* Ohm green arc */}
          <path
            d={`M ${normToXY(0, 150).x} ${normToXY(0, 150).y} A 150 150 0 0 1 ${normToXY(1, 150).x} ${normToXY(1, 150).y}`}
            fill="none"
            stroke="#059669"
            strokeWidth="2.5"
          />
          {/* Infinity tick */}
          <line
            x1={normToXY(0, 150).x}
            y1={normToXY(0, 150).y}
            x2={normToXY(0, 160).x}
            y2={normToXY(0, 160).y}
            stroke="#059669"
            strokeWidth="2"
          />
          <text
            x={normToXY(0, 172).x}
            y={normToXY(0, 172).y}
            fontSize="11"
            fontWeight="700"
            fill="#047857"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            ∞
          </text>
          {ohmMarks.map((m) => {
            const t = ANALOG_OHM_CENTER / (ANALOG_OHM_CENTER + m.v);
            const p1 = normToXY(t, 150);
            const p2 = normToXY(t, 160);
            const pt = normToXY(t, 172);
            return (
              <g key={m.label}>
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#059669" strokeWidth="1.8" />
                <text
                  x={pt.x}
                  y={pt.y}
                  fontSize="10"
                  fontWeight="700"
                  fill="#047857"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {m.label}
                </text>
              </g>
            );
          })}

          {/* DCV/ACV linear black arc */}
          <path
            d={`M ${normToXY(0, 114).x} ${normToXY(0, 114).y} A 114 114 0 0 1 ${normToXY(1, 114).x} ${normToXY(1, 114).y}`}
            fill="none"
            stroke="#0f172a"
            strokeWidth="2"
          />
          {Array.from({ length: 26 }).map((_, idx) => {
            const t = idx / 25;
            const major = idx % 5 === 0;
            const p1 = normToXY(t, 114);
            const p2 = normToXY(t, major ? 124 : 119);
            const pt250 = normToXY(t, 134);
            const pt50 = normToXY(t, 102);
            const pt10 = normToXY(t, 86);
            const step = idx / 5;
            return (
              <g key={idx}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="#0f172a"
                  strokeWidth={major ? 2 : 1}
                />
                {major && (
                  <>
                    <text
                      x={pt250.x}
                      y={pt250.y}
                      fontSize="9.5"
                      fontWeight="700"
                      fill="#0f172a"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {step * 50}
                    </text>
                    <text
                      x={pt50.x}
                      y={pt50.y}
                      fontSize="9"
                      fontWeight="700"
                      fill="#1e293b"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {step * 10}
                    </text>
                    <text
                      x={pt10.x}
                      y={pt10.y}
                      fontSize="8.5"
                      fontWeight="600"
                      fill="#dc2626"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {step * 2}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* Animated Needle */}
          <g transform={`rotate(${angleDeg} ${cx} ${cy})`}>
            <line x1={cx} y1={cy} x2={cx} y2={cy - 154} stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <circle cx={cx} cy={cy} r="9" fill="#0f172a" />
          <circle cx={cx} cy={cy} r="4" fill="#f59e0b" />
        </svg>
      </div>

      {/* Zero-Ohm calibration slider for Analog Ω */}
      {dial.mode === 'OHM' && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-300 font-medium">Kalibrasi 0 Ω (Adjust)</span>
            <span className="font-mono text-emerald-400 tabular-nums">
              {zeroOhmOffset >= 0 ? '+' : ''}
              {zeroOhmOffset.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={zeroOhmOffset}
            onChange={(e) => onChangeZeroOhm(parseFloat(e.target.value))}
            aria-label="Kalibrasi Zero Ohm Analog"
            className="w-full accent-emerald-500 h-6 cursor-pointer"
          />
        </div>
      )}
    </div>
  );
};

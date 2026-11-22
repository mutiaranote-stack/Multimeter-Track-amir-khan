import React, { useState } from 'react';
import { UDLSettings } from '../game/types';
import { X, Volume2, VolumeX, Accessibility, Calculator, Palette, BookOpen } from 'lucide-react';

interface UDLGuideDrawerProps {
  open: boolean;
  settings: UDLSettings;
  onUpdateSettings: (next: Partial<UDLSettings>) => void;
  onClose: () => void;
}

const BAND_COLORS = [
  { name: 'Hitam', val: 0, mult: 1, hex: '#111827', text: '#f8fafc' },
  { name: 'Cokelat', val: 1, mult: 10, hex: '#92400e', text: '#f8fafc' },
  { name: 'Merah', val: 2, mult: 100, hex: '#ef4444', text: '#ffffff' },
  { name: 'Oranye', val: 3, mult: 1000, hex: '#f97316', text: '#ffffff' },
  { name: 'Kuning', val: 4, mult: 10000, hex: '#eab308', text: '#0f172a' },
  { name: 'Hijau', val: 5, mult: 100000, hex: '#10b981', text: '#0f172a' },
  { name: 'Biru', val: 6, mult: 1000000, hex: '#3b82f6', text: '#ffffff' },
  { name: 'Ungu', val: 7, mult: 10000000, hex: '#a855f7', text: '#ffffff' },
];

export const UDLGuideDrawer: React.FC<UDLGuideDrawerProps> = ({
  open,
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const [tab, setTab] = useState<'access' | 'ohm' | 'resistor' | 'guide'>('access');
  const [volt, setVolt] = useState(9);
  const [res, setRes] = useState(100);
  const [b1, setB1] = useState(2); // Merah (2)
  const [b2, setB2] = useState(2); // Merah (2)
  const [b3, setB3] = useState(1); // Cokelat (x10) => 220

  if (!open) return null;

  const currentMa = ((volt / res) * 1000).toFixed(1);
  const decodedOhms = (BAND_COLORS[b1].val * 10 + BAND_COLORS[b2].val) * BAND_COLORS[b3].mult;
  const formattedDecoded =
    decodedOhms >= 1000 ? `${(decodedOhms / 1000).toFixed(decodedOhms % 1000 === 0 ? 0 : 1)} kΩ` : `${decodedOhms} Ω`;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-end bg-black/50 p-3 sm:p-5">
      <div className="w-full max-w-md max-h-full flex flex-col bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Accessibility className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Bantuan &amp; Aksesibilitas UDL</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel UDL"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab buttons */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-slate-900 border-b border-slate-800">
          {[
            { id: 'access', label: 'Akses', icon: <Accessibility className="w-4 h-4" /> },
            { id: 'ohm', label: 'Hukum Ω', icon: <Calculator className="w-4 h-4" /> },
            { id: 'resistor', label: 'Gelang', icon: <Palette className="w-4 h-4" /> },
            { id: 'guide', label: 'Panduan', icon: <BookOpen className="w-4 h-4" /> },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as typeof tab)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-semibold min-h-[44px] cursor-pointer transition-colors ${
                tab === item.id
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="p-5 overflow-y-auto thin-scroll space-y-4 text-sm text-slate-200">
          {tab === 'access' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Sesuaikan tampilan dan dukungan multisensori untuk Laptop, Tablet, HP, maupun Papan Interaktif Digital (IFP).
              </p>

              {[
                {
                  key: 'largeControls' as const,
                  title: 'Mode Tombol Besar (HP & Papan Interaktif)',
                  desc: 'Memperbesar area sentuh tombol & teks kontrol.',
                },
                {
                  key: 'showElectronFlow' as const,
                  title: 'Visualisasi Aliran Elektron 3D',
                  desc: 'Menampilkan gerak arus searah (DC) & bolak-balik (AC) di lintasan.',
                },
                {
                  key: 'showAnalogLoupe' as const,
                  title: 'Lensa Pembesar Skala Analog',
                  desc: 'Tampilkan bacaan jarum analog besar dan tajam di layar.',
                },
                {
                  key: 'dyslexiaFriendly' as const,
                  title: 'Spasi Teks Ramah Baca (Dyslexia-Friendly)',
                  desc: 'Melebarkan jarak huruf dan baris pada instruksi misi.',
                },
              ].map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer"
                >
                  <div>
                    <div className="font-semibold text-white">{opt.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{opt.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings[opt.key]}
                    onChange={(e) => onUpdateSettings({ [opt.key]: e.target.checked })}
                    className="w-6 h-6 mt-0.5 accent-amber-500 shrink-0 cursor-pointer"
                  />
                </label>
              ))}

              <button
                type="button"
                onClick={() => onUpdateSettings({ muted: !settings.muted })}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 cursor-pointer min-h-[48px]"
              >
                <div className="flex items-center gap-2.5 font-semibold text-white">
                  {settings.muted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
                  <span>Efek Suara Umpan Balik</span>
                </div>
                <span className="text-xs font-mono text-slate-300">
                  {settings.muted ? 'NONAKTIF' : 'AKTIF'}
                </span>
              </button>
            </div>
          )}

          {tab === 'ohm' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <div className="text-xs text-slate-400 mb-1">Rumus Hukum Ohm</div>
                <div className="text-xl font-mono font-bold text-amber-400">
                  I = V ÷ R
                </div>
                <div className="text-2xl font-mono font-bold text-cyan-300 mt-2 tabular-nums">
                  {volt}V ÷ {res}Ω = {currentMa} mA
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Tegangan Sumber (V)</span>
                  <span className="font-mono text-white tabular-nums">{volt} V</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={24}
                  step={1}
                  value={volt}
                  onChange={(e) => setVolt(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-7 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Tahanan Beban (R)</span>
                  <span className="font-mono text-white tabular-nums">{res} Ω</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={1000}
                  step={50}
                  value={res}
                  onChange={(e) => setRes(Number(e.target.value))}
                  className="w-full accent-emerald-400 h-7 cursor-pointer"
                />
              </div>
            </div>
          )}

          {tab === 'resistor' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center">
                <div className="text-xs text-slate-400 mb-2">Simulasi 4-Gelang Resistor</div>
                <div className="flex items-center gap-1.5 bg-[#d6b88d] px-6 py-3 rounded-full border border-amber-200/30">
                  <span className="w-3.5 h-7 rounded-sm" style={{ backgroundColor: BAND_COLORS[b1].hex }} />
                  <span className="w-3.5 h-7 rounded-sm" style={{ backgroundColor: BAND_COLORS[b2].hex }} />
                  <span className="w-3.5 h-7 rounded-sm" style={{ backgroundColor: BAND_COLORS[b3].hex }} />
                  <span className="w-3.5 h-7 rounded-sm ml-2 bg-yellow-500" title="Emas ±5%" />
                </div>
                <div className="text-2xl font-mono font-bold text-emerald-400 mt-3 tabular-nums">
                  {formattedDecoded} ±5%
                </div>
              </div>

              {[
                { label: 'Gelang 1 (Puluhan)', val: b1, set: setB1, list: BAND_COLORS.slice(1) },
                { label: 'Gelang 2 (Satuan)', val: b2, set: setB2, list: BAND_COLORS },
                { label: 'Gelang 3 (Pengali)', val: b3, set: setB3, list: BAND_COLORS.slice(0, 5) },
              ].map((row) => (
                <div key={row.label}>
                  <div className="text-xs text-slate-400 mb-1.5">{row.label}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {row.list.map((c) => {
                      const idx = BAND_COLORS.findIndex((x) => x.name === c.name);
                      const active = row.val === idx;
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => row.set(idx)}
                          style={{ backgroundColor: c.hex, color: c.text }}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold min-h-[36px] cursor-pointer border-2 ${
                            active ? 'border-white scale-105' : 'border-transparent opacity-80'
                          }`}
                        >
                          {c.name} ({row.label.includes('Pengali') ? `×${c.mult}` : c.val})
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'guide' && (
            <div className="space-y-3 text-xs sm:text-sm leading-relaxed">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <h3 className="font-bold text-emerald-400 mb-1">1. Mengukur Tahanan (Ω)</h3>
                <p className="text-slate-300">
                  Wajib matikan daya rangkaian (sakelar OFF). Pada Analog, lakukan kalibrasi 0 Ω, lalu baca skala hijau dari kanan (0) ke kiri (∞) dikalikan pengali (×1, ×10, ×1k).
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <h3 className="font-bold text-sky-400 mb-1">2. Mengukur Tegangan DC &amp; AC</h3>
                <p className="text-slate-300">
                  Dipasang secara PARALEL. Pada DCV perhatikan polaritas: Merah ke (+) dan Hitam ke (−). Pada ACV pilih batas ukur aman di atas perkiraan sumber (mis. 250V~).
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <h3 className="font-bold text-amber-400 mb-1">3. Mengukur Arus Listrik (mA)</h3>
                <p className="text-slate-300">
                  Dipasang secara SERI! Putus lintasan dengan membuka Jumper Seri agar seluruh arus melewati multimeter, bukan dipasang paralel.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  CameraViewPreset,
} from '../game/LabSceneController';
import {
  DIAL_MAP,
  DIAL_SPECS,
  getStationTerminals,
} from '../game/physics';
import { STATION_ORDER } from '../game/missions';
import {
  ChallengeTier,
  CircuitState,
  DialId,
  MeasurementResult,
  MeterType,
  MissionQuestion,
  StationId,
  TerminalId,
  UDLSettings,
} from '../game/types';
import { AnalogZoomLoupe } from './AnalogZoomLoupe';
import {
  Accessibility,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  HelpCircle,
  Pause,
  Power,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';

interface MissionOverlayProps {
  tier: ChallengeTier;
  station: StationId;
  activeMeter: MeterType;
  dialId: DialId;
  redProbe: TerminalId;
  blackProbe: TerminalId;
  activeProbeTool: 'red' | 'black';
  circuit: CircuitState;
  measurement: MeasurementResult;
  zeroOhmOffset: number;
  holdActive: boolean;
  cameraPreset: CameraViewPreset;
  mission: MissionQuestion;
  completedStations: Record<StationId, boolean>;
  score: number;
  streak: number;
  udl: UDLSettings;
  dockCollapsed: boolean;
  feedbackBanner: { ok: boolean; text: string } | null;
  onToggleDock: () => void;
  onSelectStation: (s: StationId) => void;
  onSelectMeter: (m: MeterType) => void;
  onStepDial: (delta: number) => void;
  onSelectDial: (id: DialId) => void;
  onSelectProbeTool: (p: 'red' | 'black') => void;
  onAttachProbe: (terminal: TerminalId) => void;
  onClearProbes: () => void;
  onToggleSwitch: (station: StationId) => void;
  onToggleJumper: (station: StationId) => void;
  onChangeZeroOhm: (val: number) => void;
  onToggleHold: () => void;
  onChangeCameraPreset: (preset: CameraViewPreset) => void;
  onSubmitAnswer: (optionIndex: number) => void;
  onOpenUDL: () => void;
  onToggleMute: () => void;
  onToggleLoupe: () => void;
  onPause: () => void;
}

const STATION_LABELS: Record<StationId, string> = {
  resistor: '1·Ω',
  dcv: '2·DC',
  acv: '3·AC',
  current: '4·mA',
  diagnostic: '5·Uji',
};

export const MissionOverlay: React.FC<MissionOverlayProps> = ({
  tier,
  station,
  activeMeter,
  dialId,
  redProbe,
  blackProbe,
  activeProbeTool,
  circuit,
  measurement,
  zeroOhmOffset,
  holdActive,
  cameraPreset,
  mission,
  completedStations,
  score,
  streak,
  udl,
  dockCollapsed,
  feedbackBanner,
  onToggleDock,
  onSelectStation,
  onSelectMeter,
  onStepDial,
  onSelectDial,
  onSelectProbeTool,
  onAttachProbe,
  onClearProbes,
  onToggleSwitch,
  onToggleJumper,
  onChangeZeroOhm,
  onToggleHold,
  onChangeCameraPreset,
  onSubmitAnswer,
  onOpenUDL,
  onToggleMute,
  onToggleLoupe,
  onPause,
}) => {
  const [dockTab, setDockTab] = useState<'meter' | 'probes' | 'answer'>('meter');
  const [showHint, setShowHint] = useState(false);

  const dial = DIAL_MAP[dialId];
  const terminals = getStationTerminals(station);
  const btnSize = udl.largeControls ? 'min-h-[48px] text-sm' : 'min-h-[42px] text-xs sm:text-sm';

  const statusConfig = (() => {
    if (measurement.status === 'hazard') {
      return {
        bg: 'bg-rose-950/95 border-rose-500/70 text-rose-200',
        icon: <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />,
        tag: 'BAHAYA',
      };
    }
    if (measurement.status === 'overload' || measurement.status === 'wrong_mode' || measurement.status === 'reverse') {
      return {
        bg: 'bg-amber-950/95 border-amber-500/70 text-amber-200',
        icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
        tag: measurement.status === 'overload' ? 'OVERLOAD' : measurement.status === 'reverse' ? 'TERBALIK' : 'MODE',
      };
    }
    if (measurement.status === 'ok') {
      return {
        bg: 'bg-emerald-950/95 border-emerald-500/60 text-emerald-200',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
        tag: 'TERBACA',
      };
    }
    return {
      bg: 'bg-slate-900/95 border-slate-700 text-slate-300',
      icon: <Zap className="w-4 h-4 text-sky-400 shrink-0" />,
      tag: 'SIAP',
    };
  })();

  const hasSwitch = station === 'resistor' || station === 'current' || station === 'diagnostic';
  const switchState =
    station === 'resistor'
      ? circuit.resistorSwitchOn
      : station === 'current'
        ? circuit.seriesPowerOn
        : circuit.diagSwitchOn;

  const hasJumper = station === 'current' || (station === 'diagnostic' && circuit.diagKind === 'DCA');
  const jumperClosed = station === 'current' ? circuit.seriesJumperClosed : circuit.diagJumperClosed;

  const formatOpt = (val: number) => {
    if (mission.unit === 'Ω' && val >= 1000) {
      return `${val} Ω (${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)} kΩ)`;
    }
    return `${val} ${mission.unit}`;
  };

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4">
      {/* TOP BAR: Compact Track Map Bar + Score + Global Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Track Map Station Selector */}
        <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-xl bg-slate-950/92 border border-slate-700/70 shadow-lg overflow-x-auto max-w-full">
          {STATION_ORDER.map((sid) => {
            const active = sid === station;
            const done = completedStations[sid];
            return (
              <button
                key={sid}
                type="button"
                onClick={() => onSelectStation(sid)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap shrink-0 min-h-[38px] flex items-center gap-1.5 transition-colors cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-slate-950'
                    : done
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/80'
                      : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {done && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                <span className="text-xs sm:text-sm font-mono">{STATION_LABELS[sid]}</span>
              </button>
            );
          })}
        </div>

        {/* Score, Camera Presets & Utility Actions */}
        <div className="pointer-events-auto flex items-center gap-1.5 flex-wrap">
          {/* Score & Streak */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 min-h-[40px] rounded-xl bg-slate-950/92 border border-slate-700/70 text-xs sm:text-sm">
            <span className="text-slate-400">Skor</span>
            <span className="font-mono font-bold text-amber-400 tabular-nums">{score}</span>
            <span className="text-slate-600">·</span>
            <span className="font-mono font-bold text-cyan-400 tabular-nums">{streak}×</span>
          </div>

          {/* Camera Presets */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-slate-950/92 border border-slate-700/70">
            {(
              [
                { id: 'overview', label: 'Meja' },
                { id: 'station', label: 'Stasiun' },
                { id: 'meter', label: 'Meter' },
              ] as { id: CameraViewPreset; label: string }[]
            ).map((cam) => (
              <button
                key={cam.id}
                type="button"
                onClick={() => onChangeCameraPreset(cam.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold min-h-[34px] cursor-pointer whitespace-nowrap ${
                  cameraPreset === cam.id
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {cam.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleLoupe}
            title="Pembesar Skala Analog"
            className={`px-2.5 py-1.5 min-h-[40px] rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              udl.showAnalogLoupe
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-950/92 text-slate-200 border-slate-700/70 hover:bg-slate-800'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Skala</span>
          </button>

          <button
            type="button"
            onClick={onOpenUDL}
            title="Alat Bantu UDL & Rumus"
            className="px-2.5 py-1.5 min-h-[40px] rounded-xl bg-slate-950/92 hover:bg-slate-800 border border-slate-700/70 text-slate-100 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Accessibility className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">UDL</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={udl.muted ? 'Aktifkan suara' : 'Bisukan suara'}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-slate-950/92 hover:bg-slate-800 border border-slate-700/70 text-slate-200 cursor-pointer"
          >
            {udl.muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={onPause}
            aria-label="Jeda permainan"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-slate-950/92 hover:bg-slate-800 border border-slate-700/70 text-slate-200 cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Optional Analog Scale Zoom Loupe floating cleanly at top-right */}
      {udl.showAnalogLoupe && (
        <div className="self-end my-auto">
          <AnalogZoomLoupe
            dialId={dialId}
            normalizedDeflection={activeMeter === 'analog' ? measurement.analogNormalized : 0}
            zeroOhmOffset={zeroOhmOffset}
            onChangeZeroOhm={onChangeZeroOhm}
            onClose={onToggleLoupe}
          />
        </div>
      )}

      {/* COLLAPSIBLE BOTTOM CONTROL DOCK */}
      <div className="w-full flex flex-col items-center">
        {/* Collapse / Expand Tab */}
        <button
          type="button"
          onClick={onToggleDock}
          className="pointer-events-auto mb-1.5 px-4 py-1.5 min-h-[36px] rounded-t-xl rounded-b-md bg-slate-950/92 hover:bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-200 flex items-center gap-1.5 shadow-lg cursor-pointer"
        >
          {dockCollapsed ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-amber-400" />}
          <span>{dockCollapsed ? 'Tampilkan Kontrol (H)' : 'Sembunyikan Kontrol (H)'}</span>
        </button>

        {!dockCollapsed && (
          <div
            className={`pointer-events-auto w-full max-w-[960px] bg-slate-950/94 border border-slate-700/80 rounded-2xl p-3 sm:p-4 shadow-2xl ${
              udl.dyslexiaFriendly ? 'udl-wide-reading' : ''
            }`}
          >
            {/* Mission Briefing & Status Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-800">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="font-bold text-amber-400">{mission.title}</span>
                  {mission.requiredMeter !== 'any' && (
                    <>
                      <span>·</span>
                      <span className="text-rose-300 font-semibold">
                        Wajib: Multimeter {mission.requiredMeter === 'analog' ? 'Analog' : 'Digital'}
                      </span>
                    </>
                  )}
                  {completedStations[station] && (
                    <>
                      <span>·</span>
                      <span className="text-emerald-400 font-semibold">Stasiun Selesai</span>
                    </>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-200 mt-0.5 leading-snug">
                  {mission.briefing}
                </p>
              </div>

              {/* Guided Steps Toggle (always available in Guided, optional hint in Challenge) */}
              <button
                type="button"
                onClick={() => setShowHint((v) => !v)}
                className="self-start sm:self-center shrink-0 px-3 py-1.5 min-h-[38px] rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-sky-300 flex items-center gap-1.5 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                <span>{showHint ? 'Tutup Langkah' : 'Panduan Langkah'}</span>
              </button>
            </div>

            {/* Optional Guided Steps Drawer */}
            {(showHint || tier === 'guided') && showHint && (
              <div className="mb-2.5 p-2.5 rounded-xl bg-slate-900 border border-sky-500/30 text-xs text-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {mission.guidedSteps.map((step) => (
                  <div key={step}>{step}</div>
                ))}
              </div>
            )}

            {/* Live Feedback Banner */}
            {feedbackBanner && (
              <div
                className={`mb-2.5 p-2.5 rounded-xl border text-xs sm:text-sm font-medium flex items-center gap-2 ${
                  feedbackBanner.ok
                    ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                }`}
              >
                {feedbackBanner.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                <span>{feedbackBanner.text}</span>
              </div>
            )}

            {/* Live Meter Status Readout */}
            <div className={`mb-3 px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs ${statusConfig.bg}`}>
              <div className="flex items-center gap-2 min-w-0">
                {statusConfig.icon}
                <span className="font-mono font-bold shrink-0">{statusConfig.tag}</span>
                <span className="truncate sm:whitespace-normal">{measurement.message}</span>
              </div>
              <div className="font-mono font-bold text-slate-100 shrink-0 tabular-nums hidden sm:block">
                {activeMeter === 'digital'
                  ? dial.mode === 'OFF'
                    ? 'OFF'
                    : `${measurement.digitalPolarity === '-' ? '-' : ''}${measurement.digitalDisplay} ${measurement.digitalUnit}`
                  : `Skala ${dial.shortLabel}`}
              </div>
            </div>

            {/* Dock Navigation Tabs */}
            <div className="grid grid-cols-3 gap-1.5 mb-2.5">
              {[
                { id: 'meter', label: '1. Alat & Selektor' },
                { id: 'probes', label: '2. Probe & Sakelar' },
                { id: 'answer', label: '3. Jawab & Verifikasi' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDockTab(t.id as typeof dockTab)}
                  className={`px-2 py-2 rounded-xl font-semibold min-h-[42px] transition-colors cursor-pointer text-xs sm:text-sm truncate ${
                    dockTab === t.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB 1: METER & DIAL SELECTOR */}
            {dockTab === 'meter' && (
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
                {/* Analog vs Digital Switch */}
                <div className="flex items-center gap-1.5">
                  {(['analog', 'digital'] as MeterType[]).map((m) => {
                    const active = activeMeter === m;
                    const locked = mission.requiredMeter !== 'any' && mission.requiredMeter !== m;
                    return (
                      <button
                        key={m}
                        type="button"
                        disabled={locked}
                        onClick={() => onSelectMeter(m)}
                        className={`flex-1 sm:flex-none px-4 rounded-xl font-semibold border transition-colors cursor-pointer ${btnSize} ${
                          locked
                            ? 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
                            : active
                              ? m === 'analog'
                                ? 'bg-amber-500 text-slate-950 border-amber-400'
                                : 'bg-sky-500 text-slate-950 border-sky-400'
                              : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {m === 'analog' ? 'Multimeter Analog' : 'Multimeter Digital'}
                      </button>
                    );
                  })}
                </div>

                {/* Rotary Dial Stepper */}
                <div className="flex items-center gap-1.5 flex-1 justify-end">
                  <button
                    type="button"
                    onClick={() => onStepDial(-1)}
                    aria-label="Putar selektor kiri"
                    className={`px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white cursor-pointer flex items-center justify-center ${btnSize}`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <select
                    value={dialId}
                    onChange={(e) => onSelectDial(e.target.value as DialId)}
                    aria-label="Pilih posisi selektor multimeter"
                    className={`flex-1 max-w-[230px] px-3 rounded-xl bg-slate-900 border border-slate-600 text-white font-mono font-semibold cursor-pointer ${btnSize}`}
                  >
                    {DIAL_SPECS.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => onStepDial(1)}
                    aria-label="Putar selektor kanan"
                    className={`px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white cursor-pointer flex items-center justify-center ${btnSize}`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {activeMeter === 'digital' && (
                    <button
                      type="button"
                      onClick={onToggleHold}
                      className={`px-3 rounded-xl font-mono font-bold border cursor-pointer ${btnSize} ${
                        holdActive
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-900 text-slate-200 border-slate-700'
                      }`}
                    >
                      HOLD
                    </button>
                  )}

                  {activeMeter === 'analog' && dial.mode === 'OHM' && (
                    <button
                      type="button"
                      onClick={onToggleLoupe}
                      className={`px-3 rounded-xl font-semibold border cursor-pointer flex items-center gap-1 ${btnSize} bg-emerald-950/90 border-emerald-500/50 text-emerald-300`}
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      <span>0 Ω</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: PROBES & CIRCUIT SWITCHES */}
            {dockTab === 'probes' && (
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
                {/* Select which probe to move */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectProbeTool('red')}
                    className={`px-3 rounded-xl font-semibold border cursor-pointer ${btnSize} ${
                      activeProbeTool === 'red'
                        ? 'bg-rose-600 text-white border-rose-400'
                        : 'bg-slate-900 text-rose-300 border-slate-700'
                    }`}
                  >
                    Probe Merah (+): {redProbe === 'NONE' ? 'Lepas' : redProbe}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectProbeTool('black')}
                    className={`px-3 rounded-xl font-semibold border cursor-pointer ${btnSize} ${
                      activeProbeTool === 'black'
                        ? 'bg-slate-200 text-slate-950 border-white'
                        : 'bg-slate-900 text-slate-300 border-slate-700'
                    }`}
                  >
                    Probe Hitam (−): {blackProbe === 'NONE' ? 'Lepas' : blackProbe}
                  </button>
                </div>

                {/* Terminal quick-attach buttons (synced with 3D terminal clicks) */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {terminals.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onAttachProbe(t.id)}
                      className={`px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-sky-500/40 text-sky-200 font-mono font-semibold cursor-pointer ${btnSize}`}
                    >
                      Pasang {t.shortLabel}
                    </button>
                  ))}

                  {hasSwitch && (
                    <button
                      type="button"
                      onClick={() => onToggleSwitch(station)}
                      className={`px-3 rounded-xl font-semibold border cursor-pointer flex items-center gap-1.5 ${btnSize} ${
                        switchState
                          ? 'bg-rose-950/90 border-rose-500/60 text-rose-200'
                          : 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
                      }`}
                    >
                      <Power className="w-4 h-4" />
                      <span>Sakelar: {switchState ? 'ON' : 'OFF'}</span>
                    </button>
                  )}

                  {hasJumper && (
                    <button
                      type="button"
                      onClick={() => onToggleJumper(station)}
                      className={`px-3 rounded-xl font-semibold border cursor-pointer ${btnSize} ${
                        jumperClosed
                          ? 'bg-amber-950/90 border-amber-500/60 text-amber-200'
                          : 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
                      }`}
                    >
                      Jumper: {jumperClosed ? 'Tertutup' : 'Terbuka (Seri)'}
                    </button>
                  )}

                  {(redProbe !== 'NONE' || blackProbe !== 'NONE') && (
                    <button
                      type="button"
                      onClick={onClearProbes}
                      className={`px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer ${btnSize}`}
                    >
                      Lepas
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: SUBMIT READING ANSWER */}
            {dockTab === 'answer' && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="text-xs sm:text-sm text-slate-300">
                  {measurement.status === 'ok' && measurement.measuredValue !== null ? (
                    <span>
                      Hasil ukur aktif! Pilih nilai yang sesuai dengan bacaan{' '}
                      <strong className="text-white">
                        {activeMeter === 'analog' ? 'jarum skala analog' : 'layar LCD digital'}
                      </strong>
                      :
                    </span>
                  ) : (
                    <span className="text-amber-300">
                      Selesaikan pengukuran pada Tab 1 &amp; 2 hingga status <strong className="font-mono">TERBACA</strong> sebelum mengirim jawaban.
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:flex items-center gap-2">
                  {mission.options.map((opt, idx) => (
                    <button
                      key={`${mission.id}-${opt}`}
                      type="button"
                      disabled={measurement.status !== 'ok' || completedStations[station]}
                      onClick={() => onSubmitAnswer(idx)}
                      className={`px-4 rounded-xl font-mono font-bold border transition-colors tabular-nums cursor-pointer ${btnSize} ${
                        measurement.status !== 'ok' || completedStations[station]
                          ? 'opacity-45 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500'
                          : 'bg-slate-900 hover:bg-amber-500 hover:text-slate-950 hover:border-amber-400 border-slate-600 text-white'
                      }`}
                    >
                      {formatOpt(opt)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

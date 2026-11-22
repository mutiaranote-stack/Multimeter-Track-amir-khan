import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CameraViewPreset,
  LabSceneController,
  SceneVisualState,
} from './game/LabSceneController';
import { soundEngine } from './game/audio';
import { generateRunData, STATION_ORDER } from './game/missions';
import { InteractiveTarget } from './game/models';
import { DIAL_SPECS, evaluateMeasurement, TERMINAL_META } from './game/physics';
import {
  ChallengeTier,
  CircuitState,
  DialId,
  GamePhase,
  MeasurementResult,
  MeterType,
  MissionQuestion,
  StationId,
  TerminalId,
  UDLSettings,
} from './game/types';
import { MissionOverlay } from './components/MissionOverlay';
import { ResultModal } from './components/ResultModal';
import { TitleScreen } from './components/TitleScreen';
import { UDLGuideDrawer } from './components/UDLGuideDrawer';

const INITIAL_RUN = generateRunData('guided');

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<LabSceneController | null>(null);

  const [phase, setPhase] = useState<GamePhase>('title');
  const [tier, setTier] = useState<ChallengeTier>('guided');
  const [circuit, setCircuit] = useState<CircuitState>(INITIAL_RUN.circuit);
  const [missions, setMissions] = useState<MissionQuestion[]>(INITIAL_RUN.missions);

  const [station, setStation] = useState<StationId>('resistor');
  const [activeMeter, setActiveMeter] = useState<MeterType>('analog');
  const [dialId, setDialId] = useState<DialId>('OFF');
  const [redProbe, setRedProbe] = useState<TerminalId>('NONE');
  const [blackProbe, setBlackProbe] = useState<TerminalId>('NONE');
  const [activeProbeTool, setActiveProbeTool] = useState<'red' | 'black'>('red');
  const [zeroOhmOffset, setZeroOhmOffset] = useState<number>(0.45);
  const [holdActive, setHoldActive] = useState<boolean>(false);
  const [heldMeasurement, setHeldMeasurement] = useState<MeasurementResult | null>(null);
  const [cameraPreset, setCameraPreset] = useState<CameraViewPreset>('station');

  const [completedStations, setCompletedStations] = useState<Record<StationId, boolean>>({
    resistor: false,
    dcv: false,
    acv: false,
    current: false,
    diagnostic: false,
  });
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [safetyMistakes, setSafetyMistakes] = useState<number>(0);
  const [feedbackBanner, setFeedbackBanner] = useState<{ ok: boolean; text: string } | null>(null);

  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [udlOpen, setUdlOpen] = useState<boolean>(false);
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [udl, setUdl] = useState<UDLSettings>({
    largeControls: false,
    showElectronFlow: true,
    showAnalogLoupe: false,
    showFormulaHelper: false,
    dyslexiaFriendly: false,
    muted: false,
  });

  const currentMission = useMemo(
    () => missions.find((m) => m.station === station) || missions[0],
    [missions, station]
  );

  const liveMeasurement = useMemo(
    () =>
      evaluateMeasurement(
        station,
        dialId,
        redProbe,
        blackProbe,
        circuit,
        zeroOhmOffset,
        activeMeter
      ),
    [station, dialId, redProbe, blackProbe, circuit, zeroOhmOffset, activeMeter]
  );

  const displayedMeasurement =
    holdActive && activeMeter === 'digital' && heldMeasurement
      ? heldMeasurement
      : liveMeasurement;

  // Trigger audio warning on newly entered hazard state
  const prevStatusRef = useRef<string>('idle');
  useEffect(() => {
    if (
      phase === 'playing' &&
      liveMeasurement.safetyPenalty &&
      prevStatusRef.current !== liveMeasurement.status
    ) {
      soundEngine.playHazardBuzz();
      setSafetyMistakes((c) => c + 1);
    }
    prevStatusRef.current = liveMeasurement.status;
  }, [liveMeasurement.status, liveMeasurement.safetyPenalty, phase]);

  // Keep sound engine mute synced
  useEffect(() => {
    soundEngine.muted = udl.muted;
  }, [udl.muted]);

  // Handlers kept in refs for stable Three.js callback access
  const selectStation = useCallback(
    (nextStation: StationId) => {
      if (nextStation === station) {
        setCameraPreset('station');
        sceneRef.current?.focusCamera('station');
        return;
      }
      soundEngine.playStationWhoosh();
      setStation(nextStation);
      setRedProbe('NONE');
      setBlackProbe('NONE');
      setActiveProbeTool('red');
      setHoldActive(false);
      setHeldMeasurement(null);
      setFeedbackBanner(null);
      setCameraPreset('station');

      // Auto-switch meter if mission requires specific meter
      const nextMission = missions.find((m) => m.station === nextStation);
      if (nextMission && nextMission.requiredMeter !== 'any') {
        setActiveMeter(nextMission.requiredMeter);
      }
    },
    [station, missions]
  );

  const stepDial = useCallback((delta: number) => {
    soundEngine.playDialClick();
    setHoldActive(false);
    setHeldMeasurement(null);
    setDialId((prev) => {
      const idx = DIAL_SPECS.findIndex((d) => d.id === prev);
      const nextIdx = (idx + delta + DIAL_SPECS.length) % DIAL_SPECS.length;
      return DIAL_SPECS[nextIdx].id;
    });
  }, []);

  const attachProbe = useCallback(
    (terminal: TerminalId) => {
      if (terminal === 'NONE') return;
      const meta = TERMINAL_META[terminal];
      if (meta.station !== station) {
        selectStation(meta.station);
      }
      if (activeProbeTool === 'red') {
        soundEngine.playProbeSnap(true);
        setRedProbe(terminal);
        if (blackProbe === terminal) setBlackProbe('NONE');
        // Auto-toggle to black probe for fast 2-tap touch / IFP workflow
        setActiveProbeTool('black');
      } else {
        soundEngine.playProbeSnap(false);
        setBlackProbe(terminal);
        if (redProbe === terminal) setRedProbe('NONE');
        setActiveProbeTool('red');
      }
    },
    [activeProbeTool, blackProbe, redProbe, selectStation, station]
  );

  const toggleSwitch = useCallback((targetStation: StationId) => {
    soundEngine.playSwitchToggle(true);
    setCircuit((prev) => {
      if (targetStation === 'resistor') {
        return { ...prev, resistorSwitchOn: !prev.resistorSwitchOn };
      }
      if (targetStation === 'current') {
        return { ...prev, seriesPowerOn: !prev.seriesPowerOn };
      }
      if (targetStation === 'diagnostic') {
        return { ...prev, diagSwitchOn: !prev.diagSwitchOn };
      }
      return prev;
    });
  }, []);

  const toggleJumper = useCallback((targetStation: StationId) => {
    soundEngine.playSwitchToggle(false);
    setCircuit((prev) => {
      if (targetStation === 'current') {
        return { ...prev, seriesJumperClosed: !prev.seriesJumperClosed };
      }
      if (targetStation === 'diagnostic') {
        return { ...prev, diagJumperClosed: !prev.diagJumperClosed };
      }
      return prev;
    });
  }, []);

  const toggleHold = useCallback(() => {
    soundEngine.playDialClick();
    setHoldActive((prev) => {
      if (!prev) {
        setHeldMeasurement(liveMeasurement);
        return true;
      }
      setHeldMeasurement(null);
      return false;
    });
  }, [liveMeasurement]);

  const handle3DClick = useCallback(
    (target: InteractiveTarget) => {
      if (phase !== 'playing') return;
      if (target.type === 'terminal') {
        attachProbe(target.id as TerminalId);
      } else if (target.type === 'dial') {
        if (target.meter && (currentMission.requiredMeter === 'any' || currentMission.requiredMeter === target.meter)) {
          setActiveMeter(target.meter);
        }
        stepDial(1);
      } else if (target.type === 'switch' && target.station) {
        toggleSwitch(target.station);
      } else if (target.type === 'jumper' && target.station) {
        toggleJumper(target.station);
      } else if (target.type === 'station' && target.station) {
        selectStation(target.station);
      } else if (target.type === 'hold') {
        if (activeMeter === 'digital') toggleHold();
      } else if (target.type === 'zero_ohm') {
        soundEngine.playDialClick();
        setZeroOhmOffset(0);
        setUdl((u) => ({ ...u, showAnalogLoupe: true }));
      } else if (target.type === 'meter' && target.meter) {
        if (currentMission.requiredMeter === 'any' || currentMission.requiredMeter === target.meter) {
          soundEngine.playDialClick();
          setActiveMeter(target.meter);
        }
      }
    },
    [
      activeMeter,
      attachProbe,
      currentMission.requiredMeter,
      phase,
      selectStation,
      stepDial,
      toggleHold,
      toggleJumper,
      toggleSwitch,
    ]
  );

  const handle3DClickRef = useRef(handle3DClick);
  handle3DClickRef.current = handle3DClick;

  // Mount isolated Three.js Canvas once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const initialVisual: SceneVisualState = {
      phase,
      station,
      activeMeter,
      dialId,
      redProbe,
      blackProbe,
      circuit,
      measurement: displayedMeasurement,
      zeroOhmOffset,
      holdActive,
      showElectronFlow: udl.showElectronFlow,
      cameraPreset,
    };

    const controller = new LabSceneController(container, initialVisual, {
      onInteractiveClick: (t) => handle3DClickRef.current(t),
      onContextLostChange: (lost) => setContextLost(lost),
    });
    sceneRef.current = controller;

    return () => {
      controller.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push state updates cleanly to Three.js controller without remounting
  useEffect(() => {
    sceneRef.current?.updateState({
      phase,
      station,
      activeMeter,
      dialId,
      redProbe,
      blackProbe,
      circuit,
      measurement: displayedMeasurement,
      zeroOhmOffset,
      holdActive,
      showElectronFlow: udl.showElectronFlow,
      cameraPreset,
    });
  }, [
    phase,
    station,
    activeMeter,
    dialId,
    redProbe,
    blackProbe,
    circuit,
    displayedMeasurement,
    zeroOhmOffset,
    holdActive,
    udl.showElectronFlow,
    cameraPreset,
  ]);

  const startNewRun = useCallback(
    (selectedTier: ChallengeTier) => {
      const nextRun = generateRunData(selectedTier);
      setCircuit(nextRun.circuit);
      setMissions(nextRun.missions);
      setStation('resistor');
      setActiveMeter(nextRun.missions[0].requiredMeter === 'analog' ? 'analog' : 'analog');
      setDialId('OFF');
      setRedProbe('NONE');
      setBlackProbe('NONE');
      setActiveProbeTool('red');
      setZeroOhmOffset(selectedTier === 'guided' ? 0 : 0.45);
      setHoldActive(false);
      setHeldMeasurement(null);
      setCompletedStations({
        resistor: false,
        dcv: false,
        acv: false,
        current: false,
        diagnostic: false,
      });
      setScore(0);
      setStreak(0);
      setMaxStreak(0);
      setSafetyMistakes(0);
      setFeedbackBanner(null);
      setCameraPreset('station');
      setPhase('playing');
      soundEngine.playStationWhoosh();
    },
    []
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase === 'title') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startNewRun(tier);
        }
        return;
      }

      if (e.key === 'Escape') {
        if (udlOpen) {
          setUdlOpen(false);
        } else if (phase === 'playing') {
          setPhase('paused');
        } else if (phase === 'paused') {
          setPhase('playing');
        }
        return;
      }

      if (phase !== 'playing' || udlOpen) return;

      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((c) => !c);
      } else if (e.key === 'q' || e.key === 'Q') {
        stepDial(-1);
      } else if (e.key === 'e' || e.key === 'E') {
        stepDial(1);
      } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
        selectStation(STATION_ORDER[Number(e.key) - 1]);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, tier, udlOpen, startNewRun, stepDial, selectStation]);

  const handleSubmitAnswer = (optionIdx: number) => {
    if (liveMeasurement.status !== 'ok') return;

    if (optionIdx === currentMission.correctOptionIndex) {
      soundEngine.playSuccessChime();
      const tierMultiplier = tier === 'expert' ? 1.5 : tier === 'challenge' ? 1.2 : 1;
      const nextStreak = streak + 1;
      const points = Math.round((100 + streak * 25) * tierMultiplier);

      setScore((s) => s + points);
      setStreak(nextStreak);
      setMaxStreak((ms) => Math.max(ms, nextStreak));

      const updatedCompleted = { ...completedStations, [station]: true };
      setCompletedStations(updatedCompleted);
      setFeedbackBanner({
        ok: true,
        text: `Tepat! +${points} poin. ${currentMission.explanation}`,
      });

      const allDone = STATION_ORDER.every((sid) => updatedCompleted[sid]);
      if (allDone) {
        setTimeout(() => setPhase('victory'), 1100);
      } else {
        // Advance smoothly to next incomplete station after brief feedback
        const nextIdx = STATION_ORDER.findIndex((sid) => !updatedCompleted[sid]);
        if (nextIdx !== -1) {
          setTimeout(() => {
            selectStation(STATION_ORDER[nextIdx]);
          }, 1450);
        }
      }
    } else {
      soundEngine.playHazardBuzz();
      setStreak(0);
      setFeedbackBanner({
        ok: false,
        text: 'Belum sesuai dengan bacaan multimeter! Periksa kembali skala pengali atau angka LCD sebelum mengirim.',
      });
    }
  };

  const completedCount = STATION_ORDER.filter((s) => completedStations[s]).length;

  return (
    <main className="relative w-full h-full overflow-hidden bg-slate-950">
      {/* Isolated 3D WebGL Canvas Mount */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full"
        aria-label="Arena Laboratorium Multimeter 3D Interaktif"
      />

      {/* WebGL Context Lost Fallback */}
      {contextLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-6 text-center">
          <div className="max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-2">Konteks Grafis 3D Terjeda</h2>
            <p className="text-sm text-slate-300">
              Sedang memulihkan tampilan laboratorium 3D secara otomatis...
            </p>
          </div>
        </div>
      )}

      {/* Game Shell States */}
      {phase === 'title' && (
        <TitleScreen
          tier={tier}
          onSelectTier={setTier}
          onStart={() => startNewRun(tier)}
        />
      )}

      {phase === 'playing' && (
        <MissionOverlay
          tier={tier}
          station={station}
          activeMeter={activeMeter}
          dialId={dialId}
          redProbe={redProbe}
          blackProbe={blackProbe}
          activeProbeTool={activeProbeTool}
          circuit={circuit}
          measurement={displayedMeasurement}
          zeroOhmOffset={zeroOhmOffset}
          holdActive={holdActive}
          cameraPreset={cameraPreset}
          mission={currentMission}
          completedStations={completedStations}
          score={score}
          streak={streak}
          udl={udl}
          dockCollapsed={dockCollapsed}
          feedbackBanner={feedbackBanner}
          onToggleDock={() => setDockCollapsed((c) => !c)}
          onSelectStation={selectStation}
          onSelectMeter={(m) => {
            soundEngine.playDialClick();
            setActiveMeter(m);
            setHoldActive(false);
            setHeldMeasurement(null);
          }}
          onStepDial={stepDial}
          onSelectDial={(id) => {
            soundEngine.playDialClick();
            setDialId(id);
            setHoldActive(false);
            setHeldMeasurement(null);
          }}
          onSelectProbeTool={setActiveProbeTool}
          onAttachProbe={attachProbe}
          onClearProbes={() => {
            soundEngine.playSwitchToggle(false);
            setRedProbe('NONE');
            setBlackProbe('NONE');
            setActiveProbeTool('red');
          }}
          onToggleSwitch={toggleSwitch}
          onToggleJumper={toggleJumper}
          onChangeZeroOhm={setZeroOhmOffset}
          onToggleHold={toggleHold}
          onChangeCameraPreset={(preset) => {
            setCameraPreset(preset);
            sceneRef.current?.focusCamera(preset);
          }}
          onSubmitAnswer={handleSubmitAnswer}
          onOpenUDL={() => setUdlOpen(true)}
          onToggleMute={() => setUdl((u) => ({ ...u, muted: !u.muted }))}
          onToggleLoupe={() => setUdl((u) => ({ ...u, showAnalogLoupe: !u.showAnalogLoupe }))}
          onPause={() => setPhase('paused')}
        />
      )}

      <UDLGuideDrawer
        open={udlOpen}
        settings={udl}
        onUpdateSettings={(next) => setUdl((prev) => ({ ...prev, ...next }))}
        onClose={() => setUdlOpen(false)}
      />

      <ResultModal
        phase={phase}
        score={score}
        maxStreak={maxStreak}
        safetyMistakes={safetyMistakes}
        completedCount={completedCount}
        totalMissions={missions.length}
        onResume={() => setPhase('playing')}
        onRestartRun={() => startNewRun(tier)}
        onBackToTitle={() => {
          setPhase('title');
          setFeedbackBanner(null);
        }}
      />
    </main>
  );
}

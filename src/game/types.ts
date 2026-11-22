export type MeterType = 'analog' | 'digital';

export type ChallengeTier = 'guided' | 'challenge' | 'expert';

export type StationId = 'resistor' | 'dcv' | 'acv' | 'current' | 'diagnostic';

export type DialId =
  | 'OFF'
  | 'DCV_10'
  | 'DCV_50'
  | 'DCV_250'
  | 'ACV_50'
  | 'ACV_250'
  | 'ACV_750'
  | 'DCA_25m'
  | 'DCA_250m'
  | 'OHM_X1'
  | 'OHM_X10'
  | 'OHM_X1K';

export interface DialSpec {
  id: DialId;
  index: number;
  label: string;
  shortLabel: string;
  mode: 'OFF' | 'DCV' | 'ACV' | 'DCA' | 'OHM';
  analogMax: number; // Max scale for V/mA, or multiplier for OHM (1, 10, 1000)
  digitalMax: number; // Max display range on digital DMM
  unit: string;
}

export type TerminalId =
  | 'NONE'
  | 'R_A'
  | 'R_B'
  | 'DC_POS'
  | 'DC_NEG'
  | 'AC_L'
  | 'AC_N'
  | 'I_IN'
  | 'I_OUT'
  | 'DIAG_A'
  | 'DIAG_B';

export interface TerminalMeta {
  id: TerminalId;
  station: StationId;
  label: string;
  shortLabel: string;
  polarityHint: 'pos' | 'neg' | 'neutral';
}

export interface CircuitState {
  // Station 1: Resistor
  resistorOhms: number;
  resistorBands: [string, string, string, string];
  resistorSwitchOn: boolean; // Must be OFF when measuring resistance

  // Station 2: DC Voltage
  dcVoltage: number;

  // Station 3: AC Voltage
  acVoltage: number;
  acFreqHz: number;

  // Station 4: Series Current
  seriesVoltage: number;
  seriesResistance: number; // in Ohms -> I = V / R (in mA)
  seriesJumperClosed: boolean; // Must be OPEN when inserting ammeter in series
  seriesPowerOn: boolean; // Must be ON to have current flow

  // Station 5: Diagnostic Boss Track
  diagMode: 'mystery_resistor' | 'mystery_ac_dc' | 'mystery_current';
  diagKind: 'OHM' | 'DCV' | 'ACV' | 'DCA';
  diagValue: number; // Ohms, Volts, or mA
  diagSwitchOn: boolean;
  diagJumperClosed: boolean;
}

export interface MeasurementResult {
  connected: boolean;
  validConnection: boolean;
  analogNormalized: number; // 0..1 on scale; <0 means reverse deflection; >1 means pegged
  analogZeroAdjusted: boolean;
  digitalDisplay: string;
  digitalUnit: string;
  digitalPolarity: '' | '-' | 'AC';
  status: 'idle' | 'ok' | 'reverse' | 'overload' | 'wrong_mode' | 'hazard' | 'open_circuit';
  message: string;
  measuredValue: number | null;
  safetyPenalty: boolean;
}

export interface MissionQuestion {
  id: string;
  station: StationId;
  title: string;
  briefing: string;
  requiredMeter: MeterType | 'any';
  targetKind: 'OHM' | 'DCV' | 'ACV' | 'DCA';
  trueValue: number;
  unit: string;
  options: number[]; // Multiple-choice choices (for UDL / mobile / IFP speed & clarity)
  correctOptionIndex: number;
  guidedSteps: string[];
  explanation: string;
}

export interface UDLSettings {
  largeControls: boolean;
  showElectronFlow: boolean;
  showAnalogLoupe: boolean;
  showFormulaHelper: boolean;
  dyslexiaFriendly: boolean;
  muted: boolean;
}

export type GamePhase = 'title' | 'playing' | 'paused' | 'victory';

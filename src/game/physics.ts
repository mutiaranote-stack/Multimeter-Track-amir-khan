import {
  CircuitState,
  DialId,
  DialSpec,
  MeasurementResult,
  StationId,
  TerminalId,
  TerminalMeta,
} from './types';

export const DIAL_SPECS: DialSpec[] = [
  { id: 'OFF', index: 0, label: 'OFF (Mati)', shortLabel: 'OFF', mode: 'OFF', analogMax: 0, digitalMax: 0, unit: '' },
  { id: 'DCV_10', index: 1, label: 'DCV 10V (20V)', shortLabel: 'DC 10V', mode: 'DCV', analogMax: 10, digitalMax: 20, unit: 'V' },
  { id: 'DCV_50', index: 2, label: 'DCV 50V (200V)', shortLabel: 'DC 50V', mode: 'DCV', analogMax: 50, digitalMax: 200, unit: 'V' },
  { id: 'DCV_250', index: 3, label: 'DCV 250V (600V)', shortLabel: 'DC 250V', mode: 'DCV', analogMax: 250, digitalMax: 600, unit: 'V' },
  { id: 'ACV_50', index: 4, label: 'ACV 50V (200V)', shortLabel: 'AC 50V', mode: 'ACV', analogMax: 50, digitalMax: 200, unit: 'V~' },
  { id: 'ACV_250', index: 5, label: 'ACV 250V (250V)', shortLabel: 'AC 250V', mode: 'ACV', analogMax: 250, digitalMax: 250, unit: 'V~' },
  { id: 'ACV_750', index: 6, label: 'ACV 750V', shortLabel: 'AC 750V', mode: 'ACV', analogMax: 750, digitalMax: 750, unit: 'V~' },
  { id: 'DCA_25m', index: 7, label: 'DCmA 25mA (200mA)', shortLabel: '25 mA', mode: 'DCA', analogMax: 25, digitalMax: 200, unit: 'mA' },
  { id: 'DCA_250m', index: 8, label: 'DCmA 250mA (10A)', shortLabel: '250 mA', mode: 'DCA', analogMax: 250, digitalMax: 10000, unit: 'mA' },
  { id: 'OHM_X1', index: 9, label: 'Ω ×1 (200Ω)', shortLabel: 'Ω ×1', mode: 'OHM', analogMax: 1, digitalMax: 200, unit: 'Ω' },
  { id: 'OHM_X10', index: 10, label: 'Ω ×10 (2kΩ)', shortLabel: 'Ω ×10', mode: 'OHM', analogMax: 10, digitalMax: 2000, unit: 'Ω' },
  { id: 'OHM_X1K', index: 11, label: 'Ω ×1k (200kΩ)', shortLabel: 'Ω ×1k', mode: 'OHM', analogMax: 1000, digitalMax: 200000, unit: 'Ω' },
];

export const DIAL_MAP: Record<DialId, DialSpec> = DIAL_SPECS.reduce((acc, spec) => {
  acc[spec.id] = spec;
  return acc;
}, {} as Record<DialId, DialSpec>);

export const TERMINAL_META: Record<Exclude<TerminalId, 'NONE'>, TerminalMeta> = {
  R_A: { id: 'R_A', station: 'resistor', label: 'Node R-A (Kiri)', shortLabel: 'R-A', polarityHint: 'neutral' },
  R_B: { id: 'R_B', station: 'resistor', label: 'Node R-B (Kanan)', shortLabel: 'R-B', polarityHint: 'neutral' },
  DC_POS: { id: 'DC_POS', station: 'dcv', label: 'Terminal DC (+)', shortLabel: 'DC (+)', polarityHint: 'pos' },
  DC_NEG: { id: 'DC_NEG', station: 'dcv', label: 'Terminal DC (−)', shortLabel: 'DC (−)', polarityHint: 'neg' },
  AC_L: { id: 'AC_L', station: 'acv', label: 'Terminal AC L (~)', shortLabel: 'AC (L)', polarityHint: 'neutral' },
  AC_N: { id: 'AC_N', station: 'acv', label: 'Terminal AC N (~)', shortLabel: 'AC (N)', polarityHint: 'neutral' },
  I_IN: { id: 'I_IN', station: 'current', label: 'Jalur Masuk (+)', shortLabel: 'I-Masuk (+)', polarityHint: 'pos' },
  I_OUT: { id: 'I_OUT', station: 'current', label: 'Jalur Beban (−)', shortLabel: 'I-Keluar (−)', polarityHint: 'neg' },
  DIAG_A: { id: 'DIAG_A', station: 'diagnostic', label: 'Node Uji A (+)', shortLabel: 'Uji A', polarityHint: 'pos' },
  DIAG_B: { id: 'DIAG_B', station: 'diagnostic', label: 'Node Uji B (−)', shortLabel: 'Uji B', polarityHint: 'neg' },
};

export function getStationTerminals(station: StationId): TerminalMeta[] {
  return Object.values(TERMINAL_META).filter((t) => t.station === station);
}

/**
 * Analog Ohm scale center resistance is typically ~20 on standard YX-360 / Sanwa dials.
 * Right side (needle = 1.0) is 0 Ohm; Left side (needle = 0.0) is Infinity.
 * Formula: normalized = R_center / (R_center + R_raw), where R_raw = R_actual / multiplier
 */
export const ANALOG_OHM_CENTER = 20;

export function ohmToAnalogNormalized(ohms: number, multiplier: number, zeroOhmOffset: number): number {
  const scaled = ohms / multiplier;
  const baseDeflection = ANALOG_OHM_CENTER / (ANALOG_OHM_CENTER + scaled);
  // Zero ohm knob adjusts needle +/- 0.08 near full scale
  return Math.max(0, Math.min(1.06, baseDeflection + zeroOhmOffset * 0.08));
}

export function evaluateMeasurement(
  station: StationId,
  dialId: DialId,
  redProbe: TerminalId,
  blackProbe: TerminalId,
  circuit: CircuitState,
  zeroOhmOffset: number,
  meterType: 'analog' | 'digital'
): MeasurementResult {
  const dial = DIAL_MAP[dialId];

  // Not connected yet
  if (redProbe === 'NONE' || blackProbe === 'NONE' || redProbe === blackProbe) {
    return {
      connected: false,
      validConnection: false,
      analogNormalized: dial.mode === 'OHM' ? 0 : 0,
      analogZeroAdjusted: Math.abs(zeroOhmOffset) < 0.15,
      digitalDisplay: dial.mode === 'OFF' ? '' : dial.mode === 'OHM' ? 'OL' : '0.00',
      digitalUnit: dial.unit,
      digitalPolarity: '',
      status: 'idle',
      message: 'Pasang probe merah (+) dan hitam (−) pada dua titik uji yang berbeda di stasiun aktif.',
      measuredValue: null,
      safetyPenalty: false,
    };
  }

  if (dial.mode === 'OFF') {
    return {
      connected: true,
      validConnection: false,
      analogNormalized: 0,
      analogZeroAdjusted: false,
      digitalDisplay: '',
      digitalUnit: '',
      digitalPolarity: '',
      status: 'idle',
      message: 'Selektor masih di posisi OFF. Putar selektor ke besaran yang sesuai.',
      measuredValue: null,
      safetyPenalty: false,
    };
  }

  // Ensure probes are on the active station
  const redMeta = TERMINAL_META[redProbe];
  const blackMeta = TERMINAL_META[blackProbe];
  if (redMeta.station !== station || blackMeta.station !== station) {
    return {
      connected: true,
      validConnection: false,
      analogNormalized: 0,
      analogZeroAdjusted: false,
      digitalDisplay: '0.00',
      digitalUnit: dial.unit,
      digitalPolarity: '',
      status: 'open_circuit',
      message: 'Kedua probe harus ditempatkan pada terminal di stasiun lintasan yang sama.',
      measuredValue: null,
      safetyPenalty: false,
    };
  }

  // Evaluate per station physics
  if (station === 'resistor') {
    if (circuit.resistorSwitchOn) {
      return {
        connected: true,
        validConnection: false,
        analogNormalized: 1.08,
        analogZeroAdjusted: false,
        digitalDisplay: 'ERR!',
        digitalUnit: 'Ω',
        digitalPolarity: '',
        status: 'hazard',
        message: 'Bahaya! Sakelar daya masih ON. Matikan sakelar terlebih dahulu sebelum mengukur tahanan (Ω)!',
        measuredValue: null,
        safetyPenalty: true,
      };
    }
    if (dial.mode !== 'OHM') {
      return {
        connected: true,
        validConnection: false,
        analogNormalized: 0,
        analogZeroAdjusted: false,
        digitalDisplay: '0.00',
        digitalUnit: dial.unit,
        digitalPolarity: '',
        status: 'wrong_mode',
        message: 'Mode salah! Untuk mengukur resistor tanpa catu daya, gunakan mode Tahanan (Ω).',
        measuredValue: null,
        safetyPenalty: false,
      };
    }

    const r = circuit.resistorOhms;
    const analogNorm = ohmToAnalogNormalized(r, dial.analogMax, zeroOhmOffset);
    const zeroOk = Math.abs(zeroOhmOffset) < 0.18;

    if (meterType === 'digital' && r > dial.digitalMax) {
      return {
        connected: true,
        validConnection: true,
        analogNormalized: analogNorm,
        analogZeroAdjusted: zeroOk,
        digitalDisplay: 'OL',
        digitalUnit: dial.digitalMax >= 1000 ? 'kΩ' : 'Ω',
        digitalPolarity: '',
        status: 'overload',
        message: `Overload (OL): Nilai resistor (${r} Ω) melebihi batas skala digital (${dial.digitalMax} Ω). Naikkan skala Ω!`,
        measuredValue: null,
        safetyPenalty: false,
      };
    }

    const formatDigitalOhm = (val: number, maxRange: number) => {
      if (maxRange >= 1000) {
        return { text: (val / 1000).toFixed(val >= 10000 ? 1 : 2), unit: 'kΩ' };
      }
      return { text: val.toFixed(val < 100 ? 1 : 0), unit: 'Ω' };
    };
    const fmt = formatDigitalOhm(r, dial.digitalMax);

    // Check if analog scale is poorly readable (too far left < 0.06 or too far right > 0.96)
    const analogIdeal = analogNorm >= 0.08 && analogNorm <= 0.94;
    if (meterType === 'analog' && !zeroOk) {
      return {
        connected: true,
        validConnection: true,
        analogNormalized: analogNorm,
        analogZeroAdjusted: false,
        digitalDisplay: fmt.text,
        digitalUnit: fmt.unit,
        digitalPolarity: '',
        status: 'ok',
        message: 'Jarum bergerak, namun atur kenop Kalibrasi 0 Ω mendekati 0 agar pembacaan analog akurat.',
        measuredValue: r,
        safetyPenalty: false,
      };
    }

    return {
      connected: true,
      validConnection: true,
      analogNormalized: analogNorm,
      analogZeroAdjusted: zeroOk,
      digitalDisplay: fmt.text,
      digitalUnit: fmt.unit,
      digitalPolarity: '',
      status: 'ok',
      message:
        meterType === 'analog' && !analogIdeal
          ? `Terbaca, namun posisi jarum kurang ideal. Coba skala pengali lain (×1 / ×10 / ×1k) agar jarum di area tengah.`
          : `Pengukuran tahanan aktif. Baca skala Ω ×${dial.analogMax} (Analog) atau layar LCD (Digital).`,
      measuredValue: r,
      safetyPenalty: false,
    };
  }

  if (station === 'dcv') {
    const v = circuit.dcVoltage;
    const reversed = redProbe === 'DC_NEG' && blackProbe === 'DC_POS';

    if (dial.mode === 'OHM') {
      return {
        connected: true,
        validConnection: false,
        analogNormalized: 1.09,
        analogZeroAdjusted: false,
        digitalDisplay: 'ERR!',
        digitalUnit: 'Ω',
        digitalPolarity: '',
        status: 'hazard',
        message: 'Bahaya! Jangan ukur sumber tegangan aktif memakai mode Ω! Alat ukur bisa rusak.',
        measuredValue: null,
        safetyPenalty: true,
      };
    }
    if (dial.mode === 'DCA') {
      return {
        connected: true,
        validConnection: false,
        analogNormalized: 1.1,
        analogZeroAdjusted: false,
        digitalDisplay: 'FUSE!',
        digitalUnit: 'mA',
        digitalPolarity: '',
        status: 'hazard',
        message: 'Bahaya Hubung Singkat! Jangan pasang Amperemeter (mA) paralel langsung ke sumber tegangan!',
        measuredValue: null,
        safetyPenalty: true,
      };
    }
    if (dial.mode === 'ACV') {
      return {
        connected: true,
        validConnection: false,
        analogNormalized: Math.min(1, (v / dial.analogMax) * 0.45),
        analogZeroAdjusted: true,
        digitalDisplay: '0.00',
        digitalUnit: 'V~',
        digitalPolarity: 'AC',
        status: 'wrong_mode',
        message: 'Mode salah! Ini sumber tegangan DC (searah). Pindahkan selektor ke DCV (V⎓).',
        measuredValue: null,
        safetyPenalty: false,
      };
    }

    // Mode DCV
    const maxScale = meterType === 'analog' ? dial.analogMax : dial.digitalMax;
    if (v > maxScale) {
      return {
        connected: true,
        validConnection: true,
        analogNormalized: reversed ? -0.1 : 1.09,
        analogZeroAdjusted: true,
        digitalDisplay: 'OL',
        digitalUnit: 'V',
        digitalPolarity: reversed ? '-' : '',
        status: 'overload',
        message: `Batas ukur terlampaui! Tegangan ${v}V melebihi skala ${maxScale}V. Naikkan batas ukur DCV!`,
        measuredValue: null,
        safetyPenalty: true,
      };
    }

    if (reversed) {
      return {
        connected: true,
        validConnection: true,
        analogNormalized: -0.09,
        analogZeroAdjusted: true,
        digitalDisplay: v.toFixed(2),
        digitalUnit: 'V',
        digitalPolarity: '-',
        status: 'reverse',
        message:
          meterType === 'analog'
            ? 'Polaritas terbalik! Jarum analog menyimpang ke kiri. Tukar probe Merah ke (+) dan Hitam ke (−).'
            : `Polaritas terbalik: LCD menampilkan tanda minus (−${v.toFixed(2)} V). Tukar probe untuk polaritas benar.`,
        measuredValue: v,
        safetyPenalty: false,
      };
    }

    return {
      connected: true,
      validConnection: true,
      analogNormalized: v / dial.analogMax,
      analogZeroAdjusted: true,
      digitalDisplay: v.toFixed(2),
      digitalUnit: 'V',
      digitalPolarity: '',
      status: 'ok',
      message: `Tegangan DC terbaca normal pada skala ${maxScale}V.`,
      measuredValue: v,
      safetyPenalty: false,
    };
  }

  if (station === 'acv') {
    const v = circuit.acVoltage;
    if (dial.mode === 'OHM' || dial.mode === 'DCA') {
      return {
        connected: true,
        validConnection: false,
        analogNormalized: 1.1,
        analogZeroAdjusted: false,
        digitalDisplay: 'ERR!',
        digitalUnit: '',
        digitalPolarity: '',
        status: 'hazard',
        message: 'Bahaya! Jangan mengukur sumber tegangan AC memakai mode Ω atau mA!',
        measuredValue: null,
        safetyPenalty: true,
      };
    }
    if (dial.mode === 'DCV') {
      return {
        connected: true,
        validConnection: false,
        analogNormalized: 0.015,
        analogZeroAdjusted: true,
        digitalDisplay: '0.0',
        digitalUnit: 'V',
        digitalPolarity: '',
        status: 'wrong_mode',
        message: 'Mode salah! Tegangan AC bolak-balik terbaca nol di mode DCV. Pilih mode ACV (V~)!',
        measuredValue: null,
        safetyPenalty: false,
      };
    }

    const maxScale = meterType === 'analog' ? dial.analogMax : dial.digitalMax;
    if (v > maxScale) {
      return {
        connected: true,
        validConnection: true,
        analogNormalized: 1.09,
        analogZeroAdjusted: true,
        digitalDisplay: 'OL',
        digitalUnit: 'V~',
        digitalPolarity: 'AC',
        status: 'overload',
        message: `Over-range! Tegangan AC ${v}V melebihi skala ${maxScale}V~. Segera naikkan ke skala ACV lebih tinggi!`,
        measuredValue: null,
        safetyPenalty: true,
      };
    }

    return {
      connected: true,
      validConnection: true,
      analogNormalized: v / dial.analogMax,
      analogZeroAdjusted: true,
      digitalDisplay: v.toFixed(1),
      digitalUnit: 'V~',
      digitalPolarity: 'AC',
      status: 'ok',
      message: `Tegangan AC RMS terbaca stabil pada skala ${maxScale}V~ (polaritas bolak-balik).`,
      measuredValue: v,
      safetyPenalty: false,
    };
  }

  if (station === 'current') {
    const currentMa = (circuit.seriesVoltage / circuit.seriesResistance) * 1000;
    const reversed = redProbe === 'I_OUT' && blackProbe === 'I_IN';

    if (circuit.seriesJumperClosed) {
      return {
        connected: true,
        validConnection: false,
        analogNormalized: 0.02,
        analogZeroAdjusted: true,
        digitalDisplay: '0.0',
        digitalUnit: dial.unit,
        digitalPolarity: '',
        status: 'open_circuit',
        message:
          'Jembatan Jumper masih tertutup! Untuk mengukur arus secara SERI, buka Jumper terlebih dahulu agar arus melewati multimeter.',
        measuredValue: null,
        safetyPenalty: false,
      };
    }

    if (!circuit.seriesPowerOn) {
      return {
        connected: true,
        validConnection: true,
        analogNormalized: 0,
        analogZeroAdjusted: true,
        digitalDisplay: '0.0',
        digitalUnit: dial.unit,
        digitalPolarity: '',
        status: 'open_circuit',
        message: 'Sakelar rangkaian seri masih OFF. Nyalakan sakelar daya agar arus mengalir melalui meter.',
        measuredValue: 0,
        safetyPenalty: false,
      };
    }

    if (dial.mode !== 'DCA') {
      return {
        connected: true,
        validConnection: false,
        analogNormalized: dial.mode === 'OHM' ? 1.09 : 0.04,
        analogZeroAdjusted: false,
        digitalDisplay: dial.mode === 'OHM' ? 'ERR!' : '0.00',
        digitalUnit: dial.unit,
        digitalPolarity: '',
        status: dial.mode === 'OHM' ? 'hazard' : 'wrong_mode',
        message:
          dial.mode === 'OHM'
            ? 'Bahaya! Jangan gunakan mode Ω pada rangkaian seri bertegangan!'
            : 'Mode salah! Untuk mengukur arus listrik DC seri, pilih mode Arus (DCmA).',
        measuredValue: null,
        safetyPenalty: dial.mode === 'OHM',
      };
    }

    const maxMa = meterType === 'analog' ? dial.analogMax : dial.digitalMax;
    if (currentMa > maxMa) {
      return {
        connected: true,
        validConnection: true,
        analogNormalized: reversed ? -0.1 : 1.09,
        analogZeroAdjusted: true,
        digitalDisplay: 'OL',
        digitalUnit: 'mA',
        digitalPolarity: reversed ? '-' : '',
        status: 'overload',
        message: `Arus (${currentMa.toFixed(1)} mA) melebihi batas ${maxMa} mA! Naikkan ke skala 250 mA / 10A.`,
        measuredValue: null,
        safetyPenalty: true,
      };
    }

    if (reversed) {
      return {
        connected: true,
        validConnection: true,
        analogNormalized: -0.09,
        analogZeroAdjusted: true,
        digitalDisplay: currentMa.toFixed(1),
        digitalUnit: 'mA',
        digitalPolarity: '-',
        status: 'reverse',
        message: 'Polaritas seri terbalik! Pasang probe Merah ke I-Masuk (+) dan Hitam ke I-Keluar (−).',
        measuredValue: currentMa,
        safetyPenalty: false,
      };
    }

    return {
      connected: true,
      validConnection: true,
      analogNormalized: currentMa / dial.analogMax,
      analogZeroAdjusted: true,
      digitalDisplay: currentMa.toFixed(1),
      digitalUnit: 'mA',
      digitalPolarity: '',
      status: 'ok',
      message: `Arus seri mengalir melalui multimeter dan terbaca ${currentMa.toFixed(1)} mA!`,
      measuredValue: currentMa,
      safetyPenalty: false,
    };
  }

  // Station 5: Diagnostic Boss Track
  const kind = circuit.diagKind;
  const val = circuit.diagValue;
  const reversed = redProbe === 'DIAG_B' && blackProbe === 'DIAG_A';

  if (kind === 'OHM') {
    if (circuit.diagSwitchOn) {
      return {
        connected: true,
        validConnection: false,
        analogNormalized: 1.09,
        analogZeroAdjusted: false,
        digitalDisplay: 'ERR!',
        digitalUnit: 'Ω',
        digitalPolarity: '',
        status: 'hazard',
        message: 'Bahaya pada jalur diagnostik! Matikan sakelar daya terlebih dahulu jika ingin mengukur komponen pasif (Ω).',
        measuredValue: null,
        safetyPenalty: true,
      };
    }
    if (dial.mode !== 'OHM') {
      return {
        connected: true,
        validConnection: false,
        analogNormalized: 0,
        analogZeroAdjusted: false,
        digitalDisplay: '0.00',
        digitalUnit: dial.unit,
        digitalPolarity: '',
        status: 'wrong_mode',
        message: 'Tidak ada tegangan terdeteksi (0 V). Ini komponen pasif — gunakan mode Ω setelah memastikan daya OFF.',
        measuredValue: null,
        safetyPenalty: false,
      };
    }
    const norm = ohmToAnalogNormalized(val, dial.analogMax, zeroOhmOffset);
    const zeroOk = Math.abs(zeroOhmOffset) < 0.18;
    if (meterType === 'digital' && val > dial.digitalMax) {
      return {
        connected: true,
        validConnection: true,
        analogNormalized: norm,
        analogZeroAdjusted: zeroOk,
        digitalDisplay: 'OL',
        digitalUnit: 'Ω',
        digitalPolarity: '',
        status: 'overload',
        message: 'OL! Naikkan batas ukur Ω.',
        measuredValue: null,
        safetyPenalty: false,
      };
    }
    return {
      connected: true,
      validConnection: true,
      analogNormalized: norm,
      analogZeroAdjusted: zeroOk,
      digitalDisplay: dial.digitalMax >= 1000 ? (val / 1000).toFixed(2) : val.toFixed(0),
      digitalUnit: dial.digitalMax >= 1000 ? 'kΩ' : 'Ω',
      digitalPolarity: '',
      status: 'ok',
      message: 'Komponen misteri terukur pada mode Tahanan (Ω).',
      measuredValue: val,
      safetyPenalty: false,
    };
  }

  if (kind === 'DCV') {
    if (dial.mode === 'OHM' || dial.mode === 'DCA') {
      return {
        connected: true,
        validConnection: false,
        analogNormalized: 1.1,
        analogZeroAdjusted: false,
        digitalDisplay: 'ERR!',
        digitalUnit: '',
        digitalPolarity: '',
        status: 'hazard',
        message: 'Bahaya! Jalur diagnostik aktif bertegangan. Jangan gunakan mode Ω atau mA paralel!',
        measuredValue: null,
        safetyPenalty: true,
      };
    }
    if (dial.mode !== 'DCV') {
      return {
        connected: true,
        validConnection: false,
        analogNormalized: 0.02,
        analogZeroAdjusted: true,
        digitalDisplay: '0.0',
        digitalUnit: dial.unit,
        digitalPolarity: 'AC',
        status: 'wrong_mode',
        message: 'Terdeteksi sumber DC, bukan AC! Pindahkan ke DCV (mulai dari batas ukur tertinggi).',
        measuredValue: null,
        safetyPenalty: false,
      };
    }
    const maxScale = meterType === 'analog' ? dial.analogMax : dial.digitalMax;
    if (val > maxScale) {
      return {
        connected: true,
        validConnection: true,
        analogNormalized: 1.09,
        analogZeroAdjusted: true,
        digitalDisplay: 'OL',
        digitalUnit: 'V',
        digitalPolarity: '',
        status: 'overload',
        message: `Overload! Naikkan batas ukur DCV di atas ${val}V.`,
        measuredValue: null,
        safetyPenalty: true,
      };
    }
    return {
      connected: true,
      validConnection: true,
      analogNormalized: reversed ? -0.09 : val / dial.analogMax,
      analogZeroAdjusted: true,
      digitalDisplay: val.toFixed(2),
      digitalUnit: 'V',
      digitalPolarity: reversed ? '-' : '',
      status: reversed ? 'reverse' : 'ok',
      message: reversed
        ? 'Polaritas terbalik (−). Tukar probe ke posisi yang benar.'
        : `Sumber misteri teridentifikasi sebagai DC ${val}V!`,
      measuredValue: val,
      safetyPenalty: false,
    };
  }

  if (kind === 'ACV') {
    if (dial.mode === 'OHM' || dial.mode === 'DCA') {
      return {
        connected: true,
        validConnection: false,
        analogNormalized: 1.1,
        analogZeroAdjusted: false,
        digitalDisplay: 'ERR!',
        digitalUnit: '',
        digitalPolarity: '',
        status: 'hazard',
        message: 'Bahaya! Jalur diagnostik bertegangan tinggi. Gunakan mode tegangan (ACV/DCV)!',
        measuredValue: null,
        safetyPenalty: true,
      };
    }
    if (dial.mode !== 'ACV') {
      return {
        connected: true,
        validConnection: false,
        analogNormalized: 0.01,
        analogZeroAdjusted: true,
        digitalDisplay: '0.0',
        digitalUnit: dial.unit,
        digitalPolarity: '',
        status: 'wrong_mode',
        message: 'Jarum/LCD menunjukkan 0 pada DCV! Coba ukur ulang menggunakan mode ACV (V~).',
        measuredValue: null,
        safetyPenalty: false,
      };
    }
    const maxScale = meterType === 'analog' ? dial.analogMax : dial.digitalMax;
    if (val > maxScale) {
      return {
        connected: true,
        validConnection: true,
        analogNormalized: 1.09,
        analogZeroAdjusted: true,
        digitalDisplay: 'OL',
        digitalUnit: 'V~',
        digitalPolarity: 'AC',
        status: 'overload',
        message: `Overload! Naikkan skala ACV ke 250V~ atau 750V~.`,
        measuredValue: null,
        safetyPenalty: true,
      };
    }
    return {
      connected: true,
      validConnection: true,
      analogNormalized: val / dial.analogMax,
      analogZeroAdjusted: true,
      digitalDisplay: val.toFixed(1),
      digitalUnit: 'V~',
      digitalPolarity: 'AC',
      status: 'ok',
      message: `Sumber misteri teridentifikasi sebagai AC ${val}V~ RMS!`,
      measuredValue: val,
      safetyPenalty: false,
    };
  }

  // Diagnostic DCA
  if (circuit.diagJumperClosed) {
    return {
      connected: true,
      validConnection: false,
      analogNormalized: 0,
      analogZeroAdjusted: true,
      digitalDisplay: '0.0',
      digitalUnit: dial.unit,
      digitalPolarity: '',
      status: 'open_circuit',
      message: 'Buka Jumper Seri pada Stasiun Diagnostik agar arus mengalir masuk ke Amperemeter!',
      measuredValue: null,
      safetyPenalty: false,
    };
  }
  if (!circuit.diagSwitchOn) {
    return {
      connected: true,
      validConnection: true,
      analogNormalized: 0,
      analogZeroAdjusted: true,
      digitalDisplay: '0.0',
      digitalUnit: dial.unit,
      digitalPolarity: '',
      status: 'open_circuit',
      message: 'Nyalakan Sakelar Daya pada jalur diagnostik agar arus mengalir.',
      measuredValue: 0,
      safetyPenalty: false,
    };
  }
  if (dial.mode !== 'DCA') {
    return {
      connected: true,
      validConnection: false,
      analogNormalized: 0,
      analogZeroAdjusted: true,
      digitalDisplay: '0.0',
      digitalUnit: dial.unit,
      digitalPolarity: '',
      status: 'wrong_mode',
      message: 'Rangkaian seri siap dialiri arus. Pindahkan selektor ke mode DCmA!',
      measuredValue: null,
      safetyPenalty: false,
    };
  }
  const maxMa = meterType === 'analog' ? dial.analogMax : dial.digitalMax;
  if (val > maxMa) {
    return {
      connected: true,
      validConnection: true,
      analogNormalized: 1.09,
      analogZeroAdjusted: true,
      digitalDisplay: 'OL',
      digitalUnit: 'mA',
      digitalPolarity: '',
      status: 'overload',
      message: 'Overload arus! Naikkan batas ukur ke 250 mA.',
      measuredValue: null,
      safetyPenalty: true,
    };
  }
  return {
    connected: true,
    validConnection: true,
    analogNormalized: reversed ? -0.09 : val / dial.analogMax,
    analogZeroAdjusted: true,
    digitalDisplay: val.toFixed(1),
    digitalUnit: 'mA',
    digitalPolarity: reversed ? '-' : '',
    status: reversed ? 'reverse' : 'ok',
    message: reversed ? 'Polaritas terbalik (−).' : `Arus seri diagnostik terbaca ${val.toFixed(1)} mA.`,
    measuredValue: val,
    safetyPenalty: false,
  };
}

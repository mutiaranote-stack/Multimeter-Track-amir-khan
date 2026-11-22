import { ChallengeTier, CircuitState, MissionQuestion, StationId } from './types';

interface ResistorPreset {
  ohms: number;
  bands: [string, string, string, string];
  distractors: number[];
}

const RESISTOR_PRESETS: ResistorPreset[] = [
  { ohms: 220, bands: ['#ef4444', '#ef4444', '#92400e', '#eab308'], distractors: [120, 470, 2200] },
  { ohms: 330, bands: ['#f97316', '#f97316', '#92400e', '#eab308'], distractors: [33, 680, 3300] },
  { ohms: 470, bands: ['#eab308', '#a855f7', '#92400e', '#eab308'], distractors: [47, 1000, 4700] },
  { ohms: 1000, bands: ['#92400e', '#111827', '#ef4444', '#eab308'], distractors: [100, 470, 10000] },
  { ohms: 2200, bands: ['#ef4444', '#ef4444', '#ef4444', '#eab308'], distractors: [220, 4700, 22000] },
  { ohms: 4700, bands: ['#eab308', '#a855f7', '#ef4444', '#eab308'], distractors: [470, 1000, 47000] },
  { ohms: 10000, bands: ['#92400e', '#111827', '#f97316', '#eab308'], distractors: [1000, 4700, 100000] },
];

const DC_PRESETS = [
  { v: 1.5, distractors: [3.0, 5.0, 9.0] },
  { v: 3.7, distractors: [1.5, 5.0, 12.0] },
  { v: 5.0, distractors: [3.3, 9.0, 12.0] },
  { v: 9.0, distractors: [5.0, 12.0, 24.0] },
  { v: 12.0, distractors: [5.0, 9.0, 24.0] },
  { v: 24.0, distractors: [12.0, 36.0, 48.0] },
];

const AC_PRESETS = [
  { v: 12, distractors: [6, 24, 220] },
  { v: 24, distractors: [12, 48, 110] },
  { v: 110, distractors: [24, 220, 380] },
  { v: 220, distractors: [110, 127, 380] },
];

const CURRENT_PRESETS = [
  { v: 9, r: 100, distractors: [45, 90, 180] }, // 90 mA
  { v: 12, r: 100, distractors: [60, 120, 240] }, // 120 mA
  { v: 5, r: 250, distractors: [10, 20, 50] }, // 20 mA
  { v: 12, r: 150, distractors: [40, 80, 160] }, // 80 mA
  { v: 9, r: 500, distractors: [9, 18, 45] }, // 18 mA
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildShuffledOptions(correct: number, distractors: number[]): { options: number[]; correctIndex: number } {
  const all = [correct, ...distractors];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return {
    options: all,
    correctIndex: all.indexOf(correct),
  };
}

export function generateRunData(tier: ChallengeTier): {
  circuit: CircuitState;
  missions: MissionQuestion[];
} {
  const res = pickRandom(RESISTOR_PRESETS);
  const dc = pickRandom(DC_PRESETS);
  const ac = pickRandom(AC_PRESETS);
  const cur = pickRandom(CURRENT_PRESETS);
  const curMa = Math.round(((cur.v / cur.r) * 1000) * 10) / 10;

  // Diagnostic boss picks either mystery AC/DC or mystery high-value resistor or current
  const diagChoice = pickRandom(['mystery_resistor', 'mystery_ac_dc', 'mystery_current'] as const);
  let diagKind: 'OHM' | 'DCV' | 'ACV' | 'DCA' = 'ACV';
  let diagValue = 110;
  let diagDistractors = [12, 24, 220];
  let diagUnit = 'V~';
  let diagBriefing = '';
  let diagExplain = '';

  if (diagChoice === 'mystery_resistor') {
    const bossRes = pickRandom(RESISTOR_PRESETS.filter((p) => p.ohms >= 1000));
    diagKind = 'OHM';
    diagValue = bossRes.ohms;
    diagDistractors = bossRes.distractors;
    diagUnit = 'Ω';
    diagBriefing =
      'Jalur Uji 5 memuat komponen resistor tak berlabel dengan sakelar daya menyala. Matikan sakelar dahulu, lalu ukur nilai tahanannya!';
    diagExplain = `Untuk mengukur tahanan (${bossRes.ohms} Ω), sakelar daya harus OFF agar arus baterai multimeter tidak berbenturan dengan daya rangkaian.`;
  } else if (diagChoice === 'mystery_ac_dc') {
    const isAc = Math.random() > 0.45;
    if (isAc) {
      const p = pickRandom(AC_PRESETS);
      diagKind = 'ACV';
      diagValue = p.v;
      diagDistractors = p.distractors;
      diagUnit = 'V~';
      diagBriefing =
        'Terminal Uji 5 mengeluarkan tegangan misteri (AC atau DC belum diketahui). Uji dengan batas ukur tertinggi dahulu agar aman, lalu tentukan nilai tegangannya!';
      diagExplain = `Sumber terdeteksi bernilai ${p.v} V~ pada mode ACV. Mode DCV akan menunjukkan nol pada tegangan bolak-balik.`;
    } else {
      const p = pickRandom(DC_PRESETS.filter((d) => d.v >= 5));
      diagKind = 'DCV';
      diagValue = p.v;
      diagDistractors = p.distractors;
      diagUnit = 'V';
      diagBriefing =
        'Terminal Uji 5 mengeluarkan tegangan misteri (AC atau DC belum diketahui). Pastikan polaritas dan pilih mode tepat untuk mengetahui nilai tegangannya!';
      diagExplain = `Sumber terdeteksi bernilai ${p.v} V searah pada mode DCV dengan polaritas stabil.`;
    }
  } else {
    const p = pickRandom(CURRENT_PRESETS);
    diagKind = 'DCA';
    diagValue = Math.round(((p.v / p.r) * 1000) * 10) / 10;
    diagDistractors = p.distractors.filter((d) => d !== diagValue);
    diagUnit = 'mA';
    diagBriefing =
      'Jalur Uji 5 mengalami aliran arus menuju beban. Buka jembatan jumper untuk menyisipkan multimeter secara SERI, nyalakan daya, lalu ukur besar arusnya!';
    diagExplain = `Arus listrik (${diagValue} mA) hanya bisa diukur dengan memutus jalur dan menyisipkan Amperemeter secara seri.`;
  }

  const circuit: CircuitState = {
    resistorOhms: res.ohms,
    resistorBands: res.bands,
    resistorSwitchOn: tier !== 'guided', // In challenge/expert, student must turn OFF switch before measuring Ω!
    dcVoltage: dc.v,
    acVoltage: ac.v,
    acFreqHz: 50,
    seriesVoltage: cur.v,
    seriesResistance: cur.r,
    seriesJumperClosed: true, // Student must open jumper to insert ammeter in series!
    seriesPowerOn: tier === 'guided', // In challenge/expert, student also manages power switch
    diagMode: diagChoice,
    diagKind,
    diagValue,
    diagSwitchOn: diagChoice === 'mystery_resistor' ? true : false,
    diagJumperClosed: true,
  };

  const rOpts = buildShuffledOptions(res.ohms, res.distractors);
  const dcOpts = buildShuffledOptions(dc.v, dc.distractors);
  const acOpts = buildShuffledOptions(ac.v, ac.distractors);
  const iOpts = buildShuffledOptions(curMa, cur.distractors.filter((d) => d !== curMa).slice(0, 3));
  const diagOpts = buildShuffledOptions(diagValue, diagDistractors);

  const missions: MissionQuestion[] = [
    {
      id: 'm1_resistor',
      station: 'resistor',
      title: 'Stasiun 1 · Tahanan Resistor (Ω)',
      briefing:
        tier === 'guided'
          ? 'Gunakan Multimeter Analog atau Digital pada mode Ω untuk mengukur nilai tahanan resistor di jalur 1.'
          : 'Pastikan rangkaian tidak bertegangan (sakelar OFF), kalibrasi 0 Ω jika memakai Analog, lalu ukur besar tahanan resistor!',
      requiredMeter: tier === 'expert' ? 'analog' : 'any',
      targetKind: 'OHM',
      trueValue: res.ohms,
      unit: 'Ω',
      options: rOpts.options,
      correctOptionIndex: rOpts.correctIndex,
      guidedSteps: [
        '1. Pastikan Sakelar Stasiun Resistor dalam posisi OFF.',
        '2. Putar selektor ke mode Ω (coba ×10 atau ×1k agar jarum di tengah).',
        '3. Jika memakai Analog, geser Kalibrasi 0 Ω ke 0.00.',
        '4. Pasang Probe Merah ke R-A dan Probe Hitam ke R-B, lalu baca nilainya.',
      ],
      explanation: `Resistor memiliki nilai ${res.ohms} Ω. Pada multimeter analog, nilai terbaca = angka skala Ω × pengali selektor.`,
    },
    {
      id: 'm2_dcv',
      station: 'dcv',
      title: 'Stasiun 2 · Tegangan Searah (DCV)',
      briefing:
        'Ukur tegangan keluaran sumber DC secara PARALEL. Perhatikan polaritas probe Merah (+) dan Hitam (−) serta batas ukur yang aman!',
      requiredMeter: 'any',
      targetKind: 'DCV',
      trueValue: dc.v,
      unit: 'V',
      options: dcOpts.options,
      correctOptionIndex: dcOpts.correctIndex,
      guidedSteps: [
        '1. Putar selektor ke mode DCV (pilih batas ukur lebih besar dari perkiraan, mis. 50V).',
        '2. Pasang Probe Merah ke Terminal DC (+) dan Probe Hitam ke DC (−).',
        '3. Jika tanda (−) muncul di LCD atau jarum ke kiri, berarti polaritas terbalik.',
        '4. Baca angka tegangan DC pada skala atau layar LCD.',
      ],
      explanation: `Tegangan DC diukur paralel dengan polaritas tepat: Merah pada (+) dan Hitam pada (−), terbaca ${dc.v} V.`,
    },
    {
      id: 'm3_acv',
      station: 'acv',
      title: 'Stasiun 3 · Tegangan Bolak-Balik (ACV)',
      briefing:
        'Trafo pada jalur 3 menghasilkan tegangan AC. Pilih mode ACV (V~) dengan batas ukur aman, lalu ukur tegangan RMS-nya!',
      requiredMeter: tier === 'challenge' ? 'analog' : 'any',
      targetKind: 'ACV',
      trueValue: ac.v,
      unit: 'V~',
      options: acOpts.options,
      correctOptionIndex: acOpts.correctIndex,
      guidedSteps: [
        '1. Putar selektor ke mode ACV (V~), mulai dari 250V~ atau 750V~ untuk keamanan.',
        '2. Pasang Probe Merah dan Hitam ke Terminal AC (L) dan AC (N).',
        '3. Pada tegangan AC, arah probe bolak-balik menghasilkan pembacaan RMS yang sama.',
        '4. Baca nilai pada skala merah/hitam ACV (Analog) atau LCD (Digital).',
      ],
      explanation: `Tegangan AC (${ac.v} V~) harus diukur pada mode ACV dengan batas ukur di atas tegangan sumber.`,
    },
    {
      id: 'm4_current',
      station: 'current',
      title: 'Stasiun 4 · Arus Listrik Seri (mA)',
      briefing: `Rangkaian beban ${cur.r} Ω disuplai ${cur.v} V DC. Ukur arus listrik yang mengalir dengan menyisipkan multimeter secara SERI!`,
      requiredMeter: 'any',
      targetKind: 'DCA',
      trueValue: curMa,
      unit: 'mA',
      options: iOpts.options,
      correctOptionIndex: iOpts.correctIndex,
      guidedSteps: [
        '1. Buka Jembatan Jumper Seri pada Stasiun 4 agar jalur terputus.',
        '2. Nyalakan Sakelar Daya rangkaian seri menjadi ON.',
        '3. Putar selektor ke DCmA (mulai dari 250 mA agar aman).',
        '4. Pasang Probe Merah ke I-Masuk (+) dan Probe Hitam ke I-Keluar (−), lalu baca arusnya.',
      ],
      explanation: `Berdasarkan Hukum Ohm: I = V / R = ${cur.v}V / ${cur.r}Ω = ${(cur.v / cur.r).toFixed(3)}A = ${curMa} mA.`,
    },
    {
      id: 'm5_diagnostic',
      station: 'diagnostic',
      title: 'Stasiun 5 · Tantangan Track Diagnostik',
      briefing: diagBriefing,
      requiredMeter: tier === 'expert' ? 'analog' : 'any',
      targetKind: diagKind,
      trueValue: diagValue,
      unit: diagUnit,
      options: diagOpts.options,
      correctOptionIndex: diagOpts.correctIndex,
      guidedSteps: [
        '1. Amati kondisi sakelar daya dan jumper di Stasiun Diagnostik.',
        '2. Uji tegangan dahulu pada batas ukur tertinggi (ACV/DCV) bila sumber aktif.',
        '3. Jika menguji komponen pasif (Ω), pastikan sakelar OFF. Jika arus, buka jumper seri.',
        '4. Cocokkan hasil ukur yang terbaca pada multimeter dengan pilihan jawaban.',
      ],
      explanation: diagExplain,
    },
  ];

  return { circuit, missions };
}

export const STATION_ORDER: StationId[] = ['resistor', 'dcv', 'acv', 'current', 'diagnostic'];

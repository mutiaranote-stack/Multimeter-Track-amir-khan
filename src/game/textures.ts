import * as THREE from 'three';
import { ANALOG_OHM_CENTER, DIAL_SPECS } from './physics';

export function createEsdMatTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Deep matte dark navy-slate ESD bench surface
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle rubber micro-speckle texture
  ctx.fillStyle = 'rgba(255,255,255,0.018)';
  for (let i = 0; i < 4500; i++) {
    const x = (i * 73) % 1024;
    const y = (i * 137) % 1024;
    ctx.fillRect(x, y, 2, 2);
  }

  // Minor grid (32px)
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 1024; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  // Major grid (128px)
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 1024; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 1024);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(1024, i);
    ctx.stroke();
  }

  // Corner ESD border frame
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 18, 988, 988);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createAnalogScaleTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext('2d')!;

  // Warm cream instrument face
  ctx.fillStyle = '#faf7ef';
  ctx.fillRect(0, 0, 1024, 640);

  // Subtle recessed border
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, 1000, 616);

  const cx = 512;
  const cy = 575;
  const startAngle = -Math.PI / 2 - 0.78; // Left (-44.7 deg)
  const endAngle = -Math.PI / 2 + 0.78; // Right (+44.7 deg)

  const normToAngle = (t: number) => startAngle + t * (endAngle - startAngle);

  // 1. Mirror anti-parallax band
  ctx.beginPath();
  ctx.arc(cx, cy, 355, startAngle, endAngle);
  ctx.arc(cx, cy, 325, endAngle, startAngle, true);
  ctx.closePath();
  const mirrorGrad = ctx.createLinearGradient(150, 150, 870, 350);
  mirrorGrad.addColorStop(0, '#cbd5e1');
  mirrorGrad.addColorStop(0.5, '#f1f5f9');
  mirrorGrad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = mirrorGrad;
  ctx.fill();

  // 2. Green OHM non-linear scale (top outer arc r=440)
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 440, startAngle, endAngle);
  ctx.stroke();

  const ohmTicks = [
    { val: 0, label: '0' },
    { val: 1, label: '1' },
    { val: 2, label: '2' },
    { val: 5, label: '5' },
    { val: 10, label: '10' },
    { val: 20, label: '20' },
    { val: 30, label: '30' },
    { val: 50, label: '50' },
    { val: 100, label: '100' },
    { val: 200, label: '200' },
    { val: 500, label: '500' },
    { val: 1000, label: '1k' },
  ];

  ctx.fillStyle = '#047857';
  ctx.font = 'bold 22px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Infinity mark at left
  {
    const a = normToAngle(0);
    const x1 = cx + Math.cos(a) * 440;
    const y1 = cy + Math.sin(a) * 440;
    const x2 = cx + Math.cos(a) * 462;
    const y2 = cy + Math.sin(a) * 462;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.fillText('∞', cx + Math.cos(a) * 484, cy + Math.sin(a) * 484);
  }

  for (const tick of ohmTicks) {
    const t = ANALOG_OHM_CENTER / (ANALOG_OHM_CENTER + tick.val);
    const a = normToAngle(t);
    const x1 = cx + Math.cos(a) * 440;
    const y1 = cy + Math.sin(a) * 440;
    const x2 = cx + Math.cos(a) * 464;
    const y2 = cy + Math.sin(a) * 464;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const lx = cx + Math.cos(a) * 486;
    const ly = cy + Math.sin(a) * 486;
    ctx.fillText(tick.label, lx, ly);
  }

  // Minor Ohm subticks
  ctx.lineWidth = 2;
  for (const v of [0.5, 1.5, 3, 4, 6, 8, 15, 25, 40, 75, 150, 300]) {
    const t = ANALOG_OHM_CENTER / (ANALOG_OHM_CENTER + v);
    const a = normToAngle(t);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 440, cy + Math.sin(a) * 440);
    ctx.lineTo(cx + Math.cos(a) * 454, cy + Math.sin(a) * 454);
    ctx.stroke();
  }

  // 3. Black DCV.A linear scale (r=380)
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 380, startAngle, endAngle);
  ctx.stroke();

  for (let i = 0; i <= 50; i++) {
    const t = i / 50;
    const a = normToAngle(t);
    const isMajor = i % 10 === 0;
    const isMid = i % 5 === 0;
    const len = isMajor ? 22 : isMid ? 14 : 8;
    ctx.lineWidth = isMajor ? 3.5 : 1.8;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 380, cy + Math.sin(a) * 380);
    ctx.lineTo(cx + Math.cos(a) * (380 + len), cy + Math.sin(a) * (380 + len));
    ctx.stroke();

    if (isMajor) {
      const step = i / 10; // 0..5
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px "JetBrains Mono", monospace';
      ctx.fillText(String(step * 50), cx + Math.cos(a) * 416, cy + Math.sin(a) * 416);
      ctx.font = 'bold 17px "JetBrains Mono", monospace';
      ctx.fillText(String(step * 10), cx + Math.cos(a) * 362, cy + Math.sin(a) * 362);
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 15px "JetBrains Mono", monospace';
      ctx.fillText(String(step * 2), cx + Math.cos(a) * 308, cy + Math.sin(a) * 308);
    }
  }

  // 4. Red ACV scale (r=270)
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 270, startAngle, endAngle);
  ctx.stroke();

  for (let i = 0; i <= 25; i++) {
    const t = i / 25;
    const a = normToAngle(t);
    const isMajor = i % 5 === 0;
    ctx.lineWidth = isMajor ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 270, cy + Math.sin(a) * 270);
    ctx.lineTo(cx + Math.cos(a) * (270 + (isMajor ? 16 : 8)), cy + Math.sin(a) * (270 + (isMajor ? 16 : 8)));
    ctx.stroke();
  }

  // Labels on face
  ctx.fillStyle = '#059669';
  ctx.font = 'bold 22px "Outfit", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Ω', 90, 128);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px "Outfit", sans-serif';
  ctx.fillText('DCV·A', 76, 224);

  ctx.fillStyle = '#dc2626';
  ctx.fillText('ACV~', 76, 300);

  ctx.fillStyle = '#475569';
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MULTIMETER ANALOG · SKALA PRESISI', cx, 440);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createDialPlateTexture(
  variant: 'analog' | 'digital',
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = variant === 'analog' ? '#1e293b' : '#0f172a';
  ctx.fillRect(0, 0, 1024, 1024);

  const cx = 512;
  const cy = 512;

  // Outer dial ring
  ctx.strokeStyle = variant === 'analog' ? '#f59e0b' : '#38bdf8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 468, 0, Math.PI * 2);
  ctx.stroke();

  // Sector arcs by mode
  const drawArc = (startIdx: number, endIdx: number, color: string) => {
    const a0 = -Math.PI / 2 + (startIdx - 0.4) * ((Math.PI * 2) / 12);
    const a1 = -Math.PI / 2 + (endIdx + 0.4) * ((Math.PI * 2) / 12);
    ctx.strokeStyle = color;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, 315, a0, a1);
    ctx.stroke();
  };

  drawArc(1, 3, '#38bdf8'); // DCV
  drawArc(4, 6, '#ef4444'); // ACV
  drawArc(7, 8, '#f59e0b'); // DCA
  drawArc(9, 11, '#10b981'); // OHM

  // 12 radial labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const spec of DIAL_SPECS) {
    const angle = -Math.PI / 2 + spec.index * ((Math.PI * 2) / 12);
    // Tick dot
    const tx = cx + Math.cos(angle) * 285;
    const ty = cy + Math.sin(angle) * 285;
    ctx.fillStyle = spec.mode === 'OFF' ? '#94a3b8' : '#f8fafc';
    ctx.beginPath();
    ctx.arc(tx, ty, 7, 0, Math.PI * 2);
    ctx.fill();

    // Label
    const lx = cx + Math.cos(angle) * 392;
    const ly = cy + Math.sin(angle) * 392;
    ctx.fillStyle =
      spec.mode === 'OFF'
        ? '#cbd5e1'
        : spec.mode === 'DCV'
          ? '#7dd3fc'
          : spec.mode === 'ACV'
            ? '#fca5a5'
            : spec.mode === 'DCA'
              ? '#fcd34d'
              : '#6ee7b7';
    ctx.font = 'bold 34px "JetBrains Mono", monospace';
    ctx.fillText(spec.shortLabel, lx, ly);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export class DigitalLcdController {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public texture: THREE.CanvasTexture;

  constructor(maxAnisotropy: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 256;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = maxAnisotropy;
    this.update('0.00', 'V', '', 'DCV', false, false);
  }

  public update(
    valueText: string,
    unit: string,
    polarity: '' | '-' | 'AC',
    modeLabel: string,
    isOff: boolean,
    isHold: boolean
  ) {
    const ctx = this.ctx;
    ctx.fillStyle = isOff ? '#0f172a' : '#08202c';
    ctx.fillRect(0, 0, 512, 256);

    // Subtle LCD bezel shadow
    ctx.strokeStyle = isOff ? '#1e293b' : '#164e63';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 504, 248);

    if (isOff) {
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 28px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('POWER OFF', 256, 128);
      this.texture.needsUpdate = true;
      return;
    }

    // Top status strip
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(polarity === 'AC' ? 'AC ~ TRUE RMS' : 'DC ⎓ AUTO', 24, 20);

    if (isHold) {
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('HOLD', 260, 20);
    }

    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.fillText(modeLabel, 486, 20);

    // Main numeric readout
    const isDanger = valueText === 'ERR!' || valueText === 'FUSE!' || valueText === 'OL';
    ctx.fillStyle = isDanger ? '#f87171' : '#67e8f9';
    ctx.font = 'bold 112px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const prefix = polarity === '-' ? '-' : '';
    ctx.fillText(`${prefix}${valueText}`, 410, 148);

    // Unit
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 42px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(unit, 422, 160);

    this.texture.needsUpdate = true;
  }
}

export function createStationPlaqueTexture(
  code: string,
  title: string,
  accentHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 504, 120);

  ctx.fillStyle = accentHex;
  ctx.font = 'bold 24px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(code, 22, 38);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 34px "Outfit", sans-serif';
  ctx.fillText(title, 22, 86);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

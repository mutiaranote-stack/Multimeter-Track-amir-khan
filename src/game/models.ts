import * as THREE from 'three';
import { StationId, TerminalId } from './types';
import {
  createAnalogScaleTexture,
  createDialPlateTexture,
  createEsdMatTexture,
  createStationPlaqueTexture,
  DigitalLcdController,
} from './textures';

export interface InteractiveTarget {
  type: 'terminal' | 'dial' | 'switch' | 'jumper' | 'station' | 'hold' | 'zero_ohm' | 'meter';
  id: string;
  station?: StationId;
  meter?: 'analog' | 'digital';
}

function makeRoundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const hw = w / 2;
  const hh = h / 2;
  s.moveTo(-hw + r, -hh);
  s.lineTo(hw - r, -hh);
  s.quadraticCurveTo(hw, -hh, hw, -hh + r);
  s.lineTo(hw, hh - r);
  s.quadraticCurveTo(hw, hh, hw - r, hh);
  s.lineTo(-hw + r, hh);
  s.quadraticCurveTo(-hw, hh, -hw, hh - r);
  s.lineTo(-hw, -hh + r);
  s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return s;
}

export interface AnalogMeterRig {
  group: THREE.Group;
  needlePivot: THREE.Group;
  dialKnob: THREE.Group;
  zeroKnob: THREE.Mesh;
  redJackWorldAnchor: THREE.Object3D;
  blackJackWorldAnchor: THREE.Object3D;
  interactables: THREE.Object3D[];
}

export function createAnalogMultimeter(
  maxAnisotropy: number,
  isSoftwareGl: boolean
): AnalogMeterRig {
  const group = new THREE.Group();
  const interactables: THREE.Object3D[] = [];

  // Tilted instrument body pivot so it sits grounded on bench at y=0
  const tiltGroup = new THREE.Group();
  tiltGroup.position.set(0, 0.12, 0);
  tiltGroup.rotation.x = -0.92; // Angled nicely toward viewer
  group.add(tiltGroup);

  // 1. Protective rubber holster (amber-yellow matte)
  const holsterShape = makeRoundedRectShape(1.56, 2.38, 0.14);
  const holsterGeo = new THREE.ExtrudeGeometry(holsterShape, {
    depth: 0.42,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 3,
  });
  holsterGeo.center();
  const holsterMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.82,
    metalness: 0.04,
  });
  const holsterMesh = new THREE.Mesh(holsterGeo, holsterMat);
  holsterMesh.castShadow = true;
  holsterMesh.receiveShadow = true;
  tiltGroup.add(holsterMesh);

  // 2. Inner dark ABS chassis
  const bodyShape = makeRoundedRectShape(1.38, 2.2, 0.08);
  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
    depth: 0.4,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  bodyGeo.center();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.42,
    metalness: 0.12,
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.z = 0.04;
  bodyMesh.castShadow = true;
  tiltGroup.add(bodyMesh);

  // 3. Analog Scale Faceplate
  const scaleTex = createAnalogScaleTexture(maxAnisotropy);
  const faceGeo = new THREE.PlaneGeometry(1.18, 0.74);
  const faceMat = new THREE.MeshStandardMaterial({
    map: scaleTex,
    roughness: 0.5,
    metalness: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const faceMesh = new THREE.Mesh(faceGeo, faceMat);
  faceMesh.position.set(0, 0.56, 0.27);
  tiltGroup.add(faceMesh);

  // 4. Needle Pivot & Red Pointer
  const needlePivot = new THREE.Group();
  needlePivot.position.set(0, 0.26, 0.295);
  tiltGroup.add(needlePivot);

  const needleGeo = new THREE.BoxGeometry(0.016, 0.56, 0.008);
  needleGeo.translate(0, 0.28, 0);
  const needleMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.35,
    metalness: 0.15,
    emissive: 0x7f1d1d,
    emissiveIntensity: 0.25,
  });
  const needleMesh = new THREE.Mesh(needleGeo, needleMat);
  needlePivot.add(needleMesh);

  const pivotCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.075, 0.03, 20),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.7 })
  );
  pivotCap.rotation.x = Math.PI / 2;
  needlePivot.add(pivotCap);

  // 5. Acrylic Window Cover (depthWrite: false, explicit renderOrder)
  const glassGeo = new THREE.PlaneGeometry(1.22, 0.78);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.08,
    metalness: 0.0,
    transmission: isSoftwareGl ? 0 : 0.85,
    transparent: true,
    opacity: isSoftwareGl ? 0.22 : 1.0,
    ior: 1.5,
    clearcoat: 1.0,
    depthWrite: false,
  });
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.position.set(0, 0.56, 0.325);
  glassMesh.renderOrder = 6;
  tiltGroup.add(glassMesh);

  // Window bezel frame
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.4 });
  const bezelTop = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.04, 0.05), bezelMat);
  bezelTop.position.set(0, 0.96, 0.31);
  tiltGroup.add(bezelTop);
  const bezelBot = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.04, 0.05), bezelMat);
  bezelBot.position.set(0, 0.16, 0.31);
  tiltGroup.add(bezelBot);

  // 6. Dial Plate & Rotary Selector Knob
  const dialPlateTex = createDialPlateTexture('analog', maxAnisotropy);
  const dialPlate = new THREE.Mesh(
    new THREE.CircleGeometry(0.49, 48),
    new THREE.MeshStandardMaterial({
      map: dialPlateTex,
      roughness: 0.45,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    })
  );
  dialPlate.position.set(0, -0.34, 0.27);
  tiltGroup.add(dialPlate);

  const dialKnob = new THREE.Group();
  dialKnob.position.set(0, -0.34, 0.295);
  tiltGroup.add(dialKnob);

  const knobDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.26, 0.09, 28),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.25 })
  );
  knobDisc.rotation.x = Math.PI / 2;
  knobDisc.castShadow = true;
  dialKnob.add(knobDisc);

  const knobBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.065, 0.46, 0.09),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.3 })
  );
  knobBar.position.z = 0.04;
  dialKnob.add(knobBar);

  const knobPointer = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.18, 0.03),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, emissive: 0x78350f, emissiveIntensity: 0.4 })
  );
  knobPointer.position.set(0, 0.14, 0.09);
  dialKnob.add(knobPointer);

  // Dial clickable hitbox
  const dialHitbox = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.18, 16),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  dialHitbox.rotation.x = Math.PI / 2;
  dialHitbox.position.set(0, -0.34, 0.34);
  dialHitbox.userData.interactive = { type: 'dial', id: 'analog_dial', meter: 'analog' } as InteractiveTarget;
  dialHitbox.layers.enable(1);
  tiltGroup.add(dialHitbox);
  interactables.push(dialHitbox);

  // 7. Zero-Ohm Adjustment Knob (right side)
  const zeroKnob = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.08, 20),
    new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4, metalness: 0.3 })
  );
  zeroKnob.rotation.x = Math.PI / 2;
  zeroKnob.position.set(0.54, 0.02, 0.29);
  zeroKnob.userData.interactive = { type: 'zero_ohm', id: 'zero_ohm' } as InteractiveTarget;
  zeroKnob.layers.enable(1);
  tiltGroup.add(zeroKnob);
  interactables.push(zeroKnob);

  // 8. Banana Jacks (COM black, + red, 10A red)
  const makeJack = (x: number, colorHex: number) => {
    const jackGroup = new THREE.Group();
    jackGroup.position.set(x, -0.92, 0.28);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.07, 0.02, 12, 24),
      new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.35, metalness: 0.2 })
    );
    jackGroup.add(ring);
    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.05, 16),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 0.92 })
    );
    sleeve.rotation.x = Math.PI / 2;
    jackGroup.add(sleeve);
    tiltGroup.add(jackGroup);
    return jackGroup;
  };

  const blackJack = makeJack(-0.36, 0x111827);
  const redJack = makeJack(0.0, 0xef4444);
  makeJack(0.36, 0xdc2626);

  const blackJackWorldAnchor = new THREE.Object3D();
  blackJackWorldAnchor.position.set(0, 0, 0.06);
  blackJack.add(blackJackWorldAnchor);

  const redJackWorldAnchor = new THREE.Object3D();
  redJackWorldAnchor.position.set(0, 0, 0.06);
  redJack.add(redJackWorldAnchor);

  // 9. Rear Kickstand grounded on bench
  const stand = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.9, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.2 })
  );
  stand.position.set(0, 0.32, -0.45);
  stand.rotation.x = 0.45;
  stand.castShadow = true;
  group.add(stand);

  // Body hitbox to select Analog meter
  const bodyHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 2.3, 0.5),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  bodyHitbox.position.set(0, 0, 0);
  bodyHitbox.userData.interactive = { type: 'meter', id: 'select_analog', meter: 'analog' } as InteractiveTarget;
  bodyHitbox.layers.enable(1);
  tiltGroup.add(bodyHitbox);
  interactables.push(bodyHitbox);

  // Shift tiltGroup upward so bottom edge touches y = 0 cleanly
  tiltGroup.position.y = 0.85;

  return {
    group,
    needlePivot,
    dialKnob,
    zeroKnob,
    redJackWorldAnchor,
    blackJackWorldAnchor,
    interactables,
  };
}

export interface DigitalMeterRig {
  group: THREE.Group;
  lcd: DigitalLcdController;
  dialKnob: THREE.Group;
  holdBtnMesh: THREE.Mesh;
  redJackWorldAnchor: THREE.Object3D;
  blackJackWorldAnchor: THREE.Object3D;
  interactables: THREE.Object3D[];
}

export function createDigitalMultimeter(
  maxAnisotropy: number,
  isSoftwareGl: boolean
): DigitalMeterRig {
  const group = new THREE.Group();
  const interactables: THREE.Object3D[] = [];

  const tiltGroup = new THREE.Group();
  tiltGroup.position.set(0, 0.85, 0);
  tiltGroup.rotation.x = -0.92;
  group.add(tiltGroup);

  // 1. Ruggedized slate-cyan rubber holster
  const holsterShape = makeRoundedRectShape(1.5, 2.38, 0.16);
  const holsterGeo = new THREE.ExtrudeGeometry(holsterShape, {
    depth: 0.42,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 3,
  });
  holsterGeo.center();
  const holsterMesh = new THREE.Mesh(
    holsterGeo,
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.72, metalness: 0.08 })
  );
  holsterMesh.castShadow = true;
  holsterMesh.receiveShadow = true;
  tiltGroup.add(holsterMesh);

  // 2. Dark charcoal inner body
  const bodyShape = makeRoundedRectShape(1.32, 2.18, 0.09);
  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
    depth: 0.4,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  bodyGeo.center();
  const bodyMesh = new THREE.Mesh(
    bodyGeo,
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.38, metalness: 0.18 })
  );
  bodyMesh.position.z = 0.04;
  bodyMesh.castShadow = true;
  tiltGroup.add(bodyMesh);

  // 3. Backlit Live LCD Screen
  const lcd = new DigitalLcdController(maxAnisotropy);
  const lcdMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.12, 0.56),
    new THREE.MeshStandardMaterial({
      map: lcd.texture,
      emissiveMap: lcd.texture,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.55,
      roughness: 0.25,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    })
  );
  lcdMesh.position.set(0, 0.64, 0.275);
  tiltGroup.add(lcdMesh);

  // Outer glass bezel
  const lcdGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(1.16, 0.6),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.06,
      metalness: 0,
      transmission: isSoftwareGl ? 0 : 0.8,
      transparent: true,
      opacity: isSoftwareGl ? 0.16 : 1.0,
      clearcoat: 1.0,
      depthWrite: false,
    })
  );
  lcdGlass.position.set(0, 0.64, 0.31);
  lcdGlass.renderOrder = 6;
  tiltGroup.add(lcdGlass);

  // 4. Tactile Function Buttons (HOLD, RANGE, REL)
  const holdBtnMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.13, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.1 })
  );
  holdBtnMesh.position.set(-0.36, 0.24, 0.28);
  holdBtnMesh.userData.interactive = { type: 'hold', id: 'dmm_hold' } as InteractiveTarget;
  holdBtnMesh.layers.enable(1);
  tiltGroup.add(holdBtnMesh);
  interactables.push(holdBtnMesh);

  const rangeBtn = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.13, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.2 })
  );
  rangeBtn.position.set(0, 0.24, 0.28);
  tiltGroup.add(rangeBtn);

  const lightBtn = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.13, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4, metalness: 0.15 })
  );
  lightBtn.position.set(0.36, 0.24, 0.28);
  tiltGroup.add(lightBtn);

  // 5. Dial Plate & Rotary Selector Knob
  const dialPlateTex = createDialPlateTexture('digital', maxAnisotropy);
  const dialPlate = new THREE.Mesh(
    new THREE.CircleGeometry(0.49, 48),
    new THREE.MeshStandardMaterial({
      map: dialPlateTex,
      roughness: 0.45,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    })
  );
  dialPlate.position.set(0, -0.34, 0.27);
  tiltGroup.add(dialPlate);

  const dialKnob = new THREE.Group();
  dialKnob.position.set(0, -0.34, 0.295);
  tiltGroup.add(dialKnob);

  const knobDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.26, 0.09, 28),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.3 })
  );
  knobDisc.rotation.x = Math.PI / 2;
  dialKnob.add(knobDisc);

  const knobBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.065, 0.46, 0.09),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.35 })
  );
  knobBar.position.z = 0.04;
  dialKnob.add(knobBar);

  const knobPointer = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.18, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.25, emissive: 0x0369a1, emissiveIntensity: 0.5 })
  );
  knobPointer.position.set(0, 0.14, 0.09);
  dialKnob.add(knobPointer);

  const dialHitbox = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.18, 16),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  dialHitbox.rotation.x = Math.PI / 2;
  dialHitbox.position.set(0, -0.34, 0.34);
  dialHitbox.userData.interactive = { type: 'dial', id: 'digital_dial', meter: 'digital' } as InteractiveTarget;
  dialHitbox.layers.enable(1);
  tiltGroup.add(dialHitbox);
  interactables.push(dialHitbox);

  // 6. Banana Jacks
  const makeJack = (x: number, colorHex: number) => {
    const jg = new THREE.Group();
    jg.position.set(x, -0.92, 0.28);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.07, 0.02, 12, 24),
      new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.35, metalness: 0.2 })
    );
    jg.add(ring);
    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.05, 16),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.18, metalness: 0.92 })
    );
    sleeve.rotation.x = Math.PI / 2;
    jg.add(sleeve);
    tiltGroup.add(jg);
    return jg;
  };

  const blackJack = makeJack(-0.36, 0x111827);
  const redJack = makeJack(0.0, 0xef4444);
  makeJack(0.36, 0xdc2626);

  const blackJackWorldAnchor = new THREE.Object3D();
  blackJackWorldAnchor.position.set(0, 0, 0.06);
  blackJack.add(blackJackWorldAnchor);

  const redJackWorldAnchor = new THREE.Object3D();
  redJackWorldAnchor.position.set(0, 0, 0.06);
  redJack.add(redJackWorldAnchor);

  // Rear stand
  const stand = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.9, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 })
  );
  stand.position.set(0, 0.32, -0.45);
  stand.rotation.x = 0.45;
  stand.castShadow = true;
  group.add(stand);

  // Body hitbox to select Digital meter
  const bodyHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 2.3, 0.5),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  bodyHitbox.userData.interactive = { type: 'meter', id: 'select_digital', meter: 'digital' } as InteractiveTarget;
  bodyHitbox.layers.enable(1);
  tiltGroup.add(bodyHitbox);
  interactables.push(bodyHitbox);

  return {
    group,
    lcd,
    dialKnob,
    holdBtnMesh,
    redJackWorldAnchor,
    blackJackWorldAnchor,
    interactables,
  };
}

export interface TrackBenchRig {
  group: THREE.Group;
  stationPositions: Record<StationId, THREE.Vector3>;
  terminalAnchors: Record<Exclude<TerminalId, 'NONE'>, THREE.Vector3>;
  terminalRings: Record<Exclude<TerminalId, 'NONE'>, THREE.Mesh>;
  resistorBandMeshes: THREE.Mesh[];
  resistorSwitchPivot: THREE.Group;
  seriesSwitchPivot: THREE.Group;
  seriesJumperPivot: THREE.Group;
  seriesBulbMat: THREE.MeshStandardMaterial;
  diagSwitchPivot: THREE.Group;
  diagJumperPivot: THREE.Group;
  diagCoreMat: THREE.MeshStandardMaterial;
  focusBeacon: THREE.Group;
  electronInstances: THREE.InstancedMesh;
  trackCurves: THREE.CatmullRomCurve3[];
  interactables: THREE.Object3D[];
}

export function createTrackMapBench(maxAnisotropy: number): TrackBenchRig {
  const group = new THREE.Group();
  const interactables: THREE.Object3D[] = [];

  // 1. ESD Lab Workbench Mat & Aluminum Trim
  const matTex = createEsdMatTexture(maxAnisotropy);
  const benchBase = new THREE.Mesh(
    new THREE.BoxGeometry(13.6, 0.2, 8.6),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.35 })
  );
  benchBase.position.set(0, -0.11, 0);
  benchBase.receiveShadow = true;
  group.add(benchBase);

  const esdSurface = new THREE.Mesh(
    new THREE.PlaneGeometry(13.2, 8.2),
    new THREE.MeshStandardMaterial({
      map: matTex,
      roughness: 0.82,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    })
  );
  esdSurface.rotation.x = -Math.PI / 2;
  esdSurface.position.y = 0.005;
  esdSurface.receiveShadow = true;
  group.add(esdSurface);

  // Station layout along a sweeping curved PCB track across the back/mid bench
  const stationPositions: Record<StationId, THREE.Vector3> = {
    resistor: new THREE.Vector3(-4.4, 0, -1.7),
    dcv: new THREE.Vector3(-2.2, 0, -2.5),
    acv: new THREE.Vector3(0.0, 0, -2.75),
    current: new THREE.Vector3(2.2, 0, -2.5),
    diagnostic: new THREE.Vector3(4.4, 0, -1.7),
  };

  // Elevated PCB Track Rails linking the 5 stations
  const trackPoints = [
    stationPositions.resistor.clone().setY(0.04),
    stationPositions.dcv.clone().setY(0.04),
    stationPositions.acv.clone().setY(0.04),
    stationPositions.current.clone().setY(0.04),
    stationPositions.diagnostic.clone().setY(0.04),
  ];

  const mainTrackCurve = new THREE.CatmullRomCurve3(trackPoints, false, 'catmullrom', 0.35);
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.24,
    metalness: 0.88,
  });

  // Twin parallel copper busbar tracks
  for (const offsetZ of [-0.14, 0.14]) {
    const offsetPts = mainTrackCurve.getPoints(48).map((p) => new THREE.Vector3(p.x, 0.045, p.z + offsetZ));
    const offsetCurve = new THREE.CatmullRomCurve3(offsetPts);
    const railGeo = new THREE.TubeGeometry(offsetCurve, 64, 0.032, 8, false);
    const railMesh = new THREE.Mesh(railGeo, copperMat);
    railMesh.castShadow = true;
    group.add(railMesh);
  }

  // Track ties / sleepers under the copper rails (InstancedMesh > 20 items)
  const tieGeo = new THREE.BoxGeometry(0.14, 0.03, 0.56);
  const tieMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.6, metalness: 0.15 });
  const tieCount = 28;
  const ties = new THREE.InstancedMesh(tieGeo, tieMat, tieCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < tieCount; i++) {
    const t = i / (tieCount - 1);
    const pt = mainTrackCurve.getPoint(t);
    const tan = mainTrackCurve.getTangent(t);
    dummy.position.set(pt.x, 0.018, pt.z);
    dummy.rotation.set(0, Math.atan2(tan.x, tan.z), 0);
    dummy.updateMatrix();
    ties.setMatrixAt(i, dummy.matrix);
  }
  ties.instanceMatrix.needsUpdate = true;
  ties.computeBoundingSphere();
  group.add(ties);

  // Electron flow InstancedMesh along the track
  const electronGeo = new THREE.SphereGeometry(0.042, 10, 10);
  const electronMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  const electronInstances = new THREE.InstancedMesh(electronGeo, electronMat, 40);
  electronInstances.frustumCulled = false;
  group.add(electronInstances);

  const terminalAnchors = {} as Record<Exclude<TerminalId, 'NONE'>, THREE.Vector3>;
  const terminalRings = {} as Record<Exclude<TerminalId, 'NONE'>, THREE.Mesh>;

  const createStationPlatform = (
    stationId: StationId,
    code: string,
    title: string,
    accentHex: string
  ): THREE.Group => {
    const pos = stationPositions[stationId];
    const stGroup = new THREE.Group();
    stGroup.position.copy(pos);

    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.1, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.28 })
    );
    plinth.position.y = 0.05;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    stGroup.add(plinth);

    // Front plaque
    const plaqueTex = createStationPlaqueTexture(code, title, accentHex, maxAnisotropy);
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.38),
      new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.4 })
    );
    plaque.position.set(0, 0.11, 0.54);
    plaque.rotation.x = -Math.PI / 2.6;
    stGroup.add(plaque);

    // Clickable station pad hitbox
    const stHit = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.5, 1.5),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    stHit.position.y = 0.25;
    stHit.userData.interactive = { type: 'station', id: stationId, station: stationId } as InteractiveTarget;
    stHit.layers.enable(1);
    stGroup.add(stHit);
    interactables.push(stHit);

    group.add(stGroup);
    return stGroup;
  };

  const addTerminalPost = (
    parent: THREE.Group,
    station: StationId,
    id: Exclude<TerminalId, 'NONE'>,
    localPos: THREE.Vector3,
    capColor: number
  ) => {
    const postGroup = new THREE.Group();
    postGroup.position.copy(localPos);

    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.13, 0.06, 20),
      new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.45, metalness: 0.15 })
    );
    collar.position.y = 0.03;
    postGroup.add(collar);

    const brassPin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.16, 16),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.2, metalness: 0.92 })
    );
    brassPin.position.y = 0.1;
    brassPin.castShadow = true;
    postGroup.add(brassPin);

    // Highlight ring
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.3,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.018, 10, 24), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.025;
    postGroup.add(ring);
    terminalRings[id] = ring;

    // Large generous raycast hitbox for touch & IFP!
    const hitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.36, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitbox.position.y = 0.14;
    hitbox.userData.interactive = { type: 'terminal', id, station } as InteractiveTarget;
    hitbox.layers.enable(1);
    postGroup.add(hitbox);
    interactables.push(hitbox);

    parent.add(postGroup);

    // Store world anchor
    const worldPos = stationPositions[station].clone().add(localPos).add(new THREE.Vector3(0, 0.18, 0));
    terminalAnchors[id] = worldPos;
  };

  const buildToggleSwitch = (
    parent: THREE.Group,
    station: StationId,
    id: string,
    localPos: THREE.Vector3,
    type: 'switch' | 'jumper'
  ): THREE.Group => {
    const swBase = new THREE.Group();
    swBase.position.copy(localPos);

    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.08, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.3 })
    );
    housing.position.y = 0.04;
    swBase.add(housing);

    const pivot = new THREE.Group();
    pivot.position.set(0, 0.08, 0);
    swBase.add(pivot);

    const lever = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.032, 0.24, 12),
      new THREE.MeshStandardMaterial({
        color: type === 'jumper' ? 0xf59e0b : 0xef4444,
        roughness: 0.3,
        metalness: 0.5,
      })
    );
    lever.position.y = 0.11;
    pivot.add(lever);

    const tipBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 12),
      new THREE.MeshStandardMaterial({ color: type === 'jumper' ? 0xfbbf24 : 0xf87171, roughness: 0.25 })
    );
    tipBall.position.y = 0.23;
    pivot.add(tipBall);

    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.42, 0.44),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.y = 0.18;
    hit.userData.interactive = { type, id, station } as InteractiveTarget;
    hit.layers.enable(1);
    swBase.add(hit);
    interactables.push(hit);

    parent.add(swBase);
    return pivot;
  };

  // --- STATION 1: RESISTOR (OHM) ---
  const st1 = createStationPlatform('resistor', 'STASIUN 01', 'Tahanan Resistor', '#10b981');
  // Ceramic standoffs + Axial resistor
  const leadWire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 1.1, 10),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 })
  );
  leadWire.rotation.z = Math.PI / 2;
  leadWire.position.set(0, 0.34, -0.1);
  st1.add(leadWire);

  // Resistor contoured body (tan ceramic)
  const resBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.62, 24),
    new THREE.MeshStandardMaterial({ color: 0xd6b88d, roughness: 0.5, metalness: 0.05 })
  );
  resBody.rotation.z = Math.PI / 2;
  resBody.position.set(0, 0.34, -0.1);
  resBody.castShadow = true;
  st1.add(resBody);

  // End caps
  for (const sx of [-0.3, 0.3]) {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.125, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xd6b88d, roughness: 0.45 })
    );
    cap.position.set(sx, 0.34, -0.1);
    st1.add(cap);
  }

  // 4 Dynamic Color Bands
  const resistorBandMeshes: THREE.Mesh[] = [];
  const bandOffsets = [-0.21, -0.08, 0.05, 0.21];
  for (const bx of bandOffsets) {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.116, 0.116, 0.055, 24),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35 })
    );
    band.rotation.z = Math.PI / 2;
    band.position.set(bx, 0.34, -0.1);
    st1.add(band);
    resistorBandMeshes.push(band);
  }

  addTerminalPost(st1, 'resistor', 'R_A', new THREE.Vector3(-0.56, 0.1, 0.12), 0x10b981);
  addTerminalPost(st1, 'resistor', 'R_B', new THREE.Vector3(0.56, 0.1, 0.12), 0x10b981);
  const resistorSwitchPivot = buildToggleSwitch(st1, 'resistor', 'resistor_switch', new THREE.Vector3(0, 0.1, -0.46), 'switch');

  // --- STATION 2: DC VOLTAGE (DCV) ---
  const st2 = createStationPlatform('dcv', 'STASIUN 02', 'Tegangan DC (⎓)', '#38bdf8');
  // Twin DC Power Cell Modules
  for (const bx of [-0.24, 0.24]) {
    const cell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.48, 24),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.55 })
    );
    cell.position.set(bx, 0.34, -0.2);
    cell.castShadow = true;
    st2.add(cell);

    const cellCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.2, metalness: 0.9 })
    );
    cellCap.position.set(bx, 0.6, -0.2);
    st2.add(cellCap);
  }
  addTerminalPost(st2, 'dcv', 'DC_POS', new THREE.Vector3(-0.46, 0.1, 0.14), 0xef4444);
  addTerminalPost(st2, 'dcv', 'DC_NEG', new THREE.Vector3(0.46, 0.1, 0.14), 0x111827);

  // --- STATION 3: AC VOLTAGE (ACV) ---
  const st3 = createStationPlatform('acv', 'STASIUN 03', 'Tegangan AC (~)', '#ef4444');
  // Laminated Iron Core Transformer + Copper Windings
  const ironCore = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.46, 0.36),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.42, metalness: 0.78 })
  );
  ironCore.position.set(0, 0.33, -0.22);
  ironCore.castShadow = true;
  st3.add(ironCore);

  const windingMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.25, metalness: 0.88 });
  for (const wx of [-0.18, 0.18]) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.06, 12, 24), windingMat);
    coil.position.set(wx, 0.35, -0.22);
    coil.rotation.y = Math.PI / 2;
    coil.castShadow = true;
    st3.add(coil);
  }
  addTerminalPost(st3, 'acv', 'AC_L', new THREE.Vector3(-0.46, 0.1, 0.14), 0xef4444);
  addTerminalPost(st3, 'acv', 'AC_N', new THREE.Vector3(0.46, 0.1, 0.14), 0x38bdf8);

  // --- STATION 4: SERIES CURRENT (mA) ---
  const st4 = createStationPlatform('current', 'STASIUN 04', 'Arus Seri (mA)', '#f59e0b');
  // Load Lamp Bulb
  const bulbSocket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.16, 0.14, 20),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.35, metalness: 0.75 })
  );
  bulbSocket.position.set(0.38, 0.17, -0.28);
  st4.add(bulbSocket);

  const seriesBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });
  const bulbGlass = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 20), seriesBulbMat);
  bulbGlass.position.set(0.38, 0.36, -0.28);
  st4.add(bulbGlass);

  const seriesSwitchPivot = buildToggleSwitch(st4, 'current', 'series_switch', new THREE.Vector3(-0.44, 0.1, -0.32), 'switch');
  const seriesJumperPivot = buildToggleSwitch(st4, 'current', 'series_jumper', new THREE.Vector3(0, 0.1, 0.14), 'jumper');
  addTerminalPost(st4, 'current', 'I_IN', new THREE.Vector3(-0.48, 0.1, 0.14), 0xef4444);
  addTerminalPost(st4, 'current', 'I_OUT', new THREE.Vector3(0.48, 0.1, 0.14), 0x111827);

  // --- STATION 5: DIAGNOSTIC BOSS TRACK ---
  const st5 = createStationPlatform('diagnostic', 'STASIUN 05', 'Diagnostik Track', '#a855f7');
  const mysteryBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.34, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.38, metalness: 0.45 })
  );
  mysteryBox.position.set(0, 0.27, -0.26);
  mysteryBox.castShadow = true;
  st5.add(mysteryBox);

  const diagCoreMat = new THREE.MeshStandardMaterial({
    color: 0xc084fc,
    emissive: 0x7e22ce,
    emissiveIntensity: 0.7,
    roughness: 0.25,
  });
  const diagDome = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2), diagCoreMat);
  diagDome.position.set(0, 0.44, -0.26);
  st5.add(diagDome);

  const diagSwitchPivot = buildToggleSwitch(st5, 'diagnostic', 'diag_switch', new THREE.Vector3(-0.55, 0.1, -0.25), 'switch');
  const diagJumperPivot = buildToggleSwitch(st5, 'diagnostic', 'diag_jumper', new THREE.Vector3(0.55, 0.1, -0.25), 'jumper');
  addTerminalPost(st5, 'diagnostic', 'DIAG_A', new THREE.Vector3(-0.46, 0.1, 0.14), 0xef4444);
  addTerminalPost(st5, 'diagnostic', 'DIAG_B', new THREE.Vector3(0.46, 0.1, 0.14), 0x111827);

  // Active Station Focus Beacon (subtle glowing corner brackets)
  const focusBeacon = new THREE.Group();
  const bracketMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  const beaconRing = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.03, 48), bracketMat);
  beaconRing.rotation.x = -Math.PI / 2;
  beaconRing.position.y = 0.025;
  focusBeacon.add(beaconRing);
  group.add(focusBeacon);

  return {
    group,
    stationPositions,
    terminalAnchors,
    terminalRings,
    resistorBandMeshes,
    resistorSwitchPivot,
    seriesSwitchPivot,
    seriesJumperPivot,
    seriesBulbMat,
    diagSwitchPivot,
    diagJumperPivot,
    diagCoreMat,
    focusBeacon,
    electronInstances,
    trackCurves: [mainTrackCurve],
    interactables,
  };
}

export interface ProbePairRig {
  group: THREE.Group;
  redProbe: THREE.Group;
  blackProbe: THREE.Group;
  updateCables: (redStart: THREE.Vector3, redEnd: THREE.Vector3, blackStart: THREE.Vector3, blackEnd: THREE.Vector3) => void;
}

export function createProbePairRig(): ProbePairRig {
  const group = new THREE.Group();

  const buildProbe = (bodyColor: number): THREE.Group => {
    const p = new THREE.Group();
    // Tip point is at (0, 0, 0), handle extends upwards along +Y
    const metalTip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.018, 0.22, 12),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.94, roughness: 0.15 })
    );
    metalTip.position.y = 0.11;
    p.add(metalTip);

    const flange = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.055, 0.04, 16),
      new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.45 })
    );
    flange.position.y = 0.23;
    p.add(flange);

    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.052, 0.42, 16),
      new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.5, metalness: 0.08 })
    );
    handle.position.y = 0.45;
    handle.castShadow = true;
    p.add(handle);

    // Slight tilt so handle leans naturally like a held test probe
    p.rotation.z = -0.18;
    p.rotation.x = 0.22;
    return p;
  };

  const redProbe = buildProbe(0xef4444);
  const blackProbe = buildProbe(0x111827);
  group.add(redProbe);
  group.add(blackProbe);

  const redCableMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.65 });
  const blackCableMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });

  let redCableMesh: THREE.Mesh | null = null;
  let blackCableMesh: THREE.Mesh | null = null;

  const rebuildCable = (
    existing: THREE.Mesh | null,
    mat: THREE.Material,
    start: THREE.Vector3,
    end: THREE.Vector3,
    sagOffset: number
  ): THREE.Mesh => {
    if (existing) {
      group.remove(existing);
      existing.geometry.dispose();
    }
    const mid1 = start.clone().lerp(end, 0.32);
    mid1.y = Math.max(0.06, Math.min(start.y, end.y) * 0.45);
    mid1.z += sagOffset;

    const mid2 = start.clone().lerp(end, 0.68);
    mid2.y = Math.max(0.08, end.y + 0.35);

    const curve = new THREE.CatmullRomCurve3([start.clone(), mid1, mid2, end.clone()]);
    const geo = new THREE.TubeGeometry(curve, 22, 0.022, 6, false);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };

  let lastHash = '';
  const updateCables = (
    redStart: THREE.Vector3,
    redEnd: THREE.Vector3,
    blackStart: THREE.Vector3,
    blackEnd: THREE.Vector3
  ) => {
    const hash = `${redStart.x.toFixed(2)},${redEnd.x.toFixed(2)},${redEnd.z.toFixed(2)},${blackStart.x.toFixed(2)},${blackEnd.x.toFixed(2)},${blackEnd.z.toFixed(2)}`;
    if (hash === lastHash) return;
    lastHash = hash;

    const redHandleTop = redEnd.clone().add(new THREE.Vector3(0.11, 0.62, 0.14));
    const blackHandleTop = blackEnd.clone().add(new THREE.Vector3(0.11, 0.62, 0.14));

    redCableMesh = rebuildCable(redCableMesh, redCableMat, redStart, redHandleTop, 0.45);
    blackCableMesh = rebuildCable(blackCableMesh, blackCableMat, blackStart, blackHandleTop, 0.65);
  };

  return { group, redProbe, blackProbe, updateCables };
}

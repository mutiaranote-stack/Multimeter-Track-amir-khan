import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  AnalogMeterRig,
  createAnalogMultimeter,
  createDigitalMultimeter,
  createProbePairRig,
  createTrackMapBench,
  DigitalMeterRig,
  InteractiveTarget,
  ProbePairRig,
  TrackBenchRig,
} from './models';
import { DIAL_MAP } from './physics';
import {
  CircuitState,
  DialId,
  GamePhase,
  MeasurementResult,
  MeterType,
  StationId,
  TerminalId,
} from './types';

export type CameraViewPreset = 'overview' | 'station' | 'meter';

export interface SceneVisualState {
  phase: GamePhase;
  station: StationId;
  activeMeter: MeterType;
  dialId: DialId;
  redProbe: TerminalId;
  blackProbe: TerminalId;
  circuit: CircuitState;
  measurement: MeasurementResult;
  zeroOhmOffset: number;
  holdActive: boolean;
  showElectronFlow: boolean;
  cameraPreset: CameraViewPreset;
}

export interface SceneCallbacks {
  onInteractiveClick: (target: InteractiveTarget) => void;
  onContextLostChange?: (lost: boolean) => void;
}

// Pre-allocated math helpers outside render loop (zero GC)
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();
const _redStart = new THREE.Vector3();
const _blackStart = new THREE.Vector3();
const _redTarget = new THREE.Vector3();
const _blackTarget = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _pt = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

export class LabSceneController {
  private container: HTMLElement;
  private callbacks: SceneCallbacks;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private pmremGenerator: THREE.PMREMGenerator;
  private envRT: THREE.WebGLRenderTarget;

  private analogMeter: AnalogMeterRig;
  private digitalMeter: DigitalMeterRig;
  private bench: TrackBenchRig;
  private probes: ProbePairRig;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private pointerDownPos = { x: 0, y: 0 };

  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;

  // Dynamic simulation targets
  private state: SceneVisualState;
  private currentNeedleNorm = 0;
  private needleVelocity = 0;
  private currentRedPos = new THREE.Vector3(-0.6, 0.25, 1.3);
  private currentBlackPos = new THREE.Vector3(-1.1, 0.25, 1.3);
  private currentAnalogDialAngle = 0;
  private currentDigitalDialAngle = 0;

  // Smooth camera transition state (yields immediately to user OrbitControls start)
  private camTransitionActive = false;
  private goalCamPos = new THREE.Vector3(0, 6.2, 6.8);
  private goalCamTarget = new THREE.Vector3(0, 0.4, -0.8);

  constructor(
    container: HTMLElement,
    initialState: SceneVisualState,
    callbacks: SceneCallbacks
  ) {
    this.container = container;
    this.state = initialState;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 240);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    // Scene & horizon-matched fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b1120);
    this.scene.fog = new THREE.FogExp2(0x0b1120, 0.032);

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
    this.camera.position.set(0, 6.4, 7.2);

    // Studio Reflection Environment (RoomEnvironment) on all devices
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envRT = this.pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;

    // 3-Point Studio Lighting Rig
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.75);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.9);
    keyLight.position.set(5, 9, 6);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 26;
    const d = 7.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.7);
    rimLight.position.set(-6, 5, -7);
    this.scene.add(rimLight);

    // Build Composite 3D Scene Assets
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.bench = createTrackMapBench(maxAniso);
    this.scene.add(this.bench.group);

    this.analogMeter = createAnalogMultimeter(maxAniso, this.isSoftwareGl);
    this.analogMeter.group.position.set(-1.35, 0, 1.35);
    this.analogMeter.group.rotation.y = 0.14;
    this.scene.add(this.analogMeter.group);

    this.digitalMeter = createDigitalMultimeter(maxAniso, this.isSoftwareGl);
    this.digitalMeter.group.position.set(1.35, 0, 1.35);
    this.digitalMeter.group.rotation.y = -0.14;
    this.scene.add(this.digitalMeter.group);

    this.probes = createProbePairRig();
    this.scene.add(this.probes.group);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 2.4;
    this.controls.maxDistance = 14.5;
    this.controls.minPolarAngle = 0.25;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.12;
    this.controls.target.copy(this.goalCamTarget);
    this.controls.addEventListener('start', () => {
      // Yield scripted camera transition immediately so it never fights user drag
      this.camTransitionActive = false;
    });

    this.raycaster.layers.set(1);

    // Bind events
    this.bindEvents();
    this.applyStateVisuals(initialState, true);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.startLoop();
  }

  private bindEvents() {
    window.addEventListener('resize', this.onResize);
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  private onContextLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.callbacks.onContextLostChange?.(true);
  };

  private onContextRestored = () => {
    this.callbacks.onContextLostChange?.(false);
    this.startLoop();
  };

  private onResize = () => {
    if (this.disposed) return;
    const w = Math.max(this.container.clientWidth, 320);
    const h = Math.max(this.container.clientHeight, 240);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onPointerDown = (e: PointerEvent) => {
    this.pointerDownPos.x = e.clientX;
    this.pointerDownPos.y = e.clientY;
  };

  private onPointerUp = (e: PointerEvent) => {
    const dx = e.clientX - this.pointerDownPos.x;
    const dy = e.clientY - this.pointerDownPos.y;
    // Ignore drag gestures used for OrbitControls
    if (dx * dx + dy * dy > 64) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const allInteractables = [
      ...this.bench.interactables,
      ...this.analogMeter.interactables,
      ...this.digitalMeter.interactables,
    ];
    const hits = this.raycaster.intersectObjects(allInteractables, false);
    if (hits.length > 0) {
      const data = hits[0].object.userData.interactive as InteractiveTarget | undefined;
      if (data) {
        this.callbacks.onInteractiveClick(data);
      }
    }
  };

  public updateState(next: SceneVisualState) {
    const stationOrPresetChanged =
      next.station !== this.state.station ||
      next.cameraPreset !== this.state.cameraPreset ||
      next.activeMeter !== this.state.activeMeter ||
      next.phase !== this.state.phase;

    this.state = next;
    this.applyStateVisuals(next, stationOrPresetChanged);
  }

  public focusCamera(preset: CameraViewPreset) {
    this.state = { ...this.state, cameraPreset: preset };
    this.computeCameraGoal(this.state);
    this.camTransitionActive = true;
  }

  private computeCameraGoal(s: SceneVisualState) {
    const aspect = this.camera.aspect || 1.6;
    const isNarrow = aspect < 0.85; // Portrait HP / small tablet zoom adjustment
    const distScale = isNarrow ? 1.32 : 1.0;

    if (s.phase === 'title') {
      _camGoalPos.set(0, 5.4 * distScale, 6.8 * distScale);
      _camGoalTarget.set(0, 0.3, -0.6);
    } else if (s.cameraPreset === 'overview') {
      _camGoalPos.set(0, 6.2 * distScale, 6.6 * distScale);
      _camGoalTarget.set(0, 0.2, -0.7);
    } else if (s.cameraPreset === 'station') {
      const stPos = this.bench.stationPositions[s.station];
      _camGoalPos.set(stPos.x * 0.85, 3.1 * distScale, stPos.z + 3.2 * distScale);
      _camGoalTarget.set(stPos.x, 0.2, stPos.z);
    } else {
      // 'meter' close-up on active multimeter
      const mx = s.activeMeter === 'analog' ? -1.35 : 1.35;
      _camGoalPos.set(mx, 2.55 * distScale, 3.45 * distScale);
      _camGoalTarget.set(mx, 0.65, 1.3);
    }

    this.goalCamPos.copy(_camGoalPos);
    this.goalCamTarget.copy(_camGoalTarget);
  }

  private applyStateVisuals(s: SceneVisualState, triggerCamera: boolean) {
    // 1. Resistor 4-band colors
    s.circuit.resistorBands.forEach((hex, idx) => {
      const mesh = this.bench.resistorBandMeshes[idx];
      if (mesh) {
        (mesh.material as THREE.MeshStandardMaterial).color.set(hex);
      }
    });

    // 2. Switches & Jumpers angles
    this.bench.resistorSwitchPivot.rotation.x = s.circuit.resistorSwitchOn ? -0.42 : 0.42;
    this.bench.seriesSwitchPivot.rotation.x = s.circuit.seriesPowerOn ? -0.42 : 0.42;
    this.bench.seriesJumperPivot.rotation.z = s.circuit.seriesJumperClosed ? 0 : 0.85;
    this.bench.diagSwitchPivot.rotation.x = s.circuit.diagSwitchOn ? -0.42 : 0.42;
    this.bench.diagJumperPivot.rotation.z = s.circuit.diagJumperClosed ? 0 : 0.85;

    // 3. Series Load Lamp glow
    const lampActive = s.circuit.seriesPowerOn && (s.circuit.seriesJumperClosed || (s.measurement.connected && s.measurement.status === 'ok' && s.station === 'current'));
    this.bench.seriesBulbMat.emissiveIntensity = lampActive ? 1.4 : 0.08;

    // 4. Focus Beacon position
    const stPos = this.bench.stationPositions[s.station];
    this.bench.focusBeacon.position.set(stPos.x, 0.01, stPos.z);

    // 5. Update Digital LCD Canvas
    const dialSpec = DIAL_MAP[s.dialId];
    this.digitalMeter.lcd.update(
      s.measurement.digitalDisplay || '0.00',
      s.measurement.digitalUnit,
      s.measurement.digitalPolarity,
      dialSpec.shortLabel,
      dialSpec.mode === 'OFF',
      s.holdActive
    );

    // 6. Highlight active meter subtly via scale/elevation
    this.analogMeter.group.position.y = s.activeMeter === 'analog' ? 0.04 : 0;
    this.digitalMeter.group.position.y = s.activeMeter === 'digital' ? 0.04 : 0;

    // 7. Highlight active station terminal rings
    (Object.keys(this.bench.terminalRings) as Exclude<TerminalId, 'NONE'>[]).forEach((tid) => {
      const ring = this.bench.terminalRings[tid];
      const mat = ring.material as THREE.MeshStandardMaterial;
      const isRed = s.redProbe === tid;
      const isBlack = s.blackProbe === tid;
      if (isRed) {
        mat.color.setHex(0xef4444);
        mat.emissive.setHex(0xdc2626);
        mat.emissiveIntensity = 1.2;
      } else if (isBlack) {
        mat.color.setHex(0x94a3b8);
        mat.emissive.setHex(0x475569);
        mat.emissiveIntensity = 0.9;
      } else {
        mat.color.setHex(0x38bdf8);
        mat.emissive.setHex(0x0284c7);
        mat.emissiveIntensity = 0.35;
      }
    });

    if (triggerCamera) {
      this.computeCameraGoal(s);
      this.camTransitionActive = true;
    }
  }

  private startLoop() {
    const tick = () => {
      if (this.disposed) return;
      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsed = this.clock.elapsedTime;

      this.updateSimulation(dt, elapsed);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };
    tick();
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateSimulation(dt: number, elapsed: number) {
    const s = this.state;

    // 1. Title screen gentle orbital drift
    if (s.phase === 'title') {
      const angle = elapsed * 0.16;
      const radius = 8.4;
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, Math.sin(angle) * radius * 0.55, 2.5, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, 6.2 + Math.cos(angle) * 1.1, 2.5, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, 5.2, 2.5, dt);
      this.controls.target.set(0, 0.35, -0.7);
      this.controls.update();
    } else if (this.camTransitionActive) {
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.goalCamPos.x, 5.5, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.goalCamPos.y, 5.5, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.goalCamPos.z, 5.5, dt);
      this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, this.goalCamTarget.x, 6.0, dt);
      this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, this.goalCamTarget.y, 6.0, dt);
      this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, this.goalCamTarget.z, 6.0, dt);

      if (this.camera.position.distanceTo(this.goalCamPos) < 0.03) {
        this.camTransitionActive = false;
      }
      this.controls.update();
    } else {
      this.controls.update();
    }

    // 2. Smooth Rotary Dial Knob Rotation
    const dialSpec = DIAL_MAP[s.dialId];
    const targetDialAngle = -dialSpec.index * ((Math.PI * 2) / 12);
    this.currentAnalogDialAngle = THREE.MathUtils.damp(
      this.currentAnalogDialAngle,
      s.activeMeter === 'analog' ? targetDialAngle : 0,
      14,
      dt
    );
    this.currentDigitalDialAngle = THREE.MathUtils.damp(
      this.currentDigitalDialAngle,
      s.activeMeter === 'digital' ? targetDialAngle : 0,
      14,
      dt
    );
    this.analogMeter.dialKnob.rotation.z = this.currentAnalogDialAngle;
    this.digitalMeter.dialKnob.rotation.z = this.currentDigitalDialAngle;
    this.analogMeter.zeroKnob.rotation.y = s.zeroOhmOffset * 1.4;

    // 3. Spring-Damped Analog Needle Deflection (-0.78 rad left to +0.78 rad right)
    const targetNorm = s.activeMeter === 'analog' ? s.measurement.analogNormalized : 0;
    const stiffness = 140;
    const damping = 16;
    const force = (targetNorm - this.currentNeedleNorm) * stiffness;
    this.needleVelocity += (force - this.needleVelocity * damping) * dt;
    this.currentNeedleNorm += this.needleVelocity * dt;
    // Slight 50Hz jitter if measuring AC with DCV or hazard
    const jitter = s.measurement.status === 'hazard' ? Math.sin(elapsed * 45) * 0.025 : 0;
    const clampedNorm = THREE.MathUtils.clamp(this.currentNeedleNorm + jitter, -0.11, 1.11);
    this.analogMeter.needlePivot.rotation.z = (0.5 - clampedNorm) * 1.56;

    // 4. Smooth Probe Placement & Cable Updates
    const meterRig = s.activeMeter === 'analog' ? this.analogMeter : this.digitalMeter;
    meterRig.redJackWorldAnchor.getWorldPosition(_redStart);
    meterRig.blackJackWorldAnchor.getWorldPosition(_blackStart);

    if (s.redProbe !== 'NONE' && this.bench.terminalAnchors[s.redProbe]) {
      _redTarget.copy(this.bench.terminalAnchors[s.redProbe]);
    } else {
      _redTarget.set(s.activeMeter === 'analog' ? -0.45 : 2.25, 0.06, 2.2);
    }

    if (s.blackProbe !== 'NONE' && this.bench.terminalAnchors[s.blackProbe]) {
      _blackTarget.copy(this.bench.terminalAnchors[s.blackProbe]);
    } else {
      _blackTarget.set(s.activeMeter === 'analog' ? -2.25 : 0.45, 0.06, 2.2);
    }

    this.currentRedPos.x = THREE.MathUtils.damp(this.currentRedPos.x, _redTarget.x, 12, dt);
    this.currentRedPos.y = THREE.MathUtils.damp(this.currentRedPos.y, _redTarget.y, 12, dt);
    this.currentRedPos.z = THREE.MathUtils.damp(this.currentRedPos.z, _redTarget.z, 12, dt);

    this.currentBlackPos.x = THREE.MathUtils.damp(this.currentBlackPos.x, _blackTarget.x, 12, dt);
    this.currentBlackPos.y = THREE.MathUtils.damp(this.currentBlackPos.y, _blackTarget.y, 12, dt);
    this.currentBlackPos.z = THREE.MathUtils.damp(this.currentBlackPos.z, _blackTarget.z, 12, dt);

    this.probes.redProbe.position.copy(this.currentRedPos);
    this.probes.blackProbe.position.copy(this.currentBlackPos);
    this.probes.updateCables(_redStart, this.currentRedPos, _blackStart, this.currentBlackPos);

    // 5. Electron Flow Particle Animation along Track Conduits (UDL visual representation!)
    this.bench.electronInstances.visible = s.showElectronFlow;
    if (s.showElectronFlow) {
      const curve = this.bench.trackCurves[0];
      const count = 40;
      const isAcStation = s.station === 'acv' || (s.station === 'diagnostic' && s.circuit.diagKind === 'ACV');
      for (let i = 0; i < count; i++) {
        let u = i / count;
        if (isAcStation) {
          // AC oscillates back and forth visually!
          u = (u + Math.sin(elapsed * 4.2) * 0.045 + 1) % 1;
        } else {
          // DC flows steadily forward
          const speed = s.station === 'resistor' && !s.circuit.resistorSwitchOn ? 0.015 : 0.085;
          u = (u + elapsed * speed) % 1;
        }
        curve.getPointAt(u, _pt);
        const side = i % 2 === 0 ? -0.14 : 0.14;
        _dummy.position.set(_pt.x, 0.095, _pt.z + side);
        _dummy.scale.setScalar(1.0);
        _dummy.updateMatrix();
        this.bench.electronInstances.setMatrixAt(i, _dummy.matrix);
      }
      this.bench.electronInstances.instanceMatrix.needsUpdate = true;
    }
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.onResize);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('webglcontextlost', this.onContextLost);
    canvas.removeEventListener('webglcontextrestored', this.onContextRestored);

    this.controls.dispose();
    this.envRT.dispose();
    this.pmremGenerator.dispose();

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else if (mesh.material) {
          mesh.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (canvas.parentElement === this.container) {
      this.container.removeChild(canvas);
    }
  }
}

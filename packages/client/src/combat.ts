import {
  Color3,
  MeshBuilder,
  Ray,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import { socket } from "./network";
import { Player } from "./characterController";
import { HUD } from "./hud";
import {
  WEAPONS,
  createWeaponState,
} from "./weapons";
import type { WeaponId, WeaponSpec, WeaponState } from "./weapons";

interface HitPayload {
  targetId?: string;
  point?: { x: number; y: number; z: number };
}

export class CombatSystem {
  private _scene: Scene;
  private _player: Player;
  private _hud?: HUD;

  private _activeWeapon: WeaponId = "rifle";
  private _weaponState: Record<WeaponId, WeaponState>;

  private _fireDown = false;
  private _firedThisPress = false;

  private _health = 100;
  private _lastFrame = performance.now();
  private _hitMarkerTimeout = 0;
  private _recoilKick = 0;
  private _fxColorTracer = new Color3(0.8, 0.9, 1);
  private _fxColorHit = new Color3(1, 0.3, 0.3);
  private _audioCtx?: AudioContext;
  private _killFeed: { text: string; ts: number }[] = [];
  private _lastMoveAmount = 0;

  constructor(scene: Scene, player: Player, hud?: HUD) {
    this._scene = scene;
    this._player = player;
    this._hud = hud;

    this._weaponState = {
      rifle: createWeaponState(WEAPONS.rifle),
      pistol: createWeaponState(WEAPONS.pistol),
      melee: createWeaponState(WEAPONS.melee),
    };

    this._hud?.setAmmo(
      this._weaponState[this._activeWeapon].currentAmmo,
      WEAPONS[this._activeWeapon].mag
    );
    this._hud?.setHealth(this._health);
    this._hud?.setWeaponInfo("Rifle", "AUTO");
    this._player.showWeapon("rifle");

    window.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp);
    window.addEventListener("keydown", this._onKeyDown);

    socket.on("player:damaged", (data: { targetId: string; hp: number }) => {
      if (!socket.id || data.targetId !== socket.id) return;
      this._health = data.hp;
      this._hud?.setHealth(this._health);
    });

    socket.on(
      "combat:hitmarker",
      (data: { shooterId: string; targetId: string }) => {
        if (!socket.id || data.shooterId !== socket.id) return;
        this._triggerHitMarker();
      }
    );

    socket.on(
      "combat:kill",
      (data: { killerId: string; victimId: string; weaponId: string }) => {
        const txt = `${data.killerId} → ${data.victimId} (${data.weaponId})`;
        this._killFeed.unshift({ text: txt, ts: performance.now() });
        this._killFeed = this._killFeed.slice(0, 5);
        this._hud?.setKillFeed(this._killFeed.map((k) => k.text));
      }
    );

    socket.on(
      "player:respawn",
      (data: { targetId: string; x: number; y: number; z: number }) => {
        if (!socket.id || data.targetId !== socket.id) return;
        this._health = 100;
        this._hud?.setHealth(this._health);
        this._player.respawn(new Vector3(data.x, data.y, data.z));
      }
    );
  }

  public update(): void {
    const now = performance.now();
    const dt = (now - this._lastFrame) / 1000;
    this._lastFrame = now;

    // recover spread toward base
    for (const id of Object.keys(WEAPONS) as WeaponId[]) {
      const spec = WEAPONS[id];
      const state = this._weaponState[id];
      state.spread = Math.max(spec.spread, state.spread - spec.spreadRecover * dt);
    }

    // crosshair bloom recovery
    this._hud?.setCrosshairScale(1 + this._weaponState[this._activeWeapon].spread * 0.05);

    // recoil kick decay
    if (this._recoilKick > 0) {
      this._recoilKick = Math.max(0, this._recoilKick - dt * 0.8);
    }

    // hit marker decay
    if (this._hitMarkerTimeout && now > this._hitMarkerTimeout) {
      this._hitMarkerTimeout = 0;
      this._hud?.setCrosshairScale(1 + this._weaponState[this._activeWeapon].spread * 0.05);
    }

    this._processReload(now);
    this._processFire(now);

    // movement-based bloom
    this._lastMoveAmount = this._player.getMoveAmount();
    const moveFactor = 1 + this._lastMoveAmount * 0.15;
    this._hud?.setCrosshairScale(moveFactor + this._weaponState[this._activeWeapon].spread * 0.05);

    // reload progress
    const state = this._weaponState[this._activeWeapon];
    const spec = WEAPONS[this._activeWeapon];
    if (state.reloading) {
      const remaining = Math.max(0, state.nextFireAt - now);
      const pct = 1 - Math.min(1, remaining / spec.reloadMs);
      this._hud?.setReloadProgress(pct, true);
    } else {
      this._hud?.setReloadProgress(0, false);
    }
  }

  private _processReload(now: number) {
    const spec = WEAPONS[this._activeWeapon];
    const state = this._weaponState[this._activeWeapon];
    if (!state.reloading) return;
    if (now < state.nextFireAt) return;
    state.reloading = false;
    state.currentAmmo = spec.mag;
    this._hud?.setAmmo(state.currentAmmo, spec.mag);
  }

  private _processFire(now: number) {
    const spec = WEAPONS[this._activeWeapon];
    const state = this._weaponState[this._activeWeapon];
    if (state.reloading) return;
    if (!this._fireDown) {
      this._firedThisPress = false;
      return;
    }

    if (!spec.automatic && this._firedThisPress) return;
    if (now < state.nextFireAt) return;

    if (spec.mag !== Infinity && state.currentAmmo <= 0) {
      this._startReload(now);
      return;
    }

    this._fireShot(spec, state, now);
  }

  private _fireShot(spec: WeaponSpec, state: WeaponState, now: number) {
    const camera = this._player.camera;
    const origin = camera.position.clone();
    const muzzle = this._player.getMuzzleWorldPosition();
    const forward = camera.getForwardRay().direction.clone();
    const spread = state.spread * (this._player.isAds() ? 0.6 : 1);
    const dir = this._applySpread(forward, spread);

    const hit = this._raycast(dir, spec.range);
    this._sendFire(spec.id, origin, dir, hit);

    if (spec.mag !== Infinity) {
      state.currentAmmo = Math.max(0, state.currentAmmo - 1);
    }
    state.nextFireAt = now + 60000 / spec.rpm;
    state.spread += spec.spreadBloom;
    this._applyRecoil(spec);
    this._hud?.setAmmo(state.currentAmmo, spec.mag);
    this._spawnMuzzleFlash(muzzle, dir, spec.id);
    this._playShotSound(spec.id);

    if (hit.point) {
      this._spawnTracer(muzzle, new Vector3(hit.point.x, hit.point.y, hit.point.z));
      this._spawnImpact(new Vector3(hit.point.x, hit.point.y, hit.point.z), !!hit.targetId);
    }

    if (!spec.automatic) {
      this._firedThisPress = true;
    }
  }

  private _applySpread(direction: Vector3, spreadDeg: number): Vector3 {
    if (spreadDeg <= 0) return direction.normalize();
    const spreadRad = (spreadDeg * Math.PI) / 180;
    const yaw = (Math.random() - 0.5) * spreadRad;
    const pitch = (Math.random() - 0.5) * spreadRad;
    const dir = direction.normalize().clone();
    const rotated = new Vector3(dir.x, dir.y, dir.z);
    rotated.x += Math.tan(yaw);
    rotated.y += Math.tan(pitch);
    rotated.normalize();
    return rotated;
  }

  private _raycast(direction: Vector3, range: number): HitPayload {
    const origin = this._player.camera.position;
    const ray = new Ray(origin.clone(), direction, range);

    const picks = this._scene.multiPickWithRay(ray) || [];
    // prefer hitting players
    for (const pick of picks) {
      const pid = pick?.pickedMesh?.metadata?.playerId as string | undefined;
      if (pick?.hit && pid) {
        const point = pick.pickedPoint;
        return {
          targetId: pid,
          point: point
            ? { x: point.x, y: point.y, z: point.z }
            : undefined,
        };
      }
    }

    // no player hit; return impact point along the ray if any
    const first = picks.find((p) => p?.hit);
    if (first?.pickedPoint) {
      return { point: { x: first.pickedPoint.x, y: first.pickedPoint.y, z: first.pickedPoint.z } };
    }

    const missPoint = origin.add(direction.scale(range));
    return { point: { x: missPoint.x, y: missPoint.y, z: missPoint.z } };
  }

  private _sendFire(
    weaponId: WeaponId,
    origin: Vector3,
    direction: Vector3,
    hit: HitPayload
  ) {
    socket.emit("player:fire", {
      weaponId,
      origin: { x: origin.x, y: origin.y, z: origin.z },
      direction: { x: direction.x, y: direction.y, z: direction.z },
      targetId: hit.targetId,
      hitPoint: hit.point,
      ts: Date.now(),
    });
  }

  private _applyRecoil(spec: WeaponSpec) {
    const state = this._weaponState[spec.id];
    const pattern = spec.recoilPattern;
    const step = pattern[state.recoilIndex % pattern.length];
    state.recoilIndex = (state.recoilIndex + 1) % pattern.length;
    this._recoilKick += Math.abs(step.x);
    const cam = this._player.camera;
    cam.rotation.x += step.x;
    cam.rotation.y += step.y;
  }

  private _startReload(now: number) {
    const spec = WEAPONS[this._activeWeapon];
    const state = this._weaponState[this._activeWeapon];
    if (spec.mag === Infinity || state.reloading) return;
    state.reloading = true;
    state.nextFireAt = now + spec.reloadMs;
    this._hud?.setReloadProgress(0, true);
  }

  private _onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    this._fireDown = true;
  };

  private _onMouseUp = (e: MouseEvent) => {
    if (e.button !== 0) return;
    this._fireDown = false;
    this._firedThisPress = false;
  };

  private _onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (key === "r") {
      this._startReload(performance.now());
    }
    if (key === "1") this._switchWeapon("rifle");
    if (key === "2") this._switchWeapon("pistol");
    if (key === "3") this._switchWeapon("melee");
  };

  private _switchWeapon(id: WeaponId) {
    if (id === this._activeWeapon) return;
    this._activeWeapon = id;
    const spec = WEAPONS[id];
    const state = this._weaponState[id];
    this._hud?.setAmmo(state.currentAmmo, spec.mag);
    this._hud?.setCrosshairScale(1 + state.spread * 0.05);
    this._hud?.setWeaponInfo(this._labelFor(id), spec.automatic ? "AUTO" : "SEMI");
    this._player.showWeapon(id);
    state.recoilIndex = 0;
    this._hud?.setReloadProgress(0, false);
  }

  private _triggerHitMarker() {
    this._hitMarkerTimeout = performance.now() + 120;
    // simple crosshair flash via size bump
    this._hud?.setCrosshairScale(1.4);
  }

  private _spawnTracer(origin: Vector3, point: Vector3) {
    const line = MeshBuilder.CreateLines(
      `tracer_${Date.now()}`,
      { points: [origin, point] },
      this._scene
    );
    line.color = this._fxColorTracer;
    const mat = new StandardMaterial(`tracerMat_${Date.now()}`, this._scene);
    mat.emissiveColor = this._fxColorTracer;
    mat.alpha = 0.7;
    line.material = mat;
    setTimeout(() => line.dispose(), 80);
  }

  private _spawnImpact(point: Vector3, isHit: boolean) {
    const sphere = MeshBuilder.CreateSphere(
      `impact_${Date.now()}`,
      { diameter: isHit ? 0.1 : 0.1 },
      this._scene
    );
    sphere.position.copyFrom(point);
    const mat = new StandardMaterial(`impactMat_${Date.now()}`, this._scene);
    mat.emissiveColor = isHit ? this._fxColorHit : new Color3(1, 1, 1);
    mat.alpha = 0.85;
    sphere.material = mat;
    setTimeout(() => sphere.dispose(), 150);
  }

  private _spawnMuzzleFlash(origin: Vector3, dir: Vector3, weaponId: WeaponId) {
    const pos = origin.add(dir.scale(0.08));
    const flash = MeshBuilder.CreateSphere(
      `muzzle_${Date.now()}`,
      { diameter: weaponId === "rifle" ? 0.1 : 0.1 },
      this._scene
    );
    flash.position.copyFrom(pos);
    const mat = new StandardMaterial(`muzzleMat_${Date.now()}`, this._scene);
    mat.emissiveColor = new Color3(1, 0.8, 0.3);
    mat.alpha = 0.9;
    flash.material = mat;
    setTimeout(() => flash.dispose(), 60);
  }

  private _playShotSound(weaponId: WeaponId) {
    try {
      if (!this._audioCtx) {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        this._audioCtx = AC ? new AC() : undefined;
      }
      if (!this._audioCtx) return;
      const ctx = this._audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const base = weaponId === "rifle" ? 220 : weaponId === "pistol" ? 260 : 180;
      osc.frequency.value = base + Math.random() * 20;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (err) {
      // ignore audio errors
    }
  }

  private _labelFor(id: WeaponId): string {
    if (id === "rifle") return "Rifle";
    if (id === "pistol") return "Pistol";
    return "Melee";
  }
}

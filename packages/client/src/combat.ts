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
import { WEAPONS, createWeaponState } from "./weapons";
import type { WeaponId, WeaponSpec, WeaponState } from "./weapons";
import { chatOpen } from "./chat";

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
  private _fxColorTracer = new Color3(0.8, 0.9, 1);
  private _fxColorHit = new Color3(1, 0.3, 0.3);
  private _audioClips: Record<string, HTMLAudioElement | null> = {};
  private _killFeed: {
    killer: string;
    killerTeam?: string;
    victim: string;
    victimTeam?: string;
    weapon: string;
    ts: number;
  }[] = [];
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

    this._preloadAudio("rifle_shot", "/audio/rifle_shot.mp3");
    this._preloadAudio("pistol_shot", "/audio/pistol_shot.mp3");
    this._preloadAudio("melee_swing", "/audio/melee_swing.mp3");
    this._preloadAudio("reload", "/audio/reload.mp3");

    window.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp);
    window.addEventListener("pointerdown", this._onPointerDown);
    window.addEventListener("pointerup", this._onPointerUp);
    window.addEventListener("keydown", this._onKeyDown);

    socket.on("player:damaged", (data: { targetId: string; hp: number }) => {
      if (!socket.id || data.targetId !== socket.id) return;
      this._health = data.hp;
      this._hud?.setHealth(this._health);
    });

    socket.on("combat:hitmarker", (data: { shooterId: string; targetId: string }) => {
      if (!socket.id || data.shooterId !== socket.id) return;
      this._triggerHitMarker();
    });

    socket.on(
      "combat:kill",
      (data: {
        killerId: string;
        victimId: string;
        weaponId: string;
        killerTeam?: string;
        victimTeam?: string;
        killerName?: string;
        victimName?: string;
      }) => {
        this._killFeed.unshift({
          killer: data.killerName || data.killerId,
          killerTeam: data.killerTeam,
          victim: data.victimName || data.victimId,
          victimTeam: data.victimTeam,
          weapon: data.weaponId,
          ts: performance.now(),
        });
        this._killFeed = this._killFeed.slice(0, 5);
        this._hud?.setKillFeed(this._killFeed);
      }
    );

    socket.on(
      "player:respawn",
      (data: { targetId: string; x: number; y: number; z: number; team?: string }) => {
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

    // hit marker decay
    if (this._hitMarkerTimeout && now > this._hitMarkerTimeout) {
      this._hitMarkerTimeout = 0;
    }

    this._processReload(now);
    this._processFire(now);

    // movement based bloom
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
      const hitPoint = new Vector3(hit.point.x, hit.point.y, hit.point.z);
      const start = muzzle.add(new Vector3(0, 0.05, 0)); // lift tracer origin slightly
      this._spawnImpact(hitPoint, !!hit.targetId);
      this._spawnTracer(start, hitPoint);
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
    // hitting players
    for (const pick of picks) {
      const pid = pick?.pickedMesh?.metadata?.playerId as string | undefined;
      if (pick?.hit && pid) {
        const point = pick.pickedPoint;
        return {
          targetId: pid,
          point: point ? { x: point.x, y: point.y, z: point.z } : undefined,
        };
      }
    }

    // no player hit - return impact point along the ray if any
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
    this._playReloadSound();
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

  private _onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    this._fireDown = true;
  };

  private _onPointerUp = (e: PointerEvent) => {
    if (e.button !== 0) return;
    this._fireDown = false;
    this._firedThisPress = false;
  };

  private _onKeyDown = (e: KeyboardEvent) => {
    if (chatOpen === true) return;
    const key = e.key.toLowerCase();
    const state = this._weaponState[this._activeWeapon];
    const spec = WEAPONS[this._activeWeapon];
    if (key === "r" && state.currentAmmo < spec.mag) {
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
    this._hud?.setCrosshairScale(1.4);
  }

  // bullet tracer (adjust position in characterController.ts)
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

  // hit marker
  private _spawnImpact(point: Vector3, isHit: boolean) {
    const sphere = MeshBuilder.CreateSphere(
      `impact_${Date.now()}`,
      { diameter: isHit ? 0.12 : 0.1 },
      this._scene
    );
    sphere.position.copyFrom(point);
    const mat = new StandardMaterial(`impactMat_${Date.now()}`, this._scene);
    mat.emissiveColor = isHit ? this._fxColorHit : new Color3(1, 1, 1);
    mat.alpha = 0.85;
    sphere.material = mat;
    setTimeout(() => sphere.dispose(), 150);
  }

  private _spawnMuzzleFlash(_origin: Vector3, _dir: Vector3, _weaponId: WeaponId) {
    // muzzle flash disabled (maybe added in future)
  }

  // audio control
  private _playShotSound(weaponId: WeaponId) {
    const clipName =
      weaponId === "rifle" ? "rifle_shot" : weaponId === "pistol" ? "pistol_shot" : "melee_swing";
    const clip = this._audioClips[clipName];
    if (clip) {
      try {
        clip.currentTime = 0;
        clip.volume = weaponId === "melee" ? 0.5 : 0.9;
        clip.play();
      } catch (err) {
        // ignore audio errors
      }
    }
  }

  private _playReloadSound() {
    const clip = this._audioClips["reload"];
    if (!clip) return;
    try {
      clip.currentTime = 0;
      clip.volume = 0.6;
      clip.play();
    } catch (err) {
      // ignore
    }
  }

  private _labelFor(id: WeaponId): string {
    if (id === "rifle") return "Rifle";
    if (id === "pistol") return "Pistol";
    return "Melee";
  }

  private _preloadAudio(key: string, path: string) {
    try {
      const audio = new Audio(path);
      audio.preload = "auto";
      this._audioClips[key] = audio;
    } catch (err) {
      this._audioClips[key] = null;
    }
  }

  public getActiveWeaponId(): WeaponId {
    return this._activeWeapon;
  }

  private _label(team: string): string {
    if (team === "teamA") return "TEAM A";
    if (team === "teamB") return "TEAM B";
    return team.toUpperCase();
  }
}

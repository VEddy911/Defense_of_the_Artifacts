// packages/client/src/remotePlayers.ts
import {
  Scene,
  MeshBuilder,
  Mesh,
  Color3,
  StandardMaterial,
  Vector3,
  Mesh as AbstractMesh,
  TransformNode,
  SceneLoader,
  LinesMesh,
} from "@babylonjs/core";
import {
  AdvancedDynamicTexture,
  Rectangle,
  TextBlock,
  Control,
} from "@babylonjs/gui";
import { StandardMaterial as StdMat } from "@babylonjs/core";

interface RemotePlayerState {
  id: string;
  x: number;
  y: number;
  z: number;
  ry: number;
  team?: string;
  hp?: number;
  maxHp?: number;
  name?: string;
  weaponId?: string;
}

interface RemoteEntry {
  mesh: Mesh;
  namePlane?: AbstractMesh;
  ui?: AdvancedDynamicTexture;
  barFill?: Rectangle;
  nameText?: TextBlock;
  weaponMesh?: Mesh;
  weaponId?: string;
  weaponNode?: TransformNode;
}

export class RemotePlayers {
  private _scene: Scene;
  private _entries: Map<string, RemoteEntry> = new Map();
  private _weaponCache: Map<string, TransformNode> = new Map();
  private _tracerColor: Color3 = new Color3(0.8, 0.9, 1);

  constructor(scene: Scene) {
    this._scene = scene;
  }

  public syncFromServer(players: RemotePlayerState[], localId: string | undefined) {
    const seen = new Set<string>();

    for (const p of players) {
      // skip ourself - use a camera instead of a mesh
      if (p.id === localId) continue;

      seen.add(p.id);

      let entry = this._entries.get(p.id);
      if (!entry) {
        const mesh = MeshBuilder.CreateCapsule(
          `remote_${p.id}`,
          { height: 2, radius: 0.4 },
          this._scene
        );
        mesh.checkCollisions = true;
        // store the owner id on the mesh so hitscan can identify targets
        mesh.metadata = { playerId: p.id };

        const mat = new StandardMaterial(`remoteMat_${p.id}`, this._scene);
        mat.diffuseColor = this._teamColor(p.team);
        mesh.material = mat;

        entry = { mesh };
        this._entries.set(p.id, entry);
        this._ensureNameplate(entry, p);
      }

      const mesh = entry.mesh;
      const mat = mesh.material as StandardMaterial | null;
      if (mat) {
        const desired = this._teamColor(p.team);
        mat.diffuseColor = desired;
        mat.emissiveColor = desired.scale(0.6);
      }

      mesh.position.set(p.x, p.y, p.z);
      mesh.rotation.y = p.ry;

      this._updateNameplate(entry, p);
      void this._ensureWeapon(entry, p.weaponId, p.team);
    }

    // remove meshes no longer in server list
    for (const [id, entry] of this._entries) {
      if (!seen.has(id)) {
        entry.mesh.dispose();
        entry.namePlane?.dispose();
        entry.ui?.dispose();
        this._disposeWeapon(entry);
        this._entries.delete(id);
      }
    }
  }

  private _teamColor(team?: string): Color3 {
    if (team === "teamA") return new Color3(0.3, 0.7, 1.0);
    if (team === "teamB") return new Color3(1.0, 0.35, 0.35);
    return new Color3(0.5, 0.8, 0.5);
  }

  private _ensureNameplate(entry: RemoteEntry, state: RemotePlayerState) {
    if (entry.namePlane) return;
    const plane = MeshBuilder.CreatePlane(`name_${state.id}`, { size: 0.9 }, this._scene);
    plane.parent = entry.mesh;
    plane.position = new Vector3(0, 1.6, 0);
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    plane.isPickable = false;

    const ui = AdvancedDynamicTexture.CreateForMesh(plane, 512, 128);

    const bg = new Rectangle();
    bg.width = "100%";
    bg.height = "72px";
    bg.cornerRadius = 10;
    bg.thickness = 0;
    bg.background = "rgba(0,0,0,0.35)";
    ui.addControl(bg);

    const nameText = new TextBlock();
    nameText.text = state.name || "";
    nameText.color = "#e5ecff";
    nameText.fontSize = 22;
    nameText.fontFamily = "monospace";
    nameText.fontStyle = "bold";
    nameText.outlineWidth = 2;
    nameText.outlineColor = "rgba(0,0,0,0.65)";
    nameText.shadowBlur = 2;
    nameText.shadowColor = "rgba(0,0,0,0.5)";
    nameText.shadowOffsetY = 1;
    nameText.top = "-6px";
    bg.addControl(nameText);

    const barBg = new Rectangle();
    barBg.width = "80%";
    barBg.height = "10px";
    barBg.cornerRadius = 5;
    barBg.thickness = 1;
    barBg.color = "rgba(255,255,255,0.2)";
    barBg.background = "rgba(0,0,0,0.4)";
    barBg.top = "12px";
    bg.addControl(barBg);

    const barFill = new Rectangle();
    barFill.width = "100%";
    barFill.height = "100%";
    barFill.cornerRadius = 6;
    barFill.thickness = 0;
    barFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    barFill.background = this._teamColor(state.team).toHexString();
    barBg.addControl(barFill);

    entry.namePlane = plane;
    entry.ui = ui;
    entry.nameText = nameText;
    entry.barFill = barFill;
  }

  private _updateNameplate(entry: RemoteEntry, state: RemotePlayerState) {
    const hpMax = state.maxHp ?? 100;
    const hp = state.hp ?? hpMax;
    if (entry.nameText) {
      entry.nameText.text = state.name || "";
      entry.nameText.color =
        state.team === "teamA" ? "#82e2ff" : state.team === "teamB" ? "#ff8d8d" : "#e5ecff";
    }
    if (entry.barFill) {
      const pct = hpMax > 0 ? Math.max(0, Math.min(1, hp / hpMax)) : 0;
      entry.barFill.width = `${pct * 100}%`;
      entry.barFill.background =
        state.team === "teamA" ? "#82e2ff" : state.team === "teamB" ? "#ff8d8d" : "#7fd67f";
    }
    if (entry.namePlane) {
      entry.namePlane.position = new Vector3(0, 1.6, 0);
    }
  }

  private async _ensureWeapon(entry: RemoteEntry, weaponId?: string, team?: string) {
    if (!weaponId) return;
    if (entry.weaponId === weaponId && entry.weaponNode) return;
    this._disposeWeapon(entry);
    entry.weaponId = weaponId;

    try {
      const base = await this._getWeaponNode(weaponId);
      const clone = base.clone(
        `r_weapon_${entry.mesh.name}_${weaponId}_${Date.now()}`,
        null,
        false
      ) as TransformNode;
      clone.parent = entry.mesh;
      const cfg = this._weaponTransform(weaponId);
      clone.position = cfg.pos;
      clone.rotation = cfg.rot;
      clone.scaling = cfg.scale;
      clone.setEnabled(true);
      clone.metadata = { weapon: true };
      clone.getChildMeshes().forEach((m) => {
        m.setEnabled(true);
        m.metadata = { weapon: true };
      });
      entry.weaponNode = clone;
    } catch (err) {
      // fallback to box
      const weapon = MeshBuilder.CreateBox(
        `weapon_${entry.mesh.name}_${Date.now()}`,
        { width: 0.1, height: 0.08, depth: 0.6 },
        this._scene
      );
      weapon.parent = entry.mesh;
      weapon.position = new Vector3(0.25, 0.9, 0.2);
      weapon.rotation = new Vector3(0, -Math.PI / 2, 0);
      const mat = new StandardMaterial(`weaponMat_${entry.mesh.name}`, this._scene);
      mat.diffuseColor = this._teamColor(team);
      mat.emissiveColor = new Color3(0.6, 0.6, 0.6);
      weapon.material = mat;
      weapon.isPickable = false;
      weapon.metadata = { weapon: true };
      entry.weaponNode = weapon;
    }
  }

  private _disposeWeapon(entry: RemoteEntry) {
    // dispose tracked weapon node
    if (entry.weaponNode) {
      entry.weaponNode.getChildMeshes()?.forEach((m) => m.dispose());
      entry.weaponNode.getChildTransformNodes()?.forEach((t) => {
        if (t !== entry.weaponNode) t.dispose();
      });
      entry.weaponNode.dispose();
      entry.weaponNode = undefined;
    }
    // dispose any stray weapon-tagged children on the mesh
    entry.mesh.getChildren().forEach((child) => {
      if ((child as any)?.metadata?.weapon) {
        (child as AbstractMesh).dispose();
      }
    });
  }

  private async _getWeaponNode(weaponId: string): Promise<TransformNode> {
    const cached = this._weaponCache.get(weaponId);
    if (cached) return cached;

    const file = this._weaponFile(weaponId);
    const result = await SceneLoader.ImportMeshAsync("", "/models/", file, this._scene);
    const root = new TransformNode(`weapon_root_${weaponId}`, this._scene);
    for (const m of result.meshes) {
      if (m === result.meshes[0]) continue;
      m.parent = root;
      m.setEnabled(false);
    }
    root.scaling = new Vector3(1.2, 1.2, 1.2);
    root.setEnabled(false);
    this._weaponCache.set(weaponId, root);
    return root;
  }

  private _weaponFile(weaponId: string): string {
    if (weaponId === "pistol") return "pistol.glb";
    if (weaponId === "melee") return "melee.glb";
    return "rifle.glb";
  }

  private _weaponTransform(weaponId: string): { pos: Vector3; rot: Vector3; scale: Vector3 } {
    if (weaponId === "pistol") {
      return {
        pos: new Vector3(0.4, 0, 0.25),
        rot: new Vector3(0, -Math.PI / 2, 0),
        scale: new Vector3(1.3, 1.3, 1.3),
      };
    }
    if (weaponId === "melee") {
      return {
        pos: new Vector3(0.4, 0, 0.25),
        rot: new Vector3(0, Math.PI / 2, 0),
        scale: new Vector3(1.2, 1.2, 1.2),
      };
    }
    // rifle default
    return {
      pos: new Vector3(0.4, 0, 0.25), //0.4, 0, 0.25
      rot: new Vector3(0, -Math.PI / 2, 0),
      scale: new Vector3(1.35, 1.35, 1.35),
    };
  }

  public spawnTracer(data: {
    shooterId?: string;
    origin?: { x: number; y: number; z: number };
    direction?: { x: number; y: number; z: number };
    range?: number;
    weaponId?: string;
  }) {
    if (!data.origin || !data.direction) return;
    const origin = new Vector3(data.origin.x, data.origin.y, data.origin.z);
    const dir = new Vector3(data.direction.x, data.direction.y, data.direction.z);
    const mag = dir.length();
    if (mag === 0) return;
    const range = data.range ?? 80;
    const end = origin.add(dir.normalize().scale(range));
    this._spawnTracer(origin, end);
  }

  private _spawnTracer(origin: Vector3, end: Vector3) {
    const path = [origin, end];
    const tube = MeshBuilder.CreateTube(`r_tracer_${Date.now()}`, {
      path,
      radius: 0.035,
      tessellation: 6,
      updatable: false,
    }, this._scene);
    const mat = new StdMat(`r_tracerMat_${Date.now()}`, this._scene);
    mat.emissiveColor = this._tracerColor;
    mat.diffuseColor = this._tracerColor;
    mat.alpha = 1;
    tube.material = mat;
    tube.isPickable = false;
    setTimeout(() => tube.dispose(), 250);
  }
}

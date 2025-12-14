// packages/client/src/remotePlayers.ts
import {
  Scene,
  MeshBuilder,
  Mesh,
  Color3,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";

interface RemotePlayerState {
  id: string;
  x: number;
  y: number;
  z: number;
  ry: number;
  team?: string;
}

export class RemotePlayers {
  private _scene: Scene;
  private _meshes: Map<string, Mesh> = new Map();

  constructor(scene: Scene) {
    this._scene = scene;
  }

  public syncFromServer(players: RemotePlayerState[], localId: string | undefined) {
    const seen = new Set<string>();

    for (const p of players) {
      // skip ourself - use a camera instead of a mesh
      if (p.id === localId) continue;

      seen.add(p.id);

      let mesh = this._meshes.get(p.id);
      if (!mesh) {
        mesh = MeshBuilder.CreateCapsule(
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

        this._meshes.set(p.id, mesh);
      }

      const mat = mesh.material as StandardMaterial | null;
      if (mat) {
        const desired = this._teamColor(p.team);
        mat.diffuseColor = desired;
        mat.emissiveColor = desired.scale(0.6);
      }

      mesh.position.set(p.x, p.y, p.z);
      mesh.rotation.y = p.ry;
    }

    // remove meshes no longer in server list
    for (const [id, mesh] of this._meshes) {
      if (!seen.has(id)) {
        mesh.dispose();
        this._meshes.delete(id);
      }
    }
  }

  private _teamColor(team?: string): Color3 {
    if (team === "alpha") return new Color3(0.3, 0.7, 1.0);
    if (team === "bravo") return new Color3(1.0, 0.35, 0.35);
    return new Color3(0.5, 0.8, 0.5);
  }
}

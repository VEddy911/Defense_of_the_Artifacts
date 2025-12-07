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
        mat.diffuseColor = new Color3(0.2, 0.7, 1.0);
        mesh.material = mat;

        // simple head hitbox for headshots
        const head = MeshBuilder.CreateSphere(`remote_${p.id}_head`, { diameter: 0.4 }, this._scene);
        head.position = new Vector3(0, 1, 0);
        head.parent = mesh;
        head.metadata = { playerId: p.id, part: "head" };
        const headMat = new StandardMaterial(`remoteHeadMat_${p.id}`, this._scene);
        headMat.diffuseColor = new Color3(0.9, 0.9, 0.9);
        headMat.alpha = 0.001; // nearly invisible but pickable
        head.material = headMat;

        this._meshes.set(p.id, mesh);
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
}

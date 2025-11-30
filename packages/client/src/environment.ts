import { Scene, MeshBuilder, Vector3, Color3, StandardMaterial, HemisphericLight } from "@babylonjs/core";

export class Environment {
    private _scene: Scene;

    constructor(scene: Scene) {
        this._scene = scene;
    }

    // build the environment. create a ground
    // plane and a handful of obstacles
    public async load(): Promise<void> {
        // Lighting 
        const light = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), this._scene);
        light.intensity = 0.8;

        // TODO: add more lights and enable shadows

        // Ground 
        const ground = MeshBuilder.CreateBox("ground", { size: 124 }, this._scene);
        ground.scaling = new Vector3(1, 0.02, 1);
        ground.position.y = -0.01; // so the top sits at y=0
        ground.checkCollisions = true;
        
        // add a material so the ground is visible
        const groundMat = new StandardMaterial("groundMat", this._scene);
        groundMat.diffuseColor = new Color3(0.4, 0.6, 0.4);
        ground.material = groundMat;

        // Obstacles 
        const obstacleCount = 5;
        for (let i = 0; i < obstacleCount; i++) {
            const box = MeshBuilder.CreateBox(`obstacle_${i}`, { size: 2 }, this._scene);
            box.position = new Vector3(i * 4 - 8, 1, (i % 2 === 0 ? 1 : -1) * 4);
            box.checkCollisions = true;
            const mat = new StandardMaterial(`boxMat_${i}`, this._scene);
            // Give each box a different pastel colour
            mat.diffuseColor = new Color3(0.6 + (i * 0.07) % 0.4, 0.4 + (i * 0.05) % 0.4, 0.5 + (i * 0.03) % 0.4);
            box.material = mat;
        }
    }
}


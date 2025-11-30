import { Scene, UniversalCamera, Vector3, FreeCamera, MeshBuilder } from "@babylonjs/core";
import { PlayerInput } from "./inputController";

/**
 * Player encapsulates a first‑person camera and translates discrete
 * keyboard input into smooth motion with collision detection.  The
 * underlying BabylonJS camera is configured to use collision
 * detection and gravity.  During the update loop the camera's
 * `cameraDirection` is augmented by a movement vector computed from
 * the current input.  BabylonJS applies this direction vector when
 * updating the camera, automatically handling collisions.
 */
export class Player {
    public camera: UniversalCamera;
    private _input: PlayerInput;
    private _scene: Scene;

    constructor(scene: Scene, canvas: HTMLCanvasElement, input: PlayerInput) {
        this._scene = scene;
        this._input = input;
        // Create a UniversalCamera so we have both keyboard and mouse look
        this.camera = new UniversalCamera("playerCamera", new Vector3(0, 2, -10), scene);
        // Attach to the canvas to enable built‑in mouse look controls
        this.camera.attachControl(canvas, true);
        // Do not allow the built‑in keyboard inputs to drive the camera; we
        // supply our own via the input controller.  This prevents double
        // movement.
        this.camera.inputs.removeByType("FreeCameraKeyboardMoveInput");
        // Configure collision and gravity settings on the scene and camera
        scene.gravity = new Vector3(0, -9.81, 0);
        scene.collisionsEnabled = true;
        this.camera.checkCollisions = true;
        this.camera.applyGravity = true;
        this.camera.ellipsoid = new Vector3(0.5, 1.0, 0.5);
        this.camera.ellipsoidOffset = new Vector3(0, 1.0, 0);
        // Set a small near clipping plane to avoid clipping when looking up/down
        this.camera.minZ = 0.01;
    }

    /**
     * Update the player's position based on input.  This should be called
     * once per frame from the main render loop.  The movement vector is
     * projected onto the horizontal plane so that vertical mouse movement
     * doesn't inadvertently move the player up or down.  BabylonJS will
     * handle the actual movement and collision resolution when rendering
     * the frame.
     */
    public update(): void {
        const engine = this._scene.getEngine();
        const deltaTime = engine.getDeltaTime() / 1000.0;
        const moveSpeed = 5; // units per second
        // Determine forward and right directions relative to the camera
        // Forward is the camera's local z axis; right is the local x axis
        const forward = this.camera.getDirection(new Vector3(0, 0, 1));
        const right = this.camera.getDirection(new Vector3(1, 0, 0));
        // Project directions onto the XZ plane to avoid vertical drift
        forward.y = 0;
        right.y = 0;
        forward.normalize();
        right.normalize();

        // Compute the movement vector from input axes
        const movement = forward.scale(this._input.vertical * moveSpeed * deltaTime)
            .add(right.scale(this._input.horizontal * moveSpeed * deltaTime));

        // Accumulate the movement on the camera's cameraDirection so that
        // BabylonJS will apply collisions and gravity automatically
        this.camera.cameraDirection.addInPlace(movement);
    }
}


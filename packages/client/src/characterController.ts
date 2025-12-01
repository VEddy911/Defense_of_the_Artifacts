import { Scene, UniversalCamera, Vector3 } from "@babylonjs/core";
import { PlayerInput } from "./inputController";

// Player movment, jump, sprint, crouch
export class Player {
    public camera: UniversalCamera;
    private _input: PlayerInput;
    private _scene: Scene;

    // Movement state
    private _isJumping: boolean = false;
    private _isCrouched: boolean = false;

    // Physics values
    private _gravity: number = -50;   // -50 work best
    private _jumpForce: number = 23;  // 23 work best
    private _verticalVelocity: number = 0;

    // ground height setting (keep this value)
    private _standHeight: number = 2.0;
    private _crouchHeight: number = 1.6;

    constructor(scene: Scene, canvas: HTMLCanvasElement, input: PlayerInput) {
        this._scene = scene;
        this._input = input;

        // Setup Camera
        this.camera = new UniversalCamera("playerCamera", new Vector3(0, this._standHeight, -10), scene);
        this.camera.attachControl(canvas, true);

        // Disable built in keyboard movement (custom movement)
        this.camera.inputs.removeByType("FreeCameraKeyboardMoveInput");

        // Enable collisions
        scene.collisionsEnabled = true;
        this.camera.checkCollisions = true;

        // disable babylon gravity, use custom gravity (movement speed value)
        this.camera.applyGravity = false;

        // Collision capsule standing
        this.camera.ellipsoid = new Vector3(0.5, 1.0, 0.5);
        this.camera.ellipsoidOffset = new Vector3(0, 1.0, 0);

        this.camera.minZ = 0.01;
    }

    // Player Update (Movement WASD, Jump Space, Sprint Shift, Crouch Ctrl)
    public update(): void {
        const engine = this._scene.getEngine();
        const dt = engine.getDeltaTime() / 1000;

        // Movement Speed value (Walk / Sprint)
        const walkSpeed = 2;
        const sprintSpeed = 5;
        const moveSpeed = this._input.sprint ? sprintSpeed : walkSpeed;
        // Camera direction
        const forward = this.camera.getDirection(new Vector3(0, 0, 1));
        const right = this.camera.getDirection(new Vector3(1, 0, 0));

        // Flatten to XZ plane
        forward.y = 0;
        right.y = 0;
        forward.normalize();
        right.normalize();

        // CROUCH (Ctrl)
        // Ensure correct collision capsule height
        if (this._input.crouch && !this._isCrouched) {
            this._isCrouched = true;

            // Lower camera
            this.camera.position.y = this._crouchHeight;

            // Shorter capsule
            this.camera.ellipsoid = new Vector3(0.5, 0.8, 0.5);
            this.camera.ellipsoidOffset = new Vector3(0, 0.8, 0);
        }
        else if (!this._input.crouch && this._isCrouched) {
            this._isCrouched = false;

            // Raise camera
            this.camera.position.y = this._standHeight;

            // Restore capsule
            this.camera.ellipsoid = new Vector3(0.5, 1.0, 0.5);
            this.camera.ellipsoidOffset = new Vector3(0, 1.0, 0);
        }

        // Gravity
        this._verticalVelocity += this._gravity * dt;

        // Ground check
        // Only grounded when falling and touching floor
        const grounded =
            this._verticalVelocity <= 0 &&
            this.camera.position.y <= this._standHeight + 0.05;
        // JUMP
        if (grounded) {
            // lock to exact stand/crouch height
            this.camera.position.y = this._isCrouched ? this._crouchHeight : this._standHeight;

            this._verticalVelocity = 0;
            this._isJumping = false;

            if (this._input.jump) {
                this._verticalVelocity = this._jumpForce;
                this._isJumping = true;
            }
        }
        // Apply vertical movement
        this.camera.position.y += this._verticalVelocity * dt;

        // Horizontal movement (WASD)
        const horizontalMove =
            forward.scale(this._input.vertical * moveSpeed * dt)
            .add(right.scale(this._input.horizontal * moveSpeed * dt));

        // Apply horizontal movement
        this.camera.cameraDirection.addInPlace(horizontalMove);
    }
}
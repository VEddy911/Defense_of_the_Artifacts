import { Scene, UniversalCamera, Vector3 } from "@babylonjs/core";
import { PlayerInput } from "./inputController";
import { socket } from "./network";

export class Player {
    public camera: UniversalCamera;
    private _input: PlayerInput;
    private _scene: Scene;

    private _isJumping = false;
    private _isCrouched = false;

    private _gravity = -50;
    private _jumpForce = 23;
    private _verticalVelocity = 0;

    private _standHeight = 2.0;
    private _crouchHeight = 1.6;

    constructor(scene: Scene, canvas: HTMLCanvasElement, input: PlayerInput) {
        this._scene = scene;
        this._input = input;

        this.camera = new UniversalCamera("playerCamera", new Vector3(0, this._standHeight, -10), scene);
        this.camera.attachControl(canvas, true);

        this.camera.inputs.removeByType("FreeCameraKeyboardMoveInput");

        scene.collisionsEnabled = true;
        this.camera.checkCollisions = true;

        this.camera.applyGravity = false;

        this.camera.ellipsoid = new Vector3(0.5, 1.0, 0.5);
        this.camera.ellipsoidOffset = new Vector3(0, 1.0, 0);

        this.camera.minZ = 0.01;
    }

    public update(): void {
        const dt = this._scene.getEngine().getDeltaTime() / 1000;

        // Movement speed
        const walkSpeed = 2;
        const sprintSpeed = 5;
        const moveSpeed = this._input.sprint ? sprintSpeed : walkSpeed;

        const forward = this.camera.getDirection(new Vector3(0, 0, 1));
        const right = this.camera.getDirection(new Vector3(1, 0, 0));
        forward.y = 0;
        right.y = 0;
        forward.normalize();
        right.normalize();

        // CROUCH
        if (this._input.crouch && !this._isCrouched) {
            this._isCrouched = true;
            this.camera.position.y = this._crouchHeight;
            this.camera.ellipsoid = new Vector3(0.5, 0.8, 0.5);
            this.camera.ellipsoidOffset = new Vector3(0, 0.8, 0);
        } else if (!this._input.crouch && this._isCrouched) {
            this._isCrouched = false;
            this.camera.position.y = this._standHeight;
            this.camera.ellipsoid = new Vector3(0.5, 1.0, 0.5);
            this.camera.ellipsoidOffset = new Vector3(0, 1.0, 0);
        }

        // GRAVITY
        this._verticalVelocity += this._gravity * dt;

        const grounded =
            this._verticalVelocity <= 0 &&
            this.camera.position.y <= this._standHeight + 0.05;

        // JUMP
        if (grounded) {
            this.camera.position.y = this._isCrouched ? this._crouchHeight : this._standHeight;
            this._verticalVelocity = 0;
            this._isJumping = false;

            if (this._input.jump) {
                this._verticalVelocity = this._jumpForce;
                this._isJumping = true;
            }
        }

        this.camera.position.y += this._verticalVelocity * dt;

        // HORIZONTAL MOVE
        const horizontalMove =
            forward.scale(this._input.vertical * moveSpeed * dt)
                   .add(right.scale(this._input.horizontal * moveSpeed * dt));

        this.camera.cameraDirection.addInPlace(horizontalMove);

        // multiplayer - send position and rotation to server
        socket.emit("player-update", {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z,
            ry: this.camera.rotation.y,
        });
    }
}
import { Color3, MeshBuilder, Scene, StandardMaterial, UniversalCamera, Vector3 } from "@babylonjs/core";
import { PlayerInput } from "./inputController";
import { socket } from "./network";
import type { WeaponId } from "./weapons";

export class Player {
    public camera: UniversalCamera;
    private _input: PlayerInput;
    private _scene: Scene;

    private _isCrouched = false;
    private _isAds = false;

    private _gravity = -50;
    private _jumpForce = 23;
    private _verticalVelocity = 0;

    private _eyeHeight = 2.0;
    private _crouchHeight = 1.5;
    private _defaultFov = 0.8;
    private _adsFov = 0.55;
    private _weaponMesh?: any;
    private _barrelMesh?: any;
    private _bobTime = 0;
    private _weaponOffset = new Vector3(0.25, -0.18, 0.4);

    constructor(scene: Scene, canvas: HTMLCanvasElement, input: PlayerInput) {
        this._scene = scene;
        this._input = input;

        this.camera = new UniversalCamera("playerCamera", new Vector3(0, this._eyeHeight, -10), scene);
        this.camera.attachControl(canvas, true);

        this.camera.inputs.removeByType("FreeCameraKeyboardMoveInput");

        scene.collisionsEnabled = true;
        this.camera.checkCollisions = true;

        this.camera.applyGravity = false;

        this.camera.ellipsoid = new Vector3(0.5, 1.0, 0.5);
        this.camera.ellipsoidOffset = new Vector3(0, 1.0, 0);

        this.camera.minZ = 0.01;
        this.camera.fov = this._defaultFov;

        this._buildWeaponMesh("rifle");
    }

    public respawn(position: Vector3): void {
        this.camera.position.copyFrom(position);
        this._verticalVelocity = 0;
    }

    public showWeapon(id: WeaponId): void {
        if (!this._weaponMesh) {
            this._buildWeaponMesh(id);
            return;
        }
        const mat = this._weaponMesh.material as StandardMaterial;
        mat.emissiveColor = this._weaponColor(id);
        this._weaponMesh.isVisible = true;
        if (this._barrelMesh) {
            this._barrelMesh.material = this._weaponMesh.material;
        }
    }

    public getMuzzleWorldPosition(): Vector3 {
        if (this._weaponMesh) {
            return this._weaponMesh.getAbsolutePosition().add(this.camera.getForwardRay().direction.scale(0.3));
        }
        const forward = this.camera.getForwardRay().direction;
        return this.camera.position.add(forward.scale(0.5));
    }

    public isAds(): boolean {
        return this._isAds;
    }

    public getMoveAmount(): number {
        return Math.min(1, Math.abs(this._input.horizontal) + Math.abs(this._input.vertical));
    }

    private _weaponColor(id: WeaponId): Color3 {
        if (id === "rifle") return new Color3(0.3, 0.8, 1);
        if (id === "pistol") return new Color3(1, 0.8, 0.3);
        return new Color3(1, 0.4, 0.4);
    }

    private _buildWeaponMesh(id: WeaponId): void {
        const body = MeshBuilder.CreateBox("weaponBody", { width: 0.08, height: 0.08, depth: 0.35 }, this._scene);
        const barrel = MeshBuilder.CreateCylinder("weaponBarrel", { diameter: 0.04, height: 0.3 }, this._scene);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.z = 0.25;
        barrel.position.y = -0.02;

        const mat = new StandardMaterial("weaponMat", this._scene);
        mat.emissiveColor = this._weaponColor(id);
        body.material = mat;
        barrel.material = mat;

        body.parent = this.camera;
        barrel.parent = body;

        body.position = this._weaponOffset.clone();
        body.rotation = new Vector3(0.1, 0.3, 0);

        this._weaponMesh = body;
        this._barrelMesh = barrel;
    }

    public update(): void {
        const dt = this._scene.getEngine().getDeltaTime() / 1000;

        // Movement speed (reduced while airborne and when crouched/ADS)
        const baseSpeed = 2.8;
        const adsSpeed = 1.6;
        const crouchSpeed = 1.7;
        const isAirborne = this._verticalVelocity !== 0 || this.camera.position.y > this._eyeHeight + 0.05;
        const airPenalty = isAirborne ? 0.5 : 1; // slower in air
        let moveSpeed = baseSpeed;
        if (this._isAds) moveSpeed = adsSpeed;
        if (this._isCrouched) moveSpeed = Math.min(moveSpeed, crouchSpeed);
        moveSpeed *= airPenalty;

        const forward = this.camera.getDirection(new Vector3(0, 0, 1));
        const right = this.camera.getDirection(new Vector3(1, 0, 0));
        forward.y = 0;
        right.y = 0;
        forward.normalize();
        right.normalize();

        // ADS toggle (hold)
        if (this._input.ads && !this._isAds) {
            this._isAds = true;
            this.camera.fov = this._adsFov;
        } else if (!this._input.ads && this._isAds) {
            this._isAds = false;
            this.camera.fov = this._defaultFov;
        }

        // Crouch toggle (hold C)
        if (this._input.crouch && !this._isCrouched) {
            this._isCrouched = true;
            this.camera.position.y = this._crouchHeight;
            this.camera.ellipsoid = new Vector3(0.5, 0.8, 0.5);
            this.camera.ellipsoidOffset = new Vector3(0, 0.8, 0);
        } else if (!this._input.crouch && this._isCrouched) {
            this._isCrouched = false;
            this.camera.position.y = this._eyeHeight;
            this.camera.ellipsoid = new Vector3(0.5, 1.0, 0.5);
            this.camera.ellipsoidOffset = new Vector3(0, 1.0, 0);
        }

        // GRAVITY
        this._verticalVelocity += this._gravity * dt;

        const targetHeight = this._isCrouched ? this._crouchHeight : this._eyeHeight;
        const grounded =
            this._verticalVelocity <= 0 &&
            this.camera.position.y <= targetHeight + 0.05;

        // JUMP
        if (grounded) {
            this.camera.position.y = targetHeight;
            this._verticalVelocity = 0;

            if (this._input.jump) {
                this._verticalVelocity = this._jumpForce;
            }
        }

        this.camera.position.y += this._verticalVelocity * dt;

        // HORIZONTAL MOVE
        const horizontalMove =
            forward.scale(this._input.vertical * moveSpeed * dt)
                   .add(right.scale(this._input.horizontal * moveSpeed * dt));

        this.camera.cameraDirection.addInPlace(horizontalMove);

        // weapon bob / sway
        this._bobTime += dt * (Math.abs(this._input.horizontal) + Math.abs(this._input.vertical) > 0 ? 8 : 3);
        const bob = Math.sin(this._bobTime) * 0.02;
        const sway = Math.sin(this._bobTime * 0.5) * 0.01;
        if (this._weaponMesh) {
            const target = new Vector3(this._weaponOffset.x + sway, this._weaponOffset.y + bob, this._weaponOffset.z);
            this._weaponMesh.position = target;
        }

        // multiplayer - send position and rotation to server
        socket.emit("player-update", {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z,
            ry: this.camera.rotation.y,
        });
    }
}

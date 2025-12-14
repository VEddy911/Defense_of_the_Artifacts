import { Color3, MeshBuilder, Scene, SceneLoader, StandardMaterial, TransformNode, UniversalCamera, Vector3 } from "@babylonjs/core";
import { PlayerInput } from "./inputController";
import { socket } from "./network";
import type { WeaponId } from "./weapons";
import { computeMoveAmount } from "./movement";
import { getWeaponColorComponents } from "./weaponColor";

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
    private _weaponMesh?: TransformNode;
    private _weaponRoot?: TransformNode;
    private _weaponCache: Partial<Record<WeaponId, TransformNode>> = {};
    private _currentWeaponConfig?: { hipPos: Vector3; adsPos: Vector3; rot: Vector3; scale: number };
    private _loaderReady?: Promise<void>;

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

        void this.showWeapon("rifle");
    }

    public respawn(position: Vector3): void {
        this.camera.position.copyFrom(position);
        this._verticalVelocity = 0;
    }

    public showWeapon(id: WeaponId): void {
        void this._loadWeaponModel(id);
    }

    // tracer position adjust here
    public getMuzzleWorldPosition(): Vector3 {
        const forward = this.camera.getForwardRay().direction;
        if (this._weaponMesh) {
            return this._weaponMesh.getAbsolutePosition()
                .add(forward.scale(0.5))
                .add(new Vector3(0, 0.02, 0.3));
        }
        return this.camera.position.add(forward.scale(0.5));
    }

    public isAds(): boolean {
        return this._isAds;
    }

    public getMoveAmount(): number {
        return computeMoveAmount(this._input.horizontal, this._input.vertical);
    }

    private _weaponColor(id: WeaponId): Color3 {
        const { r, g, b } = getWeaponColorComponents(id);
        return new Color3(r, g, b);
    }

    private async _loadWeaponModel(id: WeaponId): Promise<void> {
        const cfg: Record<WeaponId, { file: string; hipPos: Vector3; adsPos: Vector3; rot: Vector3; scale: number }> = {
            // weapon position -90 degree face forward. keep melee 90
            rifle: {
                file: "rifle.glb",
                hipPos: new Vector3(0.3, -0.16, 0.45),
                adsPos: new Vector3(0.08, -0.14, 0.5),
                rot: new Vector3(0, -Math.PI / 2, 0),
                scale: 1.5,
            },
            pistol: {
                file: "pistol.glb",
                hipPos: new Vector3(0.2, -0.16, 0.5),
                adsPos: new Vector3(0.08, -0.14, 0.52),
                rot: new Vector3(0, -Math.PI / 2, 0),
                scale: 1.5,
            },
            melee: {
                file: "melee.glb",
                hipPos: new Vector3(0.22, -0.1, 0.4),
                adsPos: new Vector3(0.22, -0.1, 0.4),
                rot: new Vector3(0, Math.PI / 2, 0),
                scale: 0.5,
            },
        };

        try {
            let cached = this._weaponCache[id];
            if (!cached) {
                await this._ensureGltfLoader();
                const res = await SceneLoader.ImportMeshAsync("", "/models/", cfg[id].file, this._scene);
                const root = new TransformNode(`weapon_${id}_root`, this._scene);
                for (const m of res.meshes) {
                    if (m === res.meshes[0]) continue;
                    m.parent = root;
                }
                root.position.copyFrom(cfg[id].hipPos);
                root.rotation = cfg[id].rot;
                root.scaling = new Vector3(cfg[id].scale, cfg[id].scale, cfg[id].scale);
                root.setEnabled(false);
                this._weaponCache[id] = root;
                cached = root;
            }

            const instance = cached.clone(`weapon_${id}_${Date.now()}`, this.camera) as TransformNode;
            instance.parent = this.camera;
            instance.setEnabled(true);

            if (this._weaponRoot) {
                this._weaponRoot.dispose();
            }
            this._weaponRoot = instance;
            this._weaponMesh = instance;
            this._currentWeaponConfig = cfg[id];
            this._applyWeaponPose();
        } catch (err) {
            // fallback primitive if model fails
            const body = MeshBuilder.CreateBox("weaponBody", { width: 0.08, height: 0.08, depth: 0.35 }, this._scene);
            body.position = new Vector3(0.25, -0.18, 0.4);
            body.rotation = new Vector3(0.1, 0.3, 0);
            const mat = new StandardMaterial("weaponMat", this._scene);
            mat.emissiveColor = this._weaponColor(id);
            body.material = mat;
            body.parent = this.camera;
            if (this._weaponRoot) this._weaponRoot.dispose();
            this._weaponRoot = body;
            this._weaponMesh = body;
        }
    }

    private _ensureGltfLoader(): Promise<void> {
        if (!this._loaderReady) {
            this._loaderReady = import("@babylonjs/loaders/glTF").then(() => undefined);
        }
        return this._loaderReady;
    }

    private _applyWeaponPose(): void {
        if (!this._weaponRoot || !this._currentWeaponConfig) return;
        const cfg = this._currentWeaponConfig;
        const pos = this._isAds ? cfg.adsPos : cfg.hipPos;
        this._weaponRoot.position.copyFrom(pos);
        this._weaponRoot.rotation = cfg.rot;
        this._weaponRoot.scaling = new Vector3(cfg.scale, cfg.scale, cfg.scale);
    }

    public update(): void {
        const dt = this._scene.getEngine().getDeltaTime() / 1000;

        // Movement speed - reduced while airborne and when crouch/ADS 
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

        // ADS toggle hold shift
        if (this._input.ads && !this._isAds) {
            this._isAds = true;
            this.camera.fov = this._adsFov;
            this._applyWeaponPose();
        } else if (!this._input.ads && this._isAds) {
            this._isAds = false;
            this.camera.fov = this._defaultFov;
            this._applyWeaponPose();
        }

        // Crouch toggle hold C
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

        // multiplayer - send position and rotation to server
        socket.emit("player-update", {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z,
            ry: this.camera.rotation.y,
        });
    }
}

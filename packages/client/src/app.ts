import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";

import { HUD } from "./hud";

import {
    Engine,
    Scene,
    Color4,
    Vector3,
    FreeCamera,
} from "@babylonjs/core";

import {
    AdvancedDynamicTexture,
    TextBlock,
    Rectangle,
    Control,
    Button
} from "@babylonjs/gui";

import { Environment } from "./environment";
import { PlayerInput } from "./inputController";
import { Player } from "./characterController";

enum State { START = 0, IN_GAME = 2, GAME_END = 3 }

export class App {
    private _scene: Scene;
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;

    private _state: number = 0;
    private _gamescene!: Scene;

    private _environment?: Environment;
    private _input?: PlayerInput;
    private _player?: Player;

    private _hud?: HUD;

    constructor() {
        this._canvas = this._createCanvas();

        this._engine = new Engine(this._canvas, true);
        this._scene = new Scene(this._engine);

        // Toggle inspector
        window.addEventListener("keydown", (ev) => {
            if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
                this._scene.debugLayer.isVisible()
                    ? this._scene.debugLayer.hide()
                    : this._scene.debugLayer.show();
            }
        });

        this._main();
    }

    private async _main(): Promise<void> {
        await this._setUpGame();
        await this._goToStart();

        this._engine.runRenderLoop(() => {
            this._scene.render();
        });

        window.addEventListener("resize", () => {
            this._engine.resize();
        });
    }

    private _createCanvas(): HTMLCanvasElement {
        const canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.id = "gameCanvas";
        document.body.appendChild(canvas);
        return canvas;
    }

    private async _setUpGame() {
        const scene = new Scene(this._engine);
        this._gamescene = scene;

        this._environment = new Environment(scene);
        await this._environment.load();

        this._input = new PlayerInput(scene);
        this._player = new Player(scene, this._canvas, this._input);
    }

    // START MENU
    private async _goToStart() {
        this._engine.displayLoadingUI();
        this._scene.detachControl();

        const scene = new Scene(this._engine);
        scene.clearColor = new Color4(0, 0, 0, 1);

        const camera = new FreeCamera("menuCamera", new Vector3(0, 0, -10), scene);
        camera.setTarget(Vector3.Zero());
        scene.attachControl();

        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
        guiMenu.idealHeight = 720;

        const startBtn = Button.CreateSimpleButton("start", "PLAY");
        startBtn.width = 0.2;
        startBtn.height = "40px";
        startBtn.color = "white";
        startBtn.top = "-14px";
        startBtn.thickness = 0;
        startBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        guiMenu.addControl(startBtn);

        startBtn.onPointerDownObservable.add(() => {
            this._goToGame();
        });


        await scene.whenReadyAsync();
        this._engine.hideLoadingUI();

        this._scene.dispose();
        this._scene = scene;
        this._state = State.START;
    }

    // GAMEPLAY
    private async _goToGame() {
        this._scene.detachControl();

        const scene = this._gamescene;
        scene.clearColor = new Color4(0.01, 0.015, 0.2);

        if (this._player) {
            scene.activeCamera = this._player.camera;
        }

        if (this._player) {
            scene.onBeforeRenderObservable.clear();
            scene.onBeforeRenderObservable.add(() => {
                this._player!.update();
            });
        }

        // FIXED — Delay HUD until AFTER the scene becomes active
        this._scene.dispose();
        this._scene = scene;
        this._state = State.IN_GAME;

        // NOW safe to initialize HUD
        this._hud = new HUD(this._scene);
        this._hud.buildHUD();

        // Mouse lock
        const canvas = this._canvas;
        scene.onPointerDown = (evt) => {
            if (evt.button === 0) {
                canvas.requestPointerLock();
            }
        };

        document.addEventListener("pointerlockchange", () => {
            const locked = document.pointerLockElement === canvas;
            console.log("Pointer lock:", locked ? "locked" : "unlocked");
        });

        this._engine.hideLoadingUI();
        this._scene.attachControl();
    }
}

export default new App();
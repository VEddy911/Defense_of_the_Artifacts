import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";

import {
    Engine,
    Scene,
    Color4,
    Vector3,
    FreeCamera,
    ArcRotateCamera,
    HemisphericLight,
    Mesh,
    MeshBuilder
} from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, Control } from "@babylonjs/gui";

import { Environment } from "./environment";
import { PlayerInput } from "./inputController";
import { Player } from "./characterController";

/**
 * Game states used to drive the simple state machine.  START displays
 * the main menu, IN_GAME runs the game scene, and GAME_END is reserved for
 * future end state screens.
 */
enum State { START = 0, IN_GAME = 2, GAME_END = 3 }

export class App {
    private _scene: Scene;
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;

    // game state tracking
    private _state: number = 0;
    private _gamescene: Scene;

    // game object references
    private _environment: Environment | undefined;
    private _input: PlayerInput | undefined;
    private _player: Player | undefined;

    constructor() {
        this._canvas = this._createCanvas();

        // initialize babylon scene & engine
        this._engine = new Engine(this._canvas, true);
        this._scene = new Scene(this._engine);

        // hide/show the Inspector with Shift+Ctrl+Alt+I
        window.addEventListener("keydown", (ev) => {
            if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
                if (this._scene.debugLayer.isVisible()) {
                    this._scene.debugLayer.hide();
                } else {
                    this._scene.debugLayer.show();
                }
            }
        });

        this._main();
    }

    private async _main(): Promise<void> {
        await this._setUpGame();
        await this._goToStart();

        // Run the appropriate scene based on the current state
        this._engine.runRenderLoop(() => {
            switch (this._state) {
                case State.START:
                    this._scene.render();
                    break;
                case State.IN_GAME:
                    this._scene.render();
                    break;
                case State.GAME_END:
                    this._scene.render();
                    break;
                default:
                    break;
            }
        });

        window.addEventListener('resize', () => {
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

        // Create the player with a first‑person camera.  The player's
        // update method will be called each frame via the scene's
        // onBeforeRenderObservable in goToGame().  Pass in canvas so
        // pointer lock/mouse look can attach correctly.
        this._player = new Player(scene, this._canvas, this._input);
    }

     // Transitions to the start menu.
    private async _goToStart() {
        this._engine.displayLoadingUI();
        this._scene.detachControl();
        const scene = new Scene(this._engine);
        scene.clearColor = new Color4(0, 0, 0, 1);
        // Set up a free camera for the menu
        const camera = new FreeCamera("menuCamera", new Vector3(0, 0, -10), scene);
        camera.setTarget(Vector3.Zero());
        scene.attachControl();

        // GUI
        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
        guiMenu.idealHeight = 720;

        const startBtn = Button.CreateSimpleButton("start", "PLAY");
        startBtn.width = 0.2;
        startBtn.height = "40px";
        startBtn.color = "white";
        startBtn.top = "-14px";
        startBtn.thickness = 0;
        startBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
        guiMenu.addControl(startBtn);

        startBtn.onPointerDownObservable.add(() => {
            this._goToGame();
        });

        // Wait for the scene to be ready and switch
        await scene.whenReadyAsync();
        this._engine.hideLoadingUI();
        this._scene.dispose();
        this._scene = scene;
        this._state = State.START;
    }

     // Sets up and transitions into the gameplay scen
    private async _goToGame() {
        this._scene.detachControl();

        const scene = this._gamescene;
        // dark blue
        scene.clearColor = new Color4(0.01, 0.015, 0.2);

        // Ensure the player's camera is set as the active camera
        if (this._player) {
            scene.activeCamera = this._player.camera;
        }

        if (this._player) {
            scene.onBeforeRenderObservable.clear();
            scene.onBeforeRenderObservable.add(() => {
                this._player!.update();
            });
        }

        // TODO: add in‑game GUI elements, sounds and shadow generators

        // Transition state
        this._scene.dispose();
        this._state = State.IN_GAME;
        this._scene = scene;
        this._engine.hideLoadingUI();
        // Attach control to the scene so pointer lock works when playing
        this._scene.attachControl();
    }
}

export default new App();


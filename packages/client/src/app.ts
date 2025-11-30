import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, 
    Color3, Color4, FreeCamera, MeshBuilder } from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, Control } from "@babylonjs/gui";

enum State { START = 0, IN_GAME = 2, GAME_END = 3 }

export class App {
    private _scene: Scene;
    private _canvas: HTMLCanvasElement;
    private _engine: Engine;

    // game state stuff

    // scene related stuff
    private _state: number = 0;
    private _gamescene: Scene;
    
    constructor() {
        // create the canvas html element and attach it to the webpage
        this._canvas = this._createCanvas();

        // initialize babylon scene & engine
        this._engine = new Engine(this._canvas, true);
        this._scene = new Scene(this._engine);

        // hide/show the Inspector
        window.addEventListener("keydown", (ev) => {
            // Shift+Ctrl+Alt+I
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
        await this._goToStart()

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
                default: break;
            }
        });

        window.addEventListener('resize', () => {
            this._engine.resize();
        });
    }
    private _createCanvas(): HTMLCanvasElement {
        this._canvas = document.createElement("canvas");
        this._canvas.style.width = "100%";
        this._canvas.style.height = "100%";
        this._canvas.id = "gameCanvas";
        document.body.appendChild(this._canvas);

        return this._canvas;
    }
    private async _goToStart() {
        this._engine.displayLoadingUI();
        
        this._scene.detachControl();
        let scene = new Scene(this._engine)
        scene.clearColor = new Color4(0, 0, 0, 1);
        let camera = new FreeCamera("camera1", new Vector3(0, 0, 0), scene);
        camera.setTarget(Vector3.Zero());

        scene.attachControl();


        // -- GUI --
        const guiMenu = AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
        guiMenu.idealHeight = 720;

        // start button
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
            // scene.detachControl(); // observables disabled
        });

        // SCENE FINISHED LOADING
        await scene.whenReadyAsync();
        this._engine.hideLoadingUI();
        
        this._scene.dispose();
        this._scene = scene;
        this._state = State.START;
    }

    private async _setUpGame() {
        let scene = new Scene(this._engine);
        this._gamescene = scene;

        // TODO: Add lights, meshes, etc

    }

    private async _goToGame() {
        // -- SETUP SCENE --
        this._scene.detachControl();
        let scene = this._gamescene;
        scene.clearColor = new Color4(.01, .015,.2);
        let camera: ArcRotateCamera = new ArcRotateCamera("Camera", Math.PI / 2,
            Math.PI / 2, 2, Vector3.Zero(), scene);
        camera.setTarget(Vector3.Zero());

        // -- GUI --
        const playerUI = AdvancedDynamicTexture.CreateFullscreenUI("UI");
        scene.detachControl(); // don't receive input while loading

        // tmp scene object
        var light1: HemisphericLight = new HemisphericLight("light1", new 
            Vector3(1, 1, 0), scene);
        var sphere: Mesh = MeshBuilder.CreateSphere("sphere", { diameter: 1 },
            scene);
        
        // remove start scene and switch to game State
        this._scene.dispose();
        this._state = State.IN_GAME;
        this._scene = scene;
        this._engine.hideLoadingUI();
        this._scene.attachControl();
    }
}
export default new App();

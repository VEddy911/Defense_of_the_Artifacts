import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { createCanvas } from "./createCanvas";

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
  Control,
  Button,
} from "@babylonjs/gui";

import { Environment } from "./environment";
import { PlayerInput } from "./inputController";
import { Player } from "./characterController";
import { ChatUI } from "./chat";

// multiplayer
import { RemotePlayers } from "./remotePlayers";
import { socket } from "./network";
import { buildPlayerState } from "./playerState";

enum State {
  START = 0,
  IN_GAME = 2,
  GAME_END = 3,
}

export class App {
  private _scene: Scene;
  private _canvas: HTMLCanvasElement;
  private _engine: Engine;

  private _state: number = 0;
  private _gamescene!: Scene;

  private _environment?: Environment;
  private _input?: PlayerInput;
  private _player?: Player;
  private _chat?: ChatUI;

  private _hud?: HUD;
  private _remotePlayers?: RemotePlayers;

  private _lastStateSend = 0;

  constructor() {
    this._canvas = createCanvas();

    this._engine = new Engine(this._canvas, true);
    this._scene = new Scene(this._engine);

    // Toggle inspector
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

    this._engine.runRenderLoop(() => {
      // avoid rendering/sending updates when tab is hidden
      if (document.hidden) return;
      this._scene.render();
    });

    window.addEventListener("resize", () => {
      this._engine.resize();
    });
  }

  private async _setUpGame() {
    const scene = new Scene(this._engine);
    this._gamescene = scene;

    this._environment = new Environment(scene);
    await this._environment.load();

    this._input = new PlayerInput();
    this._player = new Player(scene, this._canvas, this._input);
    this._chat = new ChatUI(this._input);

    // remote players manager
    this._remotePlayers = new RemotePlayers(scene);

    // listen for worldState from server
    socket.on("worldState", (data: { players: any[] }) => {
      if (!this._remotePlayers) return;
      this._remotePlayers.syncFromServer(data.players, socket.id);
    });
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

    // main per-frame update
    scene.onBeforeRenderObservable.clear();
    scene.onBeforeRenderObservable.add(() => {
      if (!this._player) return;
      const now = performance.now();

      // local movement
      this._player.update();

      // send local player state to server at ~20 Hz
      if (now - this._lastStateSend >= 50) {
        this._lastStateSend = now;

        const cam = this._player.camera;
        socket.emit("playerState", buildPlayerState(cam));
      }
    });

    // switch scene & HUD
    this._scene.dispose();
    this._scene = scene;
    this._state = State.IN_GAME;

    this._hud = new HUD(this._scene);
    this._hud.buildHUD();

    // pointer lock on left click
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

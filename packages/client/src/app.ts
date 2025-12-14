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
  StackPanel,
  TextBlock,
  InputText,
} from "@babylonjs/gui";

import { Environment } from "./environment";
import { PlayerInput } from "./inputController";
import { Player } from "./characterController";
import { ChatUI } from "./chat";
import { CombatSystem } from "./combat";

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
  private _combat?: CombatSystem;
  private _team?: string;
  private _scores: { teamA: number; teamB: number } = { teamA: 0, teamB: 0 };
  private _scoreLimit = 100;
  private _winner?: string | null;
  private _selectedTeam?: "teamA" | "teamB";
  private _btnTeamA?: Button;
  private _btnTeamB?: Button;
  private _timerMs: number = 5 * 60 * 1000;
  private _playerName: string = `Player ${Math.floor(1000 + Math.random() * 9000)}`;
  private _nameInput?: InputText;

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

    socket.on(
      "world:tracer",
      (data: {
        shooterId?: string;
        origin?: { x: number; y: number; z: number };
        direction?: { x: number; y: number; z: number };
        range?: number;
        weaponId?: string;
      }) => {
        if (!this._remotePlayers) return;
        if (data.shooterId && data.shooterId === socket.id) return;
        this._remotePlayers.spawnTracer(data);
      }
    );

    socket.on("team:assigned", (data: { team?: string }) => {
      this._team = data.team;
      this._hud?.setTeam(this._team);
    });

    socket.on(
      "game:score",
      (data: { scores?: { teamA?: number; teamB?: number }; limit?: number; winner?: string | null }) => {
        this._scores = {
          teamA: data.scores?.teamA ?? 0,
          teamB: data.scores?.teamB ?? 0,
        };
        if (typeof data.limit === "number") this._scoreLimit = data.limit;
        this._winner = data.winner ?? null;
        this._hud?.setScores(this._scores, this._scoreLimit, this._winner);
      }
    );

    socket.on("game:win", (data: { winner?: string; scores?: { teamA?: number; teamB?: number } }) => {
      if (data.scores) {
        this._scores = {
          teamA: data.scores.teamA ?? this._scores.teamA,
          teamB: data.scores.teamB ?? this._scores.teamB,
        };
      }
      this._winner = data.winner ?? null;
      this._hud?.setScores(this._scores, this._scoreLimit, this._winner);
    });

    socket.on("game:reset", () => {
      this._winner = null;
      this._scores = { teamA: 0, teamB: 0 };
      this._hud?.setScores(this._scores, this._scoreLimit, this._winner);
      this._timerMs = 5 * 60 * 1000;
      this._hud?.setTimer(this._timerMs);
    });

    socket.on("connect", () => {
      this._sendTeamSelection();
      this._sendName();
    });

    socket.on("game:timer", (data: { remainingMs?: number; durationMs?: number }) => {
      if (typeof data.remainingMs === "number") {
        this._timerMs = data.remainingMs;
        this._hud?.setTimer(this._timerMs);
      }
    });

    socket.on("game:win", (data: { winner?: string; scores?: { teamA?: number; teamB?: number } }) => {
      if (data.scores) {
        this._scores = {
          teamA: data.scores.teamA ?? this._scores.teamA,
          teamB: data.scores.teamB ?? this._scores.teamB,
        };
      }
      this._winner = data.winner ?? null;
      this._hud?.setScores(this._scores, this._scoreLimit, this._winner);
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

    const infoText = new TextBlock("teamInfo");
    infoText.text = "Pick a team or we will auto-assign to balance.";
    infoText.color = "white";
    infoText.fontSize = 14;
    infoText.fontFamily = "monospace";
    infoText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    infoText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    infoText.top = "-50px";
    guiMenu.addControl(infoText);

    const nameInput = new InputText("nameInput");
    nameInput.width = "200px";
    nameInput.height = "36px";
    nameInput.color = "white";
    nameInput.background = "rgba(255,255,255,0.08)";
    nameInput.thickness = 1;
    nameInput.placeholderText = "Enter name";
    nameInput.text = this._playerName;
    nameInput.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    nameInput.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    nameInput.top = "-90px";
    nameInput.maxWidth = 220;
    nameInput.focusedBackground = "rgba(255,255,255,0.12)";
    guiMenu.addControl(nameInput);
    this._nameInput = nameInput;

    const teamRow = new StackPanel("teamRow");
    teamRow.isVertical = false;
    teamRow.width = "360px";
    teamRow.height = "60px";
    teamRow.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    teamRow.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    teamRow.top = "10px";
    teamRow.spacing = 16;
    guiMenu.addControl(teamRow);

    let btnTeamA: Button;
    let btnTeamB: Button;

    btnTeamA = Button.CreateSimpleButton("teamA", "Team A");
    btnTeamA.width = "160px";
    btnTeamA.height = "44px";
    btnTeamA.color = "white";
    btnTeamA.thickness = 1;
    btnTeamA.cornerRadius = 8;
    btnTeamA.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    btnTeamA.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    btnTeamA.onPointerDownObservable.add(() => this._chooseTeam("teamA"));
    teamRow.addControl(btnTeamA);

    btnTeamB = Button.CreateSimpleButton("teamB", "Team B");
    btnTeamB.width = "160px";
    btnTeamB.height = "44px";
    btnTeamB.color = "white";
    btnTeamB.thickness = 1;
    btnTeamB.cornerRadius = 8;
    btnTeamB.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    btnTeamB.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    btnTeamB.onPointerDownObservable.add(() => this._chooseTeam("teamB"));
    teamRow.addControl(btnTeamB);

    this._btnTeamA = btnTeamA;
    this._btnTeamB = btnTeamB;
    this._applyTeamButtonState();

    const startBtn = Button.CreateSimpleButton("start", "PLAY");
    startBtn.width = 0.2;
    startBtn.height = "40px";
    startBtn.color = "white";
    startBtn.top = "60px";
    startBtn.thickness = 0;
    startBtn.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    startBtn.left = "-10px";
    guiMenu.addControl(startBtn);

    startBtn.onPointerDownObservable.add(() => {
      this._playerName = this._nameInput?.text?.trim() || this._playerName;
      this._sendName();
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
      this._combat?.update();

      // send local player state to server at ~20 Hz
      if (now - this._lastStateSend >= 50) {
        this._lastStateSend = now;

        const cam = this._player.camera;
        socket.emit("playerState", buildPlayerState(cam, this._combat?.getActiveWeaponId()));
      }
    });

    // switch scene & HUD
    this._scene.dispose();
    this._scene = scene;
    this._state = State.IN_GAME;

    this._hud = new HUD(this._scene);
    this._hud.buildHUD();
    if (this._player) {
      this._combat = new CombatSystem(scene, this._player, this._hud);
    }
    this._hud.setTeam(this._team);
    this._hud.setScores(this._scores, this._scoreLimit, this._winner);
    this._hud.setTimer(this._timerMs);

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

  private _chooseTeam(team: "teamA" | "teamB") {
    this._selectedTeam = team;
    this._applyTeamButtonState();
    this._sendTeamSelection();
  }

  private _sendTeamSelection() {
    if (!this._selectedTeam) return;
    socket.emit("team:select", { team: this._selectedTeam });
  }

  private _applyTeamButtonState() {
    const neutralBg = "rgba(255,255,255,0.05)";
    const teamAColor = "#2d7bff";
    const teamBColor = "#ff4f4f";

    if (this._btnTeamA) {
      this._btnTeamA.background = this._selectedTeam === "teamA" ? teamAColor : neutralBg;
      this._btnTeamA.color = "white";
      this._btnTeamA.thickness = 1;
    }

    if (this._btnTeamB) {
      this._btnTeamB.background = this._selectedTeam === "teamB" ? teamBColor : neutralBg;
      this._btnTeamB.color = "white";
      this._btnTeamB.thickness = 1;
    }
  }

  private _sendName() {
    if (!this._playerName) return;
    socket.emit("player:name", { name: this._playerName });
  }
}

export default new App();

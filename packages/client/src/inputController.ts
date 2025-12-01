import { Scene } from "@babylonjs/core";

/**
 * PlayerInput abstracts away the raw keyboard events into simple numeric
 * values representing forward/back (vertical) and left/right (horizontal)
 * movement inputs.  The input controller listens for key down and key up
 * events on the DOM and updates its public properties accordingly.
 */
export class PlayerInput {
    // axis values ranging from -1 to 1
    public horizontal: number = 0;
    public vertical: number = 0;
        // add jump sprint crouch inputs
    public jump: boolean = false;
    public sprint: boolean = false;
    public crouch: boolean = false;

    private _keysPressed: Set<string> = new Set();
    private _scene: Scene;
    private _onKeyDown: (e: KeyboardEvent) => void;
    private _onKeyUp: (e: KeyboardEvent) => void;

    constructor(scene: Scene) {
        this._scene = scene;
        this._onKeyDown = (e) => this._handleKeyDown(e);
        this._onKeyUp = (e) => this._handleKeyUp(e);
        // Attach directly to window so that input is captured even when pointer lock is active.
        window.addEventListener("keydown", this._onKeyDown);
        window.addEventListener("keyup", this._onKeyUp);
    }
    // added key for SSC
    private _handleKeyDown(e: KeyboardEvent) {
        const key = e.key.toLowerCase();
        this._keysPressed.add(key);

        if (key === " ") this.jump = true;           // Space = jump
        if (key === "shift") this.sprint = true;     // Shift = sprint
        if (key === "control") this.crouch = true;   // Ctrl = crouch

        this._updateAxes();
    }

    private _handleKeyUp(e: KeyboardEvent) {
        const key = e.key.toLowerCase();
        this._keysPressed.delete(key);

        if (key === " ") this.jump = false;
        if (key === "shift") this.sprint = false;
        if (key === "control") this.crouch = false;

        this._updateAxes();
    }


    // Convert the current set of pressed keys into horizontal and vertical
    private _updateAxes() {
        // Forward/back
        let v = 0;
        if (this._keysPressed.has("w") || this._keysPressed.has("arrowup")) {
            v += 1;
        }
        if (this._keysPressed.has("s") || this._keysPressed.has("arrowdown")) {
            v -= 1;
        }
        this.vertical = v;
        // Left/right
        let h = 0;
        if (this._keysPressed.has("d") || this._keysPressed.has("arrowright")) {
            h += 1;
        }
        if (this._keysPressed.has("a") || this._keysPressed.has("arrowleft")) {
            h -= 1;
        }
        this.horizontal = h;
    }

    public detach() {
        window.removeEventListener("keydown", this._onKeyDown);
        window.removeEventListener("keyup", this._onKeyUp);
    }

}


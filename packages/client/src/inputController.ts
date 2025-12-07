export class PlayerInput {
    // axis values ranging from -1 to 1
    public horizontal: number = 0;
    public vertical: number = 0;
        // add jump + ADS inputs
    public jump: boolean = false;
    public ads: boolean = false;
    public crouch: boolean = false;

    private _keysPressed: Set<string> = new Set();
    private _enabled = true;
    private _onKeyDown: (e: KeyboardEvent) => void;
    private _onKeyUp: (e: KeyboardEvent) => void;

    constructor() {
        this._onKeyDown = (e) => this._handleKeyDown(e);
        this._onKeyUp = (e) => this._handleKeyUp(e);
        // Attach directly to window so that input is captured even when pointer lock is active.
        window.addEventListener("keydown", this._onKeyDown);
        window.addEventListener("keyup", this._onKeyUp);
    }
    // added key for SSC
    private _handleKeyDown(e: KeyboardEvent) {
        if (this._shouldIgnoreInput(e)) return;

        const key = e.key.toLowerCase();
        this._keysPressed.add(key);

        if (key === " ") this.jump = true;           // Space = jump
        if (key === "shift") this.ads = true;        // Shift = ADS
        if (key === "c") this.crouch = true;         // C = crouch

        this._updateAxes();
    }

    private _handleKeyUp(e: KeyboardEvent) {
        if (this._shouldIgnoreInput(e)) return;

        const key = e.key.toLowerCase();
        this._keysPressed.delete(key);

        if (key === " ") this.jump = false;
        if (key === "shift") this.ads = false;
        if (key === "c") this.crouch = false;

        this._updateAxes();
    }

    private _shouldIgnoreInput(e: KeyboardEvent): boolean {
        if (!this._enabled) return true;
        const target = e.target as HTMLElement | null;
        if (!target) return false;
        const tag = target.tagName.toLowerCase();
        return tag === "input" || tag === "textarea" || target.isContentEditable === true;
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

    public setEnabled(enabled: boolean) {
        this._enabled = enabled;
        if (!enabled) {
            this._keysPressed.clear();
            this.horizontal = 0;
            this.vertical = 0;
            this.jump = false;
            this.ads = false;
            this.crouch = false;
        }
    }

}


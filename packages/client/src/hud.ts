import {
    AdvancedDynamicTexture,
    TextBlock,
    Rectangle,
    Control,
    Button
} from "@babylonjs/gui";

import { Scene } from "@babylonjs/core";

export class HUD {
    private _scene: Scene;

    private _ui!: AdvancedDynamicTexture;
    private _crosshair!: Rectangle;
    private _healthBar!: Rectangle;
    private _healthFill!: Rectangle;
    private _ammoText!: TextBlock;

    constructor(scene: Scene) {
        this._scene = scene;
    }

public buildHUD(): void {
    this._ui = AdvancedDynamicTexture.CreateFullscreenUI("HUD", true, this._scene);
    // CROSSHAIR
    this._crosshair = new Rectangle("crosshair");
    this._crosshair.width = "8px";
    this._crosshair.height = "8px";
    this._crosshair.color = "white";
    this._crosshair.background = "white";
    this._crosshair.thickness = 0;
    this._crosshair.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this._crosshair.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this._ui.addControl(this._crosshair);

    // HEALTH BAR
    this._healthBar = new Rectangle("healthBar");
    this._healthBar.width = "200px";
    this._healthBar.height = "25px";
    this._healthBar.color = "white";
    this._healthBar.thickness = 2;
    this._healthBar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this._healthBar.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this._healthBar.left = 20;
    this._healthBar.top = -20;
    this._ui.addControl(this._healthBar);

    this._healthFill = new Rectangle("healthFill");
    this._healthFill.width = "100%";
    this._healthFill.height = "100%";
    this._healthFill.background = "red";
    this._healthBar.addControl(this._healthFill);

    // --- AMMO TEXT ---
    this._ammoText = new TextBlock("ammoText");
    this._ammoText.text = "Ammo: 0 / 0";
    this._ammoText.color = "white";
    this._ammoText.fontSize = 24;

    this._ammoText.width = "200px"; 
    this._ammoText.height = "60px";   // ← bigger box prevents cropping

    // Container alignment (on-screen)
    this._ammoText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this._ammoText.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;

    // Text alignment (inside the box)
    this._ammoText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this._ammoText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;

    // Padding
    this._ammoText.paddingRight = "30px";
    this._ammoText.paddingBottom = "15px";
    this._ammoText.paddingTop = "5px";

    this._ammoText.zIndex = 10;

    this._ui.addControl(this._ammoText);

}
}
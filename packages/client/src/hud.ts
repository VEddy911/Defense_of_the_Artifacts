import {
  AdvancedDynamicTexture,
  Control,
  Rectangle,
  StackPanel,
  TextBlock,
} from "@babylonjs/gui";
import { Scene } from "@babylonjs/core";

export class HUD {
  private _scene: Scene;

  private _ui!: AdvancedDynamicTexture;
  private _crosshair!: Rectangle;
  private _healthBarFill!: Rectangle;
  private _healthText!: TextBlock;
  private _ammoText!: TextBlock;

  constructor(scene: Scene) {
    this._scene = scene;
  }

  public buildHUD(): void {
    this._ui = AdvancedDynamicTexture.CreateFullscreenUI("HUD", true, this._scene);
    this._ui.idealHeight = 720;

    // Health panel bottom-left (under chat)
    const healthPanel = new Rectangle("healthPanel");
    healthPanel.width = "350px";
    healthPanel.height = "60px";
    healthPanel.cornerRadius = 12;
    healthPanel.thickness = 1;
    healthPanel.color = "rgba(255,255,255,0.08)";
    healthPanel.background = "rgba(10, 12, 26, 0.55)";
    healthPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    healthPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    healthPanel.left = "16px";
    healthPanel.top = "-16px";
    healthPanel.paddingLeft = "14px";
    healthPanel.paddingRight = "14px";
    healthPanel.paddingTop = "12px";
    healthPanel.paddingBottom = "12px";
    this._ui.addControl(healthPanel);

    const healthStack = new StackPanel();
    healthStack.isVertical = true;
    healthStack.spacing = 8;
    healthStack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    healthStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    healthStack.paddingTop = "2px";
    healthPanel.addControl(healthStack);

    const healthContainer = new Rectangle("healthContainer");
    healthContainer.width = "100%";
    healthContainer.height = "28px";
    healthContainer.cornerRadius = 8;
    healthContainer.color = "rgba(255,255,255,0.12)";
    healthContainer.thickness = 1;
    healthContainer.background = "rgba(255,255,255,0.04)";
    healthContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    healthContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    healthContainer.paddingBottom = "2px";
    healthStack.addControl(healthContainer);

    const healthFill = new Rectangle("healthFill");
    healthFill.width = "100%";
    healthFill.height = "100%";
    healthFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    healthFill.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    healthFill.background = "#82e2ff";
    healthFill.thickness = 0;
    healthFill.alpha = 0.8;
    healthContainer.addControl(healthFill);
    this._healthBarFill = healthFill;

    const healthText = new TextBlock("healthText");
    healthText.text = "HP 100";
    healthText.color = "#e5ecff";
    healthText.fontSize = 16;
    healthText.fontFamily = "monospace";
    healthText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    healthText.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    healthText.paddingLeft = "8px";
    healthContainer.addControl(healthText);
    this._healthText = healthText;

    // Ammo panel bottom-right
    const ammoPanel = new Rectangle("ammoPanel");
    ammoPanel.width = "200px";
    ammoPanel.height = "60px";
    ammoPanel.cornerRadius = 12;
    ammoPanel.thickness = 1;
    ammoPanel.color = "rgba(255,255,255,0.08)";
    ammoPanel.background = "rgba(10, 12, 26, 0.55)";
    ammoPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    ammoPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    ammoPanel.left = "-30px"; // offset from right edge
    ammoPanel.top = "-16px";
    ammoPanel.paddingLeft = "12px";
    ammoPanel.paddingRight = "12px";
    ammoPanel.paddingTop = "10px";
    ammoPanel.paddingBottom = "10px";
    this._ui.addControl(ammoPanel);

    const ammoBlock = new TextBlock("ammoText");
    ammoBlock.text = "Ammo 0 / 0";
    ammoBlock.color = "#e5ecff";
    ammoBlock.fontSize = 16;
    ammoBlock.fontFamily = "monospace";
    ammoBlock.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    ammoBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    ammoBlock.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    ammoBlock.paddingRight = "4px";
    ammoPanel.addControl(ammoBlock);
    this._ammoText = ammoBlock;

    // CROSSHAIR (minimal dot)
    this._crosshair = new Rectangle("crosshair");
    this._crosshair.width = "6px";
    this._crosshair.height = "6px";
    this._crosshair.color = "#e5ecff";
    this._crosshair.background = "#e5ecff";
    this._crosshair.thickness = 0;
    this._crosshair.cornerRadius = 3;
    this._crosshair.alpha = 0.9;
    this._crosshair.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    this._crosshair.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    this._ui.addControl(this._crosshair);
  }
}

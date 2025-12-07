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
  private _reloadFill?: Rectangle;
  private _reloadContainer?: Rectangle;
  private _weaponText?: TextBlock;
  private _modeText?: TextBlock;
  private _statusText?: TextBlock;
  private _killFeedStack?: StackPanel;
  private _maxHealth = 100;
  private _crosshairBaseSize = 6;

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
    ammoPanel.width = "240px";
    ammoPanel.height = "90px";
    ammoPanel.cornerRadius = 12;
    ammoPanel.thickness = 1;
    ammoPanel.color = "rgba(255,255,255,0.08)";
    ammoPanel.background = "rgba(10, 12, 26, 0.55)";
    ammoPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    ammoPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    ammoPanel.left = "-26px"; // offset from right edge
    ammoPanel.top = "-18px";
    ammoPanel.paddingLeft = "12px";
    ammoPanel.paddingRight = "12px";
    ammoPanel.paddingTop = "12px";
    ammoPanel.paddingBottom = "12px";
    this._ui.addControl(ammoPanel);

    const ammoStack = new StackPanel();
    ammoStack.isVertical = true;
    ammoStack.width = "100%";
    ammoStack.height = "100%";
    ammoStack.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    ammoStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    ammoStack.spacing = 4;
    ammoPanel.addControl(ammoStack);

    const weaponRow = new StackPanel();
    weaponRow.isVertical = false;
    weaponRow.width = "100%";
    weaponRow.height = "20px";
    weaponRow.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    weaponRow.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    weaponRow.spacing = 4;
    ammoStack.addControl(weaponRow);

    const weaponText = new TextBlock("weaponText");
    weaponText.text = "Rifle";
    weaponText.color = "#e5ecff";
    weaponText.fontSize = 14;
    weaponText.fontFamily = "monospace";
    weaponText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    weaponText.paddingLeft = "30px";
    weaponRow.addControl(weaponText);
    this._weaponText = weaponText;

    const modeText = new TextBlock("modeText");
    modeText.text = "AUTO";
    modeText.color = "rgba(229,236,255,0.8)";
    modeText.fontSize = 12;
    modeText.fontFamily = "monospace";
    modeText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    modeText.paddingLeft = "130px";
    modeText.paddingRight = "8px";
    weaponRow.addControl(modeText);
    this._modeText = modeText;

    const ammoBlock = new TextBlock("ammoText");
    ammoBlock.text = "Ammo 0 / 0";
    ammoBlock.color = "#e5ecff";
    ammoBlock.fontSize = 16;
    ammoBlock.fontFamily = "monospace";
    ammoBlock.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    ammoBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    ammoBlock.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    ammoBlock.paddingRight = "4px";
    ammoBlock.paddingTop = "-30px";
    ammoStack.addControl(ammoBlock);
    this._ammoText = ammoBlock;

    const status = new TextBlock("statusText");
    status.text = "";
    status.color = "rgba(229,236,255,0.65)";
    status.fontSize = 12;
    status.fontFamily = "monospace";
    status.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    status.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    status.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    ammoStack.addControl(status);
    this._statusText = status;

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

    // Center reload bar (below crosshair)
    const reloadContainer = new Rectangle("reloadContainer");
    reloadContainer.width = "160px";
    reloadContainer.height = "10px";
    reloadContainer.cornerRadius = 5;
    reloadContainer.thickness = 0;
    reloadContainer.background = "rgba(255,255,255,0.12)";
    reloadContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    reloadContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    reloadContainer.top = "32px";
    reloadContainer.isVisible = false;
    this._ui.addControl(reloadContainer);
    this._reloadContainer = reloadContainer;

    const reloadFill = new Rectangle("reloadFill");
    reloadFill.width = "0%";
    reloadFill.height = "100%";
    reloadFill.cornerRadius = 5;
    reloadFill.thickness = 0;
    reloadFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    reloadFill.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    reloadFill.background = "#82e2ff";
    reloadContainer.addControl(reloadFill);
    this._reloadFill = reloadFill;

    // kill feed top-right
    const feed = new StackPanel("killFeed");
    feed.isVertical = true;
    feed.width = "280px";
    feed.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    feed.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    feed.top = "20px";
    feed.left = "-24px";
    feed.spacing = 4;
    this._ui.addControl(feed);
    this._killFeedStack = feed;
  }

  public setHealth(current: number, max: number = this._maxHealth): void {
    this._maxHealth = max;
    const clamped = Math.max(0, Math.min(current, max));
    const percent = max > 0 ? (clamped / max) * 100 : 0;
    this._healthBarFill.width = `${percent}%`;
    this._healthText.text = `HP ${Math.round(clamped)}`;
  }

  public setAmmo(current: number, mag: number): void {
    const magText = mag === Infinity ? "∞" : mag.toString();
    const currText = current === Infinity ? "∞" : current.toString();
    this._ammoText.text = `Ammo ${currText} / ${magText}`;
  }

  public setCrosshairScale(scale: number): void {
    const size = Math.max(3, this._crosshairBaseSize * scale);
    const px = `${size}px`;
    this._crosshair.width = px;
    this._crosshair.height = px;
  }

  public setReloadProgress(percent: number, active: boolean): void {
    if (!this._reloadContainer || !this._reloadFill) return;
    const clamped = Math.max(0, Math.min(percent, 1));
    this._reloadContainer.isVisible = active;
    this._reloadFill.width = `${clamped * 100}%`;
  }

  public setWeaponInfo(name: string, mode: string): void {
    if (this._weaponText) this._weaponText.text = name;
    if (this._modeText) this._modeText.text = mode;
  }

  public setStatus(text: string): void {
    if (!this._statusText) return;
    this._statusText.text = text;
  }

  public setKillFeed(lines: string[]): void {
    if (!this._killFeedStack) return;
    this._killFeedStack.clearControls();
    for (const line of lines) {
      const t = new TextBlock();
      t.text = line;
      t.color = "#e5ecff";
      t.fontSize = 12;
      t.fontFamily = "monospace";
      t.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
      t.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
      t.height = "18px";
      this._killFeedStack.addControl(t);
    }
  }
}

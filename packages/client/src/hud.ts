import {
  AdvancedDynamicTexture,
  Control,
  Rectangle,
  StackPanel,
  TextBlock,
  Grid,
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
  private _killFeedStack?: StackPanel;
  private _maxHealth = 100;
  private _crosshairBaseSize = 3;
  private _teamText?: TextBlock;
  private _teamLabelA?: TextBlock;
  private _teamLabelB?: TextBlock;
  private _barTeamAFill?: Rectangle;
  private _barTeamBFill?: Rectangle;
  private _timerText?: TextBlock;
  private _winnerText?: TextBlock;
  private _scoreLimit = 100;
  private _localTeam?: string;

  constructor(scene: Scene) {
    this._scene = scene;
  }

  public buildHUD(): void {
    this._ui = AdvancedDynamicTexture.CreateFullscreenUI("HUD", true, this._scene);
    this._ui.idealHeight = 720;

    // Health panel
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

    // Ammo panel 
    const ammoPanel = new Rectangle("ammoPanel");
    ammoPanel.width = "240px";
    ammoPanel.height = "100px";
    ammoPanel.cornerRadius = 12;
    ammoPanel.thickness = 1;
    ammoPanel.color = "rgba(255,255,255,0.08)";
    ammoPanel.background = "rgba(10, 12, 26, 0.55)";
    ammoPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    ammoPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    ammoPanel.left = "-26px"; // move in from right (bottem-left)
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

    const weaponRow = new Grid("weaponRow");
    weaponRow.addColumnDefinition(1, false);
    weaponRow.addColumnDefinition(1, false);
    weaponRow.width = "100%";
    weaponRow.height = "28px";
    weaponRow.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    weaponRow.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    weaponRow.paddingLeft = "8px";
    weaponRow.paddingRight = "8px";
    ammoStack.addControl(weaponRow);

    const weaponText = new TextBlock("weaponText");
    weaponText.text = "Rifle";
    weaponText.color = "#e5ecff";
    weaponText.fontSize = 14;
    weaponText.fontFamily = "monospace";
    weaponText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    weaponText.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    weaponRow.addControl(weaponText, 0, 0);
    this._weaponText = weaponText;

    const modeText = new TextBlock("modeText");
    modeText.text = "AUTO";
    modeText.color = "rgba(229,236,255,0.85)";
    modeText.fontSize = 12;
    modeText.fontFamily = "monospace";
    modeText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    modeText.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    modeText.paddingRight = "6px";
    weaponRow.addControl(modeText, 0, 1);
    this._modeText = modeText;

    const ammoBlock = new TextBlock("ammoText");
    ammoBlock.text = "Ammo 0 / 0";
    ammoBlock.color = "#e5ecff";
    ammoBlock.fontSize = 16;
    ammoBlock.fontFamily = "monospace";
    ammoBlock.width = "100%";
    ammoBlock.height = "24px"; // fixed height inside vertical stack
    ammoBlock.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    ammoBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    ammoBlock.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    ammoBlock.paddingLeft = "6px";
    ammoBlock.paddingTop = "8px";
    ammoStack.addControl(ammoBlock);
    this._ammoText = ammoBlock;

    // CROSSHAIR
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

    // Reload bar below crosshair in center
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

    // scoreboard top center
    const scorePanel = new Rectangle("scorePanel");
    scorePanel.width = "350px";
    scorePanel.height = "100px";
    scorePanel.cornerRadius = 10;
    scorePanel.thickness = 1;
    scorePanel.color = "rgba(255,255,255,0.08)";
    scorePanel.background = "rgba(10, 12, 26, 0.55)";
    scorePanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    scorePanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    scorePanel.top = "16px";
    scorePanel.paddingLeft = "12px";
    scorePanel.paddingRight = "12px";
    scorePanel.paddingTop = "8px";
    scorePanel.paddingBottom = "8px";
    this._ui.addControl(scorePanel);

    const scoreStack = new StackPanel();
    scoreStack.isVertical = true;
    scoreStack.width = "100%";
    scoreStack.height = "100%";
    scoreStack.spacing = 6;
    scorePanel.addControl(scoreStack);

    const teamText = new TextBlock("teamText");
    teamText.text = "You: --";
    teamText.color = "#e5ecff";
    teamText.fontSize = 14;
    teamText.fontFamily = "monospace";
    teamText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    teamText.height = "20px";
    scoreStack.addControl(teamText);
    this._teamText = teamText;

    const scoreRow = new Grid("scoreRow");
    scoreRow.width = "100%";
    scoreRow.height = "60px";
    scoreRow.addColumnDefinition(1, false); // left bar/label
    scoreRow.addColumnDefinition(80, true); // timer center
    scoreRow.addColumnDefinition(1, false); // right bar/label
    scoreRow.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    scoreRow.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    scoreStack.addControl(scoreRow);

    const leftStack = new StackPanel();
    leftStack.isVertical = true;
    leftStack.width = "100%";
    leftStack.height = "100%";
    leftStack.spacing = 6;
    scoreRow.addControl(leftStack, 0, 0);

    const labelA = new TextBlock("scoreTeamA");
    labelA.text = "TEAM A";
    labelA.color = "#82e2ff";
    labelA.fontSize = 14;
    labelA.fontFamily = "monospace";
    labelA.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    labelA.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    labelA.paddingLeft = "4px";
    labelA.height = "16px";
    labelA.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    leftStack.addControl(labelA);
    this._teamLabelA = labelA;

    const barA = new Rectangle("teamA_bar");
    barA.width = "100%";
    barA.height = "14px";
    barA.cornerRadius = 6;
    barA.thickness = 1;
    barA.color = "rgba(255,255,255,0.1)";
    barA.background = "rgba(255,255,255,0.06)";
    barA.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    barA.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    const barAFill = new Rectangle("teamA_fill");
    barAFill.width = "0%";
    barAFill.height = "100%";
    barAFill.cornerRadius = 6;
    barAFill.thickness = 0;
    barAFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    barAFill.background = "#82e2ff";
    barA.addControl(barAFill);
    this._barTeamAFill = barAFill;
    leftStack.addControl(barA);

    // spacer in center
    const timerText = new TextBlock("timerText");
    timerText.text = "05:00";
    timerText.color = "#e5ecff";
    timerText.fontSize = 14;
    timerText.fontFamily = "monospace";
    timerText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    timerText.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    scoreRow.addControl(timerText, 0, 1);
    this._timerText = timerText;

    const rightStack = new StackPanel();
    rightStack.isVertical = true;
    rightStack.width = "100%";
    rightStack.height = "100%";
    rightStack.spacing = 6;
    scoreRow.addControl(rightStack, 0, 2);

    const labelB = new TextBlock("scoreTeamB");
    labelB.text = "TEAM B";
    labelB.color = "#ff8d8d";
    labelB.fontSize = 14;
    labelB.fontFamily = "monospace";
    labelB.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    labelB.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    labelB.paddingRight = "4px";
    labelB.height = "16px";
    labelB.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    rightStack.addControl(labelB);
    this._teamLabelB = labelB;

    const barB = new Rectangle("teamB_bar");
    barB.width = "100%";
    barB.height = "14px";
    barB.cornerRadius = 6;
    barB.thickness = 1;
    barB.color = "rgba(255,255,255,0.1)";
    barB.background = "rgba(255,255,255,0.06)";
    barB.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    barB.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    const barBFill = new Rectangle("teamB_fill");
    barBFill.width = "0%";
    barBFill.height = "100%";
    barBFill.cornerRadius = 6;
    barBFill.thickness = 0;
    barBFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    barBFill.background = "#ff8d8d";
    barB.addControl(barBFill);
    this._barTeamBFill = barBFill;
    rightStack.addControl(barB);

    const winnerText = new TextBlock("winnerText");
    winnerText.text = "";
    winnerText.color = "#e5ecff";
    winnerText.fontSize = 14;
    winnerText.fontFamily = "monospace";
    winnerText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    winnerText.height = "18px";
    scoreStack.addControl(winnerText);
    this._winnerText = winnerText;
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

  public setKillFeed(
    items: {
      killer: string;
      killerTeam?: string;
      victim: string;
      victimTeam?: string;
      weapon: string;
    }[]
  ): void {
    if (!this._killFeedStack) return;
    this._killFeedStack.clearControls();
    for (const item of items) {
      const killerColor = item.killerTeam === "teamA" ? "#82e2ff" : item.killerTeam === "teamB" ? "#ff8d8d" : "#e5ecff";
      const victimColor = item.victimTeam === "teamA" ? "#82e2ff" : item.victimTeam === "teamB" ? "#ff8d8d" : "#e5ecff";
      const weaponText = item.weapon ? ` (${item.weapon})` : "";
      const row = new StackPanel();
      row.isVertical = false;
      row.width = "100%";
      row.height = "18px";
      row.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
      row.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
      row.spacing = 2;

      const killer = new TextBlock();
      killer.text = item.killer;
      killer.color = killerColor;
      killer.fontSize = 12;
      killer.fontFamily = "monospace";
      killer.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      killer.height = "18px";
      killer.resizeToFit = true;
      row.addControl(killer);

      const arrow = new TextBlock();
      arrow.text = " -> ";
      arrow.color = "#e5ecff";
      arrow.fontSize = 12;
      arrow.fontFamily = "monospace";
      arrow.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      arrow.height = "18px";
      arrow.resizeToFit = true;
      row.addControl(arrow);

      const victim = new TextBlock();
      victim.text = item.victim;
      victim.color = victimColor;
      victim.fontSize = 12;
      victim.fontFamily = "monospace";
      victim.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      victim.height = "18px";
      victim.resizeToFit = true;
      row.addControl(victim);

      if (weaponText) {
        const weapon = new TextBlock();
        weapon.text = weaponText;
        weapon.color = "#e5ecff";
        weapon.fontSize = 12;
        weapon.fontFamily = "monospace";
        weapon.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
        weapon.height = "18px";
        weapon.resizeToFit = true;
        row.addControl(weapon);
      }

      this._killFeedStack.addControl(row);
    }
  }

  public setTeam(team: string | undefined): void {
    this._localTeam = team;
    if (this._teamText) {
      this._teamText.text = `You: ${team ? this._label(team) : "--"}`;
    }
    this._updateScoreColors();
  }

  public setScores(
    scores: { teamA?: number; teamB?: number },
    limit: number = this._scoreLimit,
    winner?: string | null
  ): void {
    this._scoreLimit = limit;
    const pctA = limit > 0 ? Math.min(1, (scores.teamA ?? 0) / limit) : 0;
    const pctB = limit > 0 ? Math.min(1, (scores.teamB ?? 0) / limit) : 0;
    if (this._barTeamAFill) this._barTeamAFill.width = `${pctA * 100}%`;
    if (this._barTeamBFill) this._barTeamBFill.width = `${pctB * 100}%`;
    if (this._winnerText) {
      if (winner === "draw") {
        this._winnerText.text = "Draw";
      } else if (winner) {
        this._winnerText.text = `${this._label(winner)} wins!`;
      } else {
        this._winnerText.text = "";
      }
    }
    this._updateScoreColors();
  }

  public setTimer(remainingMs: number): void {
    const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
    const m = Math.floor(totalSec / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    if (this._timerText) this._timerText.text = `${m}:${s}`;
  }

  private _updateScoreColors(): void {
    const teamABase = "#82e2ff";
    const teamBBase = "#ff8d8d";
    const neutral = "#e5ecff";
    const teamAHighlight = this._localTeam === "teamA" ? "#b1ecff" : teamABase;
    const teamBHighlight = this._localTeam === "teamB" ? "#ffc4c4" : teamBBase;
    if (this._teamLabelA) this._teamLabelA.color = teamAHighlight;
    if (this._teamLabelB) this._teamLabelB.color = teamBHighlight;
    if (this._barTeamAFill) this._barTeamAFill.background = teamAHighlight;
    if (this._barTeamBFill) this._barTeamBFill.background = teamBHighlight;
    if (this._teamText) {
      this._teamText.color = this._localTeam === "teamA" ? teamAHighlight : this._localTeam === "teamB" ? teamBHighlight : neutral;
    }
  }

  private _label(team: string): string {
    if (team === "teamA") return "Team A";
    if (team === "teamB") return "Team B";
    if (team === "draw") return "Draw";
    return team.toUpperCase();
  }
}

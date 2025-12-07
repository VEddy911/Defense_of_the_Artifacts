export type WeaponId = "rifle" | "pistol" | "melee";

export interface WeaponSpec {
  id: WeaponId;
  damage: number;
  range: number;
  rpm: number;
  spread: number; // degrees base
  spreadBloom: number; // added per shot
  spreadRecover: number; // per second
  mag: number;
  reloadMs: number;
  automatic: boolean;
  recoilPattern: { x: number; y: number }[];
  falloffStart: number;
  falloffEnd: number;
}

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  rifle: {
    id: "rifle",
    damage: 20,
    range: 120,
    rpm: 600,
    spread: 1.2,
    spreadBloom: 0.25,
    spreadRecover: 2.5,
    mag: 30,
    reloadMs: 1900,
    automatic: true,
    recoilPattern: [
      { x: -0.012, y: 0.006 },
      { x: -0.011, y: -0.004 },
      { x: -0.013, y: 0.004 },
      { x: -0.0115, y: -0.006 },
      { x: -0.0125, y: 0.005 },
    ],
    falloffStart: 60,
    falloffEnd: 140,
  },
  pistol: {
    id: "pistol",
    damage: 28,
    range: 90,
    rpm: 300,
    spread: 1.0,
    spreadBloom: 0.12,
    spreadRecover: 3.0,
    mag: 12,
    reloadMs: 1400,
    automatic: false,
    recoilPattern: [
      { x: -0.008, y: 0.002 },
      { x: -0.009, y: -0.002 },
      { x: -0.0075, y: 0.001 },
    ],
    falloffStart: 40,
    falloffEnd: 110,
  },
  melee: {
    id: "melee",
    damage: 50,
    range: 3,
    rpm: 80,
    spread: 15,
    spreadBloom: 0,
    spreadRecover: 0,
    mag: Infinity,
    reloadMs: 0,
    automatic: false,
    recoilPattern: [{ x: -0.004, y: 0 }],
    falloffStart: 0,
    falloffEnd: 0,
  },
};

export interface WeaponState {
  currentAmmo: number;
  reserveAmmo: number;
  nextFireAt: number;
  reloading: boolean;
  spread: number;
  recoilIndex: number;
}

export function createWeaponState(spec: WeaponSpec): WeaponState {
  return {
    currentAmmo: spec.mag,
    reserveAmmo: spec.mag * 4,
    nextFireAt: 0,
    reloading: false,
    spread: spec.spread,
    recoilIndex: 0,
  };
}

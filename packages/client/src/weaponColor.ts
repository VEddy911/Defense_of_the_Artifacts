import type { WeaponId } from "./weapons";

export function getWeaponColorComponents(id: WeaponId): { r: number; g: number; b: number } {
  if (id === "rifle") return { r: 0.3, g: 0.8, b: 1 };
  if (id === "pistol") return { r: 1, g: 0.8, b: 0.3 };
  return { r: 1, g: 0.4, b: 0.4 };
}


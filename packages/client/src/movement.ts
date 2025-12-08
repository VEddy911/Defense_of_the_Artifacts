export function computeMoveAmount(horizontal: number, vertical: number): number {
  return Math.min(1, Math.abs(horizontal) + Math.abs(vertical));
}


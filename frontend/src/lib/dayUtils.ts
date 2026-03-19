/**
 * Current program day (1–180) from user created_at to today.
 */
export function getCurrentDay(createdAt: string | undefined): number {
  if (!createdAt) return 1;
  const start = new Date(createdAt);
  const today = new Date();
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const diff = Math.floor((todayUtc - startUtc) / (24 * 60 * 60 * 1000));
  return Math.min(180, Math.max(1, diff + 1));
}

export function getPhase(day: number): 1 | 2 | 3 {
  if (day <= 28) return 1;
  if (day <= 84) return 2;
  return 3;
}

export function getDaysRemaining(day: number): number {
  return Math.max(0, 180 - day);
}

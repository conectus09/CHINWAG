export const GUEST_DAILY_MATCH_LIMIT = 30;

export function estimateWaitSeconds(queueAhead: number): number {
  if (queueAhead <= 0) return 3;
  return Math.min(90, queueAhead * 2 + 5);
}
// Start of deliberate review, not a claim that every subsequent month is complete.
export const TRACKING_START_MONTH = "2026-09";
export const TRACKING_START_DATE = new Date("2026-09-01T00:00:00Z");
export function isApproximateMonth(month: string) {
  return month < TRACKING_START_MONTH;
}

/**
 * Given an ISO-8601 expiry timestamp, returns a human-readable string like:
 *   "in 3 days (March 6, 2026)"
 *   "in 1 day (March 4, 2026)"
 *   "in less than a day (March 3, 2026)"
 */
export function formatExpiry(expiresAtIso: string): string {
  const expiresAt = new Date(expiresAtIso);
  const now = new Date();
  const msRemaining = expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.floor(msRemaining / (1000 * 60 * 60 * 24)));

  const absoluteDate = expiresAt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  let relative: string;
  if (daysRemaining === 0) {
    relative = 'in less than a day';
  } else if (daysRemaining === 1) {
    relative = 'in 1 day';
  } else {
    relative = `in ${daysRemaining} days`;
  }

  return `${relative} (${absoluteDate})`;
}

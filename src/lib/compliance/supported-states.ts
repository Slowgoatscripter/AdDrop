import { complianceConfigs } from './terms/registry';

/**
 * Array of state codes derived from the compliance registry.
 * e.g. ["MT", "OH"]
 */
export const SUPPORTED_STATE_CODES: string[] = Object.keys(complianceConfigs);

/**
 * Array of full state names derived from the compliance registry.
 * e.g. ["Montana", "Ohio"]
 */
export const SUPPORTED_STATES: string[] = Object.values(complianceConfigs).map(
  (config) => config.state,
);

/**
 * Returns a human-readable list of supported states.
 * - 1 state  → "Montana"
 * - 2 states → "Montana and Ohio"
 * - 3+ states → "Montana, Ohio, and Texas"
 */
export function getSupportedStatesText(): string {
  if (SUPPORTED_STATES.length === 0) return '';
  if (SUPPORTED_STATES.length === 1) return SUPPORTED_STATES[0];
  if (SUPPORTED_STATES.length === 2)
    return `${SUPPORTED_STATES[0]} and ${SUPPORTED_STATES[1]}`;
  const allButLast = SUPPORTED_STATES.slice(0, -1).join(', ');
  const last = SUPPORTED_STATES[SUPPORTED_STATES.length - 1];
  return `${allButLast}, and ${last}`;
}

import { ORDER_STATUS } from './constants';

/**
 * Order State Machine — Single Source of Truth
 * 
 * Defines ALL valid status transitions for orders in BayIIn.
 * Must be kept in sync with:
 *   - firestore.rules (isValidTransition function)
 *   - functions/index.js (carrier webhook status mapping)
 *   - constants.js (ORDER_STATUS enum)
 */
const VALID_TRANSITIONS = {
  [ORDER_STATUS.RECEIVED]:          [ORDER_STATUS.CONFIRMED, ORDER_STATUS.PACKING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]:         [ORDER_STATUS.PACKING, ORDER_STATUS.SHIPPING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PACKING]:           [ORDER_STATUS.RAMASSAGE, ORDER_STATUS.SHIPPING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.RAMASSAGE]:         [ORDER_STATUS.SHIPPING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SHIPPING]:          [ORDER_STATUS.DELIVERED, ORDER_STATUS.RETURNED, ORDER_STATUS.RETURN_IN_PROGRESS, ORDER_STATUS.CANCELLED, ORDER_STATUS.NO_ANSWER, ORDER_STATUS.POSTPONED],
  [ORDER_STATUS.DELIVERED]:         [ORDER_STATUS.RETURNED],
  [ORDER_STATUS.CANCELLED]:         [ORDER_STATUS.RECEIVED], // Allow reopening a cancelled order
  [ORDER_STATUS.RETURNED]:          [],
  [ORDER_STATUS.RETURN_IN_PROGRESS]:[ORDER_STATUS.RETURNED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.NO_ANSWER]:         [ORDER_STATUS.CONFIRMED, ORDER_STATUS.SHIPPING, ORDER_STATUS.CANCELLED, ORDER_STATUS.POSTPONED],
  [ORDER_STATUS.POSTPONED]:         [ORDER_STATUS.CONFIRMED, ORDER_STATUS.SHIPPING, ORDER_STATUS.CANCELLED, ORDER_STATUS.NO_ANSWER],
  [ORDER_STATUS.PENDING_CATALOG]:   [ORDER_STATUS.RECEIVED, ORDER_STATUS.CANCELLED],
};

/**
 * Check if a status transition is valid.
 * @param {string} from - Current status (null for initial creation)
 * @param {string} to   - Target status
 * @returns {boolean}
 */
export function isValidTransition(from, to) {
  if (!from) return true; // Initial creation — any initial status is allowed
  if (from === to) return true; // Idempotent — same status is always valid
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get all available transitions from a given status.
 * @param {string} currentStatus
 * @returns {string[]}
 */
export function getAvailableTransitions(currentStatus) {
  return VALID_TRANSITIONS[currentStatus] ?? [];
}

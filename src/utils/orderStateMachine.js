const VALID_TRANSITIONS = {
  'reçu':         ['confirmation', 'packing', 'annulé'],
  'confirmation': ['packing', 'livraison', 'annulé'],
  'packing':      ['livraison', 'annulé'],
  'livraison':    ['livré', 'retour', 'annulé', 'pas de réponse'],
  'livré':        ['retour'],
  'annulé':       [],
  'retour':       [],
  'pas de réponse': ['confirmation', 'annulé']
};

export function isValidTransition(from, to) {
  if (!from) return true; // Initial creation
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getAvailableTransitions(currentStatus) {
  return VALID_TRANSITIONS[currentStatus] ?? [];
}

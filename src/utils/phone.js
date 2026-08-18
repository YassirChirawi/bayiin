/**
 * Normalise un numéro marocain au format standard `0XXXXXXXXX` (10 chiffres).
 *
 * But : dédupliquer les clients. Auparavant la recherche client faisait
 * `where('phone', '==', clientPhone)` sur la valeur brute → `+212612345678`,
 * `0612345678` et `612345678` étaient traités comme 3 clients différents.
 * En normalisant à la saisie (même champ, même index), la dédup fonctionne.
 *
 * @param {string} phone
 * @returns {string} numéro normalisé (ou les chiffres tels quels si non-mobile MA)
 */
export function normalizePhoneMA(phone) {
    if (!phone) return '';
    let d = String(phone).replace(/\D/g, '').replace(/^00/, '');
    if (d.startsWith('212')) {
        d = '0' + d.slice(3);            // +212 6/7… → 06/07…
    } else if (d.length === 9 && /^[67]/.test(d)) {
        d = '0' + d;                     // 6XXXXXXXX → 06XXXXXXXX
    }
    return d;
}

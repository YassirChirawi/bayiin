/**
 * Montant COD à encaisser par le transporteur.
 *
 * = total produits (prix × quantité) + frais de livraison SI le client les paie.
 *
 * « Le client paie la livraison » est un réglage boutique (store.customerPaysShipping),
 * au choix du responsable. Un helper unique garantit que Sendit / Olivraison / Cathedis
 * encaissent tous le MÊME montant (avant, Sendit ajoutait la livraison, les autres non).
 *
 * @param {Object} order - { price, quantity, shippingFee?, shippingCost? }
 * @param {Object} store - { customerPaysShipping?, defaultShippingFee? }
 * @returns {number} montant COD
 */
export function computeCodAmount(order, store) {
    const productTotal = (parseFloat(order?.price) || 0) * (parseInt(order?.quantity) || 1);

    if (store?.customerPaysShipping !== true) return productTotal;

    // Premier montant de livraison défini : fee commande → coût commande → défaut boutique.
    const shipping = [order?.shippingFee, order?.shippingCost, store?.defaultShippingFee]
        .map((v) => parseFloat(v))
        .find((v) => !isNaN(v)) || 0;

    return productTotal + shipping;
}

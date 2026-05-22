const { getFirestore } = require("firebase-admin/firestore");
const db = getFirestore("comsaas");

/**
 * ⚠️ YouCan Billing API Stub
 * YouCan's billing API for apps allows charging merchants.
 * This file serves as the integration point once the specific Billing REST endpoints are provided by YouCan.
 */

/**
 * Check if the merchant has an active YouCan App Subscription.
 * @param {string} storeId BayIIn internal store ID
 * @param {string} youcanAccessToken The merchant's YouCan API token
 * @returns {Promise<boolean>}
 */
async function checkYouCanSubscription(storeId, youcanAccessToken) {
    // TODO: Implémenter l'appel à l'API YouCan (ex: /app/charges)
    // Pour l'instant, on assume que si le token est valide, l'app est active (le store gère la désinstallation)
    
    // Si on voulait vérifier via notre base de données :
    // const storeDoc = await db.collection("stores").doc(storeId).get();
    // return storeDoc.data()?.subscriptionStatus === 'active';
    
    return true;
}

/**
 * Create a Recurring Application Charge via YouCan API.
 * This URL should be sent to the merchant to approve the charge.
 */
async function createYouCanCharge(storeId, youcanAccessToken) {
    // TODO: Request YouCan API to create an Application Charge
    const chargeUrl = `https://seller-area.youcan.shop/admin/charges/approve`;
    return chargeUrl;
}

module.exports = {
    checkYouCanSubscription,
    createYouCanCharge
};

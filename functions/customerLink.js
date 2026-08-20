const { FieldValue } = require('firebase-admin/firestore');

/**
 * Rattache une commande au CRM (BAY-112).
 *
 * Les commandes sans customerId (catalogue public, webhook, bot) ne créaient/liaient aucune
 * fiche client → CRM incomplet et pas de dédup. Cette fonction, appelée à la CRÉATION depuis
 * onOrderWrite, trouve-ou-crée le client par téléphone (déjà normalisé à l'écriture) et écrit
 * order.customerId. Le numéro client séquentiel vient du compteur dédié (counters/sequences,
 * BAY-107). Idempotente : si la commande a déjà un customerId, ne fait rien.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} orderId
 */
async function linkOrderCustomer(db, orderId) {
    return db.runTransaction(async (t) => {
        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await t.get(orderRef);
        if (!orderSnap.exists) return;
        const o = orderSnap.data();
        if (o.customerId || !o.clientPhone || !o.storeId) return; // déjà lié / inéligible

        // Dédup par téléphone (index mono-champ), filtre storeId en mémoire (pas d'index composite).
        const custSnap = await t.get(db.collection('customers').where('phone', '==', o.clientPhone).limit(10));
        const match = custSnap.docs.find((d) => d.data().storeId === o.storeId);
        const today = (o.date && String(o.date).split('T')[0]) || new Date().toISOString().split('T')[0];

        if (match) {
            t.update(orderRef, { customerId: match.id });
            t.update(match.ref, {
                orderCount: FieldValue.increment(1),
                lastOrderDate: today,
                updatedAt: FieldValue.serverTimestamp(),
            });
            return;
        }

        const seqRef = db.collection('stores').doc(o.storeId).collection('counters').doc('sequences');
        const seqSnap = await t.get(seqRef);
        const nextNum = (parseInt(seqSnap.exists ? seqSnap.data().lastCustomerNumber : 0) || 5000) + 1;
        const newCustRef = db.collection('customers').doc();
        t.set(newCustRef, {
            storeId: o.storeId,
            customerNumber: nextNum,
            name: o.clientName || '',
            phone: o.clientPhone,
            address: o.clientAddress || '',
            city: o.clientCity || '',
            totalSpent: 0, // incrémenté par le trigger au passage à 'livré'
            orderCount: 1,
            firstOrderDate: today,
            lastOrderDate: today,
            source: 'auto_link',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        t.update(orderRef, { customerId: newCustRef.id });
        t.set(seqRef, { lastCustomerNumber: nextNum }, { merge: true });
    });
}

module.exports = { linkOrderCustomer };

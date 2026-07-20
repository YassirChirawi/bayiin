const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const getDb = () => getFirestore('comsaas');

/**
 * Rollback Transactionnel — Système d'annulation sécurisée pour Beya3
 * 
 * Chaque action exécutée sauvegarde un snapshot de l'état précédent 
 * pour permettre l'annulation dans un délai de 1 heure.
 */

const ROLLBACK_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Capture un snapshot des documents qui vont être modifiés.
 */
async function captureSnapshot(storeId, affectedDocuments) {
    const db = getDb();
    const snapshot = {};

    for (const docPath of affectedDocuments) {
        try {
            const docRef = db.doc(docPath);
            const docSnap = await docRef.get();
            snapshot[docPath] = {
                exists: docSnap.exists,
                data: docSnap.exists ? docSnap.data() : null
            };
        } catch (e) {
            console.error(`[Rollback] Failed to snapshot ${docPath}:`, e);
            snapshot[docPath] = { exists: false, data: null, error: e.message };
        }
    }

    return snapshot;
}

/**
 * Restaure les documents depuis un snapshot sauvegardé.
 */
async function restoreSnapshot(storeId, snapshot) {
    const db = getDb();
    const batch = db.batch();
    const restoredDocs = [];

    for (const [docPath, state] of Object.entries(snapshot)) {
        const docRef = db.doc(docPath);
        if (state.exists && state.data) {
            batch.set(docRef, state.data);
            restoredDocs.push(docPath);
        } else if (!state.exists) {
            batch.delete(docRef);
            restoredDocs.push(docPath + ' (deleted)');
        }
    }

    await batch.commit();
    return restoredDocs;
}

/**
 * Exécute une action avec sauvegarde du snapshot de manière atomique.
 * 
 * @param {string} storeId
 * @param {object} actionMeta - { actionType, description, userId, affectedDocuments[] }
 * @param {Function} actionFn - La fonction à exécuter (async), qui recevra l'objet de transaction 't'
 * @returns {object} - { success, actionLogId, result }
 */
async function executeWithRollback(storeId, actionMeta, actionFn) {
    const db = getDb();
    const affectedDocs = actionMeta.affectedDocuments || [];
    const actionLogRef = db.collection(`stores/${storeId}/beya3_action_log`).doc();

    try {
        const result = await db.runTransaction(async (t) => {
            // 1. Lire l'état actuel dans la transaction
            const snapshot = {};
            for (const docPath of affectedDocs) {
                const docRef = db.doc(docPath);
                const docSnap = await t.get(docRef);
                snapshot[docPath] = {
                    exists: docSnap.exists,
                    data: docSnap.exists ? docSnap.data() : null
                };
            }

            // 2. Écrire le log d'action (et le snapshot) dans la transaction
            t.set(actionLogRef, {
                actionType: actionMeta.actionType,
                description: actionMeta.description || '',
                userId: actionMeta.userId || 'system',
                toolName: actionMeta.toolName || '',
                toolArgs: actionMeta.toolArgs || {},
                status: 'executed',
                rollbackData: snapshot,
                isReversible: affectedDocs.length > 0,
                rollbackDeadline: new Date(Date.now() + ROLLBACK_WINDOW_MS),
                createdAt: FieldValue.serverTimestamp(),
                executedAt: FieldValue.serverTimestamp(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // TTL: 30 days
            });

            // 3. Exécuter l'action en passant la transaction (qui doit l'utiliser pour ses écritures)
            const fnResult = await actionFn(t);

            // 4. Mettre à jour le résultat
            t.update(actionLogRef, {
                result: typeof fnResult === 'string' ? fnResult : JSON.stringify(fnResult || {})
            });

            return fnResult;
        });

        return {
            success: true,
            actionLogId: actionLogRef.id,
            result,
            isReversible: affectedDocs.length > 0,
            rollbackDeadline: new Date(Date.now() + ROLLBACK_WINDOW_MS)
        };
    } catch (error) {
        console.error(`[ActionExecutor] Action failed, transaction aborted:`, error);
        
        // Enregistrer l'échec séparément puisque la transaction a été annulée
        await actionLogRef.set({
            actionType: actionMeta.actionType,
            description: actionMeta.description || '',
            status: 'failed',
            error: error.message,
            createdAt: FieldValue.serverTimestamp(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // TTL: 30 days
        }).catch(e => console.error("[ActionExecutor] Could not write failure log", e));

        throw error;
    }
}

/**
 * Annule la dernière action réversible d'un store.
 * 
 * @param {string} storeId
 * @param {string} userId - Pour audit trail
 * @param {string} [actionId] - ID spécifique (optionnel, sinon prend la dernière)
 * @returns {object}
 */
async function rollbackLastAction(storeId, userId, actionId = null) {
    const db = getDb();
    const actionLogRef = db.collection(`stores/${storeId}/beya3_action_log`);

    let actionDoc;

    if (actionId) {
        const doc = await actionLogRef.doc(actionId).get();
        if (!doc.exists) return { error: "Action introuvable." };
        actionDoc = { id: doc.id, ...doc.data() };
    } else {
        // Get the most recent reversible action
        const snap = await actionLogRef
            .where('status', '==', 'executed')
            .where('isReversible', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        if (snap.empty) return { error: "Aucune action récente à annuler." };
        const doc = snap.docs[0];
        actionDoc = { id: doc.id, ...doc.data() };
    }

    // Check status
    if (actionDoc.status !== 'executed') {
        return { error: `Cette action est déjà dans l'état "${actionDoc.status}".` };
    }

    // Check deadline
    const deadline = actionDoc.rollbackDeadline?.toDate 
        ? actionDoc.rollbackDeadline.toDate() 
        : new Date(actionDoc.rollbackDeadline);
    
    if (new Date() > deadline) {
        return { error: "Délai d'annulation dépassé (1h). L'action ne peut plus être annulée." };
    }

    // Check rollback data exists
    if (!actionDoc.rollbackData || Object.keys(actionDoc.rollbackData).length === 0) {
        return { error: "Données de rollback non disponibles pour cette action." };
    }

    // Execute rollback
    try {
        const restoredDocs = await restoreSnapshot(storeId, actionDoc.rollbackData);

        await actionLogRef.doc(actionDoc.id).update({
            status: 'rolled_back',
            rolledBackAt: FieldValue.serverTimestamp(),
            rolledBackBy: userId,
            restoredDocuments: restoredDocs
        });

        return {
            success: true,
            message: `Action "${actionDoc.actionType}" annulée avec succès. ${restoredDocs.length} document(s) restauré(s).`,
            actionType: actionDoc.actionType,
            restoredCount: restoredDocs.length
        };
    } catch (e) {
        console.error("[ActionExecutor] Rollback failed:", e);
        return { error: `Échec du rollback : ${e.message}` };
    }
}

/**
 * Retourne les dernières actions réversibles (pour l'UI)
 */
async function getReversibleActions(storeId, limitCount = 5) {
    const db = getDb();
    const snap = await db.collection(`stores/${storeId}/beya3_action_log`)
        .where('status', '==', 'executed')
        .where('isReversible', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get();

    const now = new Date();
    return snap.docs.map(doc => {
        const data = doc.data();
        const deadline = data.rollbackDeadline?.toDate 
            ? data.rollbackDeadline.toDate() 
            : new Date(data.rollbackDeadline);
        const minutesRemaining = Math.max(0, Math.round((deadline - now) / 60000));
        
        return {
            id: doc.id,
            actionType: data.actionType,
            description: data.description,
            isExpired: now > deadline,
            minutesRemaining,
            createdAt: data.createdAt
        };
    }).filter(a => !a.isExpired);
}

/**
 * Exécute un draft d'action une fois approuvé.
 */
async function executeDraft(storeId, draftData) {
    const db = getDb();
    const { toolName, toolArgs } = draftData;

    if (toolName === 'draft_expense') {
        return await executeWithRollback(storeId, {
            actionType: 'create_expense',
            description: `Dépense générée par Beya3: ${toolArgs.label}`,
            userId: 'beya3_autonomous',
            toolName: toolName,
            toolArgs: toolArgs,
            affectedDocuments: []
        }, async (t) => {
            const expenseRef = db.collection('expenses').doc();
            t.set(expenseRef, {
                ...toolArgs,
                storeId: storeId,
                date: new Date().toISOString().split('T')[0],
                createdAt: FieldValue.serverTimestamp()
            });
            return { success: true, expenseId: expenseRef.id };
        });
    } else if (toolName === 'bulk_update_orders') {
        const requestedIds = toolArgs.orderIds || [];
        const newStatus = toolArgs.newStatus;

        // SEC (P0-8): only operate on orders that actually belong to this tenant.
        // Never trust the draft's orderIds blindly — verify each order's storeId first.
        const orderIds = [];
        for (const id of requestedIds) {
            const snap = await db.collection('orders').doc(id).get();
            if (snap.exists && snap.data().storeId === storeId) orderIds.push(id);
        }
        const affectedDocs = orderIds.map(id => `orders/${id}`);

        return await executeWithRollback(storeId, {
            actionType: 'bulk_update_orders',
            description: `Mise à jour de ${orderIds.length} commandes vers ${newStatus}`,
            userId: 'beya3_autonomous',
            toolName: toolName,
            toolArgs: { ...toolArgs, orderIds },
            affectedDocuments: affectedDocs
        }, async (t) => {
            for (const orderId of orderIds) {
                const orderRef = db.collection('orders').doc(orderId);
                t.update(orderRef, { status: newStatus });
            }
            return { success: true, count: orderIds.length };
        });
    } else if (toolName === 'send_whatsapp_campaign') {
        // Mock implementation for WhatsApp campaign
        return { success: true, message: "Campagne WhatsApp préparée/envoyée." };
    }

    throw new Error(`Tool ${toolName} execution not implemented for autonomous drafts.`);
}

module.exports = {
    executeWithRollback,
    rollbackLastAction,
    getReversibleActions,
    captureSnapshot,
    restoreSnapshot,
    executeDraft
};

// FieldValue.increment n'est plus utilisé : les mises à jour de stock sont calculées et
// bornées à 0 dans la transaction (stock négatif impossible).

// BAY-109 : la détermination des items actifs vit dans le module partagé orderStock (mirroir
// client/serveur), pour que le journal d'audit stock reflète EXACTEMENT ce que le serveur applique.
const { getActiveItems } = require('./shared/orderStock');

/**
 * Applique la logique de lots (FEFO - First Expire First Out)
 */
const applyBatchLogic = (batches, change) => {
    if (!batches || batches.length === 0) return batches;
    // Clone en profondeur : ne jamais muter les objets partagés de pData.inventoryBatches.
    let updatedBatches = batches.map(b => ({ ...b }));

    if (change > 0) {
        // Restock : on remet dans le lot dont la péremption est la plus PROCHE, pour qu'il
        // soit écoulé en premier (cohérent avec la déduction FEFO ci-dessous).
        updatedBatches.sort((a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0));
        updatedBatches[0].quantity = (parseInt(updatedBatches[0].quantity) || 0) + change;
    } else if (change < 0) {
        // Déduction : FEFO strict (péremption la plus proche d'abord).
        let remainingQty = Math.abs(change);
        updatedBatches.sort((a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0));
        for (let i = 0; i < updatedBatches.length && remainingQty > 0; i++) {
            let batchQty = parseInt(updatedBatches[i].quantity) || 0;
            if (batchQty > 0) {
                let deductAmount = Math.min(batchQty, remainingQty);
                updatedBatches[i].quantity = batchQty - deductAmount;
                remainingQty -= deductAmount;
            }
        }
    }
    return updatedBatches;
};

/**
 * Calcule et applique les changements de stock de manière atomique (Transaction)
 */
const applyStockUpdates = async (db, before, after) => {
    const oldItems = getActiveItems(before);
    const newItems = getActiveItems(after);

    // Entrepôt par défaut du store : les commandes SANS entrepôt explicite (intégrations
    // Woo/YouCan/bot, commandes manuelles sans choix) attribuent leur mouvement à cet entrepôt →
    // stock total et warehouseStocks restent cohérents (sinon warehouseStocks dérivait du total).
    // Store mono-entrepôt (aucun warehouse) → defaultWh null → seul le stock total est ajusté.
    const storeId = (after && after.storeId) || (before && before.storeId) || null;
    let defaultWh = null;
    if (storeId) {
        try {
            const whSnap = await db.collection('warehouses').where('storeId', '==', storeId).get();
            const def = whSnap.docs.find(d => d.data().isDefault) || whSnap.docs[0];
            if (def) defaultWh = def.id;
        } catch (e) { /* pas d'entrepôts configurés → stock total seul */ }
    }

    // Calcul des deltas nets par produit
    const deltas = {};
    // Format: productId -> { baseDelta: 0, variants: { variantId: delta }, warehouses: { warehouseId: delta } }

    const addItemDelta = (item, isOld) => {
        const sign = isOld ? 1 : -1; // old = restock (+), new = deduct (-)
        const qty = item.quantity * sign;
        const effWh = item.warehouseId || defaultWh; // entrepôt effectif (choisi ou défaut)

        if (!deltas[item.id]) {
            deltas[item.id] = { baseDelta: 0, variants: {}, warehouses: {}, variantWarehouse: {} };
        }

        deltas[item.id].baseDelta += qty;

        if (item.variantId) {
            deltas[item.id].variants[item.variantId] = (deltas[item.id].variants[item.variantId] || 0) + qty;
            // BAY-106 : corréler variante × entrepôt pour appliquer le delta au BON entrepôt
            // (et pas systématiquement au premier) sur les commandes multi-articles.
            const wId = effWh || '__default__';
            (deltas[item.id].variantWarehouse[item.variantId] ||= {});
            deltas[item.id].variantWarehouse[item.variantId][wId] = (deltas[item.id].variantWarehouse[item.variantId][wId] || 0) + qty;
        }
        if (effWh) {
            deltas[item.id].warehouses[effWh] = (deltas[item.id].warehouses[effWh] || 0) + qty;
        }
    };

    oldItems.forEach(item => addItemDelta(item, true));
    newItems.forEach(item => addItemDelta(item, false));

    const productIds = Object.keys(deltas).filter(id => 
        deltas[id].baseDelta !== 0 || 
        Object.keys(deltas[id].variants).length > 0 || 
        Object.keys(deltas[id].warehouses).length > 0
    );

    if (productIds.length === 0) return;

    // Fetch tous les produits impactés
    // Execute inside a strict transaction
    await db.runTransaction(async (t) => {
        const productDocs = {};
        const bundleComponentDocs = {};

        // 1. Lire les produits directs
        for (const pid of productIds) {
            const pRef = db.collection('products').doc(pid);
            const snap = await t.get(pRef);
            if (snap.exists) productDocs[pid] = snap.data();
        }

        // 2. Vérifier les bundles et lire les composants
        for (const pid of productIds) {
            const pData = productDocs[pid];
            if (pData && pData.isBundle && pData.bundleItems) {
                for (const comp of pData.bundleItems) {
                    if (!productDocs[comp.productId] && !bundleComponentDocs[comp.productId]) {
                        const compRef = db.collection('products').doc(comp.productId);
                        const compSnap = await t.get(compRef);
                        if (compSnap.exists) bundleComponentDocs[comp.productId] = compSnap.data();
                    }
                }
            }
        }

        // 3. Appliquer les mises à jour
        for (const pid of productIds) {
            const pData = productDocs[pid];
            if (!pData) continue;
            
            const adj = deltas[pid];
            const pRef = db.collection('products').doc(pid);
            let updates = {};

            // A. Mise à jour du produit Parent
            if (pData.isVariable && Object.keys(adj.variants).length > 0) {
                let newVariants = [...(pData.variants || [])];
                for (const [vid, vDelta] of Object.entries(adj.variants)) {
                    const vWarehouses = adj.variantWarehouse[vid] || {};
                    newVariants = newVariants.map(v => {
                        if (v.id === vid) {
                            const vWStocks = { ...(v.warehouseStocks || {}) };
                            // BAY-106 : appliquer le delta au(x) BON(s) entrepôt(s) de CETTE variante
                            // (avant : toujours le premier entrepôt du produit → dérive multi-articles).
                            for (const [wId, wDelta] of Object.entries(vWarehouses)) {
                                if (wId !== '__default__') {
                                    vWStocks[wId] = Math.max(0, (vWStocks[wId] || 0) + wDelta); // stock négatif impossible
                                }
                            }
                            return { ...v, stock: Math.max(0, (parseInt(v.stock) || 0) + vDelta), warehouseStocks: vWStocks };
                        }
                        return v;
                    });
                }
                updates.variants = newVariants;
                updates.stock = Math.max(0, (parseInt(pData.stock) || 0) + adj.baseDelta); // borne à 0
            } else {
                updates.stock = Math.max(0, (parseInt(pData.stock) || 0) + adj.baseDelta); // borne à 0
                for (const [wId, wDelta] of Object.entries(adj.warehouses)) {
                    updates[`warehouseStocks.${wId}`] = Math.max(0, ((pData.warehouseStocks && pData.warehouseStocks[wId]) || 0) + wDelta);
                }
                if (pData.inventoryBatches && pData.inventoryBatches.length > 0) {
                    updates.inventoryBatches = applyBatchLogic(pData.inventoryBatches, adj.baseDelta);
                }
            }

            if (Object.keys(updates).length > 0) {
                t.update(pRef, updates);
            }

            // B. Mise à jour des composants du Bundle
            if (pData.isBundle && pData.bundleItems) {
                for (const comp of pData.bundleItems) {
                    const compData = productDocs[comp.productId] || bundleComponentDocs[comp.productId];
                    if (!compData) continue;

                    const compRef = db.collection('products').doc(comp.productId);
                    const netCompChange = adj.baseDelta * (parseInt(comp.qty) || 1);
                    
                    let compUpdates = { stock: Math.max(0, (parseInt(compData.stock) || 0) + netCompChange) };

                    const mainWarehouseId = Object.keys(adj.warehouses)[0];
                    if (mainWarehouseId) {
                        compUpdates[`warehouseStocks.${mainWarehouseId}`] = Math.max(0, ((compData.warehouseStocks && compData.warehouseStocks[mainWarehouseId]) || 0) + netCompChange);
                    }

                    if (compData.inventoryBatches && compData.inventoryBatches.length > 0) {
                        compUpdates.inventoryBatches = applyBatchLogic(compData.inventoryBatches, netCompChange);
                    }

                    t.update(compRef, compUpdates);
                }
            }
        }
    });
};

module.exports = { applyStockUpdates };

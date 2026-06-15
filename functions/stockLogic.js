const { FieldValue } = require('firebase-admin/firestore');

/**
 * Extrait les items actifs d'une commande (qui consomment du stock).
 */
const getActiveItems = (o) => {
    if (!o) return [];
    // Statuts inactifs qui ne consomment pas de stock
    if (['retour', 'annulé', 'pending_catalog', 'pas de réponse'].includes(o.status)) return [];
    
    let items = [];
    if (o.articleId) {
        items.push({ 
            id: o.articleId, 
            variantId: o.variantId, 
            quantity: parseInt(o.quantity) || 1, 
            warehouseId: o.warehouseId 
        });
    }
    if (o.products && Array.isArray(o.products)) {
        items.push(...o.products.map(p => ({
            id: p.id,
            variantId: p.variantId,
            quantity: parseInt(p.quantity) || 1,
            warehouseId: o.warehouseId || p.warehouseId
        })));
    }
    return items;
};

/**
 * Applique la logique de lots (FEFO - First Expire First Out)
 */
const applyBatchLogic = (batches, change) => {
    if (!batches || batches.length === 0) return batches;
    let updatedBatches = [...batches];
    
    if (change > 0) {
        // Restock : on remet dans le lot le plus ancien par simplicité
        updatedBatches.sort((a, b) => new Date(b.expiryDate || 0) - new Date(a.expiryDate || 0));
        updatedBatches[0].quantity = (parseInt(updatedBatches[0].quantity) || 0) + change;
    } else if (change < 0) {
        // Déduction : FEFO strict
        let remainingQty = Math.abs(change);
        updatedBatches.sort((a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0));
        for (let i = 0; i < updatedBatches.length && remainingQty > 0; i++) {
            let batch = updatedBatches[i];
            let batchQty = parseInt(batch.quantity) || 0;
            if (batchQty > 0) {
                let deductAmount = Math.min(batchQty, remainingQty);
                batch.quantity = batchQty - deductAmount;
                remainingQty -= deductAmount;
            }
        }
    }
    return updatedBatches;
};

/**
 * Calcule et applique les changements de stock à un batch Firestore
 */
const applyStockUpdates = async (db, batch, before, after) => {
    const oldItems = getActiveItems(before);
    const newItems = getActiveItems(after);

    // Calcul des deltas nets par produit
    const deltas = {}; 
    // Format: productId -> { baseDelta: 0, variants: { variantId: delta }, warehouses: { warehouseId: delta } }
    
    const addItemDelta = (item, isOld) => {
        const sign = isOld ? 1 : -1; // old = restock (+), new = deduct (-)
        const qty = item.quantity * sign;
        
        if (!deltas[item.id]) {
            deltas[item.id] = { baseDelta: 0, variants: {}, warehouses: {} };
        }
        
        deltas[item.id].baseDelta += qty;
        
        if (item.variantId) {
            deltas[item.id].variants[item.variantId] = (deltas[item.id].variants[item.variantId] || 0) + qty;
        }
        if (item.warehouseId) {
            deltas[item.id].warehouses[item.warehouseId] = (deltas[item.id].warehouses[item.warehouseId] || 0) + qty;
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
    const productsToFetch = [...productIds];
    const productDocs = {};
    const bundleComponentDocs = {};

    // 1. Lire les produits directs
    for (const pid of productsToFetch) {
        const snap = await db.collection('products').doc(pid).get();
        if (snap.exists) productDocs[pid] = snap.data();
    }

    // 2. Vérifier les bundles et lire les composants
    for (const pid of productsToFetch) {
        const pData = productDocs[pid];
        if (pData && pData.isBundle && pData.bundleItems) {
            for (const comp of pData.bundleItems) {
                if (!productDocs[comp.productId] && !bundleComponentDocs[comp.productId]) {
                    const compSnap = await db.collection('products').doc(comp.productId).get();
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
                newVariants = newVariants.map(v => {
                    if (v.id === vid) {
                        const vWStocks = { ...(v.warehouseStocks || {}) };
                        // Simplification: on applique le delta global au warehouse de la commande si présent
                        const wId = Object.keys(adj.warehouses)[0]; 
                        if (wId) {
                            vWStocks[wId] = (vWStocks[wId] || 0) + vDelta;
                        }
                        return { ...v, stock: (parseInt(v.stock) || 0) + vDelta, warehouseStocks: vWStocks };
                    }
                    return v;
                });
            }
            updates.variants = newVariants;
            updates.stock = FieldValue.increment(adj.baseDelta);
        } else {
            updates.stock = FieldValue.increment(adj.baseDelta);
            for (const [wId, wDelta] of Object.entries(adj.warehouses)) {
                updates[`warehouseStocks.${wId}`] = FieldValue.increment(wDelta);
            }
            if (pData.inventoryBatches && pData.inventoryBatches.length > 0) {
                updates.inventoryBatches = applyBatchLogic(pData.inventoryBatches, adj.baseDelta);
            }
        }

        if (Object.keys(updates).length > 0) {
            batch.update(pRef, updates);
        }

        // B. Mise à jour des composants du Bundle
        if (pData.isBundle && pData.bundleItems) {
            for (const comp of pData.bundleItems) {
                const compData = productDocs[comp.productId] || bundleComponentDocs[comp.productId];
                if (!compData) continue;

                const compRef = db.collection('products').doc(comp.productId);
                const netCompChange = adj.baseDelta * (parseInt(comp.qty) || 1);
                
                let compUpdates = { stock: FieldValue.increment(netCompChange) };
                
                // Warehouse du parent appliqué au composant
                const mainWarehouseId = Object.keys(adj.warehouses)[0];
                if (mainWarehouseId) {
                    compUpdates[`warehouseStocks.${mainWarehouseId}`] = FieldValue.increment(netCompChange);
                }

                if (compData.inventoryBatches && compData.inventoryBatches.length > 0) {
                    compUpdates.inventoryBatches = applyBatchLogic(compData.inventoryBatches, netCompChange);
                }

                batch.update(compRef, compUpdates);
            }
        }
    }
};

module.exports = { applyStockUpdates };

const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const getDb = () => getFirestore('comsaas');

/**
 * Knowledge Graph Service pour Beya3 (Phase 3)
 * Implémente un graphe basé sur des Triplets dans Firestore.
 */

/**
 * Ajoute ou met à jour un nœud dans le graphe.
 * @param {string} storeId 
 * @param {string} nodeId - L'identifiant unique du noeud (ex: "produit_123", "ville_casablanca", "carrier_sendit")
 * @param {string} type - Le type de noeud ("produit", "ville", "carrier", "client")
 * @param {object} properties - Propriétés supplémentaires du noeud
 */
async function upsertNode(storeId, nodeId, type, properties = {}) {
    const db = getDb();
    const nodeRef = db.collection(`stores/${storeId}/kg_nodes`).doc(nodeId);
    
    await nodeRef.set({
        type,
        ...properties,
        updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
}

/**
 * Ajoute ou met à jour une relation (Edge) entre deux nœuds.
 * @param {string} storeId 
 * @param {string} sourceId - L'ID du nœud source
 * @param {string} targetId - L'ID du nœud cible
 * @param {string} relationType - Le type de relation ("A_DES_RETOURS_AVEC", "DELIVRÉ_PAR", "ACHÈTE_SOUVENT")
 * @param {object} properties - Données de la relation (ex: { weight: 1, returnRate: 0.15 })
 */
async function upsertEdge(storeId, sourceId, targetId, relationType, properties = {}) {
    const db = getDb();
    // Identifiant unique pour l'arête (unidirectionnelle)
    const edgeId = `${sourceId}_${relationType}_${targetId}`;
    const edgeRef = db.collection(`stores/${storeId}/kg_edges`).doc(edgeId);
    
    // On peut utiliser un transaction ou un merge simple
    await edgeRef.set({
        sourceId,
        targetId,
        relationType,
        ...properties,
        updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
}

/**
 * Incrémente un poids ou un compteur sur une relation existante (ou la crée).
 */
async function incrementEdgeMetric(storeId, sourceId, targetId, relationType, metricName = "weight", incrementBy = 1) {
    const db = getDb();
    const edgeId = `${sourceId}_${relationType}_${targetId}`;
    const edgeRef = db.collection(`stores/${storeId}/kg_edges`).doc(edgeId);
    
    await edgeRef.set({
        sourceId,
        targetId,
        relationType,
        [metricName]: FieldValue.increment(incrementBy),
        updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
}

/**
 * Interroge le graphe de connaissances.
 * @param {string} storeId 
 * @param {object} query - Objet de requête { sourceId, targetId, relationType, limit }
 */
async function queryGraph(storeId, queryObj = {}) {
    const db = getDb();
    let edgesQuery = db.collection(`stores/${storeId}/kg_edges`);
    
    if (queryObj.sourceId) {
        edgesQuery = edgesQuery.where('sourceId', '==', queryObj.sourceId);
    }
    if (queryObj.targetId) {
        edgesQuery = edgesQuery.where('targetId', '==', queryObj.targetId);
    }
    if (queryObj.relationType) {
        edgesQuery = edgesQuery.where('relationType', '==', queryObj.relationType);
    }
    
    // Tri optionnel (nécessite des index composites si combiné avec des wheres)
    if (queryObj.orderBy) {
        edgesQuery = edgesQuery.orderBy(queryObj.orderBy, queryObj.orderDirection || 'desc');
    }
    
    edgesQuery = edgesQuery.limit(queryObj.limit || 20);
    
    const snap = await edgesQuery.get();
    
    // Récupérer les détails des nœuds associés
    const edges = [];
    const nodeIdsToFetch = new Set();
    
    snap.forEach(doc => {
        const edge = doc.data();
        edges.push({ id: doc.id, ...edge });
        nodeIdsToFetch.add(edge.sourceId);
        nodeIdsToFetch.add(edge.targetId);
    });
    
    // Fetch nodes (simple batch fetch)
    const nodesMap = {};
    if (nodeIdsToFetch.size > 0 && queryObj.includeNodes) {
        const nodeRefs = Array.from(nodeIdsToFetch).map(id => db.collection(`stores/${storeId}/kg_nodes`).doc(id));
        // Firestore getAll prend jusqu'à 100 refs max
        if (nodeRefs.length <= 100) {
            const nodesSnap = await db.getAll(...nodeRefs);
            nodesSnap.forEach(doc => {
                if (doc.exists) {
                    nodesMap[doc.id] = doc.data();
                }
            });
        }
    }
    
    return {
        edges,
        nodes: nodesMap
    };
}

module.exports = {
    upsertNode,
    upsertEdge,
    incrementEdgeMetric,
    queryGraph
};

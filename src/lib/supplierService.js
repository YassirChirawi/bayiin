/**
 * supplierService.js
 * API-ready supplier/purchase service layer for BayIIn.
 * Designed for Odoo interoperability (CSV import/export) with
 * a hook point for future direct Odoo JSON-RPC API connection.
 */

import Papa from 'papaparse';
import {
    collection, query, where, getDocs, doc, getDoc,
    addDoc, updateDoc, serverTimestamp, writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { extractSKUFromRow, validateSKU } from './skuService';

// ─── Odoo CSV Column Map ──────────────────────────────────────────────────────
// Maps Odoo default export column names → our internal keys.
// Extend this if your supplier uses custom column names.
const ODOO_COLUMN_MAP = {
    // Product reference
    'Internal Reference': 'supplier_ref',
    'Référence interne': 'supplier_ref',
    'Product Code': 'supplier_ref',
    // Product name
    'Product': 'name',
    'Produit': 'name',
    'Description': 'name',
    // Quantity
    'Quantity': 'qty',
    'Quantité': 'qty',
    'Qty': 'qty',
    // Unit price
    'Unit Price': 'unit_price',
    'Prix unitaire': 'unit_price',
    'Price': 'unit_price',
    // Total
    'Price Subtotal': 'subtotal',
    'Sous-total': 'subtotal',
    // Tax
    'Taxes': 'taxes',
    // UOM
    'Unit of Measure': 'uom',
    'Unité': 'uom',
};

// ─── 1. CSV / Excel Parsing ───────────────────────────────────────────────────

/**
 * Parse an Odoo-exported CSV file.
 * Returns a normalized array of line items.
 * @param {File} file
 * @returns {Promise<{ rows: Array, errors: string[] }>}
 */
export async function parseOdooCSV(file) {
    return new Promise((resolve) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (result) => {
                const errors = [];
                const rows = result.data.map((raw, i) => {
                    const row = {};
                    // Normalize column names using the map
                    for (const [csvKey, ourKey] of Object.entries(ODOO_COLUMN_MAP)) {
                        if (raw[csvKey] !== undefined) {
                            row[ourKey] = raw[csvKey];
                        }
                    }
                    // Fallback: try lower-cased keys
                    if (!row.supplier_ref) {
                        const keys = Object.keys(raw);
                        const refKey = keys.find(k => k.toLowerCase().includes('reference') || k.toLowerCase().includes('ref'));
                        if (refKey) row.supplier_ref = raw[refKey];
                    }
                    if (!row.name) {
                        const nameKey = Object.keys(raw).find(k => k.toLowerCase().includes('product') || k.toLowerCase().includes('produit'));
                        if (nameKey) row.name = raw[nameKey];
                    }

                    row.qty = parseFloat(row.qty) || 0;
                    row.unit_price = parseFloat(row.unit_price) || 0;
                    row.subtotal = parseFloat(row.subtotal) || (row.qty * row.unit_price);

                    if (!row.supplier_ref && !row.name) {
                        errors.push(`Ligne ${i + 2} : référence et nom manquants`);
                    }
                    return row;
                }).filter(r => r.supplier_ref || r.name);

                resolve({ rows, errors, rawHeaders: result.meta.fields || [] });
            },
            error: (err) => resolve({ rows: [], errors: [err.message], rawHeaders: [] }),
        });
    });
}

// ─── 2. Product Matching ──────────────────────────────────────────────────────

/**
 * Match parsed supplier rows with BayIIn products using supplier_ref.
 * Returns { matched: [], unmatched: [] }
 * @param {string} storeId
 * @param {Array} parsedRows
 */
export async function matchProductsBySupplierRef(storeId, parsedRows) {
    const snap = await getDocs(
        query(collection(db, 'products'), where('storeId', '==', storeId))
    );
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const byRef = {};
    const byName = {};
    const bySKU = {};
    products.forEach(p => {
        if (p.supplier_ref) byRef[p.supplier_ref.trim().toLowerCase()] = p;
        if (p.sku) bySKU[p.sku.trim().toUpperCase()] = p;
        byName[p.name.trim().toLowerCase()] = p;
    });

    const matched = [];
    const unmatched = [];

    parsedRows.forEach(row => {
        const refKey = (row.supplier_ref || '').trim().toLowerCase();
        const nameKey = (row.name || '').trim().toLowerCase();
        // Try SKU match first (highest precision)
        const detectedSKU = extractSKUFromRow(row);
        const product = (
            (detectedSKU && bySKU[detectedSKU]) ||
            byRef[refKey] ||
            byName[nameKey] ||
            null
        );
        if (product) {
            matched.push({ ...row, product, matchedSKU: detectedSKU });
        } else {
            unmatched.push({ ...row, detectedSKU });
        }
    });

    return { matched, unmatched };
}

// ─── 3. Purchase Orders ───────────────────────────────────────────────────────

/**
 * Create a Purchase Order in Firestore.
 * @param {string} storeId
 * @param {{ supplierName: string, lines: Array, notes: string }} data
 */
export async function createPurchaseOrder(storeId, { supplierName, lines, notes }) {
    const totalHT = lines.reduce((s, l) => s + (l.qty * l.unit_price), 0);
    const ref = await addDoc(collection(db, 'purchase_orders'), {
        storeId,
        supplierName: supplierName || 'Fournisseur',
        lines,           // [{ supplier_ref, name, qty, unit_price, productId? }]
        totalHT,
        status: 'draft', // draft | sent | partial | received | cancelled
        notes: notes || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return ref.id;
}

/**
 * Update PO status (e.g. draft → sent).
 */
export async function updatePOStatus(orderId, status) {
    await updateDoc(doc(db, 'purchase_orders', orderId), {
        status,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Export a PO as a CSV string ready to import into Odoo.
 * @param {Object} order  Firestore PO document
 * @returns {string} CSV content
 */
export function exportOrderForOdoo(order) {
    const header = ['Internal Reference', 'Product', 'Quantity', 'Unit Price', 'Price Subtotal'];
    const rows = (order.lines || []).map(l => [
        l.supplier_ref || '',
        l.name || '',
        l.qty || 0,
        l.unit_price || 0,
        ((l.qty || 0) * (l.unit_price || 0)).toFixed(2),
    ]);
    return Papa.unparse({ fields: header, data: rows });
}

// ─── 4. Reception & Stock Update ─────────────────────────────────────────────

/**
 * Validate the reception of a purchase order:
 * 1. Increments stock for each product line.
 * 2. Updates costPrice with the received unit_price.
 * 3. Appends batch entries (batchNumber, expiryDate, quantity).
 *
 * @param {string} orderId
 * @param {Array} receivedLines  [{ productId, qty, unit_price, batchNumber, expiryDate }]
 * @param {string} storeId
 */
export async function validateReception(orderId, receivedLines, storeId) {
    const batch = writeBatch(db);

    for (const line of receivedLines) {
        if (!line.productId) continue;
        const productRef = doc(db, 'products', line.productId);
        const productSnap = await getDoc(productRef);
        if (!productSnap.exists()) continue;

        const current = productSnap.data();
        const currentStock = parseFloat(current.stock) || 0;
        const newStock = currentStock + (parseFloat(line.qty) || 0);

        // Build new batch entry
        const newBatch = {
            batchNumber: line.batchNumber || `LOT-${Date.now()}`,
            expiryDate: line.expiryDate || null,
            quantity: parseFloat(line.qty) || 0,
            receivedAt: new Date().toISOString().split('T')[0],
            costPrice: parseFloat(line.unit_price) || 0,
        };

        const existingBatches = current.inventoryBatches || [];
        batch.update(productRef, {
            stock: newStock,
            costPrice: parseFloat(line.unit_price) || current.costPrice || 0,
            inventoryBatches: [...existingBatches, newBatch],
            updatedAt: serverTimestamp(),
        });
    }

    // Update PO status to received
    batch.update(doc(db, 'purchase_orders', orderId), {
        status: 'received',
        receivedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    // Record reception sub-document
    await addDoc(collection(db, 'purchase_orders', orderId, 'receptions'), {
        receivedAt: serverTimestamp(),
        storeId,
        lines: receivedLines,
    });

    await batch.commit();
}

// ─── 5. Supplier Stats Dashboard ─────────────────────────────────────────────

/**
 * Aggregates supplier-related stats for the dashboard KPIs.
 * @param {string} storeId
 * @returns {{ totalDue, lastOrderDate, stockoutProducts }}
 */
export async function getSupplierStats(storeId) {
    // Purchase orders
    const ordersSnap = await getDocs(
        query(collection(db, 'purchase_orders'), where('storeId', '==', storeId))
    );
    const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Total due = sum of non-received orders
    const totalDue = orders
        .filter(o => o.status === 'sent' || o.status === 'draft')
        .reduce((s, o) => s + (o.totalHT || 0), 0);

    // Last received order
    const received = orders
        .filter(o => o.status === 'received')
        .sort((a, b) => (b.receivedAt?.seconds || 0) - (a.receivedAt?.seconds || 0));
    const lastOrderDate = received[0]?.receivedAt?.toDate?.()?.toLocaleDateString('fr-MA') || '—';

    // Stockout products (stock <= 0)
    const productsSnap = await getDocs(
        query(collection(db, 'products'), where('storeId', '==', storeId))
    );
    const stockoutProducts = productsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => (parseFloat(p.stock) || 0) <= 0);

    return { totalDue, lastOrderDate, stockoutProducts, orders };
}

// ─── 6. Future: Odoo API-Ready Hook ──────────────────────────────────────────
// To connect directly to an Odoo JSON-RPC API, replace the CSV functions above
// with calls to this service. The internal data format stays identical.

/**
 * @future connectOdooAPI
 * Placeholder for direct Odoo JSON-RPC 2.0 connection.
 * Usage: const products = await connectOdooAPI({ url, db, username, apiKey }).getProducts();
 */
export const OdooAPIClient = {
    /**
     * @param {{ url: string, db: string, username: string, apiKey: string }} config
     */
    create(config) {
        // When ready: POST to {url}/web/dataset/call_kw with JSON-RPC payload
        // Authentication: POST to {url}/web/session/authenticate
        return {
            async getProducts() {
                throw new Error('[OdooAPIClient] Not yet connected. Provide url, db, username, apiKey.');
            },
            async getSupplierInvoices() {
                throw new Error('[OdooAPIClient] Not yet connected.');
            },
        };
    }
};

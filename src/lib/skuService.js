/**
 * skuService.js
 * Generic SKU codification system for BayIIn SaaS
 */

// ─── 1. Validation ────────────────────────────────────────────────────────────

/**
 * Validate a SKU string. In a generic SaaS, any non-empty string is valid.
 * Later, this can accept store-specific regex patterns from store settings.
 * @param {string} sku
 * @param {Object} storeSettings (Optional) Store configuration containing custom SKU rules
 */
export function validateSKU(sku, storeSettings = null) {
    if (!sku || typeof sku !== 'string') {
        return { valid: false, error: 'SKU manquant' };
    }
    const upper = sku.trim().toUpperCase();

    // If store has custom SKU regex
    if (storeSettings?.skuRegex) {
        const regex = new RegExp(storeSettings.skuRegex);
        if (!regex.test(upper)) {
            return { valid: false, error: `Format invalide pour ce magasin.` };
        }
        const match = upper.match(regex);
        return { valid: true, sku: upper, lineCode: match?.[1], lineName: match?.[1] };
    }

    // Default: accept any SKU
    return { valid: true, sku: upper, lineCode: upper, lineName: upper };
}

/**
 * Extract the line code from a SKU string.
 */
export function getLineFromSKU(sku, storeSettings = null) {
    const result = validateSKU(sku, storeSettings);
    return result.valid ? result.lineCode : null;
}

/**
 * Get the human-readable line name from a SKU.
 */
export function getLineNameFromSKU(sku, storeSettings = null) {
    const result = validateSKU(sku, storeSettings);
    return result.valid ? result.lineName : null;
}

// ─── 2. SKU Suggestion ───────────────────────────────────────────────────────

/**
 * Generate a SKU suggestion for a new product based on its name and existing SKUs.
 * @param {string} productName
 * @param {string[]} existingSKUs
 * @param {Object} storeSettings
 */
export function suggestSKU(productName, existingSKUs = [], storeSettings = null) {
    if (!productName) return null;
    
    // Default generic SKU generation
    let prefix = productName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'P');
    if (prefix.length < 3) prefix = 'PRD';

    const lineNums = existingSKUs
        .filter(s => s && s.startsWith(prefix))
        .map(s => parseInt(s.slice(prefix.length)) || 0);
    const maxNum = lineNums.length > 0 ? Math.max(...lineNums) : 0;
    const nextNum = String(maxNum + 1).padStart(3, '0');
    return `${prefix}${nextNum}`;
}

// ─── 3. CSV/Odoo SKU Auto-Match ────────────────────────────────────────────────

/**
 * Given a row from a CSV import, detect a SKU.
 * @param {Object} row  Parsed supplier row
 * @param {Object} storeSettings
 */
export function extractSKUFromRow(row, storeSettings = null) {
    // Check known reference fields
    const candidates = [
        row.supplier_ref,
        row.sku,
        row.name,
    ].filter(Boolean);

    for (const val of candidates) {
        const words = String(val).trim().toUpperCase().split(/[\s,;/|]+/);
        for (const word of words) {
            // If store has regex, test it. Otherwise just use the word if it's alphanumeric
            if (storeSettings?.skuRegex) {
                const regex = new RegExp(storeSettings.skuRegex);
                if (regex.test(word)) return word;
            } else if (word.length >= 3) {
                return word;
            }
        }
    }
    return null;
}

// ─── 4. Display Helpers ───────────────────────────────────────────────────────

/**
 * Format a SKU for display.
 */
export function formatSKUDisplay(sku, storeSettings = null) {
    return sku;
}

/**
 * Filter a product list by partial SKU prefix (for search).
 */
export function filterBySKU(products, query) {
    if (!query) return products;
    const q = query.trim().toUpperCase();
    return products.filter(p => p.sku && p.sku.toUpperCase().includes(q));
}

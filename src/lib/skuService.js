/**
 * skuService.js
 * SKU codification system for KUO'S Cosmetics — BayIIn
 *
 * Format: D[LINE_CODE][3-DIGIT_NUMBER]
 * Examples: DREN001, DSVP001, DSEN001, DCOL001
 */

// ─── KUO'S Product Line Registry ─────────────────────────────────────────────
// Maps the 2-4 letter line code → human-readable line name
export const KUOS_LINE_MAP = {
    REN: 'Renewal',
    SVP: 'Supreme',
    SEN: 'Sensitive',
    COL: 'Colastin',
    HYD: 'Hydra Boost',
    BRI: 'Brightening',
    ANT: 'Anti-Age',
    MIC: 'Micellar',
    SER: 'Sérum',
    MAS: 'Masque',
    OIL: 'Oil',
    TON: 'Toner',
    CRM: 'Crème',
    SPF: 'Solaire SPF',
    EYE: 'Contour Yeux',
    LIP: 'Lèvres',
    BOD: 'Corps',
    HAI: 'Cheveux',
};

// SKU format regex: starts with D, then 2-4 uppercase letters (line code), then 3 digits
export const SKU_REGEX = /^D([A-Z]{2,4})(\d{3})$/;

// ─── 1. Validation ────────────────────────────────────────────────────────────

/**
 * Validate a SKU string against the KUO'S format.
 * @param {string} sku
 * @returns {{ valid: boolean, lineCode?: string, lineName?: string, number?: string, error?: string }}
 */
export function validateSKU(sku) {
    if (!sku || typeof sku !== 'string') {
        return { valid: false, error: 'SKU manquant' };
    }
    const upper = sku.trim().toUpperCase();
    const match = upper.match(SKU_REGEX);
    if (!match) {
        return {
            valid: false,
            error: `Format invalide. Attendu : D[LIGNE][000] (ex: DREN001, DSVP001)`
        };
    }
    const [, lineCode, number] = match;
    const lineName = KUOS_LINE_MAP[lineCode] || `Ligne ${lineCode}`;
    return { valid: true, sku: upper, lineCode, lineName, number };
}

/**
 * Extract the line code from a SKU string. Returns null if invalid.
 * @param {string} sku
 */
export function getLineFromSKU(sku) {
    const result = validateSKU(sku);
    return result.valid ? result.lineCode : null;
}

/**
 * Get the human-readable line name from a SKU.
 * @param {string} sku
 */
export function getLineNameFromSKU(sku) {
    const result = validateSKU(sku);
    return result.valid ? result.lineName : null;
}

// ─── 2. SKU Suggestion ───────────────────────────────────────────────────────

/**
 * Auto-detect a likely SKU prefix from a product name.
 * Useful for import suggestions.
 * @param {string} productName
 * @returns {string|null}
 */
export function detectLineFromName(productName) {
    if (!productName) return null;
    const name = productName.toUpperCase();

    // Direct keyword → line code mapping
    const keywords = {
        RENEWAL: 'REN',
        SUPREME: 'SVP',
        SENSITIVE: 'SEN',
        COLASTIN: 'COL',
        HYDRA: 'HYD',
        BRIGHT: 'BRI',
        ANTI: 'ANT',
        MICELLAR: 'MIC',
        SERUM: 'SER',
        MASQUE: 'MAS',
        MASK: 'MAS',
        HUILE: 'OIL',
        OIL: 'OIL',
        TONER: 'TON',
        CREME: 'CRM',
        CREAM: 'CRM',
        SPF: 'SPF',
        SOLAIRE: 'SPF',
        YEUX: 'EYE',
        LEVRES: 'LIP',
        CORPS: 'BOD',
        CHEVEUX: 'HAI',
    };

    for (const [keyword, code] of Object.entries(keywords)) {
        if (name.includes(keyword)) return code;
    }
    return null;
}

/**
 * Generate a SKU suggestion for a new product based on its name and existing SKUs.
 * @param {string} productName
 * @param {string[]} existingSKUs
 * @returns {string|null} Suggested SKU, e.g. "DSVP003"
 */
export function suggestSKU(productName, existingSKUs = []) {
    const lineCode = detectLineFromName(productName);
    if (!lineCode) return null;

    // Find the highest existing number for this line
    const linePrefix = `D${lineCode}`;
    const lineNums = existingSKUs
        .filter(s => s && s.startsWith(linePrefix))
        .map(s => parseInt(s.slice(linePrefix.length)) || 0);
    const maxNum = lineNums.length > 0 ? Math.max(...lineNums) : 0;
    const nextNum = String(maxNum + 1).padStart(3, '0');
    return `${linePrefix}${nextNum}`;
}

// ─── 3. CSV/Odoo SKU Auto-Match ────────────────────────────────────────────────

/**
 * Given a row from an Odoo CSV import, detect any KUO'S-format SKU
 * in the reference fields and return it, or null.
 * @param {Object} row  Parsed supplier row
 * @returns {string|null}
 */
export function extractSKUFromRow(row) {
    // Check known reference fields
    const candidates = [
        row.supplier_ref,
        row.sku,
        row.name,
    ].filter(Boolean);

    for (const val of candidates) {
        const words = String(val).trim().toUpperCase().split(/[\s,;/|]+/);
        for (const word of words) {
            if (SKU_REGEX.test(word)) return word;
        }
    }
    return null;
}

// ─── 4. Display Helpers ───────────────────────────────────────────────────────

/**
 * Format a SKU for display with the line name appended.
 * @param {string} sku e.g. "DSVP001"
 * @returns {string} e.g. "DSVP001 · Supreme"
 */
export function formatSKUDisplay(sku) {
    const lineName = getLineNameFromSKU(sku);
    return lineName ? `${sku} · ${lineName}` : sku;
}

/**
 * Filter a product list by partial SKU prefix (for search).
 * Matches start of line code, e.g. "DCOL" matches DCOL001, DCOL002 …
 * @param {Object[]} products
 * @param {string} query
 */
export function filterBySKU(products, query) {
    if (!query) return products;
    const q = query.trim().toUpperCase();
    return products.filter(p => p.sku && p.sku.toUpperCase().includes(q));
}

/**
 * Robustly extracts a JSON action object from a string.
 * This handles cases where the AI adds markdown fences or prose around the JSON.
 */
export function extractActionFromResponse(text) {
    if (!text) return null;

    try {
        // 1. Look for markdown JSON block first
        const markdownMatch = text.match(/```json([\s\S]*?)```/);
        if (markdownMatch && markdownMatch[1]) {
            const json = JSON.parse(markdownMatch[1].trim());
            if (isValidAction(json)) return json;
        }

        // 2. Fallback: search for the first { and the last }
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const potentialJson = text.substring(firstBrace, lastBrace + 1);
            const json = JSON.parse(potentialJson);
            if (isValidAction(json)) return json;
        }
    } catch (e) {
        // Silently fail to extract if JSON is malformed
        console.warn("Failed to parse AI action JSON:", e.message);
    }

    return null;
}

/**
 * Validates that the object follows the { action: "STRING", data: {} } pattern
 */
function isValidAction(obj) {
    return (
        obj &&
        typeof obj === 'object' &&
        typeof obj.action === 'string' &&
        obj.data &&
        typeof obj.data === 'object'
    );
}

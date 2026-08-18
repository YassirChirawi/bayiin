import { describe, it, expect } from "vitest";
import { normalizePhoneMA } from "../../src/utils/phone";

describe("normalizePhoneMA", () => {
    it("normalise toutes les variantes marocaines vers 0XXXXXXXXX", () => {
        expect(normalizePhoneMA("+212612345678")).toBe("0612345678");
        expect(normalizePhoneMA("00212612345678")).toBe("0612345678");
        expect(normalizePhoneMA("0612345678")).toBe("0612345678");
        expect(normalizePhoneMA("612345678")).toBe("0612345678");
        expect(normalizePhoneMA("06 12 34 56 78")).toBe("0612345678");
        expect(normalizePhoneMA("+212 7 12-34-56-78")).toBe("0712345678");
    });

    it("les variantes du même numéro convergent (dédup)", () => {
        const canon = normalizePhoneMA("0612345678");
        expect(normalizePhoneMA("+212612345678")).toBe(canon);
        expect(normalizePhoneMA("612345678")).toBe(canon);
    });

    it("gère les entrées vides / invalides", () => {
        expect(normalizePhoneMA("")).toBe("");
        expect(normalizePhoneMA(null)).toBe("");
        expect(normalizePhoneMA(undefined)).toBe("");
    });
});

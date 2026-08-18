import { describe, it, expect } from "vitest";
import { getCustomerSegment, getSegmentFromSummary } from "../../src/utils/aiSegmentation";

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

describe("getSegmentFromSummary (résumé agrégé)", () => {
    it("VIP : dépense + fréquence élevées et récent", () => {
        const s = getSegmentFromSummary({ totalSpent: 3000, orderCount: 6, lastOrderDate: daysAgo(5) });
        expect(s.id).toBe("VIP");
    });
    it("VIP à risque : VIP mais inactif > 60 j", () => {
        const s = getSegmentFromSummary({ totalSpent: 3000, orderCount: 6, lastOrderDate: daysAgo(90) });
        expect(s.id).toBe("VIP_RISK");
    });
    it("Fidèle : 3+ commandes récentes", () => {
        expect(getSegmentFromSummary({ totalSpent: 400, orderCount: 3, lastOrderDate: daysAgo(10) }).id).toBe("LOYAL");
    });
    it("Fidèle : forte dépense même avec peu de commandes", () => {
        expect(getSegmentFromSummary({ totalSpent: 1500, orderCount: 1, lastOrderDate: daysAgo(10) }).id).toBe("LOYAL");
    });
    it("Nouveau : aucune commande", () => {
        expect(getSegmentFromSummary({ totalSpent: 0, orderCount: 0 }).id).toBe("NEW");
    });
    it("Inactif : petit client silencieux > 120 j", () => {
        expect(getSegmentFromSummary({ totalSpent: 100, orderCount: 1, lastOrderDate: daysAgo(200) }).id).toBe("LOST");
    });
    it("Actif : petit client récent", () => {
        expect(getSegmentFromSummary({ totalSpent: 100, orderCount: 1, lastOrderDate: daysAgo(10) }).id).toBe("REGULAR");
    });
});

describe("getCustomerSegment (historique réel — ne compte que les livrées)", () => {
    it("VIP depuis 5 commandes livrées à 500 chacune", () => {
        const orders = Array.from({ length: 5 }, () => ({ status: "livré", price: 500, quantity: 1, createdAt: daysAgo(5) }));
        expect(getCustomerSegment({}, orders).id).toBe("VIP");
    });
    it("ignore les commandes non livrées pour la valeur", () => {
        const orders = [
            { status: "confirmation", price: 5000, quantity: 1, createdAt: daysAgo(5) },
            { status: "annulé", price: 5000, quantity: 1, createdAt: daysAgo(5) },
        ];
        // aucune livrée → REGULAR (récent), pas VIP
        expect(getCustomerSegment({}, orders).id).toBe("REGULAR");
    });
    it("aucune commande → NEW", () => {
        expect(getCustomerSegment({}, []).id).toBe("NEW");
    });
});

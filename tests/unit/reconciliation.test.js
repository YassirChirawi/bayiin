import { describe, it, expect } from "vitest";
// Importe la VRAIE logique utilisée par SmartReconciliationWizard (plus de copie).
import { cleanRef, extractNumber, findMatchingOrder, evaluateMatch, orderAmount } from "../../src/utils/reconciliationMatcher";

describe("Smart COD Reconciliation Heuristics", () => {
    const mockOrders = [
        { id: "o1", orderNumber: "CMD-1025", price: 250, quantity: 1, isPaid: false, clientName: "Ali" },
        { id: "o2", orderNumber: "CMD-1026", price: 300, quantity: 2, isPaid: false, clientName: "Fatima" }, // total 600
        { id: "o3", orderNumber: "CMD-1027", price: 150, quantity: 1, isPaid: true, clientName: "Omar" },
    ];

    describe("cleanRef", () => {
        it("lowercase + retire le non-alphanumérique", () => {
            expect(cleanRef("CMD-1025")).toBe("cmd1025");
            expect(cleanRef("cmd_1025")).toBe("cmd1025");
            expect(cleanRef("  CMD 1025  ")).toBe("cmd1025");
            expect(cleanRef("")).toBe("");
            expect(cleanRef(null)).toBe("");
        });
    });

    describe("extractNumber", () => {
        it("extrait les chiffres", () => {
            expect(extractNumber("CMD-1025")).toBe("1025");
            expect(extractNumber("1026_test")).toBe("1026");
            expect(extractNumber("abc")).toBe("");
            expect(extractNumber("")).toBe("");
        });
    });

    describe("orderAmount", () => {
        it("multiplie prix × quantité", () => {
            expect(orderAmount({ price: 300, quantity: 2 })).toBe(600);
            expect(orderAmount({ price: 250 })).toBe(250);
            expect(orderAmount({})).toBe(0);
        });
    });

    describe("findMatchingOrder", () => {
        it("match la référence nettoyée", () => {
            expect(findMatchingOrder(mockOrders, "CMD-1025")?.id).toBe("o1");
            expect(findMatchingOrder(mockOrders, "cmd_1025")?.id).toBe("o1");
        });
        it("repli sur le numéro brut quand le transporteur retire le préfixe", () => {
            expect(findMatchingOrder(mockOrders, "1026")?.id).toBe("o2");
        });
        it("match aussi par id de commande", () => {
            expect(findMatchingOrder(mockOrders, "o3")?.id).toBe("o3");
        });
        it("retourne null pour une référence inconnue (orphan)", () => {
            expect(findMatchingOrder(mockOrders, "CMD-9999")).toBeNull();
            expect(findMatchingOrder(mockOrders, "")).toBeNull();
        });
    });

    describe("evaluateMatch", () => {
        it("perfect quand le montant transporteur = valeur commande (avec quantité)", () => {
            expect(evaluateMatch(mockOrders[0], 250)).toBe("perfect"); // 250×1
            expect(evaluateMatch(mockOrders[1], 600)).toBe("perfect"); // 300×2
        });
        it("mismatch en cas d'écart de prix", () => {
            expect(evaluateMatch(mockOrders[0], 240)).toBe("mismatch");
            expect(evaluateMatch(mockOrders[1], 500)).toBe("mismatch"); // ignore la quantité => détecté
        });
        it("already_paid si la commande est déjà payée", () => {
            expect(evaluateMatch(mockOrders[2], 150)).toBe("already_paid");
        });
        it("orphan si aucune commande", () => {
            expect(evaluateMatch(null, 150)).toBe("orphan");
        });
        it("tolère un écart < 1 (arrondis)", () => {
            expect(evaluateMatch(mockOrders[0], 250.5)).toBe("perfect");
        });
    });
});

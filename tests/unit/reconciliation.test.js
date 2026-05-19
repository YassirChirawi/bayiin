import { describe, it, expect } from "vitest";

// Pure functions extracted from SmartReconciliationWizard for testing
const cleanRef = (refStr) => {
    if (!refStr) return "";
    return String(refStr).toLowerCase().replace(/[^a-z0-9]/g, "");
};

const extractNumber = (refStr) => {
    if (!refStr) return "";
    const match = String(refStr).match(/\d+/);
    return match ? match[0] : "";
};

const findMatchingOrder = (orders, courierRef, courierAmount) => {
    if (!courierRef) return null;
    
    const cleanedCourierRef = cleanRef(courierRef);
    const numCourierRef = extractNumber(courierRef);

    // 1. Try exact reference match
    let matched = orders.find(o => cleanRef(o.orderNumber) === cleanedCourierRef || cleanRef(o.id) === cleanedCourierRef);

    // 2. Try raw number fallback (for cases where courier strips prefixes)
    if (!matched && numCourierRef) {
        matched = orders.find(o => extractNumber(o.orderNumber) === numCourierRef);
    }

    return matched || null;
};

const evaluateMatch = (dbOrder, courierAmount) => {
    if (!dbOrder) return "orphan";
    
    const dbAmount = (parseFloat(dbOrder.price) || 0) * (parseInt(dbOrder.quantity) || 1);
    
    if (dbOrder.isPaid) {
        return "already_paid";
    }
    
    const diff = Math.abs(dbAmount - courierAmount);
    if (diff < 1) {
        return "perfect";
    } else {
        return "mismatch";
    }
};

describe("Smart COD Reconciliation Heuristics", () => {
    const mockOrders = [
        { id: "o1", orderNumber: "CMD-1025", price: 250, quantity: 1, isPaid: false, clientName: "Ali" },
        { id: "o2", orderNumber: "CMD-1026", price: 300, quantity: 2, isPaid: false, clientName: "Fatima" },
        { id: "o3", orderNumber: "CMD-1027", price: 150, quantity: 1, isPaid: true, clientName: "Omar" }
    ];

    describe("cleanRef", () => {
        it("should lowercase and remove non-alphanumeric characters", () => {
            expect(cleanRef("CMD-1025")).toBe("cmd1025");
            expect(cleanRef("cmd_1025")).toBe("cmd1025");
            expect(cleanRef("  CMD 1025  ")).toBe("cmd1025");
            expect(cleanRef("")).toBe("");
            expect(cleanRef(null)).toBe("");
        });
    });

    describe("extractNumber", () => {
        it("should extract digits from reference", () => {
            expect(extractNumber("CMD-1025")).toBe("1025");
            expect(extractNumber("1026_test")).toBe("1026");
            expect(extractNumber("abc")).toBe("");
            expect(extractNumber("")).toBe("");
        });
    });

    describe("findMatchingOrder", () => {
        it("should match exact clean references", () => {
            const match = findMatchingOrder(mockOrders, "CMD-1025", 250);
            expect(match).not.toBeNull();
            expect(match.id).toBe("o1");
        });

        it("should match when courier strips prefix (raw number fallback)", () => {
            const match = findMatchingOrder(mockOrders, "1026", 600);
            expect(match).not.toBeNull();
            expect(match.id).toBe("o2");
        });

        it("should return null for unknown references (orphan)", () => {
            const match = findMatchingOrder(mockOrders, "CMD-9999", 100);
            expect(match).toBeNull();
        });
    });

    describe("evaluateMatch", () => {
        it("should return perfect for exact match", () => {
            const dbOrder = mockOrders[0]; // CMD-1025, price 250, qty 1 -> 250
            const state = evaluateMatch(dbOrder, 250);
            expect(state).toBe("perfect");
        });

        it("should return mismatch for pricing discrepancies", () => {
            const dbOrder = mockOrders[0]; // CMD-1025, expected 250
            const state = evaluateMatch(dbOrder, 240); // courier collected 240
            expect(state).toBe("mismatch");
        });

        it("should return already_paid if order is already marked paid", () => {
            const dbOrder = mockOrders[2]; // CMD-1027, already isPaid = true
            const state = evaluateMatch(dbOrder, 150);
            expect(state).toBe("already_paid");
        });

        it("should return orphan if dbOrder is null", () => {
            const state = evaluateMatch(null, 150);
            expect(state).toBe("orphan");
        });
    });
});

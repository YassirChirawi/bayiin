import { describe, it, expect } from "vitest";
import { computeCodAmount } from "../../src/lib/codAmount";

describe("computeCodAmount", () => {
    const order = { price: 200, quantity: 3, shippingFee: 25 }; // produits = 600

    it("livraison NON payée par le client (défaut) → produits seulement", () => {
        expect(computeCodAmount(order, {})).toBe(600);
        expect(computeCodAmount(order, { customerPaysShipping: false })).toBe(600);
    });

    it("client paie la livraison → produits + frais de la commande", () => {
        expect(computeCodAmount(order, { customerPaysShipping: true })).toBe(625);
    });

    it("repli sur shippingCost puis frais boutique par défaut", () => {
        expect(computeCodAmount({ price: 100, quantity: 1, shippingCost: 30 }, { customerPaysShipping: true })).toBe(130);
        expect(computeCodAmount({ price: 100, quantity: 1 }, { customerPaysShipping: true, defaultShippingFee: 40 })).toBe(140);
    });

    it("livraison à 0 (gratuite explicite) reste 0", () => {
        expect(computeCodAmount({ price: 100, quantity: 1, shippingFee: 0 }, { customerPaysShipping: true })).toBe(100);
    });

    it("gère les valeurs manquantes / sales", () => {
        expect(computeCodAmount({}, { customerPaysShipping: true })).toBe(0);
        expect(computeCodAmount({ price: "abc", quantity: "x" }, {})).toBe(0);
        expect(computeCodAmount({ price: 50 }, {})).toBe(50); // quantité par défaut = 1
    });
});

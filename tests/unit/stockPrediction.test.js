import { describe, it, expect } from "vitest";
import { predictStockout, getAtRiskProducts } from "../../src/utils/stockPrediction";

// Date récente (dans la fenêtre de 30 j).
const recent = new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0];
const old = new Date(Date.now() - 60 * 86400000).toISOString().split("T")[0];

describe("predictStockout", () => {
    it("compte les commandes mono-article (par id)", () => {
        const p = { id: "p1", name: "Prod 1", stock: 30 };
        const orders = [
            { date: recent, status: "livré", articleId: "p1", quantity: 10 },
            { date: recent, status: "livré", articleId: "p1", quantity: 5 },
        ];
        const r = predictStockout(p, orders);
        expect(r.totalSold).toBe(15);
        expect(r.dailyRate).toBeGreaterThan(0);
    });

    it("compte AUSSI les commandes multi-produits (products[])", () => {
        const p = { id: "p1", name: "Prod 1", stock: 30 };
        const orders = [
            { date: recent, status: "livré", products: [{ id: "p1", quantity: 4 }, { id: "p2", quantity: 9 }] },
            { date: recent, status: "livré", products: [{ id: "p1", quantity: 2 }] },
        ];
        const r = predictStockout(p, orders);
        expect(r.totalSold).toBe(6); // 4 + 2, ignore p2
    });

    it("ignore les ventes hors fenêtre et les retours/annulations", () => {
        const p = { id: "p1", name: "Prod 1", stock: 30 };
        const orders = [
            { date: old, status: "livré", articleId: "p1", quantity: 100 },
            { date: recent, status: "retour", articleId: "p1", quantity: 50 },
            { date: recent, status: "annulé", articleId: "p1", quantity: 50 },
        ];
        expect(predictStockout(p, orders).totalSold).toBe(0);
    });

    it("marque un produit en rupture (stock 0) comme à risque", () => {
        const r = predictStockout({ id: "p1", name: "X", stock: 0 }, [
            { date: recent, status: "livré", articleId: "p1", quantity: 3 },
        ]);
        expect(r.daysLeft).toBe(0);
        expect(r.isAtRisk).toBe(true);
    });
});

describe("getAtRiskProducts", () => {
    const orders = [
        { date: recent, status: "livré", articleId: "fast", quantity: 40 },   // vélocité élevée
        { date: recent, status: "livré", articleId: "rupture", quantity: 12 },
    ];

    it("inclut un produit DÉJÀ en rupture qui se vendait encore", () => {
        const products = [{ id: "rupture", name: "Rupture", stock: 0 }];
        const at = getAtRiskProducts(products, orders);
        expect(at.map((x) => x.product.id)).toContain("rupture");
    });

    it("inclut un produit à faible couverture", () => {
        const products = [{ id: "fast", name: "Fast", stock: 5 }]; // ~40/30 j/j → <7 j
        const at = getAtRiskProducts(products, orders);
        expect(at.map((x) => x.product.id)).toContain("fast");
    });

    it("exclut un produit bien stocké et lent", () => {
        const products = [{ id: "slow", name: "Slow", stock: 999 }];
        expect(getAtRiskProducts(products, orders)).toHaveLength(0);
    });

    it("exclut les produits supprimés", () => {
        const products = [{ id: "rupture", name: "R", stock: 0, deleted: true }];
        expect(getAtRiskProducts(products, orders)).toHaveLength(0);
    });
});

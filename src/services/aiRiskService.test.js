import { describe, it, expect } from "vitest";
import { buildRiskModel, scoreOrderRisk, getRiskLevel, normalizePhone } from "./aiRiskService";

const mk = (status, clientCity, clientPhone, price = 100) => ({ status, clientCity, clientPhone, price, quantity: 1 });

// Historique : Casa surtout livré, Dakhla surtout en échec ; un client récidiviste.
const HISTORY = [
  mk("livré", "Casablanca", "0600000001"),
  mk("livré", "Casablanca", "0600000002"),
  mk("retour", "Casablanca", "0600000003"),
  mk("livré", "Casablanca", "0600000004"),
  mk("retour", "Dakhla", "0611111111"),
  mk("annulé", "Dakhla", "0611111111"),
  mk("pas de réponse", "Dakhla", "0622222222"),
  mk("retour", "Dakhla", "0633333333"),
  mk("livré", "Dakhla", "0644444444"),
  mk("confirmation", "Fes", "0655555555"), // non résolu → ignoré des taux
];

describe("normalizePhone", () => {
  it("garde les 9 derniers chiffres", () => {
    expect(normalizePhone("0611111111")).toBe("611111111");
    expect(normalizePhone("+212 611-111-111")).toBe("611111111");
    expect(normalizePhone("")).toBe("");
  });
});

describe("buildRiskModel", () => {
  const m = buildRiskModel(HISTORY);
  it("ignore les commandes non résolues et calcule le taux de base", () => {
    expect(m.sampleSize).toBe(9); // 10 - 1 (confirmation)
    expect(m.baseFailRate).toBeCloseTo(5 / 9, 5);
  });
  it("agrège les taux par ville", () => {
    expect(m.cityStats["dakhla"]).toEqual({ total: 5, fail: 4 });
    expect(m.cityStats["casablanca"]).toEqual({ total: 4, fail: 1 });
  });
  it("agrège l'historique par client (téléphone normalisé)", () => {
    expect(m.custStats["611111111"]).toEqual({ total: 2, fail: 2, delivered: 0 });
  });
  it("fournit un défaut prudent sans données", () => {
    expect(buildRiskModel([]).baseFailRate).toBe(0.25);
  });
});

describe("scoreOrderRisk", () => {
  const m = buildRiskModel(HISTORY);

  it("attribue le score maximum à un client récidiviste en ville à risque", () => {
    const r = scoreOrderRisk(mk(undefined, "Dakhla", "0611111111"), m);
    expect(r.score).toBe(100);
    expect(r.recommendation).toMatch(/acompte|appel/i);
    expect(r.reasons.some((x) => /commandes échouées/i.test(x.label))).toBe(true);
  });

  it("récompense un client fidèle (delta négatif)", () => {
    const model = buildRiskModel([
      mk("livré", "Rabat", "0677777777"),
      mk("livré", "Rabat", "0677777777"),
      mk("livré", "Rabat", "0677777777"),
    ]);
    const r = scoreOrderRisk(mk(undefined, "Rabat", "0677777777"), model);
    expect(r.reasons.some((x) => x.delta < 0)).toBe(true);
  });

  it("pénalise un client inconnu comparé à un client fidèle (même commande)", () => {
    const model = buildRiskModel([
      mk("livré", "Rabat", "0677777777"),
      mk("livré", "Rabat", "0677777777"),
      mk("livré", "Rabat", "0677777777"),
    ]);
    const trusted = scoreOrderRisk(mk(undefined, "Rabat", "0677777777"), model).score;
    const unknown = scoreOrderRisk(mk(undefined, "Rabat", "0699999999"), model).score;
    expect(unknown).toBeGreaterThan(trusted);
  });

  it("signale un nouveau client", () => {
    const r = scoreOrderRisk(mk(undefined, "Tanger", "0688888888"), m);
    expect(r.reasons.some((x) => /nouveau client/i.test(x.label))).toBe(true);
  });

  it("borne le score entre 0 et 100 et reste explicable", () => {
    const r = scoreOrderRisk(mk(undefined, "Casablanca", "0600000001"), m);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.reasons.length).toBeGreaterThan(0);
  });
});

describe("getRiskLevel", () => {
  it("mappe les seuils", () => {
    expect(getRiskLevel(10).label).toBe("Sûr");
    expect(getRiskLevel(45).label).toBe("Modéré");
    expect(getRiskLevel(80).label).toBe("Risqué");
  });
});

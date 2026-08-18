/**
 * Beya3 — Moteur d'intelligence COD (serveur).
 *
 * Version serveur (firebase-admin) du Smart COD Shield : apprend les taux d'échec
 * réels de la boutique (retour / annulé / pas de réponse) par ville et par client,
 * pour scorer le risque des commandes ACTIVES et recommander des actions.
 * La logique de scoring est identique au service client (src/services/aiRiskService.js),
 * couverte par des tests unitaires côté client.
 */
const { getFirestore } = require("firebase-admin/firestore");

const FAIL_STATUSES = ["retour", "retour en cours", "annulé", "pas de réponse"];
const SUCCESS_STATUS = "livré";
// Commandes encore "en vol" qu'il est utile de scorer (pas encore résolues).
const ACTIVE_STATUSES = ["reçu", "confirmation", "packing", "ramassage", "livraison", "reporté"];
const SAMPLE = 500;
const MIN_CITY_SAMPLE = 5;

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const norm = (s) => (s || "").toString().trim().toLowerCase();
const normalizePhone = (p) => {
  const d = (p || "").toString().replace(/\D/g, "");
  return d.length >= 9 ? d.slice(-9) : d;
};
const orderValue = (o) => (parseFloat(o?.price) || 0) * (parseInt(o?.quantity) || 1);

function buildRiskModel(orders = []) {
  const cityStats = {}, custStats = {};
  let total = 0, fail = 0, valueSum = 0, valueCount = 0;
  for (const o of orders) {
    const isFail = FAIL_STATUSES.includes(o.status);
    const isDelivered = o.status === SUCCESS_STATUS;
    const resolved = isFail || isDelivered;
    if (resolved) {
      total += 1; if (isFail) fail += 1;
      const city = norm(o.clientCity || o.city);
      if (city) { (cityStats[city] ||= { total: 0, fail: 0 }); cityStats[city].total += 1; if (isFail) cityStats[city].fail += 1; }
    }
    const phone = normalizePhone(o.clientPhone || o.phone);
    if (phone && resolved) {
      (custStats[phone] ||= { total: 0, fail: 0, delivered: 0 });
      custStats[phone].total += 1;
      if (isFail) custStats[phone].fail += 1;
      if (isDelivered) custStats[phone].delivered += 1;
    }
    const v = orderValue(o);
    if (v > 0) { valueSum += v; valueCount += 1; }
  }
  return {
    cityStats, custStats,
    baseFailRate: total > 0 ? fail / total : 0.25,
    avgOrderValue: valueCount > 0 ? valueSum / valueCount : 0,
    sampleSize: total,
  };
}

function recommend(score, customerHasFailures) {
  if (score >= 65) {
    return customerHasFailures
      ? "Client à risque : confirmer fermement par appel et envisager un acompte / prépaiement."
      : "Confirmer par appel avant expédition ; envisager un acompte si possible.";
  }
  if (score >= 40) return "Confirmer par WhatsApp avant d'expédier.";
  return "Faible risque — expédier normalement.";
}

function scoreOrderRisk(order, model) {
  const m = model || buildRiskModel([]);
  const reasons = [];
  const base = clamp(Math.round(m.baseFailRate * 100), 10, 45);
  let score = base;
  reasons.push({ label: `Base boutique : ${Math.round(m.baseFailRate * 100)}% d'échec COD`, delta: 0 });

  const city = norm(order.clientCity || order.city);
  const cs = city ? m.cityStats[city] : null;
  if (cs && cs.total >= MIN_CITY_SAMPLE) {
    const cityRate = cs.fail / cs.total;
    const delta = Math.round((cityRate - m.baseFailRate) * 60);
    if (Math.abs(delta) >= 3) { score += delta; reasons.push({ label: `${order.clientCity || order.city} : ${Math.round(cityRate * 100)}% d'échec (n=${cs.total})`, delta }); }
  }

  const phone = normalizePhone(order.clientPhone || order.phone);
  const c = phone ? m.custStats[phone] : null;
  let customerHasFailures = false;
  if (c && c.total >= 1) {
    if (c.fail > 0) {
      const custRate = c.fail / c.total;
      const delta = Math.round(custRate * 45) + (c.total >= 2 ? 10 : 0);
      score += delta; customerHasFailures = true;
      reasons.push({ label: `Client : ${c.fail}/${c.total} commandes échouées`, delta });
    } else if (c.delivered >= 2) {
      score -= 18; reasons.push({ label: `Client fidèle : ${c.delivered} livraisons réussies`, delta: -18 });
    }
  } else {
    score += 8; reasons.push({ label: "Nouveau client (aucun historique)", delta: 8 });
  }

  const v = orderValue(order);
  if (m.avgOrderValue > 0 && v > 2 * m.avgOrderValue) {
    score += 12; reasons.push({ label: `Panier élevé (${Math.round(v)} vs moy. ${Math.round(m.avgOrderValue)})`, delta: 12 });
  } else if (m.avgOrderValue === 0 && v > 2000) {
    score += 10; reasons.push({ label: `Panier élevé (${Math.round(v)} DH)`, delta: 10 });
  }

  score = clamp(Math.round(score), 0, 100);
  const level = score < 30 ? "Sûr" : score < 60 ? "Modéré" : "Risqué";
  return { score, level, reasons, recommendation: recommend(score, customerHasFailures) };
}

/**
 * Analyse le risque des commandes actives d'une boutique.
 * @returns { summary, orders: [{ id, orderNumber, clientName, clientCity, score, level, recommendation, reasons }] }
 */
async function assessStoreRisk(storeId, args = {}) {
  const db = getFirestore("comsaas");
  const snap = await db.collection("orders").where("storeId", "==", storeId).limit(SAMPLE).get();
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const model = buildRiskModel(all);

  const minScore = typeof args.minScore === "number" ? args.minScore : 60;
  const limit = Math.min(args.limit || 15, 50);

  const active = all.filter((o) => !o.deleted && ACTIVE_STATUSES.includes(o.status));
  const scored = active.map((o) => {
    const r = scoreOrderRisk(o, model);
    return {
      id: o.id,
      orderNumber: o.orderNumber || o.id?.slice(0, 6),
      clientName: o.clientName || null,
      clientCity: o.clientCity || o.city || null,
      status: o.status,
      score: r.score,
      level: r.level,
      recommendation: r.recommendation,
      reasons: r.reasons.filter((x) => x.delta !== 0).map((x) => x.label),
    };
  }).sort((a, b) => b.score - a.score);

  const risky = scored.filter((o) => o.score >= minScore).slice(0, limit);
  return {
    summary: {
      activeOrders: active.length,
      atRisk: scored.filter((o) => o.score >= minScore).length,
      storeFailRate: Math.round(model.baseFailRate * 100),
      historySample: model.sampleSize,
    },
    orders: risky,
  };
}

module.exports = { buildRiskModel, scoreOrderRisk, assessStoreRisk };

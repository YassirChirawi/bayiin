/**
 * AI Risk Service — Smart COD Shield (Beya3)
 *
 * Estime le risque d'échec (retour / annulation / pas de réponse) d'une commande COD.
 * Contrairement à la v1 (villes à risque codées en dur), ce moteur est DATA-DRIVEN :
 * il apprend les taux d'échec réels de la boutique par VILLE et par CLIENT depuis
 * l'historique, et renvoie un score EXPLICABLE (raisons) + une RECOMMANDATION d'action.
 *
 * API :
 *   buildRiskModel(orders)        → modèle pur (agrégats), testable
 *   scoreOrderRisk(order, model)  → { score, reasons[], recommendation } (pur)
 *   getRiskLevel(score)           → { label, color, icon }
 *   assessOrderRisk(order, id)    → { score, level, reasons[], recommendation } (async, caché)
 *   calculateOrderRisk(order, id) → number  (compat rétro : score seul)
 */

import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../lib/firebase";

// Statuts COD "résolus" : livraison réussie vs échec (les seuls qui informent le taux).
const FAIL_STATUSES = ["retour", "retour en cours", "annulé", "pas de réponse"];
const SUCCESS_STATUS = "livré";

// Combien de commandes récentes échantillonner pour construire le modèle boutique.
const MODEL_SAMPLE_SIZE = 400;
// Nb minimum d'observations pour faire confiance à un taux par ville.
const MIN_CITY_SAMPLE = 5;

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const norm = (s) => (s || "").toString().trim().toLowerCase();

/** Normalise un numéro marocain : ne garde que les chiffres, sur les 9 derniers. */
export function normalizePhone(phone) {
  const digits = (phone || "").toString().replace(/\D/g, "");
  return digits.length >= 9 ? digits.slice(-9) : digits;
}

const orderValue = (o) => (parseFloat(o?.price) || 0) * (parseInt(o?.quantity) || 1);

/**
 * Construit un modèle de risque à partir de l'historique des commandes (fonction pure).
 */
export function buildRiskModel(orders = []) {
  const cityStats = {};   // ville -> { total, fail }
  const custStats = {};   // téléphone -> { total, fail, delivered }
  let total = 0, fail = 0, valueSum = 0, valueCount = 0;

  for (const o of orders) {
    const status = o?.status;
    const isFail = FAIL_STATUSES.includes(status);
    const isDelivered = status === SUCCESS_STATUS;
    const resolved = isFail || isDelivered;

    if (resolved) {
      total += 1;
      if (isFail) fail += 1;

      const city = norm(o.clientCity || o.city);
      if (city) {
        (cityStats[city] ||= { total: 0, fail: 0 });
        cityStats[city].total += 1;
        if (isFail) cityStats[city].fail += 1;
      }
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
    cityStats,
    custStats,
    baseFailRate: total > 0 ? fail / total : 0.25, // défaut prudent si pas de données
    avgOrderValue: valueCount > 0 ? valueSum / valueCount : 0,
    sampleSize: total,
  };
}

/**
 * Score explicable d'une commande selon le modèle (fonction pure).
 * @returns {{score:number, reasons:{label:string,delta:number}[], recommendation:string}}
 */
export function scoreOrderRisk(order, model) {
  const m = model || buildRiskModel([]);
  const reasons = [];

  // 1. Base : le taux d'échec réel de la boutique (borné pour rester sain).
  const base = clamp(Math.round(m.baseFailRate * 100), 10, 45);
  let score = base;
  reasons.push({ label: `Base boutique : ${Math.round(m.baseFailRate * 100)}% d'échec COD`, delta: 0 });

  // 2. Signal VILLE : compare la ville au taux moyen (si assez d'observations).
  const city = norm(order.clientCity || order.city);
  const cs = city ? m.cityStats[city] : null;
  if (cs && cs.total >= MIN_CITY_SAMPLE) {
    const cityRate = cs.fail / cs.total;
    const delta = Math.round((cityRate - m.baseFailRate) * 60);
    if (Math.abs(delta) >= 3) {
      score += delta;
      reasons.push({
        label: `${order.clientCity || order.city} : ${Math.round(cityRate * 100)}% d'échec (n=${cs.total})`,
        delta,
      });
    }
  }

  // 3. Signal CLIENT (le meilleur prédicteur) : historique personnel.
  const phone = normalizePhone(order.clientPhone || order.phone);
  const c = phone ? m.custStats[phone] : null;
  let customerIsDriver = false;
  if (c && c.total >= 1) {
    if (c.fail > 0) {
      const custRate = c.fail / c.total;
      const delta = Math.round(custRate * 45) + (c.total >= 2 ? 10 : 0);
      score += delta;
      customerIsDriver = true;
      reasons.push({ label: `Client : ${c.fail}/${c.total} commandes échouées`, delta });
    } else if (c.delivered >= 2) {
      const delta = -18;
      score += delta;
      reasons.push({ label: `Client fidèle : ${c.delivered} livraisons réussies`, delta });
    }
  } else {
    const delta = 8;
    score += delta;
    reasons.push({ label: `Nouveau client (aucun historique)`, delta });
  }

  // 4. Signal VALEUR : panier nettement au-dessus de la moyenne → COD plus risqué.
  const v = orderValue(order);
  if (m.avgOrderValue > 0 && v > 2 * m.avgOrderValue) {
    const delta = 12;
    score += delta;
    reasons.push({ label: `Panier élevé (${Math.round(v)} vs moy. ${Math.round(m.avgOrderValue)})`, delta });
  } else if (m.avgOrderValue === 0 && v > 2000) {
    const delta = 10;
    score += delta;
    reasons.push({ label: `Panier élevé (${Math.round(v)} DH)`, delta });
  }

  score = clamp(Math.round(score), 0, 100);
  return { score, reasons, recommendation: recommend(score, customerIsDriver) };
}

/** Recommandation d'action opérationnelle selon le score. */
function recommend(score, customerHasFailures) {
  if (score >= 65) {
    return customerHasFailures
      ? "Client à risque : confirmer fermement par appel et envisager un acompte / prépaiement."
      : "Confirmer par appel avant expédition ; envisager un acompte si possible.";
  }
  if (score >= 40) return "Confirmer par WhatsApp avant d'expédier.";
  return "Faible risque — expédier normalement.";
}

export function getRiskLevel(score) {
  if (score < 30) return { label: "Sûr", color: "green", icon: "CheckCircle" };
  if (score < 60) return { label: "Modéré", color: "yellow", icon: "AlertTriangle" };
  return { label: "Risqué", color: "red", icon: "ShieldAlert" };
}

// ── Couche async avec cache modèle (évite de refetch à chaque frappe dans le modal) ──
let _cache = { storeId: null, model: null, ts: 0 };
const CACHE_TTL_MS = 60_000;

async function getModel(storeId) {
  const now = Date.now();
  if (_cache.storeId === storeId && _cache.model && now - _cache.ts < CACHE_TTL_MS) {
    return _cache.model;
  }
  let orders = [];
  try {
    const snap = await getDocs(query(
      collection(db, "orders"),
      where("storeId", "==", storeId),
      limit(MODEL_SAMPLE_SIZE),
    ));
    orders = snap.docs.map((d) => d.data());
  } catch (e) {
    console.error("Risk Service: model build failed", e);
  }
  const model = buildRiskModel(orders);
  _cache = { storeId, model, ts: now };
  return model;
}

/** Évaluation riche (score + niveau + raisons + recommandation). */
export async function assessOrderRisk(order, storeId) {
  const model = await getModel(storeId);
  const r = scoreOrderRisk(order, model);
  return { ...r, level: getRiskLevel(r.score) };
}

/** Compat rétro : renvoie uniquement le score numérique. */
export async function calculateOrderRisk(order, storeId) {
  return (await assessOrderRisk(order, storeId)).score;
}

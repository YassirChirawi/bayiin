/**
 * AI Risk Service - Smart COD Shield
 * Predicts the probability of order return/cancellation based on historical data.
 */

import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";

// Known high-risk zones (Mock data - to be expanded)
const HIGH_RISK_CITIES = ["Laâyoune", "Dakhla", "Guelmim"]; 

/**
 * Calculates a risk score for an order (0-100)
 * 0 = Low Risk, 100 = High Risk
 */
export const calculateOrderRisk = async (orderData, storeId) => {
    let score = 20; // Base score

    // 1. Geography Check
    if (HIGH_RISK_CITIES.includes(orderData.clientCity)) {
        score += 25;
    }

    // 2. Customer History Check
    if (orderData.clientPhone) {
        try {
            const ordersRef = collection(db, "orders");
            const q = query(
                ordersRef, 
                where("storeId", "==", storeId),
                where("clientPhone", "==", orderData.clientPhone),
                orderBy("createdAt", "desc"),
                limit(10)
            );
            const snapshot = await getDocs(q);
            const history = snapshot.docs.map(doc => doc.data());

            if (history.length > 0) {
                const returns = history.filter(o => o.status === "retour" || o.status === "annulé").length;
                const returnRate = (returns / history.length) * 100;
                
                if (returnRate > 50) score += 40;
                else if (returnRate > 20) score += 15;
                else if (returns === 0 && history.length >= 2) score -= 15; // Trusted customer
            }
        } catch (error) {
            console.error("Risk Service: Error fetching history", error);
        }
    }

    // 3. Order Value Check
    const orderValue = parseFloat(orderData.price || 0);
    if (orderValue > 2000) score += 15; // High value COD is risky

    // Clamp score
    return Math.min(100, Math.max(0, score));
};

export const getRiskLevel = (score) => {
    if (score < 30) return { label: "Sûr", color: "green", icon: "CheckCircle" };
    if (score < 60) return { label: "Modéré", color: "yellow", icon: "AlertTriangle" };
    return { label: "Risqué", color: "red", icon: "ShieldAlert" };
};

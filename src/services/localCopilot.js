import { EXPERT_KNOWLEDGE, getRandomAdvice } from "./knowledge";
import { getAtRiskProducts } from "../utils/stockPrediction";

/**
 * Local Heuristic Engine for Beya3
 * Analyzes intent and context to provide instant, data-driven responses.
 */
export const generateLocalResponse = (text, context) => {
    const input = text.toLowerCase();
    
    // 0. ACTION DETECTION (REGEX) - Priority 0
    // Pattern: Crée une commande pour [Produit] pour [Nom] au [Tel] à [Prix] DH
    const createOrderMatch = input.match(/(?:crée|ajoute|nouvelle)\s+(?:une\s+)?commande\s+(?:pour\s+)?(.+?)\s+(?:pour\s+)?(.+?)\s+(?:au\s+)?(\d+)\s+(?:à\s+)?(\d+)/i);
    if (createOrderMatch) {
        const [_, productName, clientName, phone, price] = createOrderMatch;
        const action = {
            action: "CREATE_ORDER",
            data: { productName, clientName, phone, price, quantity: 1 }
        };
        return `D'accord, je prépare la création de la commande pour **${productName}** (${clientName}). Un instant...\n\n\`\`\`json\n${JSON.stringify(action, null, 2)}\n\`\`\``;
    }

    // Pattern: Change le statut de la commande #123 en [Statut]
    const updateStatusMatch = input.match(/(?:change|update|met)\s+(?:le\s+)?statut\s+(?:de\s+la\s+commande\s+)?#?([a-z0-9]+)\s+(?:en\s+|vers\s+)?(.+)/i);
    if (updateStatusMatch) {
        const [_, orderId, newStatus] = updateStatusMatch;
        const action = {
            action: "UPDATE_ORDER_STATUS",
            data: { orderId, newStatus: newStatus.trim() }
        };
        return `Je m'occupe de mettre à jour la commande **#${orderId}** vers le statut **${newStatus}**.\n\n\`\`\`json\n${JSON.stringify(action, null, 2)}\n\`\`\``;
    }

    // Pattern: Envoie un message à 0611223344 : [Message]
    const whatsappMatch = input.match(/(?:envoie|whatsapp|message)\s+(?:un\s+)?(?:message\s+)?(?:à\s+)?(\d+)\s*[:\s]\s*(.+)/i);
    if (whatsappMatch) {
        const [_, phone, message] = whatsappMatch;
        const action = {
            action: "SEND_WHATSAPP",
            data: { phone, message }
        };
        return `Je génère le lien WhatsApp pour envoyer ce message à **${phone}**.\n\n\`\`\`json\n${JSON.stringify(action, null, 2)}\n\`\`\``;
    }

    // Pattern: Analyse mes finances
    const analyzeFinancesMatch = input.match(/(?:analyse|simule)\s+(?:mes\s+)?(?:finances|rentabilit[ée]|sc[ée]nario)/i);
    if (analyzeFinancesMatch) {
        const action = {
            action: "ANALYZE_FINANCES",
            data: {}
        };
        return `Je lance une analyse financière détaillée de ta boutique.\n\n\`\`\`json\n${JSON.stringify(action, null, 2)}\n\`\`\``;
    }

    // Pattern: Annule la commande #123
    const cancelOrderMatch = input.match(/(?:annule|cancel)\s+(?:la\s+)?commande\s+#?([a-z0-9]+)/i);
    if (cancelOrderMatch) {
        const [_, orderId] = cancelOrderMatch;
        const action = {
            action: "CANCEL_ORDER",
            data: { orderId }
        };
        return `Je m'occupe d'annuler la commande **#${orderId}**.\n\n\`\`\`json\n${JSON.stringify(action, null, 2)}\n\`\`\``;
    }

    // Pattern: Expédie la commande #123 via [olivraison/sendit]
    const shipOrderMatch = input.match(/(?:expédie|ship|envoie)\s+(?:la\s+)?commande\s+#?([a-z0-9]+)\s+(?:via|par|avec)\s+(olivraison|sendit)/i);
    if (shipOrderMatch) {
        const [_, orderId, carrier] = shipOrderMatch;
        const action = {
            action: "SHIP_ORDER",
            data: { orderId, carrier: carrier.toLowerCase() }
        };
        return `Je prépare l'expédition de la commande **#${orderId}** via **${carrier}**.\n\n\`\`\`json\n${JSON.stringify(action, null, 2)}\n\`\`\``;
    }

    // Pattern: Ajoute une dépense de [Montant] DH pour [Label]
    const createExpenseMatch = input.match(/(?:ajoute|crée|nouvelle)\s+(?:une\s+)?dépense\s+(?:de\s+)?(\d+)(?:\s*dh)?\s+(?:pour\s+)?(.+)/i);
    if (createExpenseMatch) {
        const [_, amount, label] = createExpenseMatch;
        const action = {
            action: "CREATE_EXPENSE",
            data: { amount: parseFloat(amount), label: label.trim(), category: "Autre" }
        };
        return `D'accord, j'enregistre la dépense de **${amount} DH** pour **${label.trim()}**.\n\n\`\`\`json\n${JSON.stringify(action, null, 2)}\n\`\`\``;
    }

    // Pattern: Donne-moi les statistiques de [Métrique]
    const analyticsMatch = input.match(/(?:donne|affiche|montre)[-\s]*(?:moi\s+)?(?:les\s+)?(?:statistiques|stats|analytics|donn[ée]es)\s+(?:de\s+|sur\s+|pour\s+)?(.+)/i);
    if (analyticsMatch) {
        const [_, metric] = analyticsMatch;
        const action = {
            action: "GET_ANALYTICS",
            data: { metric: metric.trim() }
        };
        return `Je récupère les statistiques pour **${metric.trim()}**.\n\n\`\`\`json\n${JSON.stringify(action, null, 2)}\n\`\`\``;
    }

    // RAPPORT HEBDOMADAIRE
    if (
        input.includes("rapport") || 
        input.includes("bilan") || 
        input.includes("semaine") || 
        input.includes("résumé") ||
        input.includes("resume") ||
        input.includes("hebdo") ||
        input.includes("cette semaine") ||
        input.includes("weekly")
    ) {
        return generateWeeklyReport(context);
    }

    // 1. GREETINGS
    if (input.includes("salam") || input.includes("bonjour") || input.includes("hello") || input.includes("qui es-tu")) {
        return "Salam ! Je suis **Beya3**, ton assistante IA locale 🚀. Je connais tes ventes, tes stocks et je peux te donner des conseils d'expert en marketing et finance.\n\n**Je peux aussi agir pour toi !** Dis-moi par exemple :\n- *'Crée une commande pour Produit X pour Client Y au 0600000000 à 200 DH'*\n- *'Change le statut de la commande #123 en Livré'*\n- *'Envoie un message à 0600000000 : Bonjour !'*";
    }

    // 2. PLATFORM HELP (Prioritized "How-to")
    if (input.includes("comment") || input.includes("aide") || input.includes("faire") || input.includes("ajouter") || input.includes("tuto")) {
        return `🤖 **Aide BayIIn :**
${getRandomAdvice('platform')}

*Si tu as besoin d'une assistance technique, utilise le lien WhatsApp dans les paramètres.*`;
    }

    // 3. MARKETING & META (Specific expertise)
    if (input.includes("marketing") || input.includes("pub") || input.includes("ads") || input.includes("meta") || input.includes("facebook") || input.includes("instagram")) {
        return `📣 **Expertise Marketing :**
${getRandomAdvice('marketing')}

*N'oublie pas de tracker ton ROAS (Return on Ad Spend) dans l'onglet Finances !*`;
    }

    // 4. SALES & PERFORMANCE
    if (input.includes("ventes") || input.includes("chiffre") || input.includes("performance") || input.includes("commandes") || input.includes("bilan")) {
        const revenue = context.stats.totalRevenue || 0;
        const count = context.stats.totalOrders || 0;
        const profit = context.stats.totalProfit || 0;
        const storeName = context.store?.name || "ta boutique";

        return `📊 **Résumé pour ${storeName} :**
Ce mois-ci, tu as réalisé **${revenue.toLocaleString()} DH** de chiffre d'affaires sur **${count} commandes**.
Ton profit net est de **${profit.toLocaleString()} DH**.

*Conseil : ${getRandomAdvice('finance')}*`;
    }

    // 5. FINANCIAL ADVICE
    if (input.includes("conseil") || input.includes("finance") || input.includes("rentable") || input.includes("marge") || input.includes("argent")) {
        const revenue = context.stats.totalRevenue || 0;
        const profit = context.stats.totalProfit || 0;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

        let status = "⚠️ Ta marge est faible.";
        let domain = 'finance';
        if (margin > 40) {
            status = "🚀 Ta rentabilité est exceptionnelle !";
            domain = 'marketing';
        } else if (margin > 20) {
            status = "✅ Ta boutique est stable.";
        }

        return `💰 **Analyse Financière :**
Ta marge nette actuelle est de **${margin.toFixed(1)}%**.
${status}

*Astuce d'expert : ${getRandomAdvice(domain)}*`;
    }

    // 6. INVENTORY & PRODUCTS (with predictive analysis)
    if (input.includes("stock") || input.includes("produit") || input.includes("épuisé") || input.includes("rupture") || input.includes("prédiction") || input.includes("prévision")) {
        const lowStock = context.products?.filter(p => p.stock < 5 && p.stock > 0) || [];
        const outOfStock = context.products?.filter(p => p.stock <= 0) || [];
        const atRisk = getAtRiskProducts(context.products || [], context.orders || []);

        if (lowStock.length === 0 && outOfStock.length === 0 && atRisk.length === 0) {
            return "✅ Tes stocks sont au beau fixe. Aucun produit n'est en rupture immédiate ni à risque.";
        }

        let msg = "📦 **État des stocks :**\n";
        if (outOfStock.length > 0) {
            msg += `- **En rupture (${outOfStock.length})** : ${outOfStock.slice(0, 3).map(p => p.name).join(', ')}\n`;
        }
        if (lowStock.length > 0) {
            msg += `- **Stock faible (${lowStock.length})** : ${lowStock.slice(0, 3).map(p => p.name).join(', ')}\n`;
        }
        if (atRisk.length > 0) {
            msg += `\n🔮 **Prédictions de rupture :**\n`;
            atRisk.slice(0, 5).forEach(({ product, prediction }) => {
                const emoji = prediction.isCritical ? '🚨' : '⚠️';
                msg += `${emoji} **${product.name}** — rupture dans **${prediction.daysLeft} jour${prediction.daysLeft > 1 ? 's' : ''}** (${prediction.dailyRate} ventes/jour, stock: ${product.stock}). Commande recommandée: **${prediction.recommendedOrder} unités**.\n`;
            });
        }

        return msg + `\n*Conseil : ${getRandomAdvice('cro')}*`;
    }

    // 7. LOGISTICS & RETURNS
    if (input.includes("livraison") || input.includes("retour") || input.includes("transport")) {
        const returns = context.stats.totalReturns || 0;
        return `🚚 **Logistique & Retours :**
Tu as eu **${returns} retours** ce mois-ci.
${getRandomAdvice('logistics')}`;
    }

    // 8. HELP / PLATFORM HOW-TO — Rich Knowledge Base
    const helpIntents = [
        { keys: ["commande", "créer", "nouvelle commande", "new order"], answer: "**Comment créer une commande :**\n1. Allez dans **Commandes** → cliquez sur **Nouvelle Commande**.\n2. Entrez le numéro de téléphone du client (10 chiffres).\n3. Si le client existe, ses infos s'auto-remplissent.\n4. Sélectionnez le produit et la quantité.\n5. Choisissez le statut initial (Reçu recommandé).\n6. Enregistrez — le stock est automatiquement déduit." },
        { keys: ["statut", "changer statut", "workflow"], answer: "**Workflow des statuts :**\n🔵 **Reçu** → ✅ **Confirmation** → 📦 **Préparation** → 🚚 **Livraison** → ✅ **Livré** (argent encaissé)\nOu : **Retour / Annulé** si le client refuse.\nChaque changement de statut peut déclencher un message WhatsApp automatique." },
        { keys: ["whatsapp", "message automatique", "template"], answer: "**Messages WhatsApp :**\nBayIIn génère un message pré-rempli en un clic selon le statut (Confirmation, Livraison, Retour).\nVous pouvez choisir entre le Français standard ou le Darija dans **Paramètres → WhatsApp**." },
        { keys: ["produit", "ajouter produit", "variante", "stock"], answer: "**Gestion des produits :**\n- **Produit simple** : nom, prix, coût, stock.\n- **Avec variantes** : créez des options (Taille, Couleur) et générez les combinaisons automatiquement.\n- **Bundle/Pack** : le stock de chaque composant est déduit à la vente.\n- L'alerte stock bas s'active sous 5 unités (configurable)." },
        { keys: ["finance", "profit", "bénéfice", "marge", "roas", "cac"], answer: "**Calcul du profit :**\nProfit Net = CA (Livré) - Coût Produit - Frais Livraison - Publicité.\nLes KPIs disponibles : ROAS, CAC, Marge nette, CA journalier.\nAjoutez vos dépenses publicitaires dans **Finances → Gestion des Dépenses**." },
        { keys: ["client", "crm", "fiche client", "ltv"], answer: "**CRM Clients :**\nChaque client a une fiche avec : historique d'achat, LTV (valeur vie), segment (VIP/À risque).\nLe numéro de téléphone sert d'identifiant unique. L'adresse s'auto-complète pour les clients existants." },
        { keys: ["livreur", "driver", "livraison interne", "transport"], answer: "**Système de livraison interne :**\n1. Publiez votre lien de candidature livreur.\n2. Validez les candidats depuis **Livreurs**.\n3. Assignez les commandes à vos livreurs.\n4. Chaque livreur a une app mobile avec ses commandes du jour et navigation GPS." },
        { keys: ["entrepôt", "scan", "code barre", "qr code"], answer: "**Module Entrepôt & Scan (PRO) :**\nScannez le QR d'une commande pour l'expédier directement.\nScannez un code-barres produit pour voir le stock et mettre à jour rapidement." },
        { keys: ["automatisation", "automation", "scénario", "déclencheur"], answer: "**Automatisations (PRO) :**\nCréez des scénarios : Déclencheur (nouvelle commande, changement de statut) → Condition → Action (envoyer WhatsApp, mettre à jour statut).\nExemple : quand une commande passe en 'Livré', envoyer automatiquement un message de remerciement." },
        { keys: ["rh", "employé", "salaire", "contrat"], answer: "**RH & Employés (PRO) :**\nGérez les fiches employés, contrats, documents RIB/CIN/CNSS.\nSuivez les présences et les avances sur salaire depuis le module RH." },
        { keys: ["paramètre", "configuration", "devise", "logo"], answer: "**Configuration boutique :**\n- Logo : Paramètres → Général → Logo\n- Devise : MAD, EUR, USD supportés\n- WhatsApp templates : Paramètres → WhatsApp\n- Équipe : Paramètres → Équipe (inviter staff/manager)" },
        { keys: ["pwa", "installer", "application", "mobile", "smartphone"], answer: "**Installer BayIIn sur votre téléphone :**\n1. Ouvrez bayiin.shop sur Chrome (Android) ou Safari (iPhone).\n2. Appuyez sur **'Ajouter à l'écran d'accueil'**.\n3. L'app s'installe comme une app native, fonctionne hors-ligne pour consultation.\nPour iOS : icône de partage → 'Sur l'écran d'accueil'." },
        { keys: ["sécurité", "faceid", "biométrie", "verrouillage"], answer: "**Sécurité & Biométrie :**\nActivez le verrouillage biométrique dans **Paramètres → Sécurité**.\nFaceID ou empreinte digitale sera demandé à chaque ouverture de l'app sur cet appareil." },
        { keys: ["catalogue", "lien public", "partager"], answer: "**Catalogue public :**\nChaque boutique a un lien public unique : `bayiin.shop/catalog/[ID]`.\nPartagez ce lien avec vos clients pour qu'ils puissent commander directement via WhatsApp." },
        { keys: ["import", "csv", "exporter"], answer: "**Import/Export :**\n- **Commandes** : importez via CSV (colonnes : téléphone, produit, prix, statut).\n- **Produits** : importez en masse depuis un fichier CSV.\n- **Export** : exportez vos commandes au format CSV depuis la page Commandes." },
        { keys: ["franchise", "multi boutique", "réseau"], answer: "**Mode Franchise :**\nAvec le compte Franchise, gérez plusieurs boutiques depuis un seul tableau de bord consolidé.\nComparez les performances, CA et stocks de chaque point de vente en temps réel." },
    ];

    for (const item of helpIntents) {
        if (item.keys.some(k => input.includes(k))) {
            return `📚 ${item.answer}\n\n_Besoin d'aide supplémentaire ? Contactez le support WhatsApp : **+212 6 00 00 00 00**_`;
        }
    }

    // 9. SUPPORT / CONTACT
    if (input.includes("support") || input.includes("problème") || input.includes("bug") || input.includes("contact") || input.includes("aide") || input.includes("whatsapp support")) {
        return "📞 **Support BayIIn**\n\nPour toute assistance, contactez notre équipe :\n\n**WhatsApp** : [+212 6 00 00 00 00](https://wa.me/212600000000)\n**Email** : support@bayiin.shop\n\nHoraires : **Lundi – Samedi, 9h – 20h**\nRéponse garantie en moins de **2 heures** ⚡\n\nOu utilisez le formulaire de contact dans **Aide → Nous contacter**.";
    }

    // DEFAULT
};

export function generateOpeningBrief(ctx) {
  if (!ctx?.stats) return null;

  const alerts = [];
  const { totalRevenue, totalProfit, totalOrders, totalReturns } = ctx.stats;
  const orders = ctx.orders || [];
  const products = ctx.products || [];

  // 1. Commandes en attente depuis +24h
  const now = new Date();
  const pending = orders.filter(o => {
    if (!["reçu", "confirmation"].includes(o.status)) return false;
    if (!o.date) return false;
    const orderDate = new Date(o.date);
    const hoursOld = (now - orderDate) / (1000 * 60 * 60);
    return hoursOld > 24;
  });
  if (pending.length > 0) {
    alerts.push(`⚠️ **${pending.length} commande${pending.length > 1 ? 's' : ''} en attente** depuis plus de 24h`);
  }

  // 2. Taux de retour élevé
  const returnRate = totalOrders > 0 ? (totalReturns / totalOrders) * 100 : 0;
  if (returnRate > 15) {
    alerts.push(`📉 **Taux de retour élevé : ${returnRate.toFixed(0)}%** — au-dessus du seuil critique`);
  }

  // 3. Stock critique (< 3 unités)
  const criticalStock = products.filter(p => p.stock !== undefined && p.stock > 0 && p.stock <= 3);
  if (criticalStock.length > 0) {
    alerts.push(`🔴 **Stock critique** : ${criticalStock.map(p => `${p.name} (${p.stock})`).join(", ")}`);
  }

  // 4. Rupture totale
  const outOfStock = products.filter(p => p.stock !== undefined && p.stock <= 0);
  if (outOfStock.length > 0) {
    alerts.push(`❌ **Rupture de stock** : ${outOfStock.slice(0, 2).map(p => p.name).join(", ")}${outOfStock.length > 2 ? ` +${outOfStock.length - 2} autres` : ''}`);
  }

  // 4b. Prédiction de rupture (Run Rate)
  const atRisk = getAtRiskProducts(products, orders);
  if (atRisk.length > 0) {
    const topRisk = atRisk.slice(0, 3).map(({ product, prediction }) =>
      `${product.name} (${prediction.daysLeft}j restants)`
    ).join(", ");
    alerts.push(`🔮 **Rupture prédite** : ${topRisk}`);
  }

  // 4c. Cash COD non réconcilié
  const unremittedCOD = orders.filter(o => o.status === 'livré' && o.codCollected && !o.isPaid);
  if (unremittedCOD.length > 0) {
    const totalCOD = unremittedCOD.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);
    alerts.push(`💰 **${unremittedCOD.length} commandes COD non remises** — ${totalCOD.toLocaleString('fr-FR')} DH en attente de réconciliation`);
  }

  // 5. Bon chiffre du jour
  const margin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(0) : 0;

  // Construction du brief
  const storeName = ctx.store?.name || "ta boutique";
  const month = new Date().toLocaleString("fr-FR", { month: "long" });

  let brief = `Salam ! Voici ton brief du jour pour **${storeName}** 📋\n\n`;

  if (alerts.length > 0) {
    brief += alerts.join("\n") + "\n\n";
  }

  brief += `💰 **${month}** : ${totalRevenue.toLocaleString("fr-FR")} DH de CA · ${totalProfit.toLocaleString("fr-FR")} DH de profit · Marge ${margin}%\n\n`;

  if (alerts.length === 0) {
    brief += `✅ Tout roule ! Aucune alerte aujourd'hui.\n\n`;
  }

  brief += `Par quoi on commence ? 🚀`;
  return brief;
}

export function generateWeeklyReport(ctx) {
  const orders = ctx.orders || [];
  const products = ctx.products || [];
  const { totalRevenue, totalProfit, totalOrders, totalReturns } = ctx.stats || {};

  // Calculs semaine en cours vs semaine dernière
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - now.getDay());
  startOfThisWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  const thisWeekOrders = orders.filter(o => o.date && new Date(o.date) >= startOfThisWeek);
  const lastWeekOrders = orders.filter(o => {
    if (!o.date) return false;
    const d = new Date(o.date);
    return d >= startOfLastWeek && d < startOfThisWeek;
  });

  const thisWeekRevenue = thisWeekOrders.filter(o => o.status === 'livré')
    .reduce((acc, o) => acc + (parseFloat(o.price) || 0), 0);
  const lastWeekRevenue = lastWeekOrders.filter(o => o.status === 'livré')
    .reduce((acc, o) => acc + (parseFloat(o.price) || 0), 0);

  const thisWeekProfit = thisWeekOrders.filter(o => o.status === 'livré')
    .reduce((acc, o) => acc + (parseFloat(o.profit) || 0), 0);

  const revenueTrend = lastWeekRevenue > 0
    ? (((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100).toFixed(0)
    : null;
  const trendEmoji = revenueTrend > 0 ? "📈" : revenueTrend < 0 ? "📉" : "➡️";

  // Top produit cette semaine
  const salesByProduct = {};
  thisWeekOrders.forEach(o => {
    const name = o.productName || o.articleName;
    if (name) salesByProduct[name] = (salesByProduct[name] || 0) + 1;
  });
  const topProduct = Object.entries(salesByProduct).sort((a, b) => b[1] - a[1])[0];

  // Commandes par statut cette semaine
  const delivered = thisWeekOrders.filter(o => o.status === 'livré').length;
  const returned = thisWeekOrders.filter(o => o.status === 'retour').length;
  const pending = thisWeekOrders.filter(o => ['reçu', 'confirmation'].includes(o.status)).length;

  // Marge
  const margin = thisWeekRevenue > 0
    ? ((thisWeekProfit / thisWeekRevenue) * 100).toFixed(0)
    : 0;

  // Conseils selon les données
  const tips = [];
  if (returned > delivered * 0.2) tips.push("📞 Ton taux de retour est élevé cette semaine — confirme par téléphone avant d'expédier.");
  if (pending > 3) tips.push(`⚡ ${pending} commandes en attente — traite-les aujourd'hui pour améliorer ton délai.`);
  if (margin < 20 && thisWeekRevenue > 0) tips.push("💡 Ta marge est sous 20% — vérifie tes coûts produits ou augmente tes prix.");
  if (tips.length === 0) tips.push("✅ Bonne semaine ! Continue sur cette lancée et pense à scaler ta pub sur tes best-sellers.");

  const weekDates = `${startOfThisWeek.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} → aujourd'hui`;

  return `📊 **Rapport hebdomadaire — ${weekDates}**

**Chiffre d'affaires** : ${thisWeekRevenue.toLocaleString("fr-FR")} DH ${revenueTrend !== null ? `(${revenueTrend > 0 ? '+' : ''}${revenueTrend}% vs sem. dernière) ${trendEmoji}` : ''}
**Profit net** : ${thisWeekProfit.toLocaleString("fr-FR")} DH · Marge **${margin}%**
**Commandes** : ${thisWeekOrders.length} total · ${delivered} livrées · ${returned} retours · ${pending} en attente
${topProduct ? `**Meilleur produit** : ${topProduct[0]} (${topProduct[1]} ventes)` : ''}

---

**💡 Mes recommandations :**
${tips.join("\n")}`;
}

import { EXPERT_KNOWLEDGE, getRandomAdvice } from "./knowledgeBase";

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

    // 6. INVENTORY & PRODUCTS
    if (input.includes("stock") || input.includes("produit") || input.includes("épuisé") || input.includes("rupture")) {
        const lowStock = context.products?.filter(p => p.stock < 5 && p.stock > 0) || [];
        const outOfStock = context.products?.filter(p => p.stock <= 0) || [];

        if (lowStock.length === 0 && outOfStock.length === 0) {
            return "✅ Tes stocks sont au beau fixe. Aucun produit n'est en rupture immédiate.";
        }

        let msg = "📦 **État des stocks :**\n";
        if (outOfStock.length > 0) {
            msg += `- **En rupture (${outOfStock.length})** : ${outOfStock.slice(0, 3).map(p => p.name).join(', ')}...\n`;
        }
        if (lowStock.length > 0) {
            msg += `- **Stock faible (${lowStock.length})** : ${lowStock.slice(0, 3).map(p => p.name).join(', ')}...\n`;
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

    // DEFAULT
    return "Je ne suis pas sûre de comprendre cette demande, mais je peux t'aider avec tes **ventes**, tes **finances**, tes **stocks** ou tes **campagnes marketing**. Pose-moi une question précise ! ✨";
};

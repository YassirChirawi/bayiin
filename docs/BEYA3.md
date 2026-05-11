# Beya3 — L'Assistant IA local

## 1. Fonctionnement
Beya3 est un Copilot hybride :
1. **Moteur Heuristique Local** : Gère les intents simples (création commande, résumé ventes, conseils business) instantanément et sans coût API.
2. **Cloud AI (Optionnel)** : Utilise Groq (Llama 3.3) pour les questions complexes via Firebase Cloud Functions.

## 2. Intents supportés localement
- `CREATE_ORDER` : "Crée une commande pour Amine au 06..."
- `UPDATE_STATUS` : "Passe la commande #1005 en livré"
- `ANALYZE_FINANCES` : "Comment vont mes profits ce mois-ci ?"
- `WHATSAPP_ACTION` : "Relance le client Fatima"

## 3. Architecture
Les fichiers clés :
- `src/services/localCopilot.js` : Moteur de détection d'intents.
- `src/context/CopilotContext.jsx` : Gestion de l'état et de l'historique.
- `src/components/Copilot.jsx` : Interface utilisateur (Chat).

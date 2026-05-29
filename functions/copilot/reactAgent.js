const Groq = require('groq-sdk');
const { BEYA3_TOOLS } = require('./tools');

/**
 * ReAct Agent — Raisonnement Multi-étapes pour Beya3
 * 
 * Pattern: THINK → ACT → OBSERVE → ... → SYNTHESIZE
 * Max 5 itérations pour éviter les boucles infinies et limiter les coûts Groq.
 */

const MAX_ITERATIONS = 5;

const REACT_SYSTEM_PROMPT = `Tu es Beya3, l'assistant expert (CFO/COO) pour le e-commerce.

PROCESSUS DE RAISONNEMENT :
Tu as accès à plusieurs outils (tools) pour récupérer des données en temps réel sur la boutique.
- Ne fais JAMAIS de calcul financier ou de supposition par toi-même.
- Utilise TOUJOURS les outils (function calling) fournis pour obtenir les chiffres (ventes, trésorerie, stock, anomalies).
- Si tu n'as pas l'information, fais l'appel à l'outil approprié.
- Si le résultat de l'outil est insuffisant, appelle un autre outil pour approfondir.
- Quand tu as réuni toutes les données nécessaires, fournis une synthèse claire, précise et orientée action.

RÈGLES :
- Sois très concis et professionnel.
- Ne mentionne jamais que tu "utilises des outils". Présente les résultats naturellement.
- Appelle directement l'outil sans écrire tes pensées dans le message.`;

/**
 * Détecte si une question nécessite le raisonnement multi-étapes (ReAct).
 * Questions simples → single-pass (rapide, 1 appel Groq).
 * Questions complexes → ReAct (profond, jusqu'à 5+1 appels Groq).
 */
function shouldUseReAct(userMessage) {
    const msg = userMessage.toLowerCase();
    
    // Bypass intelligent pour éviter ReAct sur les questions simples ou salutations
    const BYPASS_PATTERNS = [
        /^(salam|bonjour|hi|hello|wach|labas)/,
        /^(merci|shukran|okay|ok|d'accord)/,
        /combien.*aujourd'hui/,
        /quel.*statut/
    ];

    if (BYPASS_PATTERNS.some(p => p.test(msg))) return false;

    // Patterns qui déclenchent ReAct
    const complexPatterns = [
        /pourquoi\s+(ma|mon|mes|le|la|les)/,          // "pourquoi ma marge baisse"
        /comment\s+(am[ée]liorer|augmenter|r[ée]duire|optimiser)/,  // "comment améliorer..."
        /analyse\s+(compl[eè]te|d[ée]taill[ée]e|approfondie)/,    // "analyse complète"
        /strat[ée]gie/,                                 // "quelle stratégie"
        /diagnostic/,                                    // "diagnostic de..."
        /qu'est[- ]ce\s+qui\s+(cause|explique|provoque)/, // "qu'est-ce qui cause..."
        /d'o[uù]\s+vien(t|nent)/,                      // "d'où vient le problème"
        /comparer?\s+(avec|entre|les)/,                 // "compare les performances"
        /rapport\s+(complet|d[ée]taill[ée])/,           // "rapport complet"
        /bilan/,                                        // "fais-moi un bilan"
        /recommand(e|ations)/,                          // "tes recommandations"
        /action\s+plan/,                                // "action plan"
    ];

    // Si la question contient un pattern complexe
    if (complexPatterns.some(p => p.test(msg))) return true;

    // Questions composées (multiples sujets séparés par "et" ou virgules)
    const conjunctions = (msg.match(/\b(et|puis|aussi|ensuite|également)\b/g) || []).length;
    if (conjunctions >= 2) return true;

    return false;
}

/**
 * Exécute la boucle ReAct complète.
 * 
 * @param {string} storeId - L'ID du store
 * @param {string} userMessage - Le message de l'utilisateur
 * @param {object} context - Contexte enrichi (systemPrompt, memories, etc.)
 * @param {Function} executeToolFn - Fonction pour exécuter un outil financier
 * @param {string} groqApiKey - Clé API Groq
 * @returns {object} { finalAnswer, steps, iterationsUsed, toolsUsed }
 */
async function runReActLoop(storeId, userMessage, context, executeToolFn, groqApiKey) {
    const groq = new Groq({ apiKey: groqApiKey });
    const steps = [];
    const toolsUsed = new Set();
    let iteration = 0;

    // Build the messages array progressively
    const conversationMessages = [
        { role: "system", content: REACT_SYSTEM_PROMPT + `\n\nCONTEXTE STORE:\n${context.systemPrompt || ''}` },
        { role: "user", content: userMessage }
    ];

    while (iteration < MAX_ITERATIONS) {
        iteration++;
        
        try {
            const response = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: conversationMessages,
                tools: BEYA3_TOOLS,
                tool_choice: "auto",
                max_tokens: 512,
                temperature: 0.1
            });

            const choice = response.choices[0];
            const message = choice.message;

            // If no tool calls → the model has enough data and is giving a final answer
            if (!message.tool_calls || message.tool_calls.length === 0) {
                // FALLBACK: Detect hallucinated JSON action in content
                const jsonMatch = message.content && message.content.match(/\{\s*"action"\s*:\s*"([^"]+)"\s*,\s*"data"\s*:\s*(\{.*\})\s*\}/i);
                
                if (jsonMatch) {
                    const fallbackToolName = jsonMatch[1].toLowerCase() === 'analyze_finances' ? 'analyze_profit' : jsonMatch[1];
                    const fallbackArgs = jsonMatch[2];
                    
                    message.tool_calls = [{
                        id: 'call_fallback_' + Date.now(),
                        type: 'function',
                        function: {
                            name: fallbackToolName,
                            arguments: fallbackArgs
                        }
                    }];
                } else {
                    return {
                        finalAnswer: message.content,
                        steps,
                        iterationsUsed: iteration,
                        toolsUsed: Array.from(toolsUsed),
                        maxIterReached: false
                    };
                }
            }

            // Process tool calls (usually 1 per iteration for focused reasoning)
            const toolCall = message.tool_calls[0];
            const toolName = toolCall.function.name;
            let toolArgs;
            
            try {
                toolArgs = JSON.parse(toolCall.function.arguments);
            } catch (e) {
                toolArgs = {};
            }

            toolsUsed.add(toolName);

            // Execute the tool
            const observation = await executeToolFn(toolName, toolArgs, storeId);

            // Record the step
            steps.push({
                iteration,
                thought: message.content || '',
                action: { name: toolName, args: toolArgs },
                observation: typeof observation === 'string' ? observation : JSON.stringify(observation),
                timestamp: Date.now()
            });

            // Add the assistant message and tool result to the conversation
            conversationMessages.push(message);
            conversationMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: typeof observation === 'string' ? observation : JSON.stringify(observation)
            });

        } catch (e) {
            console.error(`[ReAct] Error at iteration ${iteration}:`, e);
            // If Groq errors, break and synthesize with what we have
            break;
        }
    }

    // Max iterations reached or error — force a synthesis
    const synthesisMessages = [
        ...conversationMessages,
        { 
            role: "user", 
            content: "Tu as atteint le maximum d'itérations. Synthétise maintenant ta réponse finale avec toutes les données que tu as collectées. Sois précis et actionnable." 
        }
    ];

    try {
        const synthesis = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: synthesisMessages,
            max_tokens: 1024,
            temperature: 0.4
        });

        return {
            finalAnswer: synthesis.choices[0]?.message?.content || "Je n'ai pas pu finaliser mon analyse. Réessaie avec une question plus spécifique.",
            steps,
            iterationsUsed: iteration,
            toolsUsed: Array.from(toolsUsed),
            maxIterReached: true
        };
    } catch (e) {
        console.error("[ReAct] Synthesis failed:", e);
        // Last resort: summarize from steps
        const stepsSummary = steps.map(s => `- ${s.action.name}: ${s.observation.substring(0, 200)}`).join('\n');
        return {
            finalAnswer: `Voici les données que j'ai pu collecter :\n${stepsSummary}\n\nReformule ta question pour une analyse plus précise.`,
            steps,
            iterationsUsed: iteration,
            toolsUsed: Array.from(toolsUsed),
            maxIterReached: true,
            hadError: true
        };
    }
}

module.exports = {
    shouldUseReAct,
    runReActLoop,
    REACT_SYSTEM_PROMPT
};

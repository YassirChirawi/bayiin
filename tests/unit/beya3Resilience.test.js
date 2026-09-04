/**
 * Beya3 — résilience du chemin d'accès et du repli.
 *
 * Deux défauts trouvés à l'audit, tous deux invisibles jusqu'à la panne :
 *   1. le client appelait /api/copilotChatV1 alors que Firebase Hosting ne
 *      réécrivait que /api/copilot — l'appel recevait index.html au lieu de JSON ;
 *   2. toute panne affichait « Oups, j'ai eu un petit bug interne... Réessaie ! »
 *      sans jamais basculer sur le moteur local, pourtant présent et utile.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

describe("Beya3 — le chemin d'accès doit exister sur chaque hébergeur", () => {
    // L'URL est définie une seule fois côté client ; les deux hébergeurs doivent
    // savoir la router, sinon Beya3 est muet sur l'un des deux.
    const clientPath = (() => {
        const m = read("src/services/aiService.js").match(/\|\|\s*"([^"]+)"/);
        return m ? m[1] : null;
    })();

    it("l'URL appelée par le client est identifiable", () => {
        expect(clientPath).toBeTruthy();
        expect(clientPath.startsWith("/api/")).toBe(true);
    });

    it("Firebase Hosting réécrit exactement cette URL vers la fonction", () => {
        const cfg = JSON.parse(read("firebase.json"));
        const hostings = Array.isArray(cfg.hosting) ? cfg.hosting : [cfg.hosting];
        const rewrites = hostings.flatMap((h) => h.rewrites || []);
        const match = rewrites.find((r) => r.source === clientPath && r.function);
        expect(match, `aucune réécriture Firebase pour ${clientPath}`).toBeTruthy();
        expect(match.function).toBe("copilotChatV1");
    });

    it("Vercel route aussi cette URL", () => {
        const cfg = JSON.parse(read("vercel.json"));
        const covered = (cfg.rewrites || []).some((r) => {
            if (r.source === clientPath) return true;
            // Motif générique du type /api/:match*
            return r.source.startsWith("/api/") && r.source.includes(":");
        });
        expect(covered, `aucune réécriture Vercel pour ${clientPath}`).toBe(true);
    });

    it("la réécriture cible une fonction réellement exportée", () => {
        expect(read("functions/index.js")).toContain("exports.copilotChatV1");
    });
});

describe("Beya3 — dégradation gracieuse", () => {
    const ctx = read("src/context/CopilotContext.jsx");

    it("bascule sur le moteur local quand l'appel distant échoue", () => {
        const at = ctx.indexOf("} catch (error) {");
        expect(at).toBeGreaterThan(-1);
        const block = ctx.slice(at, at + 1600);
        expect(block, "le catch doit appeler le moteur local")
            .toContain("generateLocalResponse");
    });

    it("annonce le mode dégradé au lieu de le masquer", () => {
        // On ne fait pas passer une réponse heuristique pour une réponse du modèle.
        expect(ctx).toContain("Mode hors ligne");
        expect(ctx).toContain("degraded: true");
    });

    it("ne renvoie plus le message d'excuse sans contenu", () => {
        // Hors commentaires : le fichier DOCUMENTE l'ancien message pour expliquer
        // le correctif, ce qui est legitime. Seul ce qui est affiche compte.
        const code = ctx
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/^\s*\/\/.*$/gm, "");
        expect(code).not.toContain("petit bug interne");
    });
});

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src");
const APP = fs.readFileSync(path.join(SRC, "App.jsx"), "utf8");

/** Extrait l'élément d'une <Route path="..."> déclarée dans App.jsx. */
const routeElement = (routePath) => {
    const i = APP.indexOf(`path="${routePath}"`);
    if (i === -1) return null;
    // La déclaration tient sur une ligne, ou s'étend jusqu'à la fermeture />.
    const rest = APP.slice(i);
    return rest.slice(0, rest.indexOf("/>") + 2);
};

describe("gardes de routes — pages destructives ou privilégiées", () => {
    // /qa PEUPLE la boutique courante de données de démo et bascule le plan.
    // Sur une boutique de production, cela corrompt les données du marchand.
    // Les règles Firestore ne peuvent rien : le marchand écrit chez lui, ce qui
    // est légitime de leur point de vue. Le garde de route est le seul contrôle.
    it("/qa n'est jamais montée sans garde", () => {
        const el = routeElement("/qa");
        expect(el, "la route /qa a disparu de App.jsx").not.toBeNull();
        expect(el).toContain("QARouteGuard");
    });

    it("le garde /qa refuse par défaut et n'autorise que super_admin ou testerMode", () => {
        const guard = fs.readFileSync(path.join(SRC, "components/QARouteGuard.jsx"), "utf8");
        expect(guard).toContain('role === "super_admin"');
        expect(guard).toContain("store?.testerMode === true");
        // Redirection explicite, et non rendu silencieux.
        expect(guard).toContain('/dashboard');
        // En cas d'échec de lecture du rôle, on retombe sur 'user' (refus).
        expect(guard).toContain('catch');
        expect(guard).toContain('setRole("user")');
    });

    it("les routes d'administration restent réservées au super_admin", () => {
        for (const route of ["/admin", "/admin/errors"]) {
            const i = APP.indexOf(`path="${route}"`);
            expect(i, `route ${route} absente`).toBeGreaterThan(-1);
            const block = APP.slice(i, i + 400);
            expect(block, `${route} doit rester derrière RoleProtectedRoute`).toContain("RoleProtectedRoute");
            expect(block).toContain("super_admin");
        }
    });
});

describe("champs réservés — cohérence client / règles", () => {
    const RULES = fs.readFileSync(path.resolve(SRC, "../firestore.rules"), "utf8");

    it("testerMode reste interdit au propriétaire côté règles", () => {
        // Si ce champ redevenait modifiable par un owner, il pourrait s'ouvrir
        // l'accès à /qa et au plan PRO lui-même.
        expect(RULES).toMatch(/'testerMode'/);
    });

    it("le basculement testerMode gère le refus au lieu de l'ignorer", () => {
        const settings = fs.readFileSync(path.join(SRC, "pages/Settings.jsx"), "utf8");
        const i = settings.indexOf("testerMode: newVal");
        expect(i).toBeGreaterThan(-1);
        const block = settings.slice(Math.max(0, i - 900), i + 900);
        expect(block, "l'écriture doit être encadrée par un try/catch").toContain("catch");
        expect(block, "l'état optimiste doit être annulé en cas de refus").toContain("!newVal");
    });
});

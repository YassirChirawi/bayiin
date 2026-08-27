import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src");
const LOCK = fs.readFileSync(path.join(SRC, "components/BiometricLock.jsx"), "utf8");
const SETUP = fs.readFileSync(path.join(SRC, "components/BiometricSetupModal.jsx"), "utf8");

describe("verrou biométrique — ne doit jamais enfermer l'utilisateur", () => {
    // Signalé en production sur Android : « Accès Sécurisé » affiché, Google
    // répondant « No passkeys available for bayiin.vercel.app », et un écran
    // n'offrant QUE « Déverrouiller ». Aucune sortie possible.

    it("propose toujours une déconnexion depuis l'écran verrouillé", () => {
        expect(LOCK).toContain("handleLogout");
        expect(LOCK).toContain("Se déconnecter");
    });

    it("propose de désactiver le verrou après un échec de vérification", () => {
        expect(LOCK).toContain("handleDisableLock");
        expect(LOCK).toMatch(/failed[\s\S]{0,400}Désactiver le verrouillage/);
    });

    it("ne verrouille pas un appareil sans authentificateur disponible", () => {
        // Sinon le verrou est insatisfiable par construction.
        expect(LOCK).toContain("isAvailable()");
        expect(LOCK).toMatch(/supported[\s\S]{0,200}removeItem\('biometricEnabled'\)/);
    });

    it("lève le verrou si le domaine a changé depuis l'enregistrement", () => {
        // Une passkey est liée au RP ID (le domaine) : bayiin.shop et
        // bayiin.vercel.app ne partagent pas leurs passkeys.
        expect(SETUP).toContain("biometricRpId");
        expect(LOCK).toContain("biometricRpId");
        expect(LOCK).toMatch(/rpId !== window\.location\.hostname/);
    });

    it("distingue l'échec pour pouvoir l'expliquer, au lieu de vibrer sans message", () => {
        expect(LOCK).toContain("verifyDetailed");
        expect(LOCK).toContain("setFailed(true)");
    });

    it("le domaine n'est mémorisé qu'après un enregistrement réussi", () => {
        const i = SETUP.indexOf("if (success)");
        expect(i).toBeGreaterThan(-1);
        const block = SETUP.slice(i, i + 700);
        expect(block).toContain("biometricRpId");
    });
});

/**
 * Tests de functions/copilot.js — le point d'entrée de Beya3.
 *
 * 446 lignes, aucune couverture jusqu'ici, alors que c'est LUI qui garde les
 * données d'un marchand contre celles d'un autre : il vérifie le jeton, résout
 * le rôle, et compare le storeId demandé à celui du compte. Une régression ici
 * laisse un marchand interroger l'IA sur la boutique d'un concurrent.
 *
 * On teste les portes d'entrée, pas la conversation : tous les cas ci-dessous
 * renvoient AVANT d'atteindre Groq.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'node:module';

const requireFromFunctions = createRequire(
    new URL('../../functions/copilot.js', import.meta.url)
);

// Substitution AVANT chargement : copilot.js capture getAuth et getFirestore par
// destructuration au chargement du module (même approche que financialEngine et
// actionExecutor, et même précaution sur les deux installations de
// firebase-admin présentes dans le dépôt).
let verifyIdTokenImpl = async () => ({ uid: 'u1' });
let userDocData = { storeId: 'S1', role: 'owner' };

const authModule = requireFromFunctions('firebase-admin/auth');
authModule.getAuth = () => ({ verifyIdToken: (t) => verifyIdTokenImpl(t) });

const firestoreModule = requireFromFunctions('firebase-admin/firestore');
firestoreModule.getFirestore = () => ({
    collection: () => ({
        doc: () => ({
            get: async () => ({
                exists: userDocData !== null,
                data: () => userDocData,
            }),
        }),
    }),
});

const { copilotChatV1 } = requireFromFunctions('./copilot');

/** Requête minimale acceptée par le middleware cors (pas d'origin = autorisé). */
const makeReq = (over = {}) => ({
    method: 'POST',
    headers: { authorization: 'Bearer jeton-valide', ...(over.headers || {}) },
    body: { messages: [{ role: 'user', content: 'salut' }], storeId: 'S1', ...(over.body || {}) },
    ...Object.fromEntries(Object.entries(over).filter(([k]) => !['headers', 'body'].includes(k))),
});

/** Réponse qui enregistre le code et la charge utile, façon Express. */
function makeRes() {
    const out = { code: null, payload: null, headers: {} };
    const res = {
        setHeader: (k, v) => { out.headers[k] = v; },
        getHeader: (k) => out.headers[k],
        removeHeader: (k) => { delete out.headers[k]; },
        status: (c) => { out.code = c; return res; },
        json: (p) => { out.payload = p; out.done = true; return res; },
        send: (p) => { out.payload = p; out.done = true; return res; },
        end: () => { out.done = true; return res; },
        write: () => true,
    };
    return { res, out };
}

/** Laisse la chaîne cors → handler async se dérouler. */
const settle = () => new Promise((r) => setTimeout(r, 30));

describe('copilotChatV1 — authentification', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        process.env.GROQ_API_KEY = 'cle-de-test';
        verifyIdTokenImpl = async () => ({ uid: 'u1' });
        userDocData = { storeId: 'S1', role: 'owner' };
    });

    it('refuse une requête sans en-tête Authorization', async () => {
        const { res, out } = makeRes();
        copilotChatV1(makeReq({ headers: { authorization: undefined } }), res);
        await settle();
        expect(out.code).toBe(401);
    });

    it('refuse un en-tête qui ne commence pas par Bearer', async () => {
        const { res, out } = makeRes();
        copilotChatV1(makeReq({ headers: { authorization: 'Basic abc' } }), res);
        await settle();
        expect(out.code).toBe(401);
    });

    it('refuse un jeton invalide', async () => {
        verifyIdTokenImpl = async () => { throw new Error('jeton expiré'); };
        const { res, out } = makeRes();
        copilotChatV1(makeReq(), res);
        await settle();
        expect(out.code).toBe(401);
    });
});

describe('copilotChatV1 — isolation entre marchands', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        process.env.GROQ_API_KEY = 'cle-de-test';
        verifyIdTokenImpl = async () => ({ uid: 'u1' });
    });

    it('refuse un storeId qui n\'est pas celui du compte', async () => {
        // Le cœur du sujet : sans cette garde, un marchand interroge l'IA sur les
        // données d'un concurrent en changeant un champ de la requête.
        userDocData = { storeId: 'S1', role: 'owner' };
        const { res, out } = makeRes();
        copilotChatV1(makeReq({ body: { storeId: 'BOUTIQUE_DU_VOISIN' } }), res);
        await settle();
        expect(out.code).toBe(403);
    });

    it('refuse aussi quand le compte n\'a aucune boutique', async () => {
        userDocData = { role: 'user' };
        const { res, out } = makeRes();
        copilotChatV1(makeReq(), res);
        await settle();
        expect(out.code).toBe(403);
    });

    it('refuse quand le document utilisateur n\'existe pas', async () => {
        userDocData = null;
        const { res, out } = makeRes();
        copilotChatV1(makeReq(), res);
        await settle();
        expect(out.code).toBe(403);
    });

    it('laisse passer un super_admin sur n\'importe quelle boutique', async () => {
        userDocData = { storeId: 'AUTRE', role: 'super_admin' };
        const { res, out } = makeRes();
        copilotChatV1(makeReq({ body: { storeId: 'S1' } }), res);
        await settle();
        // Il franchit la porte : le code d'erreur d'isolation ne doit pas tomber.
        expect(out.code).not.toBe(403);
    });
});

describe('copilotChatV1 — requêtes mal formées et configuration', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        verifyIdTokenImpl = async () => ({ uid: 'u1' });
        userDocData = { storeId: 'S1', role: 'owner' };
        process.env.GROQ_API_KEY = 'cle-de-test';
    });

    it('refuse une requête sans storeId', async () => {
        const { res, out } = makeRes();
        copilotChatV1(makeReq({ body: { storeId: undefined } }), res);
        await settle();
        expect(out.code).toBe(400);
    });

    it('signale une configuration incomplète si la clé Groq manque', async () => {
        delete process.env.GROQ_API_KEY;
        const { res, out } = makeRes();
        copilotChatV1(makeReq(), res);
        await settle();
        expect(out.code).toBe(500);
        // Le message ne doit pas révéler quel secret manque.
        expect(JSON.stringify(out.payload)).not.toContain('GROQ');
    });

    it('vérifie la configuration AVANT de toucher la base', async () => {
        // Sinon un appel non configuré déclenche quand même une lecture Firestore.
        delete process.env.GROQ_API_KEY;
        let touched = false;
        firestoreModule.getFirestore = () => {
            touched = true;
            return { collection: () => ({ doc: () => ({ get: async () => ({ exists: false }) }) }) };
        };
        const { res } = makeRes();
        copilotChatV1(makeReq(), res);
        await settle();
        expect(touched).toBe(false);
    });
});

describe('copilotChatV1 — une panne interne doit produire une réponse', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        process.env.GROQ_API_KEY = 'cle-de-test';
        verifyIdTokenImpl = async () => ({ uid: 'u1' });
        userDocData = { storeId: 'S1', role: 'owner' };
    });

    it('répond 500 si le chargement de la mémoire échoue, au lieu de pendre', async () => {
        // Le try du handler ne s'ouvrait qu'au streaming : retrieveMemories,
        // getMerchantProfile et l'initialisation de Groq étaient en dehors. Un
        // hoquet Firestore rejetait donc une promesse SANS gestionnaire — le
        // client ne recevait aucune réponse et la requête pendait 120 s.
        firestoreModule.getFirestore = () => ({
            collection: (name) => ({
                doc: () => ({
                    get: async () => ({ exists: true, data: () => userDocData }),
                }),
                // La mémoire interroge la collection ; on simule une panne.
                where: () => { throw new Error('Firestore indisponible'); },
            }),
        });

        const { res, out } = makeRes();
        copilotChatV1(makeReq(), res);
        await settle();

        expect(out.done, 'le handler doit répondre, même en panne').toBe(true);
        expect(out.code).toBe(500);
    });
});

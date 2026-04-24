import { describe, it, expect } from 'vitest';
import {
    renderTemplate,
    WHATSAPP_TEMPLATES,
    DARIJA_TEMPLATES,
    DEFAULT_TEMPLATES,
    getWhatsappMessage,
} from '../../src/utils/whatsappTemplates.js';

describe('renderTemplate — remplacement de variables {placeholder}', () => {

    // ── Test 1 : Remplacement basique ─────────────────────────────────────────
    it('1. Remplace {name} et {commande} correctement', () => {
        const template = 'Bonjour {name}, votre commande {commande} est confirmée.';
        const result = renderTemplate(template, { name: 'Yassir', commande: '#1042' });
        expect(result).toBe('Bonjour Yassir, votre commande #1042 est confirmée.');
    });

    // ── Test 2 : Variable manquante — reste telle quelle ────────────────────
    it('2a. Variable absente du data-object → reste {placeholder}', () => {
        const template = 'Bonjour {name}, lien de suivi : {tracking}';
        // On passe seulement `name`, `tracking` est inconnu → reste tel quel
        const result = renderTemplate(template, { name: 'Yassir' });
        expect(result).toContain('Yassir');
        expect(result).toContain('{tracking}'); // non remplacée
    });

    it('2b. Variable présente mais valeur vide → remplacée par chaîne vide', () => {
        const template = 'Bonjour {name}!';
        // La clé `name` existe dans data mais sa valeur est ''
        const result = renderTemplate(template, { name: '' });
        expect(result).toBe('Bonjour !');
    });

    // ── Test 3 : Template Darija ─────────────────────────────────────────────
    it('3. Template Darija — switch de langue via DARIJA_TEMPLATES', () => {
        const template = DARIJA_TEMPLATES['confirmation'];
        expect(template).toBeDefined();
        // Le template Darija doit contenir les mots-clés Darija (pas en FR)
        expect(template).toMatch(/Salam|salam|tkonfirma|Chokran/i);
        // Vérifier que ce n'est PAS le template français équivalent
        expect(template).not.toMatch(/^Bonjour/);
    });

    // ── Test 4 : Template Français ───────────────────────────────────────────
    it('4. Template Français — DEFAULT_TEMPLATES contient un message FR', () => {
        const template = DEFAULT_TEMPLATES['confirmation'];
        expect(template).toBeDefined();
        // Le template FR doit commencer par "Bonjour"
        expect(template).toMatch(/^Bonjour/);
        // Ne doit PAS être le template Darija
        expect(template).not.toMatch(/Salam|tkonfirma/i);
    });

    // ── Test 5 : Template vide ───────────────────────────────────────────────
    it('5. Template vide ou null → retourne chaîne vide sans crash', () => {
        expect(renderTemplate('')).toBe('');
        expect(renderTemplate(null)).toBe('');
        expect(renderTemplate(undefined)).toBe('');
    });

});

describe('WHATSAPP_TEMPLATES — cohérence bilingue (fr / en)', () => {

    it('FR et EN ont les mêmes clés de templates', () => {
        const frKeys = Object.keys(WHATSAPP_TEMPLATES.fr).sort();
        const enKeys = Object.keys(WHATSAPP_TEMPLATES.en).sort();
        expect(frKeys).toEqual(enKeys);
    });

    it('getWhatsAppLink via getWhatsappMessage — génère un message non vide pour chaque statut connu', () => {
        const statuses = ['reçu', 'confirmation', 'livraison', 'livré', 'annulé', 'reporté', 'pas de réponse'];
        const order = { clientName: 'Yassir', articleName: 'Pack Premium', price: 299 };
        const store = { name: 'BayIIn Store' };

        statuses.forEach(status => {
            const msg = getWhatsappMessage(status, order, store);
            expect(typeof msg).toBe('string');
            expect(msg.length).toBeGreaterThan(0);
            expect(msg).toContain('Yassir');
        });
    });

});

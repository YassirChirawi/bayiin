import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOrderActions } from '../../src/hooks/useOrderActions';
import { httpsCallable } from 'firebase/functions';

// Contextes
vi.mock('../../src/context/TenantContext', () => ({
    useTenant: () => ({ store: { id: 'store-123', name: 'Test Store' } })
}));
vi.mock('../../src/context/AuthContext', () => ({
    useAuth: () => ({ user: { uid: 'user-456' } })
}));
vi.mock('../../src/hooks/useAudit', () => ({ useAudit: () => ({ logAction: vi.fn() }) }));

// Firestore (non utilisé pour l'expédition — désormais côté serveur)
vi.mock('firebase/firestore', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, doc: vi.fn(() => ({})), getDoc: vi.fn(), runTransaction: vi.fn() };
});

// Cloud Functions : on capture l'appel au callable createCarrierDelivery.
vi.mock('firebase/functions', () => ({
    httpsCallable: vi.fn(),
    getFunctions: vi.fn(() => ({})),
    connectFunctionsEmulator: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function TestComponent({ actionCallback }) {
    const actions = useOrderActions();
    React.useEffect(() => { if (actionCallback) actionCallback(actions); }, [actionCallback, actions]);
    return <div>useOrderActions Test</div>;
}

describe('useOrderActions — expédition transporteur (côté serveur)', () => {
    beforeEach(() => vi.clearAllMocks());

    // Commande dans un statut d'où l'expédition est valide (confirmation → livraison).
    const shippableOrder = { id: 'order-123', status: 'confirmation', clientName: 'Yassir', clientPhone: '0612345678', clientCity: 'Casablanca', price: 500, quantity: 1 };

    it('sendToCathedis appelle le callable createCarrierDelivery avec le bon transporteur', async () => {
        const callable = vi.fn().mockResolvedValue({ data: { trackingId: 'CAT-887766', carrierStatus: 'CREATED' } });
        httpsCallable.mockReturnValue(callable);

        let response = null;
        render(<TestComponent actionCallback={async (actions) => { response = await actions.sendToCathedis(shippableOrder); }} />);

        await waitFor(() => {
            expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'createCarrierDelivery');
            expect(callable).toHaveBeenCalledWith({ orderId: 'order-123', carrier: 'cathedis' });
            expect(response).toEqual({ trackingId: 'CAT-887766', carrierStatus: 'CREATED' });
        });
    });

    it('sendToSendit et sendToOlivraison passent le bon transporteur', async () => {
        const callable = vi.fn().mockResolvedValue({ data: { trackingId: 'T', carrierStatus: 'PENDING' } });
        httpsCallable.mockReturnValue(callable);

        render(<TestComponent actionCallback={async (actions) => { await actions.sendToSendit(shippableOrder); await actions.sendToOlivraison(shippableOrder); }} />);

        await waitFor(() => {
            expect(callable).toHaveBeenCalledWith({ orderId: 'order-123', carrier: 'sendit' });
            expect(callable).toHaveBeenCalledWith({ orderId: 'order-123', carrier: 'olivraison' });
        });
    });

    it('refuse d\'expédier une commande dans un statut non expédiable (garde client)', async () => {
        const callable = vi.fn();
        httpsCallable.mockReturnValue(callable);

        let captured = null;
        render(<TestComponent actionCallback={async (actions) => {
            try { await actions.sendToSendit({ id: 'o2', status: 'livré' }); } catch (e) { captured = e.message; }
        }} />);

        await waitFor(() => expect(captured).toBeTruthy());
        expect(callable).not.toHaveBeenCalled(); // bloqué avant l'appel serveur
    });
});

import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export const PLANS = {
    STARTER: {
        id: 'starter',
        name: 'Starter',
        price: 79,
        priceId: 'price_1Ss288RbBL8AcutXLyUCGG0i', // 79 DH
        features: ['Up to 50 Orders/mo', 'Basic Analytics', 'Standard Support']
    },
    PRO: {
        id: 'pro',
        name: 'Pro',
        price: 179,
        priceId: 'price_1Ss28eRbBL8AcutXxJ1jgxPY', // 179 DH
        features: ['Unlimited Orders', 'Advanced Analytics', 'Priority Support', 'Custom Domain', 'Remove Branding']
    }
};

/**
 * Real Client-Side Stripe Checkout
 * Note: Requires "Client-only integration" to be enabled in Stripe Dashboard
 */
export const createCheckoutSession = async (storeId, priceId) => {
    try {
        const stripe = await stripePromise;

        // Define success/cancel URLs
        const successUrl = `${window.location.origin}/settings?session_id={CHECKOUT_SESSION_ID}&plan_updated=true`;
        const cancelUrl = `${window.location.origin}/settings?canceled=true`;

        const { error } = await stripe.redirectToCheckout({
            lineItems: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            successUrl: successUrl,
            cancelUrl: cancelUrl,
            clientReferenceId: storeId, // Pass Store ID to track who paid
            // customerEmail: storeEmail // Optional if you have it
        });

        if (error) {
            console.error("Stripe Redirect Error:", error);
            throw error;
        }

    } catch (err) {
        console.error("Payment Error:", err);
        throw err;
    }
};

/**
 * Helper to update store status after "successful" mock payment
 */
export const activateSubscriptionMock = async (storeId, planId) => {
    const storeRef = doc(db, "stores", storeId);

    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    await updateDoc(storeRef, {
        plan: planId,
        subscriptionStatus: 'trialing',
        trialEndsAt: trialEndsAt.toISOString(),
        updatedAt: new Date().toISOString()
    });
};

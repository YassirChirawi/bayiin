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
        paymentLink: 'https://buy.stripe.com/8x2dRb74D4bg7yF4O0es001', // Swapped: Was Pro
        features: ['Up to 50 Orders/mo', 'Basic Analytics', 'Standard Support']
    },
    PRO: {
        id: 'pro',
        name: 'Pro',
        price: 179,
        paymentLink: 'https://buy.stripe.com/3cIfZj3Sr4bgaKR80ces000', // Swapped: Was Starter
        features: ['Unlimited Orders', 'Advanced Analytics', 'Priority Support', 'Custom Domain', 'Remove Branding']
    }
};

/**
 * Redirects to Stripe Payment Link
 */
export const createCheckoutSession = async (storeId, planId) => {
    const plan = Object.values(PLANS).find(p => p.id === planId);
    if (!plan || !plan.paymentLink) throw new Error("Invalid Plan or missing link");

    // Redirect to Stripe with client_reference_id to track who paid
    window.location.href = `${plan.paymentLink}?client_reference_id=${storeId}`;

    // Return a promise that never resolves so the UI stays loading until unload
    return new Promise(() => { });
};



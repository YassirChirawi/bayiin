import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// MOCK GA4 Measurement ID
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';

export const useAnalytics = () => {
    const location = useLocation();

    useEffect(() => {
        // Initialize GA (Mock)
        if (!window.dataLayer) {
            window.dataLayer = [];
            function gtag() { window.dataLayer.push(arguments); }
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', GA_MEASUREMENT_ID);
            console.log("Analytics initialized:", GA_MEASUREMENT_ID);
        }
    }, []);

    useEffect(() => {
        // Track Page View
        if (window.gtag) {
            window.gtag('event', 'page_view', {
                page_location: window.location.href,
                page_path: location.pathname,
                page_title: document.title
            });
            console.log("Analytics page_view:", location.pathname);
        }
    }, [location]);

    const trackEvent = (action, category, label, value) => {
        if (window.gtag) {
            window.gtag('event', action, {
                event_category: category,
                event_label: label,
                value: value
            });
            console.log("Analytics event:", { action, category, label, value });
        }
    };

    return { trackEvent };
};

import { useState, useEffect } from 'react';

/**
 * Custom hook to detect if the application is running inside an iframe.
 * @returns {boolean} True if running inside an iframe.
 */
export function useEmbeddedMode() {
    const [isEmbedded, setIsEmbedded] = useState(false);

    useEffect(() => {
        try {
            // Check if window is not the top-level window
            if (window.self !== window.top) {
                setIsEmbedded(true);
            }
        } catch (e) {
            // Cross-origin errors when checking window.top mean we are definitely in an iframe
            setIsEmbedded(true);
        }
    }, []);

    return isEmbedded;
}

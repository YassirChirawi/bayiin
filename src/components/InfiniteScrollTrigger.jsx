import React, { useEffect, useRef } from 'react';

/**
 * Composant invisible (ou avec un loader discret) qui déclenche une action (onTrigger) 
 * dès qu'il devient visible dans le viewport, permettant de réaliser des Infinite Scrolls.
 */
export default function InfiniteScrollTrigger({ onTrigger, isLoading, hasMore, text = "Chargement..." }) {
    const triggerRef = useRef(null);

    useEffect(() => {
        // Ne rien faire si on est déjà en train de charger, ou s'il n'y a plus rien à charger
        if (isLoading || !hasMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    onTrigger();
                }
            },
            {
                root: null, // observe viewport
                rootMargin: '100px', // start loading before it actually enters the screen
                threshold: 0.1
            }
        );

        const currentRef = triggerRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) observer.unobserve(currentRef);
        };
    }, [isLoading, hasMore, onTrigger]);

    // Si on n'a plus d'éléments à charger, on n'affiche rien du tout pour ne pas gêner
    if (!hasMore) return null;

    return (
        <div ref={triggerRef} className="py-6 flex justify-center items-center w-full">
            {isLoading && (
                <div className="flex items-center gap-2 text-indigo-600 font-medium text-sm">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{text}</span>
                </div>
            )}
        </div>
    );
}

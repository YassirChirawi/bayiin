import { useState, useCallback } from 'react';

export function useConfirmDialog() {
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        isDestructive: false
    });

    const confirm = useCallback((options) => {
        setConfirmState({
            isOpen: true,
            title: options.title || 'Confirmation',
            message: options.message || 'Êtes-vous sûr ?',
            onConfirm: options.onConfirm,
            isDestructive: options.isDestructive || false
        });
    }, []);

    const close = useCallback(() => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    }, []);

    return {
        confirmState,
        confirm,
        close
    };
}

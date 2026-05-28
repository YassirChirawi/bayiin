import { useState, useCallback } from 'react';
import { produce } from 'immer';

export function useHistory(initialState) {
    const [state, setState] = useState({
        past: [],
        present: initialState,
        future: []
    });

    const canUndo = state.past.length > 0;
    const canRedo = state.future.length > 0;

    const set = useCallback((newPresentOrUpdater) => {
        setState(currentState => {
            const newPresent = typeof newPresentOrUpdater === 'function' 
                ? produce(currentState.present, newPresentOrUpdater)
                : newPresentOrUpdater;

            // Optional: prevent pushing if state didn't actually change
            if (currentState.present === newPresent) {
                return currentState;
            }

            return {
                past: [...currentState.past, currentState.present],
                present: newPresent,
                future: []
            };
        });
    }, []);

    const reset = useCallback((newPresent) => {
        setState({
            past: [],
            present: newPresent,
            future: []
        });
    }, []);

    const undo = useCallback(() => {
        setState(currentState => {
            if (currentState.past.length === 0) return currentState;

            const previous = currentState.past[currentState.past.length - 1];
            const newPast = currentState.past.slice(0, currentState.past.length - 1);

            return {
                past: newPast,
                present: previous,
                future: [currentState.present, ...currentState.future]
            };
        });
    }, []);

    const redo = useCallback(() => {
        setState(currentState => {
            if (currentState.future.length === 0) return currentState;

            const next = currentState.future[0];
            const newFuture = currentState.future.slice(1);

            return {
                past: [...currentState.past, currentState.present],
                present: next,
                future: newFuture
            };
        });
    }, []);

    return {
        state: state.present,
        set,
        reset,
        undo,
        redo,
        canUndo,
        canRedo
    };
}

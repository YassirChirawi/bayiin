/**
 * Triggers a haptic feedback vibration on supported devices.
 * 
 * @param {string} type - 'soft' | 'medium' | 'heavy' | 'success' | 'error'
 */
export const vibrate = (type = 'medium') => {
    if (!navigator.vibrate) return;

    switch (type) {
        case 'soft':
            navigator.vibrate(10);
            break;
        case 'medium':
            navigator.vibrate(30);
            break;
        case 'heavy':
            navigator.vibrate(70);
            break;
        case 'success':
            navigator.vibrate([30, 50, 30]);
            break;
        case 'error':
            navigator.vibrate([50, 100, 50, 100]);
            break;
        default:
            navigator.vibrate(30);
    }
};

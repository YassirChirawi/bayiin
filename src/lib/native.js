/**
 * native.js — réglages spécifiques aux apps natives (Capacitor iOS/Android).
 *
 * Entièrement gardé par Capacitor.isNativePlatform() : NO-OP sur le web (les imports
 * dynamiques ne s'exécutent que sur device). Appelé une fois au démarrage (main.jsx).
 *
 * Prérequis build natif (côté machine du dev) :
 *   npm install && npx cap sync
 * Plugins déjà déclarés : @capacitor/status-bar, splash-screen, keyboard, app.
 */
import { Capacitor } from '@capacitor/core';

export async function initNative() {
    if (!Capacitor.isNativePlatform()) return;

    // Barre d'état : superposée (edge-to-edge) + texte foncé (le header de l'app est clair).
    // La padding safe-area-inset-top (voir index.css) décale le contenu sous la barre.
    try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: Style.Dark });
    } catch (e) { console.warn('[native] StatusBar:', e?.message); }

    // Masque l'écran de démarrage une fois le web prêt.
    try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();
    } catch (e) { console.warn('[native] SplashScreen:', e?.message); }

    // Le clavier redimensionne la vue nativement (le contenu remonte au lieu d'être masqué).
    try {
        const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');
        await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
    } catch (e) { console.warn('[native] Keyboard:', e?.message); }

    // Bouton retour Android : navigue en arrière, ou quitte l'app à la racine.
    try {
        const { App } = await import('@capacitor/app');
        App.addListener('backButton', ({ canGoBack }) => {
            if (canGoBack) window.history.back();
            else App.exitApp();
        });
    } catch (e) { console.warn('[native] App backButton:', e?.message); }
}

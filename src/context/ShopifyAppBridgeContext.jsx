import React, { createContext, useContext, useEffect, useState } from 'react';

const ShopifyAppBridgeContext = createContext({ isEmbedded: false, shop: null });

export const useShopify = () => useContext(ShopifyAppBridgeContext);

export function ShopifyAppBridgeProvider({ children }) {
    const [isEmbedded, setIsEmbedded] = useState(false);
    const [shop, setShop] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const shopParam = params.get('shop');
        const hostParam = params.get('host');

        // If 'shop' and 'host' parameters are present in URL, we are inside Shopify iframe
        if (shopParam && hostParam) {
            setIsEmbedded(true);
            setShop(shopParam);
            console.log(`[ShopifyAppBridge] Embedded mode detected. Shop: ${shopParam}`);
        }
    }, []);

    return (
        <ShopifyAppBridgeContext.Provider value={{ isEmbedded, shop }}>
            {children}
        </ShopifyAppBridgeContext.Provider>
    );
}

export default ShopifyAppBridgeContext;

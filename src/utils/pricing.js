export const calculateProductPrice = (product, customerType) => {
    if (!product) return 0;

    // RETAIL returns standard price
    if (!customerType || customerType === 'RETAIL') {
        return parseFloat(product.price) || 0;
    }

    // PRO applies a B2B discount. Assume a 30% discount if proPrice is not explicitly defined.
    // If the product schema evolves to have a specific `proPrice`, we can use that here.
    if (customerType === 'PRO') {
        if (product.proPrice) {
            return parseFloat(product.proPrice);
        }
        const retailPrice = parseFloat(product.price) || 0;
        // 30% discount logic
        return retailPrice * 0.7;
    }

    // Fallback
    return parseFloat(product.price) || 0;
};

// Basic Mock for date-fns since we can't easily import in standalone node script without type module or build step
const differenceInDays = (dateLeft, dateRight) => {
    const diffTime = Math.abs(dateLeft - dateRight);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Copy-paste logic for quick verification (or setting up proper jest test would be better but overkill for quick check)
const getCustomerSegment = (customer, orders = []) => {
    // ... Copying logic from src/utils/aiSegmentation.js to avoid import issues in this scratchpad
    if (!orders || orders.length === 0) {
        return { id: 'NEW', label: 'Nouveau Client' };
    }

    const totalSpent = orders.reduce((sum, order) => sum + (parseFloat(order.price || 0) * (parseInt(order.quantity || 1))), 0);
    const orderCount = orders.length;

    // Sort orders by date descending to find last purchase
    const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const lastOrderDate = sortedOrders[0]?.createdAt ? new Date(sortedOrders[0].createdAt) : new Date();
    const daysSinceLastOrder = differenceInDays(new Date(), lastOrderDate);

    const VIP_SPEND_THRESHOLD = 2000;
    const VIP_FREQ_THRESHOLD = 5;
    const RISK_DAYS_THRESHOLD = 60;
    const LOST_DAYS_THRESHOLD = 120;

    if (totalSpent >= VIP_SPEND_THRESHOLD && orderCount >= VIP_FREQ_THRESHOLD) {
        if (daysSinceLastOrder > RISK_DAYS_THRESHOLD) return { id: 'VIP_RISK' };
        return { id: 'VIP' };
    }

    if (orderCount >= 3 || totalSpent >= 1000) {
        if (daysSinceLastOrder > RISK_DAYS_THRESHOLD) return { id: 'RISK' };
        return { id: 'LOYAL' };
    }

    if (daysSinceLastOrder > LOST_DAYS_THRESHOLD) return { id: 'LOST' };

    return { id: 'REGULAR' };
};

const testSegmentation = () => {
    console.log("--- Starting AI Segmentation Test ---");

    // 1. New Client
    const newClient = { name: "Newbie" };
    const resultNew = getCustomerSegment(newClient, []);
    console.log("New Client:", resultNew.id === 'NEW' ? "PASS" : `FAIL (${resultNew.id})`);

    // 2. VIP Client (High Spend, High Frequency)
    const vipOrders = Array(6).fill({ price: 400, quantity: 1, createdAt: new Date() }); // 2400 spending, 6 orders
    const resultVip = getCustomerSegment({ name: "VIP" }, vipOrders);
    console.log("VIP Client:", resultVip.id === 'VIP' ? "PASS" : `FAIL (${resultVip.id})`);

    // 3. At Risk (Loyal but inactive)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 70); // 70 days ago
    const riskOrders = Array(4).fill({ price: 300, quantity: 1, createdAt: oldDate }); // 1200 spending
    const resultRisk = getCustomerSegment({ name: "Risk" }, riskOrders);
    console.log("Risk Client:", resultRisk.id === 'RISK' ? "PASS" : `FAIL (${resultRisk.id})`);

    // 4. Lost (Inactive > 120 days)
    const lostDate = new Date();
    lostDate.setDate(lostDate.getDate() - 130);
    const lostOrders = [{ price: 100, quantity: 1, createdAt: lostDate }];
    const resultLost = getCustomerSegment({ name: "Lost" }, lostOrders);
    console.log("Lost Client:", resultLost.id === 'LOST' ? "PASS" : `FAIL (${resultLost.id})`);

    console.log("--- End Test ---");
};

testSegmentation();

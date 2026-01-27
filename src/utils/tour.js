import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const startDashboardTour = () => {
    const driverObj = driver({
        showProgress: true,
        steps: [
            {
                popover: {
                    title: 'Welcome to BayIIn! 👋',
                    description: 'Let me give you a quick tour of your new dashboard. It will only take a minute!'
                }
            },
            {
                element: '#tour-stats',
                popover: {
                    title: 'Your Command Center 📊',
                    description: 'Here you see your crucial numbers: Revenue, Profit, and Active Orders. Keep an eye on the "Total Paid" vs "Total Income" to track your cash flow.'
                }
            },
            {
                element: '#tour-new-order',
                popover: {
                    title: 'Create Orders 📦',
                    description: 'Click here to add a new order manually. You can check stock, assign customers, and set delivery fees instantly.'
                }
            },
            {
                element: '#tour-nav',
                popover: {
                    title: 'Navigation 🧭',
                    description: 'Access your Orders, Products, Customers, and Finances from this sidebar. Everything is one click away.'
                }
            },
            {
                element: '#tour-support',
                popover: {
                    title: 'We Are Here! 🤝',
                    description: 'Need help? Click here to chat with us on WhatsApp instantly. Use it for feature requests or bug reports!'
                }
            },
            {
                popover: {
                    title: 'You are Ready! 🚀',
                    description: 'Enjoy using BayIIn. Go make some sales!'
                }
            },
        ]
    });

    driverObj.drive();
};

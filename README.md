# 🚀 BayIIn: Unified Commerce Command Center

**BayIIn** is a comprehensive SaaS platform designed for modern e-commerce management. It streamlines order processing, financial tracking, logistics, and customer engagement into a single, cohesive interface.

---

## 📋 Table of Contents
1. [Core Features](#-core-features)
2. [Technical Stack](#-technical-stack)
3. [Architecture Overview](#-architecture-overview)
4. [Functional Modules](#-functional-modules)
5. [Developer Guide](#-developer-guide)
6. [Security & Performance](#-security--performance)
7. [Deployment](#-deployment)

---

## ✨ Core Features
- **Multi-Store Management**: Effortlessly switch between multiple stores under one account.
- **Order Lifecycle**: Tracks orders from `Confirmation` through `Expédié` (Shipped) to `Livré` (Delivered) or `Retourné` (Returned).
- **Financial Intelligence**: Automated Net Profit calculation considering COGS, shipping, and ad spend.
- **AI Copilot**: Integrated AI to assist with store analysis, automation, and support.
- **Logistics & Delivery**: Built-in Delivery Driver application and franchise management system.
- **WhatsApp Integration**: Automated customer notification templates in multiple languages (French/Darija).
- **Client CRM**: Auto-filling address logic based on phone numbers and customer history tracking.

---

## 🛠️ Technical Stack
- **Frontend**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) (SPA)
- **Styling**: [TailwindCSS 4](https://tailwindcss.com/)
- **State & Logic**: Framer Motion (Animations), Lucide React (Icons), Recharts (Analytics)
- **Database / Backend**: [Firebase Firestore](https://firebase.google.com/docs/firestore) (NoSQL)
- **Authentication**: Firebase Auth
- **Mobile Foundation**: [Capacitor](https://capacitorjs.com/) (iOS/Android support)
- **Automation / AI**: Google Generative AI (@google/generative-ai)
- **Payments**: Stripe (via Hosted Payment Links)

---

## 🏗️ Architecture Overview

### Data Flow
- **Firestore**: Primary source of truth. Security is enforced via `firestore.rules`.
- **Context API**: Global state management for `Auth`, `Store`, and `Language`.
- **Service Layer**: abstraction located in `src/lib/` for services like Stripe, Firebase, and AI.

### Security
- **Biometric Lock**: Optional device-level security via WebAuthn API (`src/hooks/useBiometrics.js`).
- **Role-Based Access**: Granular control for `Admin`, `Staff`, and `Driver` roles.

---

## 📦 Functional Modules

### 💰 Finance & Costs
- **Profit Formula**: `(Sold Price) - (Product Cost) - (Shipping Fees) - (Ads & Expenses)`
- **Expense Manager**: Track ad spend and packaging costs directly.

### 🚚 Delivery Driver App
- Dedicated interface for drivers to manage lists, update delivery statuses, and handle returns.
- **Franchise System**: Supports multi-store environments with an admin dashboard for consolidated results.

### 🤖 AI Utilities
- **Copilot**: Assistance for data-driven decision making.
- **Support AI**: Automated responses and store assistance.

---

## 💻 Developer Guide

### Prerequisites
- Node.js (v18+)
- Firebase CLI (for deployment)

### Setup
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Key Scripts
- `npm run lint`: ESLint check.
- `npm run test`: Run unit tests via Vitest.
- `npm run test:ui`: Interactive test environment.

---

## 🛡️ Security & Reliability
- **PWA Ready**: Configured with `vite-plugin-pwa` for offline capabilities and app-like experience.
- **SEO**: Dynamic meta tags and titles managed via `react-helmet-async`.
- **Security Note**: Stripe integration currently uses client-side callbacks for MVP. For production scaling, move to **Webhooks** for payment verification.

---

## 🚀 Deployment
The project is configured for multi-platform hosting:
- **Firebase**: Run `firebase deploy`.
- **Vercel**: Pre-configured via `vercel.json`.
- **Mobile**: Use Capacitor commands (`npx cap add ios`, `npx cap add android`) to sync and build native apps.

---

## 🆘 Support
For support and mastery of the tool, refer to the [USER_GUIDE.md](./USER_GUIDE.md) or use the in-app WhatsApp support link.

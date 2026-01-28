---
description: Comprehensive End-to-End Test for BayIIn PWA
---
# Global PWA Test Scenario

This workflow covers the critical paths of the Commerce SaaS application, ensuring all core features work as expected.

## 1. Environment Setup
// turbo
1. Start the development server
```bash
npm run dev
```

## 2. Authentication & Onboarding
   - **Signup**:
     - Visit `/signup`.
     - Create a user with email `verify_[TIMESTAMP]@test.com`.
     - **Verify**: Redirects to `/onboarding`.
   - **Onboarding**:
     - Store Name: "Verification Store".
     - Currency: "USD" (Default).
     - Submit.
     - **Verify**: Redirects to `/dashboard`.
     - **Verify**: URL is now `/dashboard` and no "Permission denied" errors.

## 3. Core Store Operations
   - **Products**:
     - Go to `/products`.
     - Add Product: "Test Product A", Price: 100, Stock: 50.
     - Add Product: "Test Product B", Price: 200, Stock: 20.
     - **Verify**: Products listed correctly.
   - **Settings**:
     - Go to `/settings`.
     - Change Currency to "MAD".
     - **Verify**: Toast "Currency updated".
   - **Orders**:
     - Go to `/orders`.
     - Create Order:
       - Client: "Test Client 1", Phone: "0600123456".
       - Product: "Test Product A".
       - **Verify**: calculated total is "100 MAD" (Currency reflected).
       - Save.
     - **Verify**: Order appears in list with "Nouveau" status.

## 4. Multi-Store & Permissions
   - **Create Second Store**:
     - Use Sidebar "Switch Store" -> "Create New Store" (if available) OR go to `/onboarding` manually (if supported) or logout/signup again (Multi-store UI is pending full implementation check).
     - *Alternative*: Just Switch Store context if multiple exist.
   - **Logout/Login**:
     - Logout.
     - Login with `verify_[TIMESTAMP]@test.com`.
     - **Verify**: Redirects **DIRECTLY** to `/dashboard` (skips onboarding).

## 5. Finances & Analytics
   - Go to `/finances`.
   - **Verify**:
     - "Total Income" shows "0 MAD".
     - "Net Profit" shows values based on the order (if paid).
     - No white screen or "Internal Assertion Failed".

## 6. Mobile Responsiveness (Manual Check)
   - Resize browser to mobile width (375px).
   - Check Sidebar turns into Hamburger menu.
   - Check Order Cards are visible and not overflowing horizontally.

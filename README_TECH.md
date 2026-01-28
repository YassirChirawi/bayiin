# Technical Documentation

> [!IMPORTANT]
> **Launch Status**: Ready for MVP / Beta.
> **Critical Note on Payments**: The current Stripe integration uses **Payment Links** with a client-side success callback (`?success=true`). This is functional but **insecure** against malicious users who might manually navigate to this URL. For a scaled production release, this **must** be replaced with server-side Webhooks.

## 1. Architecture Overview

- **Frontend**: React 19 + Vite (SPA)
- **Language**: JavaScript (ESModule)
- **Styling**: TailwindCSS 4 (Vanilla CSS patterns in components)
- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Firebase Auth (managed via context)
- **Hosting**: Configured for Firebase Hosting (`firebase.json`) or Vercel (`vercel.json`)

## 2. Key Integrations

### Stripe (Payments)
- **File**: `src/lib/stripeService.js`
- **Method**: Hosted Payment Links.
- **Flow**:
  1. User selects plan in `Settings.jsx`.
  2. Redirected to Stripe Payment Link (configured with `client_reference_id`).
  3. User pays on Stripe.
  4. Redirected back to `/settings?success=true`.
  5. `Settings.jsx` detects query param and updates Firestore `stores/{id}` with `plan: 'pro'`.

### WhatsApp (Notifications)
- **File**: `src/utils/whatsappTemplates.js`
- **Configuration**:
  - Templates stored in Firestore `stores/{id}` field `whatsappTemplates`.
  - Supports dynamic variables: `[Client]`, `[Commande]`, etc.
  - Multi-language support (French/Darija) toggleable in Settings.

### Biometrics
- **File**: `src/hooks/useBiometrics.js`
- **Tech**: Web Authentication API (WebAuthn) / Platform Authenticator.
- **Usage**: Optional app lock mechanism for local device security.

## 3. Deployment Pipeline

### CI/CD
- **Provider**: GitHub Actions
- **Config**: `.github/workflows/ci.yml`
- **Triggers**: Push/PR to `main`.
- **Steps**:
  1. `npm ci` (Install dependencies)
  2. `npm run lint` (ESLint) - *Note: Configured to continue on error for now.*
  3. `npm run build` (Vite Build)

### Manual Deployment
To deploy manually to Firebase:
```bash
npm run build
firebase deploy
```

## 4. Known Limitations (MVP)
1.  **Payment Security**: Client-side activation (as noted above).
2.  **Scalability**: Financial stats in `Finances.jsx` and Dashboard are calculated effectively but may need cloud functions for aggregation if order volume exceeds 10k+.
3.  **Permissions**: "Staff" role has limited access, but Firestore rules should be regularly audited to ensure strict enforcement.

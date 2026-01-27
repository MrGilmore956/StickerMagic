# Implementation Plan - Production Readiness Refinement

This plan outlines the steps to remove demo/mock logic, harden security, and optimize the Saucy AI application for a production-ready environment.

## Goal
- Eliminate all local storage-based "mock" modes.
- Implement production-standard build processes (Tailwind CSS).
- Harden Firestore security rules and analytics tracking.
- Fix UI stability issues (React key warnings).

## Phase 1: Tooling & Infrastructure (Build Optimization)
- [ ] **Tailwind CSS Installation**:
    - Uninstall/Remove `<script src="https://cdn.tailwindcss.com"></script>` from `index.html`.
    - Install `tailwindcss`, `postcss`, and `autoprefixer` as devDependencies.
    - Initialize Tailwind configuration (`npx tailwindcss init -p`).
    - Move custom styles from `index.html` to `index.css`.
- [ ] **Environment Variables**:
    - Ensure all services use `import.meta.env.VITE_...` for API keys and configuration.
    - Standardize fallback behavior for missing keys (user prompt vs. silent failure).

## Phase 2: Service Hardening (Removing Mocks)
- [ ] **`authService.ts`**:
    - Remove the `admin@saucy.com` hardcoded bypass in `signInWithEmail`.
    - Remove the `isMockAdminActive` function and its usage.
    - Ensure `initAuthListener` only relies on Firebase auth state.
- [ ] **`showdownService.ts`**:
    - Remove `isMockMode` and all hardcoded `MOCK_SHOWDOWN` data.
    - Ensure casting votes and fetching showdowns always hit Firestore or return empty states if unauthenticated/offline.
- [ ] **`analyticsService.ts`**:
    - Remove `isMockAdminActive` and all hardcoded mock stats.
    - Validate that analytics tracking doesn't crash if Firestore is unreachable (silent failure in production).
- [ ] **`geminiService.ts`**:
    - Remove `isDemo` checks and simulated text removal logic.
    - Update models to the latest production versions (e.g., `gemini-2.0-flash` or `gemini-2.0-pro`).
    - Implement robust error handling for API failures (showing user-friendly error messages).

## Phase 3: Security & Data Integrity
- [ ] **Firestore Rules (`firestore.rules`)**:
    - **Analytics**: Change `allow read: if true` to `allow read: if is_admin`.
    - **Showdown**: Tighten `allow create, delete` to `is_admin`.
    - **Users**: Ensure user profiles are properly protected.
    - Define a `is_admin` helper function in rules (checking a `role` field in the user document).
- [ ] **Data Cleanup**:
    - Fix React key warnings in `HomePage.tsx` (ensure `gif.id` is truly unique or use a composite key).
    - investigate and address `ERR_NAME_NOT_RESOLVED` for Klipy assets (check if certain subdomains are blocked or if the service is down).

## Phase 4: Validation & Testing
- [ ] Verify build succeeds with `npm run build`.
- [ ] Test the application flow as a guest, a logged-in user, and an admin.
- [ ] Check console for any remaining demo-mode warnings or errors.

## Next Steps
1. User reviews and approves this plan.
2. Begin Phase 1 (Tailwind optimization).
3. Systematically prune mocks from services.

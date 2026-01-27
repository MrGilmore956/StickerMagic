# Implementation Plan: Detailed Admin Analytics Workflow

## Goal
Implement and document the end-to-end workflow for administrators to monitor user engagement and content performance using granular download metadata.

## Phase 1: Data Infrastructure (Completed)
- [x] Update `analyticsService.ts` to support detailed `DownloadEvent` logging.
- [x] Create Firestore collection `downloads` for granular event storage.
- [x] Add `getRecentDownloads` query with descending timestamp ordering.
- [x] Implement Mock Data support for Demo/Bypass mode.

## Phase 2: User-Facing Tracking (Completed)
- [x] Update `HomePage.tsx` to pass GIF title and user context to `trackDownload`.
- [x] Update `SauceBox.tsx` to ensure personal favorites downloads are tracked with user IDs.

## Phase 3: Admin UI Integration (Completed)
- [x] Integrate `Clock`, `User`, and `Mail` icons into `Analytics.tsx`.
- [x] Build the **Recent Downloads** responsive table component.
- [x] Implement real-time data fetching for the analytics dashboard.
- [x] **Accomplishment**: Finalized homepage UI refinements (Compact Categories, Top-VS Showdown).

## Phase 4: Documentation & Stability (Completed)
- [x] Create `docs/admin/workflow_guide.md`.
- [x] Create `docs/admin/accomplishments_and_next_steps.md`.
- [x] Implement `mockAdminMode` for stable UI development during Firestore outages.

## Phase 5: Score Integration & Persistence (Next)
- [ ] Connect "Sauce Sense" score to showdown voting.
- [ ] Resolve Firestore permission errors (`permission-denied`).
- [ ] Verify Firestore index requirements for complex analytics queries.

## Risk Assessment
- **Privacy**: Ensure user emails are only visible to authorized admins (Handled by Admin Portal auth guard).
- **Scale**: The `downloads` collection could grow rapidly; implementation of a TTL (Time-To-Live) or archival policy for old logs is recommended for Phase 5.

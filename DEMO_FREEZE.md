# Final demo feature set — 14 November 2026

This is the final feature set selected for the hackathon demo. The annotated
Git tag `demo-final-2026-11-14` identifies the matching frontend and backend snapshot.
Further work before the demo should be limited to essential bug fixes.

Included: signup/sign-in, group creation, discovery and matching, swipe interest,
creator approval, shared group workspace, hotel search/save/compare, mock group
booking and cost split (M1–M6), shared-interest/gender filters (G1), traveller
profiles and permitted group visibility (G2), and persistent group chat (S1).
Friends and the teammate's itinerary/maps implementation are included.

Verification: 207 backend tests, four frontend tests, TypeScript check, frontend
production build, and a live two-traveller booking/chat flow passed. Map tiles,
three itinerary places, booked hotel pin and map controls were checked in-browser.

Bookings are demo confirmations without payments or external reservations.
Map tiles and place lookups require network access. Group visibility follows the
current friends-or-shared-group-member policy; strangers cannot view memberships.

Run the frontend on port 5173 and backend on port 8000. Keep local environment
files private; the backend requires its database connection and authentication secret.


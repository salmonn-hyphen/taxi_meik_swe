# Context

We are building a taxi booking system called "Taxi Meik SWE".
Tech Stack: React, TypeScript, Vite, Node.js, Express, Prisma (Neon DB), and Better Auth.

# Task Goal

Implement the UI and Backend logic to "Unlock" the My Bookings feature for Drivers once their KYC status is APPROVED.

# 1. Frontend Implementation Requirements (UI & Routing)

Update the Sidebar and the My Bookings Page based on the user's `kycStatus`.

**File 1: Sidebar Navigation (`frontend/src/components/.../Sidebar.tsx` or similar)**

- Access the current user's data (specifically `kycStatus`) from the Better Auth session context.
- Locate the "My Booking" navigation link.
- **Logic:** - If `kycStatus === 'APPROVED'`: Remove the lock icon, make the link fully clickable, and allow navigation to `/driver/bookings`.
  - If `kycStatus !== 'APPROVED'`: Show the lock icon. If they click it, either redirect them to the KYC page or show a toast saying "Please complete KYC first."

**File 2: My Bookings Page (`frontend/src/features/driver/MyBookingsPage.tsx`)**

- We previously added a block UI here. Ensure the logic works perfectly:
  - Fetch user session.
  - If `kycStatus === 'APPROVED'`, remove the blocked state and render the actual list/table of their bookings. Make a mock layout for the booking list if the API isn't ready yet.

# 2. Backend Implementation Requirements (API Security)

Ensure the API endpoints for fetching bookings are protected at the server level.

**File: Middleware (`backend/middleware/kycAuth.ts` or similar)**

- Create a new middleware function `requireApprovedKYC`.
- This middleware should check if the logged-in user has `kycStatus === 'APPROVED'`.
- If not, return a `403 Forbidden` error with a message: "KYC verification required to access this resource."

**File: Booking Routes (`backend/routes/.../bookingRoutes.ts`)**

- Apply the `requireApprovedKYC` middleware to endpoints like `GET /api/driver/bookings` or any action where a driver requests or manages a booking.

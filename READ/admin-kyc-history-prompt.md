# Context

We are building a taxi booking system called "Taxi Meik SWE".
Tech Stack: React, TypeScript, Vite, Node.js, Express, Prisma (Neon DB), and Better Auth.
Backend Architecture: Layered Architecture (Routes -> Controllers -> Services -> Repositories).

# Task Goal

Enhance the "Admin KYC Review" feature by adding a "History" tab.
Currently, the Admin can only see drivers with a `PENDING` or `SUBMITTED` KYC status. I want to save and view the history so the Admin can also see drivers who have already been `APPROVED` or `REJECTED`.

# 1. Backend Implementation Requirements (Admin API)

Update the backend code to fetch all drivers regardless of their KYC status, or create endpoints to fetch by status.

**Files to Create/Modify:**

1. **Repository (`backend/respositry/adminRespositry.ts` or `driverRespositry.ts`):**
   - Keep the existing `getPendingKYCDrivers()` (fetching `SUBMITTED`).
   - Add a new function `getKYCHistoryDrivers()`: Fetch all users/drivers where `kycStatus` is `APPROVED` or `REJECTED`. Return necessary fields including the documents, updated dates, and their final status.
2. **Service (`backend/service/adminService.ts`):**
   - Add the corresponding business logic for `getKYCHistoryDrivers`.
3. **Controller (`backend/controller/admin/adminController.ts`):**
   - Create `getKYCHistory` to return the approved and rejected list.
4. **Routes (`backend/routes/admin/apiRoutes.ts`):**
   - Add `GET /api/admin/verifications/drivers/history` (Protected by Admin Auth).

# 2. Frontend Implementation Requirements (Admin Dashboard)

Update the React code for the Admin Verify Drivers Page to include a Tab system.

**Location:** `frontend/src/features/admin/VerifyDriversPage.tsx`
**Requirements:**

- Implement a Tabs interface (e.g., using Radix UI Tabs or a custom implementation with "Pending" and "History" tabs).
- **"Pending" Tab:** Keep the existing logic. Fetch and display drivers who need review (`GET /api/admin/verifications/drivers`).
- **"History" Tab:** Fetch data from `GET /api/admin/verifications/drivers/history` on mount or when the tab is clicked.
- In the History Tab:
  - Display the drivers in a table or list format.
  - Show their final status prominently (e.g., a green "Approved" badge or a red "Rejected" badge).
  - Make the row clickable to open a Detail View (similar to the review modal, but read-only). The admin can see the uploaded documents and the decision made, but cannot change the status again from this view.

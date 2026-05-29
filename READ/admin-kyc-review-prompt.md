# Context

We are building a taxi booking system called "Taxi Meik SWE".
Tech Stack: React, TypeScript, Vite, Node.js, Express, Prisma (Neon DB), and Better Auth.
Backend Architecture: Layered Architecture (Routes -> Controllers -> Services -> Repositories).

# Task Goal

Implement the "Admin KYC Review" feature.
The Admin needs to view drivers who have submitted their KYC documents, inspect the images, and either Approve or Reject them. The Driver dashboard must reflect this Pending/Approved/Rejected status.

# 1. Backend Implementation Requirements (Admin API)

Generate the backend code to fetch pending drivers and update their KYC status.

**Files to Create/Modify:**

1. **Repository (`backend/respositry/adminRespositry.ts` or `driverRespositry.ts`):**
   - Create `getPendingKYCDrivers()`: Fetch all users/drivers where `kycStatus === 'SUBMITTED'`. Return necessary fields including the 4 document URLs (`nrcFrontUrl`, `nrcBackUrl`, `selfieUrl`, `drivingLicenseUrl`).
   - Create `updateDriverKYCStatus(driverId, status, rejectionReason?)`: Update the `kycStatus` to 'APPROVED' or 'REJECTED'.
2. **Service (`backend/service/adminService.ts`):**
   - Handle the business logic for fetching and updating.
3. **Controller (`backend/controller/admin/adminController.ts`):**
   - Create `getPendingVerifications` to return the list.
   - Create `reviewDriverKYC` to handle the Approve/Reject payload from the admin.
4. **Routes (`backend/routes/admin/apiRoutes.ts`):**
   - Add `GET /api/admin/verifications/drivers` (Protected by Admin Auth).
   - Add `PUT /api/admin/verifications/drivers/:id` (Protected by Admin Auth).

# 2. Frontend Implementation Requirements (Admin Dashboard)

Generate the React code for the Admin to review these documents.

**Location:** `frontend/src/features/admin/VerifyDriversPage.tsx`
**Requirements:**

- Fetch data from `GET /api/admin/verifications/drivers` on mount.
- If the list is empty, show the "All clear - No pending drivers verifications" empty state.
- If there are pending drivers, display them in a list or table.
- Create a Detail Modal or View when clicking on a driver:
  - Display the 4 uploaded images clearly (NRC Front, NRC Back, Selfie, License).
  - Provide two action buttons: "Approve" (Green) and "Reject" (Red).
  - If "Reject" is clicked, optionally prompt for a short rejection reason.
- On action, send a PUT request to the backend and show a Success Toast, then remove the driver from the pending list.

# 3. Frontend Implementation Requirements (Driver Dashboard)

Generate the React code for the Driver's Pending State.

**Location:** `frontend/src/features/driver/KYCPendingPage.tsx`
**Requirements:**

- If the driver's `kycStatus === 'SUBMITTED'`, show a "Verification Pending" UI with a clock icon.
- Include a message: "Your identity documents have been submitted and are currently under review by our administration."
- Add a "Refresh Status" button that refetches the user profile to check if the Admin has approved them yet.

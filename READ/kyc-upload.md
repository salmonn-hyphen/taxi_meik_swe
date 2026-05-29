# Context

We are building a taxi booking system called "Taxi Meik SWE".
Tech Stack: React, TypeScript, Vite, Node.js, Express, Prisma (Neon DB), and Better Auth.
Backend Architecture: Layered Architecture (Routes -> Controllers -> Services -> Repositories).

# Task Goal

Implement the "KYC Document Upload" feature for Drivers and enforce KYC verification checks on protected pages like "My Bookings".

# 1. Backend Implementation Requirements

Generate the backend code to handle multipart/form-data for image uploads and update the driver's KYC status.

**Target Fields to Update in Prisma Schema (DriverProfile/User):**

- `nrcFrontUrl` (String)
- `nrcBackUrl` (String)
- `selfieUrl` (String)
- `drivingLicenseUrl` (String)
- `kycStatus` (Enum/String: PENDING, SUBMITTED, APPROVED, REJECTED)

**Requirements:**

1. **Middleware:** Set up `multer` to handle multiple file uploads in memory.
2. **Cloud Storage (Service Layer):** Provide a placeholder or implementation using a cloud service (e.g., Cloudinary or S3) to upload the buffers and return URLs.
3. **Repository (`backend/respositry/driverRespositry.ts`):** - Create `submitKYCDocuments(driverId, urls)` to update the database with the generated URLs and change `kycStatus` to "SUBMITTED".
4. **Service (`backend/service/driverService.ts`):** - Handle the logic of receiving files, uploading them to the cloud, and passing the URLs to the repository.
5. **Controller (`backend/controller/admin/driverController.ts`):** - Extract files from `req.files`. Validate that all 4 required files exist and do not exceed 5MB.
6. **Routes:** `POST /api/driver/kyc/upload` using Better Auth middleware to protect it.

# 2. Frontend Implementation Requirements

Generate the React code for the KYC Upload Page and the Protected Route Logic.

**File 1: KYC Upload Page (`frontend/src/features/driver/KYCPage.tsx`)**

- Create a form matching my UI with 4 separate drag-and-drop/browse zones (NRC Front, NRC Back, Selfie, Driving License).
- Manage the state for these 4 files.
- On submit, append the files to a `FormData` object and send a POST request to `/api/driver/kyc/upload` via Axios/fetch.
- Show uploading state (loaders) and Success/Error Toasts.
- Once submitted, change the UI to a "Pending Approval" state so they cannot re-upload immediately.

**File 2: Route Guarding (`frontend/src/features/driver/MyBookingsPage.tsx`)**

- Fetch the user's `kycStatus` via Better Auth session or user API.
- If `kycStatus !== 'APPROVED'`, render a blocked UI state with a shield icon, saying: "KYC Verification Required. Please complete your identity verification to access My Booking." and a "Go to KYC" button that redirects to the KYC page.
- If approved, render the actual bookings list.

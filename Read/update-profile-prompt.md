# Context

We are building a taxi booking system called "Taxi Meik SWE".
Tech Stack: React, TypeScript, Node.js, Express, Prisma (Neon DB), and Better Auth.
Backend Architecture: Layered Architecture (Routes -> Controllers -> Services -> Repositories).

# Task Goal

Implement the "Update Profile" feature for the Driver.
The Driver should be able to update their Name, Phone Number, and Password from the Driver Dashboard Frontend, and the Backend should process this update securely.

# 1. Backend Implementation Requirements

Please generate the code for the backend following our existing architecture.

**Target Fields to Update:**

- `name` (String)
- `phone` (String)
- `password` (String, needs to be hashed before saving, or handled via Better Auth's password update method).

**Files to Create/Modify:**

1. **Repository:** `backend/respositry/driverRespositry.ts`
   - Create a function `updateDriverProfile(userId, updateData)`.
   - Use Prisma to update the user/driver record.
2. **Service:** `backend/service/driverService.ts` (Create if it doesn't exist)
   - Create a function to handle business logic. If a new password is provided, ensure it is securely processed (hashed) before sending it to the repository.
3. **Controller:** `backend/controller/admin/driverController.ts` (or `backend/controller/driverController.ts` if separated)
   - Create `updateProfile` method to extract `name`, `phone`, and `password` from `req.body`.
   - Validate input and call the Service layer.
4. **Routes:** `backend/routes/...`
   - Add a `PUT /api/driver/profile` route and protect it with our Better Auth middleware to ensure only the logged-in driver can update their profile.

# 2. Frontend Implementation Requirements

Please generate the React code for the Frontend Profile Page.

**Location:** `frontend/src/features/driver/ProfilePage.tsx` (or similar depending on routing).

**Requirements:**

- Build a clean, modern form with 3 fields: Name, Phone Number, and New Password.
- Fetch the current user's data on component mount and pre-fill the Name and Phone Number fields.
- Leave the New Password field blank (only fill if the user wants to change it).
- Add validation (e.g., minimum password length).
- Make an API call to `PUT /api/driver/profile` using Axios or fetch.
- Show a Success Toast when updated successfully, and an Error Toast if it fails.

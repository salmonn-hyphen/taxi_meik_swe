# Current Project State

This document tracks the current implementation state of the frontend and backend systems.

## 1. Backend Progress

### Authentication & Registration
- **Better Auth Integration**: Basic setup is complete and routing properly through `/api/auth/*`.
- **OTP Registration Flow**:
  - `POST /api/register-request`: Accepts phone and user details, generates a 6-digit OTP, stores it in the `Verification` table, and simulates sending SMS by printing to the terminal.
  - `POST /api/register-verify`: Validates the OTP against the database and creates the actual user via `auth.api.signUpEmail`.
- **Database**: Switched from `PrismaNeon` to standard `PrismaPg` to support local PostgreSQL development. The `schema.prisma` file has been synced.
- **SMS Gateway**: Twilio integration is currently planned but pending user credentials. OTPs are retrievable via the `scripts/show-otp.ts` tool.

### API Routes
- Core CRUD routes for cars, bookings, contracts, and payments are designed in `api_and_state_design.md` but are **not yet implemented**.

## 2. Frontend Progress

### Routing & Layouts
- **React Router Setup**: Complete with `PublicLayout`, `AuthLayout`, and `DashboardLayout`.
- **Route Guards**:
  - `ProtectedRoute`: Prevents unauthenticated access to dashboards and enforces Role-Based Access Control (RBAC).
  - `GuestRoute`: Redirects authenticated users away from public landing/login pages directly to their respective dashboards.
- **Role Mapping**: The `UserRole` enum is correctly mapped to Prisma's uppercase strings (`OWNER`, `DRIVER`, `ADMIN`), fixing previous navigation rendering issues.

### Dashboards & UI
- **Public Pages**: Landing, About, Contact, and Browse Cars are mapped. Dynamic Navbar adapts based on authentication status.
- **Owner Dashboard (`OwnerDashboardPage.tsx`)**: UI is built and fully mocked in `ownerApi.ts`. It displays simulated statistics, monthly earnings charts, and recent bookings.
- **Driver Dashboard (`DriverDashboardPage.tsx`)**: UI is built and fully mocked in `driverApi.ts`. It displays simulated active bookings, verification progress, and recommended cars.
- **Registration Form (`RegisterPage.tsx`)**: Successfully connected to the backend OTP flow, including a modal for entering the 6-digit code.

## 3. Immediate Next Steps
1. **Twilio SMS**: Awaiting Twilio `.env` credentials to finalize real SMS sending.
2. **Backend Controllers**: Build out the actual Postgres queries for the Owner and Driver dashboard APIs to replace the frontend mocks.
3. **Admin Dashboard**: Build out the admin UI and backend endpoints for approving verifications and monitoring system health.

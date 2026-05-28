# Database & API Integration Design

Following the changes applied to the database schema, this document outlines the current state of the database tables, enums, and details the backend API routes and frontend state flows required to implement the complete user journey.

---

## 1. Database Schema State

The PostgreSQL database currently contains the following tables and relationships (synced via Prisma):

```mermaid
erDiagram
    users ||--o{ cars : "owns"
    users ||--o{ bookings : "rents (as driver)"
    users ||--o{ bookings : "leases (as owner)"
    users ||--o{ payments : "makes"
    users ||--o{ payments : "approves (as admin)"
    users ||--o{ disputes : "raises"
    users ||--o{ disputes : "resolves (as admin)"
    users ||--o? driver_profiles : "has"
    users ||--o{ negotiation_histories : "submits"
    
    cars ||--o{ bookings : "has"
    cars ||--o{ inspections : "undergoes"
    cars ||--o{ reviews : "receives"
    
    bookings ||--o? deposits : "requires"
    bookings ||--o? contracts : "generates"
    bookings ||--o{ payments : "accrues"
    bookings ||--o{ inspections : "requires"
    bookings ||--o{ disputes : "raises"
    bookings ||--o{ negotiation_histories : "contains"
```

### Core Tables & Columns

| Table | Primary Key | Critical Fields | Key Enums / Types |
| :--- | :--- | :--- | :--- |
| **users** | `id` (String) | `email`, `phone`, `role`, `verificationStatus`, `isVerified` | `Role` (ADMIN, OWNER, DRIVER)<br>`VerificationStatus` (PENDING, APPROVED, REJECTED) |
| **driver_profiles** | `id` (String) | `userId` (FK), `licenseNumber`, `documentUrl`, `taxiLicenseNumber`, `taxiLicenseUrl`, `status` | `VerificationStatus` |
| **cars** | `id` (String) | `ownerId` (FK), `dailyRate`, `depositAmount`, `status`, `verificationStatus` | `CarStatus` (AVAILABLE, RENTED, UNDER_INSPECTION, MAINTENANCE, INACTIVE)<br>`VerificationStatus` |
| **bookings** | `id` (String) | `carId` (FK), `driverId` (FK), `ownerId` (FK), `proposedDailyRate`, `agreedDailyRate`, `proposedDeposit`, `agreedDeposit`, `rentalTerms`, `status` | `BookingStatus` (PENDING, REJECTED, NEGOTIATING, TERMS_AGREED, CONTRACT_PENDING, CONTRACT_SIGNED, PAYMENT_PENDING, PAYMENT_UNDER_REVIEW, PAID, ACTIVE, COMPLETED, CANCELLED, DISPUTED) |
| **negotiation_histories**| `id` (String) | `bookingId` (FK), `offeredById` (FK), `offeredDailyRate`, `offeredDeposit`, `terms` | |
| **contracts** | `id` (String) | `bookingId` (FK, Unique), `content`, `contractUrl`, `driverSigned`, `ownerSigned`, `status` | `ContractStatus` (PENDING, SIGNED, ACTIVE, EXPIRED, TERMINATED) |
| **payments** | `id` (String) | `bookingId` (FK), `userId` (FK), `amount`, `receiptPhotoUrl`, `status`, `verifiedById` | `PaymentStatus` (PENDING, COMPLETED, FAILED, REFUNDED)<br>`PaymentType` (RENTAL_FEE, DEPOSIT, DEPOSIT_REFUND, PENALTY) |

---

## 2. Required Backend API Endpoints

To implement the step-by-step logic of the application, the following RESTful API endpoints need to be added to the backend code (`backend/src/index.ts` or routes):

### Auth & Verification APIs
- **`POST /api/auth/register`**: Registers a user, specifying their role (`OWNER` or `DRIVER`). Inserts into `users` table and triggers verification.
- **`POST /api/auth/driver-profile`**: Allows Drivers to upload driver license and taxi documents. Updates `driver_profiles` table.
- **`GET /api/admin/pending-verifications`**: Allows Admins to fetch users and driver profiles awaiting approval.
- **`PUT /api/admin/verify-user/:id`**: Allows Admins to approve/reject user registration and driver licenses.

### Car Management APIs
- **`POST /api/cars`**: Allows Owners to list a car (daily rate, registration URL, photos). Inserts into `cars` table with status `PENDING`.
- **`GET /api/admin/pending-cars`**: Admins list cars waiting for verification.
- **`PUT /api/admin/verify-car/:id`**: Admins approve/reject car list.
- **`GET /api/cars`**: Drivers browse approved, available cars (`verificationStatus == APPROVED`, `status == AVAILABLE`).

### Booking & Negotiation APIs
- **`POST /api/bookings`**: Driver requests a booking. Inserts into `bookings` table with status `PENDING` and saves initial `proposedDailyRate` and `proposedDeposit`.
- **`POST /api/bookings/:id/negotiate`**: Either Owner or Driver makes a counter-offer. 
  - Adds an entry to `negotiation_histories`.
  - Updates `agreedDailyRate`, `agreedDeposit`, or `rentalTerms` on `bookings`.
  - Sets `bookings.status` to `NEGOTIATING`.
- **`POST /api/bookings/:id/accept`**: Owner accepts the request or terms. Sets status to `TERMS_AGREED` and triggers AI E-Contract generation.
- **`POST /api/bookings/:id/reject`**: Owner rejects request. Sets status to `REJECTED`.

### E-Contract & Payments APIs
- **`POST /api/bookings/:id/contract/generate`**: Internal/External AI service triggers. Creates a PDF, inserts text terms into `contracts` table, and sets booking status to `CONTRACT_PENDING`.
- **`POST /api/bookings/:id/contract/sign`**: Driver or Owner signs the contract. 
  - Updates `driverSigned` or `ownerSigned` boolean.
  - When both sign, sets contract status to `SIGNED` and booking status to `PAYMENT_PENDING`.
- **`POST /api/bookings/:id/payment/upload`**: Driver uploads a receipt photo (`receiptPhotoUrl`). Creates a `payments` record with type `DEPOSIT` or `RENTAL_FEE` and status `PENDING`. Sets booking status to `PAYMENT_UNDER_REVIEW`.
- **`PUT /api/admin/payments/:id/verify`**: Admin approves/rejects payment receipt. 
  - If approved, sets payment status to `COMPLETED` and booking status to `PAID` -> changes to `ACTIVE` upon handover.
  - Updates car status to `RENTED`.

---

## 3. Frontend State Flow Mapping

The frontend should monitor and transitions views based on the `Booking.status` field:

```
[Driver Booking Request] 
      │ (status: PENDING)
      ▼
[Owner Reviews] ──(Rejects)──► [REJECTED (End)]
      │ (Accepts to Negotiate)
      ▼
[Negotiation Chat & Counter-Offers] (status: NEGOTIATING)
      │ (Both agree)
      ▼
[AI E-Contract Generation] (status: CONTRACT_PENDING)
      │ (Both sign)
      ▼
[Awaiting Payment Receipt] (status: PAYMENT_PENDING)
      │ (Driver uploads receipt)
      ▼
[Admin Reviewing Payment] (status: PAYMENT_UNDER_REVIEW)
      │ (Admin approves)
      ▼
[Handover Complete & Active Rental] (status: ACTIVE)
```

1. **Owner Dashboard**: Show pending applications. If accepted, redirect to a "Negotiation Lobby" with pricing sliders (daily rate, deposit, terms).
2. **AI E-Contract View**: When status is `CONTRACT_PENDING`, show legal contract text (returned from `Contract.content`) and a canvas/checkbox for signatures.
3. **Payment Step**: When status is `PAYMENT_PENDING`, show QR code/account info for payment transfer and an image upload component for the receipt.
4. **Active Dashboard**: Once status is `ACTIVE`, show rental counters, GPS locator link, and option to raise a `Dispute` or request an `Inspection`.

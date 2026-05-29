# Taxi & Car Rental Platform - Backend API 🚕

This is the backend API for a comprehensive Taxi and Car Rental platform, built with Node.js, Express, and Prisma. The system supports a multi-role architecture allowing Car Owners to rent out their vehicles and Drivers to book them, overseen by an Admin panel.

## 🚀 Tech Stack

- **Framework:** Node.js with Express.js
- **Database:** PostgreSQL (NeonDB)
- **ORM:** Prisma
- **Authentication:** Better Auth (with Custom OTP implementation)
- **Language:** TypeScript

## 🌟 Core Features

- **Role-Based Access Control (RBAC):** Distinct flows for `ADMIN`, `OWNER`, and `DRIVER`.
- **Custom OTP Verification:** Mobile number verification via SMS OTP before account creation.
- **KYC & Document Verification:** Secure upload and admin-approval flows for NRC and Driver's Licenses.
- **Car Management:** Owners can list cars, upload images, and set pricing (Daily, Weekly, Monthly) & availability.
- **Booking System:** End-to-end booking application flow (Driver applies -> Owner Approves -> Admin Approves -> Agreements).
- **Financial Management:** Handling of Booking Payments and Security Deposits with admin verification.
- **Notification System:** Real-time internal alerts for booking statuses, payments, and document approvals.

## 📁 Folder Structure

The project follows a modular architecture for scalability and maintainability:

```text
backend/
├── controller/      # Business logic (e.g., authController.ts, carController.ts)
├── middleware/      # Express middlewares (e.g., multer upload handling)
├── routes/          # API endpoints (e.g., authRoutes.ts, carRoutes.ts)
├── repositry/       # Database queries and data access layer
├── service/         # Complex business operations and third-party integrations
├── prisma/          # Database schemas and migrations
├── scripts/         # Utility scripts (e.g., database seeding)
├── uploads/         # Static files (KYC documents, payment screenshots)
└── src/
    └── index.ts     # Main Express application entry point
```

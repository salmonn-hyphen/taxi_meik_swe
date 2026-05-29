import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';

// Route imports
import driverRouter from '../routes/driverRoutes.js';
import adminRouter from '../routes/admin/apiRoutes.js';
import ownerRouter from '../routes/ownerRoutes.js';
import userRouter from '../routes/userRoutes.js';
import authRouter from '../routes/authRoutes.js';
import carRouter from '../routes/carRoutes.js';
import bookingRouter from '../routes/bookingRoutes.js';
import paymentRouter from '../routes/paymentRoutes.js';
import depositRouter from '../routes/depositRoutes.js';
import agreementRouter from '../routes/agreementRoutes.js';
import notificationRouter from '../routes/notificationRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const paymentUploadDir = path.resolve(__dirname, '../uploads/payments');
fs.mkdirSync(paymentUploadDir, { recursive: true });

const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
]);

// Enable CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: "80mb" }));

// Static file serving
app.use('/uploads/kyc', express.static(path.resolve(__dirname, '../uploads/kyc')));
app.use('/uploads/payments', express.static(paymentUploadDir));

// Mount routes
app.use("/api/driver", driverRouter);
app.use("/api/admin", adminRouter);
app.use("/api/user", userRouter);
app.use("/api/owner", ownerRouter);
app.use("/api", authRouter);
app.use("/api", carRouter);
app.use("/api", bookingRouter);
app.use("/api", paymentRouter);
app.use("/api", depositRouter);
app.use("/api", agreementRouter);
app.use("/api", notificationRouter);

// Better Auth Route Handler (catch-all — must come LAST)
app.all("/api/auth/*splat", toNodeHandler(auth));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

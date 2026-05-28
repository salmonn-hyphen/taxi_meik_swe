import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma.js";

export const baseAuthOptions = {
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    fields: {
      phoneNumber: "phone",
      image: "profilePhoto",
    },
    additionalFields: {
      role: { type: "string" },
      nrcNumber: { type: "string", required: false },
      city: { type: "string", required: false },
      township: { type: "string", required: false },
      address: { type: "string", required: false },
      phoneNumberVerified: { type: "boolean", required: false },
      verificationStatus: { type: "string", required: false },
      isVerified: { type: "boolean", required: false },
    } as const,
  },
  advanced: {
    database: {
      generateId: "uuid" as const,
    },
  },
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
  ],
};

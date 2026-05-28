import { z } from "zod";

const myanmarNrcRegex = /^(1[0-4]|[1-9])\/[A-Z_]{3,10}\([NEPS]\)\d{6}$/;

const phoneSchema = z
  .string()
  .min(9, "Phone number must be between 9 and 15 characters")
  .max(15, "Phone number must be between 9 and 15 characters")
  .regex(/^\+?\d+$/, "Phone number must contain only numbers and optional leading +");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter")
  .regex(/[a-z]/, "Password must include at least one lowercase letter")
  .regex(/[0-9]/, "Password must include at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one special character");

const stringField = z
  .string()
  .trim()
  .min(1, "This field is required")
  .pipe(z.string().transform((val) =>
    val.replace(/<[^>]*>/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
  ));

const nameSchema = z
  .string()
  .trim()
  .min(2, "Full name must be at least 2 characters")
  .regex(/^[A-Za-z\s]+$/, "Name must contain only letters and spaces")
  .pipe(z.string().transform((val) =>
    val.replace(/<[^>]*>/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
  ));

export const loginSchema = z.object({
  email: z.string().email("Invalid email").optional(),
  phone: phoneSchema.optional(),
  password: z.string().min(1, "Password is required"),
}).refine((data) => data.email || data.phone, {
  message: "Email or phone number is required",
  path: ["email"],
});

export const registerRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  phone: phoneSchema,
  password: passwordSchema,
  name: nameSchema,
  role: z.enum(["DRIVER", "OWNER"]),
  nrc_number: z.string().regex(myanmarNrcRegex, "Invalid Myanmar NRC format (e.g., 12/KAMANA(N)123456)").optional(),
  city: stringField.optional(),
  township: stringField.optional(),
  address: stringField.optional(),
  license_number: z.string().min(3, "Invalid license number").optional(),
  years_experience: z.number().min(0).optional(),
});

export const registerVerifySchema = z.object({
  tempToken: z.string().min(1, "Verification token is required"),
  code: z.string().length(6, "OTP code must be exactly 6 digits"),
});

export const getEmailByPhoneSchema = z.object({
  phone: phoneSchema,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export { myanmarNrcRegex, phoneSchema, passwordSchema, stringField, nameSchema };

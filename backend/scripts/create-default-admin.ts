import { auth } from "../src/lib/auth.js";
import prisma from "../src/lib/prisma.js";

async function main() {
  console.log("Creating default Admin...");

  // 1. Clean up existing admin if exists to avoid unique constraint issues
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: "superadmin@gmail.com" },
        { phone: "09972579229" }
      ]
    }
  });

  if (existingUser) {
    console.log(`Found existing user: ${existingUser.email}. Deleting to recreate...`);
    await prisma.user.delete({
      where: { id: existingUser.id }
    });
  }

  // 2. Sign up via better-auth api to properly hash password and create account
  const response = await auth.api.signUpEmail({
    body: {
      email: "superadmin@gmail.com",
      password: "Super123!",
      name: "superadmin",
      role: "ADMIN"
    }
  });

  if (!response?.user) {
    throw new Error("Failed to sign up admin user");
  }

  console.log("Admin account created via Better Auth.");

  // 3. Update user custom fields (phone, verification status, active, etc.)
  const updatedUser = await prisma.user.update({
    where: { id: response.user.id },
    data: {
      phone: "09972579229",
      phoneNumberVerified: true,
      isVerified: true,
      verificationStatus: "APPROVED",
      isActive: true,
      role: "ADMIN"
    }
  });

  console.log("Default Admin successfully created/updated:", updatedUser);
}

main()
  .catch((err) => {
    console.error("Error creating default admin:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

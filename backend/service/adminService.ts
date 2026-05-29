import { getPendingKYCDrivers, updateDriverKYCStatus, getKYCHistoryDrivers } from "../repositry/driverRespository.js";

export async function getSubmittedKYCDrivers() {
  return getPendingKYCDrivers();
}

export async function getKYCHistory() {
  return getKYCHistoryDrivers();
}

export async function reviewDriverKYC(
  driverProfileId: string,
  status: "APPROVED" | "REJECTED",
  rejectionReason?: string
) {
  if (status !== "APPROVED" && status !== "REJECTED") {
    throw new Error("Invalid status. Must be APPROVED or REJECTED.");
  }
  return updateDriverKYCStatus(driverProfileId, status, rejectionReason);
}

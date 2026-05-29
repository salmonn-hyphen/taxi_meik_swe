import { Router } from "express";
import {
  listCars,
  getCarById,
  getOwnerCars,
  createCar,
  updateCar,
  toggleCarAvailability,
  deleteCar,
  getPendingCarVerifications,
  verifyCar,
} from "../controller/api/carController.js";

const router = Router();

// Public routes
router.get("/cars", listCars);
router.get("/cars/:carId", getCarById);

// Owner routes
router.get("/owner/cars", getOwnerCars);
router.post("/owner/cars", createCar);
router.put("/owner/cars/:carId", updateCar);
router.post("/owner/cars/:carId/toggle-availability", toggleCarAvailability);
router.delete("/owner/cars/:carId", deleteCar);

// Admin routes
router.get("/admin/verifications/cars", getPendingCarVerifications);
router.post("/admin/verifications/cars/:carId", verifyCar);

export default router;

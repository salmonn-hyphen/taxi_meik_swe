import { Router } from "express";
import { contactForm } from "../controller/api/contactController.js";

const router = Router();

router.post("/contact", contactForm);

export default router;

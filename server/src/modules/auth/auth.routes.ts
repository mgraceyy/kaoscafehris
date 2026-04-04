import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

// POST /api/auth/login          — authenticate user, return JWT
// POST /api/auth/logout         — clear auth cookie
// GET  /api/auth/me             — get current user profile

router.post("/login", /* authController.login */);
router.post("/logout", authenticate, /* authController.logout */);
router.get("/me", authenticate, /* authController.me */);

export default router;

const express = require("express");
const authController = require("../controllers/authController");
const { registerSchema } = require("../middleware/registerMiddleware");
const { loginSchema } = require("../middleware/loginMiddleware");
const {
  handleValidationErrors,
} = require("../middleware/validationMiddleware");
const authenticateJWT = require("../middleware/authMiddleware");

const authRoutes = express.Router();

authRoutes.post(
  "/register",
  registerSchema,
  handleValidationErrors,
  authController.register
);
authRoutes.get("/verify-email", authController.verifyEmail);
authRoutes.post("/refresh-token", authController.refreshToken);
authRoutes.get("/validate", authController.validate);
authRoutes.post("/login", loginSchema, authController.login);
authRoutes.post("/logout", authenticateJWT, authController.logout);

module.exports = authRoutes;

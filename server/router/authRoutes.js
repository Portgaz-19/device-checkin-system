import express from "express";
import { forgotPassword, login, register, resetPassword } from "../controller/authController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const authRoutes = express.Router();

authRoutes.post("/login", login);
authRoutes.post("/register", register);
authRoutes.post("/forgot-password", forgotPassword);
authRoutes.post("/reset-password", resetPassword);

authRoutes.get("/me", verifyToken, (req, res) => {
  res.json({
    id: req.user.id,
    role: req.user.role,
  });
});



export default authRoutes;

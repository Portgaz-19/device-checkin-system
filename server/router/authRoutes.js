import express from "express";
import { login, register } from "../controller/authController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const authRoutes = express.Router();

authRoutes.post("/login", login);
authRoutes.post("/register", register);

authRoutes.get("/me", verifyToken, (req, res) => {
  res.json({
    id: req.user.id,
    role: req.user.role,
  });
});



export default authRoutes;

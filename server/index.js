import dotenv from "dotenv";
import dns from "dns";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./router/authRoutes.js";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./middleware/errorHandler.js";
import deviceRoutes from './router/deviceRoutes.js';

dns.setServers(["8.8.8.8", "1.1.1.1"]);

dotenv.config();

const PORT = process.env.PORT || 5000;
const URI = process.env.MONGO_URI;

const app = express();



app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(morgan("dev"));
app.use('/api/devices', deviceRoutes);


const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: "Too many attempts, please try again later",
  },
});



app.use("/api/auth", authLimiter, authRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use(errorHandler);

mongoose
  .connect(URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));



app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

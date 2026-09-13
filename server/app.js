import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import authRoutes from "./router/authRoutes.js";
import deviceRoutes from "./router/deviceRoutes.js";
import qrRoutes from "./router/qrRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://localhost:5173/"]
  : ["http://localhost:5173/"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json());
app.use(helmet());
app.use(morgan("dev", { skip: () => process.env.NODE_ENV === "test" }));
app.use("/api/devices", deviceRoutes);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: "Too many attempts, please try again later",
  },
});

// The brute-force limiter is deliberately skipped in tests so the integration
// suite does not trip the in-memory 20-requests/15min window. Production is
// unaffected.
if (process.env.NODE_ENV !== "test") {
  app.use("/api/auth", authLimiter);
}

app.use("/api/auth", authRoutes);

app.use("/api/qr", qrRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use(errorHandler);

export default app;
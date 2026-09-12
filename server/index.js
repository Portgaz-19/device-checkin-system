import dotenv from "dotenv";
import dns from "dns";
import mongoose from "mongoose";
import app from "./app.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

dotenv.config();

const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;
const URI = process.env.MONGO_URI;

const app = express();


app.use(express.json());
app.use(helmet());
app.use(morgan("dev"));
app.use("/api/devices", deviceRoutes);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: "Too many attempts, please try again later",
  },
});

app.use("/api/auth", authLimiter, authRoutes);

app.use("/api/qr", qrRoutes);

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
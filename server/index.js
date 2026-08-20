import dotenv from "dotenv";
import dns from "dns";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./router/authRoutes.js";
import User from './models/User.js';

dns.setServers(["8.8.8.8", "1.1.1.1"]);

dotenv.config();

const PORT = process.env.PORT || 5000;

const URI = process.env.MONGODB_URI;

const app = express();

app.use(cors());
app.use(express.json());


app.use('/api/auth', authRoutes);


app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post('/api/test-user', async (req, res) => {

});
mongoose
  .connect(URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

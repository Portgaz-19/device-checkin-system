import dotenv from "dotenv";
import dns from "dns";
import mongoose from "mongoose";
import app from "./app.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

dotenv.config();

const PORT = process.env.PORT || 5000;
const URI = process.env.MONGO_URI;

mongoose
  .connect(URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
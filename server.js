import dotenv from "dotenv";
dotenv.config();
console.log("API Key loaded:", process.env.OPENAI_API_KEY ? "✅ YES" : "❌ NO");
console.log("MongoDB URI loaded:", process.env.MONGODB_URI ? "✅ YES" : "❌ NO");

import express from "express";
import cors from "cors";
import path from "path";
import mongoose from "mongoose";
import aiRoutes from "./routes/aiRoutes.js";
import interviewRoutes from "./routes/interviewRoutes.js";  // ← ADD THIS

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically (optional)
app.use("/uploads", express.static(path.resolve("uploads")));

// Routes
app.use("/api/ai", aiRoutes);
app.use("/api/interview", interviewRoutes);  // ← ADD THIS

// Basic health check
app.get("/", (req, res) => {
  res.json({
    message: "Server is running... 🎯",
    endpoints: {
      ai: "/api/ai",
      interview: "/api/interview"
    }
  });
});

// MongoDB Connection  // ← ADD THIS ENTIRE BLOCK
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
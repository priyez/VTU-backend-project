import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth.route.js";
import transactionRoutes from "./routes/transaction.route.js";
import walletRoutes from "./routes/wallet.route.js";
import dataRoutes from "./routes/data.route.js";
import airtimeRoute from "./routes/airtime.route.js"
import { errorHandler } from "./middlewares/error.middleware.js";
import electricityRoutes from "./routes/electricity.route.js";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/airtime", airtimeRoute);


// Health check
app.get("/", (req, res) => res.send("Backend is running 🚀"));

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use(errorHandler);

export default app;

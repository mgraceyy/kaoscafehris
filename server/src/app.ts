import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import router from "./routes.js";

const app = express();

// Global middleware
app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API routes
app.use("/api", router);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;

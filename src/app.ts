import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import compression from "compression";
import routes from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { createRateLimiter } from "./middlewares/security.js";
import { sanitizeBody } from "./middlewares/sanitize.js";
import hpp  from "hpp";
import { uploadGuard } from "./middlewares/uploadGuard.js";
import crypto from "crypto";

const app = express();

// Basic hardening
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false })); // CSP should be tuned per-app

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map(o => o.trim());

app.use(cors({
  origin: (origin, cb) =>
    !origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)
      ? cb(null, true)
      : cb(new Error("CORS not allowed")),
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true
}));



// Compression
app.use(compression());

// Cache control for GET requests
app.use((req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  next();
});

// Limit request JSON body size
app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT || "100kb" }));

//middlewares
app.use(morgan("dev"));
app.use(sanitizeBody);
app.use(hpp({ whitelist: ["tags", "ids"] })); // allow 'tags' or 'ids' to be multi
app.use(uploadGuard(Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024)));

// Global rate limit (per-IP)
app.use(createRateLimiter({ prefix: "global", windowSeconds: Number(process.env.RATE_WINDOW_SECONDS || 60), max: Number(process.env.RATE_MAX_REQUESTS || 200) }));

app.use("/api/v1", routes);

// fallback 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

export default app;

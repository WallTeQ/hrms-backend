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

// CORS: support comma-separated whitelist in CORS_ORIGIN and reflect request origin when allowed
const corsOriginsEnv = process.env.CORS_ORIGIN || "http://localhost:5000";
const allowedOrigins = corsOriginsEnv.split(",").map(s => s.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Require a request Origin header (reject non-browser server-to-server requests)
    if (!origin) return callback(new Error("CORS policy: Origin header required"));
    if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS policy: origin not allowed"));
  },
  credentials: true,
  methods: ["GET","HEAD","PUT","PATCH","POST","DELETE","OPTIONS"]
}));

// Compression
app.use(compression());

// Cache control for GET requests
app.use((req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    // Add ETag for better caching
    const etag = crypto.createHash('md5').update(req.originalUrl + JSON.stringify(req.query)).digest('hex');
    res.set('ETag', `"${etag}"`);
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

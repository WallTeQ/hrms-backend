import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import routes from "./routes";
import { errorHandler } from "./middlewares/errorHandler";
import { createRateLimiter } from "./middlewares/security";
import { sanitizeBody } from "./middlewares/sanitize";
import { hpp } from "./middlewares/hpp";
import { uploadGuard } from "./middlewares/uploadGuard";

const app = express();

// Basic hardening
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false })); // CSP should be tuned per-app
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));

// Limit request JSON body size
app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT || "100kb" }));

//middlewares
app.use(morgan("combined"));
app.use(sanitizeBody);
app.use(hpp(["tags", "ids"])); // allow 'tags' or 'ids' to be multi
app.use(uploadGuard(Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024)));

// Global rate limit (per-IP)
app.use(createRateLimiter({ prefix: "global", windowSeconds: Number(process.env.RATE_WINDOW_SECONDS || 60), max: Number(process.env.RATE_MAX_REQUESTS || 200) }));

app.use("/api", routes);

// fallback 404
app.use((_req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorHandler);

export default app;

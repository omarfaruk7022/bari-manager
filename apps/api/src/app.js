import "./config/env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/db.js";
import { mountRoutes } from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();
app.set("trust proxy", 1);

const defaultHelmet = helmet();
const adminJsHelmet = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", "data:", "https:"],
      imgSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      connectSrc: ["'self'", "https:", "ws:", "wss:"],
      frameAncestors: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

app.use((req, res, next) => {
  if (req.path.startsWith("/adminjs")) {
    return adminJsHelmet(req, res, next);
  }

  return defaultHelmet(req, res, next);
});

export const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  "http://109.123.236.110",
  "https://bari-manager.muhammadomarfaruk.com",
  "http://192.168.1.72:3000",
  process.env.FRONTEND_URL,
  process.env.API_URL,
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, ""),
].filter(Boolean);

function isAllowedOrigin(req, origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  const host = req.get("host");
  const protocol =
    req.headers["x-forwarded-proto"]?.split(",")[0]?.trim() || req.protocol;
  const currentOrigin = host ? `${protocol}://${host}` : null;

  return origin === currentOrigin;
}

const corsMiddleware = cors({
  origin(origin, callback) {
    callback(null, true);
  },
  credentials: true,
});

app.use((req, res, next) => {
  if (req.path.startsWith("/adminjs")) {
    return next();
  }

  const origin = req.headers.origin;

  if (isAllowedOrigin(req, origin)) {
    return corsMiddleware(req, res, next);
  }

  return next(new Error("CORS blocked"));
});

app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // max 100 requests per minute
    message: "অনেক বেশি রিকোয়েস্ট। ১ মিনিট পরে আবার চেষ্টা করুন।",
  }),
);
app.get("/health", (_, res) => res.json({ status: "ok", time: new Date() }));

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

export function mountApiMiddleware(app) {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  mountRoutes(app);
  app.use(errorHandler);
}

export default app;

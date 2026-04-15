import "./config/env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/db.js";
import { mountRoutes } from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import "./jobs/billGeneration.job.js";
import "./jobs/paymentReminder.job.js";

const app = express();

// ─── Security ───────────────────────────────────────
app.use(helmet());
// app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))
const allowedOrigins = [
  "http://localhost:3000",
  "https://bari-manager.muhammadomarfaruk.com",
  "http://192.168.1.72:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS blocked"));
      }
    },
    credentials: true,
  }),
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: "অনেক বেশি রিকোয়েস্ট। পরে চেষ্টা করুন।",
  }),
);

// ─── Body Parser ────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ───────────────────────────────────
app.get("/health", (_, res) => res.json({ status: "ok", time: new Date() }));

// ─── Routes ─────────────────────────────────────────
mountRoutes(app);

// ─── Error Handler ──────────────────────────────────
app.use(errorHandler);

// ─── Start ──────────────────────────────────────────
connectDB().then(() => {
  app.listen(process.env.API_PORT || 5000, () =>
    console.log(
      `✅ BariManager API running on port ${process.env.API_PORT || 5000}`,
    ),
  );
});

export default app;

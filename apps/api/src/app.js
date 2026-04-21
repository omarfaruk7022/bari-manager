import "./config/env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/db.js";
import { mountRoutes } from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();
app.set('trust proxy', 1)

app.use(helmet());

export const allowedOrigins = [
  "http://localhost:3000",
"http://109.123.236.110",
  "https://bari-manager.muhammadomarfaruk.com",
  "http://192.168.1.72:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error("CORS blocked"));
    },
    credentials: true,
  }),
);

app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // max 100 requests per minute
    message: "অনেক বেশি রিকোয়েস্ট। ১ মিনিট পরে আবার চেষ্টা করুন।",
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/health", (_, res) => res.json({ status: "ok", time: new Date() }));

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

mountRoutes(app);
app.use(errorHandler);

export default app;

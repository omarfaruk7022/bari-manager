import "./config/env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { mountRoutes } from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

app.use(helmet());

export const allowedOrigins = [
  "http://localhost:3000",
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
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: "অনেক বেশি রিকোয়েস্ট। পরে চেষ্টা করুন।",
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/health", (_, res) => res.json({ status: "ok", time: new Date() }));

mountRoutes(app);
app.use(errorHandler);

export default app;

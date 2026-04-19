import "./config/env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/db.js";
import { mountRoutes } from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import {
  runBillGenerationJob,
  startBillGenerationJob,
} from "./jobs/billGeneration.job.js";
import "./jobs/paymentReminder.job.js";

const app = express();

app.use(helmet());

const allowedOrigins = [
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

// Load DB configs into process.env after DB connects
async function loadDbConfigs() {
  try {
    const SystemConfig = (await import("./models/SystemConfig.model.js"))
      .default;
    const map = await SystemConfig.getAllAsEnv();
    for (const [key, val] of Object.entries(map)) {
      if (val && !process.env[key]) process.env[key] = val; // DB overrides only if not already set
    }
    console.log(`✅ Loaded ${Object.keys(map).length} config(s) from DB`);
  } catch (err) {
    console.error("⚠️ Could not load DB configs:", err.message);
  }
}

connectDB().then(async () => {
  await loadDbConfigs();
  startBillGenerationJob();
  await runBillGenerationJob();
  app.listen(process.env.API_PORT || 5000, () =>
    console.log(
      `✅ BariManager API running on port ${process.env.API_PORT || 5000}`,
    ),
  );
});

export default app;

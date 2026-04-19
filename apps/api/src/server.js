import "./config/env.js";
import http from "http";
import app, { allowedOrigins } from "./app.js";
import { connectDB } from "./config/db.js";
import { initIO } from "./socket/index.js";
import {
  runBillGenerationJob,
  startBillGenerationJob,
} from "./jobs/billGeneration.job.js";
import "./jobs/paymentReminder.job.js";

const server = http.createServer(app);
initIO(server, allowedOrigins);

async function loadDbConfigs() {
  try {
    const SystemConfig = (await import("./models/SystemConfig.model.js")).default;
    const map = await SystemConfig.getAllAsEnv();
    for (const [key, val] of Object.entries(map)) {
      if (val && !process.env[key]) process.env[key] = val;
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
  server.listen(process.env.API_PORT || 5000, () =>
    console.log(`✅ BariManager API running on port ${process.env.API_PORT || 5000}`),
  );
});

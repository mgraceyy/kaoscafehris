import app from "./app.js";
import { env } from "./config/env.js";
import { startAutoClockoutJob } from "./jobs/auto-clockout.js";

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port} [${env.nodeEnv}]`);
  startAutoClockoutJob();
});

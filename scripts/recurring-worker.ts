import { runRecurringGeneration } from "../lib/services";
import { prisma } from "../lib/prisma";

const intervalMs = Number(process.env.RECURRING_WORKER_INTERVAL_MS ?? 60 * 60 * 1000);

async function tick() {
  const result = await runRecurringGeneration(new Date());
  if (result.generatedCount > 0) {
    console.log(`[recurring-worker] generated ${result.generatedCount} expenses`);
  }
}

tick().catch((error) => {
  console.error("[recurring-worker] initial run failed", error);
});

const interval = setInterval(() => {
  tick().catch((error) => {
    console.error("[recurring-worker] run failed", error);
  });
}, intervalMs);

process.on("SIGTERM", async () => {
  clearInterval(interval);
  await prisma.$disconnect();
  process.exit(0);
});

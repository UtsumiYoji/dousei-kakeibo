import { jsonError, jsonOk } from "@/lib/http";
import { runRecurringGeneration } from "@/lib/services";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    return jsonOk(await runRecurringGeneration(body.targetDate ? new Date(body.targetDate) : new Date()));
  } catch (error) {
    return jsonError(error);
  }
}

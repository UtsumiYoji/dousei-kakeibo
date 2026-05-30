import { jsonError, jsonOk } from "@/lib/http";
import { getSettlementSummary } from "@/lib/services";

export async function GET() {
  try {
    return jsonOk(await getSettlementSummary());
  } catch (error) {
    return jsonError(error, 500);
  }
}

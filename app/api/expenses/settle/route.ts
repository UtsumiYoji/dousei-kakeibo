import { jsonError, jsonOk } from "@/lib/http";
import { settleExpenses } from "@/lib/services";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return jsonOk(await settleExpenses(body.ids));
  } catch (error) {
    return jsonError(error);
  }
}

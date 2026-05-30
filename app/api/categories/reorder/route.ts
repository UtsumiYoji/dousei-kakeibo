import { jsonError, jsonOk } from "@/lib/http";
import { reorderCategories } from "@/lib/services";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return jsonOk(await reorderCategories(body.orderedIds));
  } catch (error) {
    return jsonError(error);
  }
}

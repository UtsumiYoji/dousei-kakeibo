import { jsonError, jsonOk } from "@/lib/http";
import { updateCategory } from "@/lib/services";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    return jsonOk(await updateCategory(id, body));
  } catch (error) {
    return jsonError(error);
  }
}

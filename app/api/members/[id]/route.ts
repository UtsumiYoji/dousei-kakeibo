import { jsonError, jsonOk } from "@/lib/http";
import { updateMember } from "@/lib/services";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    return jsonOk(await updateMember(id, body));
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return jsonOk(await updateMember(id, { isActive: false }));
  } catch (error) {
    return jsonError(error);
  }
}

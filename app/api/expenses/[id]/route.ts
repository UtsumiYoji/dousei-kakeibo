import { jsonError, jsonOk } from "@/lib/http";
import { deleteExpense, updateExpense } from "@/lib/services";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    return jsonOk(
      await updateExpense(id, {
        ...body,
        amountYen: body.amountYen == null ? undefined : Number(body.amountYen),
        occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined
      })
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return jsonOk(await deleteExpense(id));
  } catch (error) {
    return jsonError(error);
  }
}

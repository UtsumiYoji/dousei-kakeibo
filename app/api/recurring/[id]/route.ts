import { RecurrenceFrequency } from "@prisma/client";
import { jsonError, jsonOk } from "@/lib/http";
import { updateRecurringRule } from "@/lib/services";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    return jsonOk(
      await updateRecurringRule(id, {
        ...body,
        frequency: body.frequency as RecurrenceFrequency | undefined,
        amountYen: body.amountYen == null ? undefined : Number(body.amountYen),
        dayOfMonth: body.dayOfMonth == null ? null : Number(body.dayOfMonth),
        dayOfWeek: body.dayOfWeek == null ? null : Number(body.dayOfWeek)
      })
    );
  } catch (error) {
    return jsonError(error);
  }
}

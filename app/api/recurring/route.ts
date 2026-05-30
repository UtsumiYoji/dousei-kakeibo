import { RecurrenceFrequency } from "@prisma/client";
import { jsonError, jsonOk } from "@/lib/http";
import { createRecurringRule, listRecurringRules } from "@/lib/services";

export async function GET() {
  try {
    return jsonOk(await listRecurringRules());
  } catch (error) {
    return jsonError(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return jsonOk(
      await createRecurringRule({
        ...body,
        frequency: body.frequency as RecurrenceFrequency,
        amountYen: Number(body.amountYen),
        dayOfMonth: body.dayOfMonth == null ? null : Number(body.dayOfMonth),
        dayOfWeek: body.dayOfWeek == null ? null : Number(body.dayOfWeek)
      }),
      { status: 201 }
    );
  } catch (error) {
    return jsonError(error);
  }
}

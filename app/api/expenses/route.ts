import { createExpense, listExpenses } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const settled = url.searchParams.get("settled");
    return jsonOk(
      await listExpenses({
        settled: settled === "all" || settled === "settled" || settled === "unsettled" ? settled : "unsettled"
      })
    );
  } catch (error) {
    return jsonError(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return jsonOk(
      await createExpense({
        ...body,
        amountYen: Number(body.amountYen),
        occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined
      }),
      { status: 201 }
    );
  } catch (error) {
    return jsonError(error);
  }
}

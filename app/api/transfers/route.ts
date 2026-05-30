import { jsonError, jsonOk } from "@/lib/http";
import { createTransfer, listTransfers } from "@/lib/services";

export async function GET() {
  try {
    return jsonOk(await listTransfers());
  } catch (error) {
    return jsonError(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return jsonOk(
      await createTransfer({
        ...body,
        amountYen: Number(body.amountYen),
        transferredAt: body.transferredAt ? new Date(body.transferredAt) : undefined
      }),
      { status: 201 }
    );
  } catch (error) {
    return jsonError(error);
  }
}

import { createMember, listMembers } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  try {
    return jsonOk(await listMembers());
  } catch (error) {
    return jsonError(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return jsonOk(await createMember(String(body.name ?? "")), { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

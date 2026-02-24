import { proxyWithAuth } from "@/lib/bff";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyWithAuth(`/api/v1/events/${id}/start`, { method: "POST" });
}

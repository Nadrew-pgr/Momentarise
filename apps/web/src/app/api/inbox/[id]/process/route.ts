import { proxyWithAuth } from "@/lib/bff";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  return proxyWithAuth(`/api/v1/inbox/${id}/process`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

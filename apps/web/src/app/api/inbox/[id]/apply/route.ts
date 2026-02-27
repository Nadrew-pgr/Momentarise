import { proxyWithAuth } from "@/lib/bff";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  return proxyWithAuth(`/api/v1/inbox/${id}/apply`, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
}

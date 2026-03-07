import { proxyWithAuth } from "@/lib/bff";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyWithAuth(`/api/v1/inbox/${id}`);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyWithAuth(`/api/v1/inbox/${id}`, {
    method: "DELETE",
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.text();
  return proxyWithAuth(`/api/v1/inbox/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

import { proxyWithAuth } from "@/lib/bff";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyWithAuth(`/api/v1/inbox/${id}`, {
    method: "DELETE",
  });
}

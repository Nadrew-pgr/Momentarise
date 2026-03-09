import { proxyWithAuth } from "@/lib/bff";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  const { id, linkId } = await params;
  return proxyWithAuth(`/api/v1/items/${id}/links/${linkId}`, {
    method: "DELETE",
  });
}


import { proxyBinaryWithAuth } from "@/lib/bff";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  const { id, assetId } = await params;
  return proxyBinaryWithAuth(`/api/v1/inbox/${id}/assets/${assetId}/content`);
}

import { proxyWithAuth } from "@/lib/bff";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyWithAuth(`/api/v1/items/${id}/links`);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  return proxyWithAuth(`/api/v1/items/${id}/links`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

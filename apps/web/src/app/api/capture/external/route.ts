import { proxyWithAuth } from "@/lib/bff";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return proxyWithAuth("/api/v1/capture/external", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
}

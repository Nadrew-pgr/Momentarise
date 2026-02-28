import { proxyWithAuth } from "@/lib/bff";

export async function GET() {
  return proxyWithAuth("/api/v1/preferences/ai");
}

export async function PATCH(request: Request) {
  const body = await request.json();
  return proxyWithAuth("/api/v1/preferences/ai", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

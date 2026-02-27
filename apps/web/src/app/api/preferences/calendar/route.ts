import { proxyWithAuth } from "@/lib/bff";

export async function GET() {
  return proxyWithAuth("/api/v1/preferences/calendar");
}

export async function PATCH(request: Request) {
  const body = await request.json();
  return proxyWithAuth("/api/v1/preferences/calendar", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

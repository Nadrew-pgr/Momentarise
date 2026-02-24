import { proxyWithAuth } from "@/lib/bff";

export async function GET() {
  return proxyWithAuth("/api/v1/inbox");
}

export async function POST(request: Request) {
  const body = await request.json();
  return proxyWithAuth("/api/v1/inbox", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

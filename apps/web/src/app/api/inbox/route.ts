import { proxyWithAuth } from "@/lib/bff";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const suffix = url.search ? url.search : "";
  return proxyWithAuth(`/api/v1/inbox${suffix}`);
}

export async function POST(request: Request) {
  const body = await request.json();
  return proxyWithAuth("/api/v1/inbox", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

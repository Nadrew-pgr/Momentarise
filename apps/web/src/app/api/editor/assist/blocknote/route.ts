import { proxyWithAuth } from "@/lib/bff";

export async function POST(request: Request) {
  const body = await request.text();
  return proxyWithAuth("/api/v1/editor/assist/blocknote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

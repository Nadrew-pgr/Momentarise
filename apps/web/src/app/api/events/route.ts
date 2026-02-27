import { NextRequest } from "next/server";
import { proxyWithAuth } from "@/lib/bff";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const path = qs.size > 0 ? `/api/v1/events?${qs.toString()}` : "/api/v1/events";
  return proxyWithAuth(path);
}

export async function POST(request: Request) {
  const body = await request.json();
  return proxyWithAuth("/api/v1/events", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

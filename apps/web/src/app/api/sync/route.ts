import { NextRequest } from "next/server";
import { proxyWithAuth } from "@/lib/bff";

function buildSyncPath(request: NextRequest): string {
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  return qs ? `/api/v1/sync?${qs}` : "/api/v1/sync";
}

export async function GET(request: NextRequest) {
  return proxyWithAuth(buildSyncPath(request));
}

export async function POST(request: Request) {
  const body = await request.text();
  return proxyWithAuth("/api/v1/sync", {
    method: "POST",
    body,
  });
}

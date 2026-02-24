import { proxyWithAuth } from "@/lib/bff";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const path = date != null ? `/api/v1/timeline?date=${encodeURIComponent(date)}` : "/api/v1/timeline";
  return proxyWithAuth(path);
}

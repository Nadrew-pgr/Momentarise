import { NextRequest } from "next/server";
import { proxyWithAuth } from "@/lib/bff";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const q = search.get("q");
  const limit = search.get("limit");
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (limit) qs.set("limit", limit);
  const suffix = qs.size > 0 ? `?${qs.toString()}` : "";
  return proxyWithAuth(`/api/v1/inbox/search${suffix}`);
}


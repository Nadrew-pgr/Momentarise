import { NextRequest } from "next/server";
import { proxyWithAuth } from "@/lib/bff";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const search = request.nextUrl.searchParams;
  const qs = new URLSearchParams();
  const period = search.get("period");
  const compare = search.get("compare");
  if (period) qs.set("period", period);
  if (compare) qs.set("compare", compare);
  const suffix = qs.size > 0 ? `?${qs.toString()}` : "";
  return proxyWithAuth(`/api/v1/events/${id}/analytics${suffix}`);
}


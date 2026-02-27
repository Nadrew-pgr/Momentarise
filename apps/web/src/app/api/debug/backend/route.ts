import { NextResponse } from "next/server";
import { API_URL } from "@/lib/constants";

function safeApiUrlMeta() {
  const isDefault = API_URL === "http://localhost:8000";
  try {
    const u = new URL(API_URL);
    return { apiUrlHost: u.host, apiUrlProtocol: u.protocol, apiUrlIsDefault: isDefault };
  } catch {
    return { apiUrlHost: null, apiUrlProtocol: null, apiUrlIsDefault: isDefault };
  }
}

export async function GET() {
  const meta = safeApiUrlMeta();
  const healthUrl = `${API_URL}/api/v1/health`;

  let upstreamOk: boolean | null = null;
  let upstreamStatus: number | null = null;
  let upstreamError: string | null = null;

  try {
    const res = await fetch(healthUrl, { method: "GET" });
    upstreamOk = res.ok;
    upstreamStatus = res.status;
  } catch (err) {
    upstreamOk = false;
    upstreamStatus = null;
    upstreamError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    ...meta,
    upstreamHealth: { ok: upstreamOk, status: upstreamStatus, error: upstreamError },
  });
}


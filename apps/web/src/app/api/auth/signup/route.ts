import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL, COOKIE_NAME } from "@/lib/constants";

const isProduction = process.env.NODE_ENV === "production";

export async function POST(request: Request) {
  function safeApiUrlMeta() {
    const isDefault = API_URL === "http://localhost:8000";
    try {
      const u = new URL(API_URL);
      return { apiUrlHost: u.host, apiUrlProtocol: u.protocol, apiUrlIsDefault: isDefault };
    } catch {
      return { apiUrlHost: null, apiUrlProtocol: null, apiUrlIsDefault: isDefault };
    }
  }

  function debugLog(hypothesisId: string, message: string, data: Record<string, unknown>) {
    const payload = {
      sessionId: "3a0865",
      runId: "pre-fix",
      hypothesisId,
      location: "apps/web/src/app/api/auth/signup/route.ts:POST",
      message,
      data,
      timestamp: Date.now(),
    };
    // #region agent log
    fetch("http://127.0.0.1:7428/ingest/549884bf-5469-462f-b01b-315f3474bcf2", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "3a0865" },
      body: JSON.stringify(payload),
    }).catch(() => {});
    // #endregion
    // eslint-disable-next-line no-console
    console.log("[debug]", payload);
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { detail: "Invalid JSON" },
      { status: 400 }
    );
  }
  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json(
      { detail: "email and password required" },
      { status: 400 }
    );
  }

  debugLog("H1", "signup handler start", {
    ...safeApiUrlMeta(),
    hasEmail: Boolean(email),
    hasPassword: Boolean(password),
  });

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch (err) {
    debugLog("H2", "signup upstream fetch threw", {
      ...safeApiUrlMeta(),
      errorName: err instanceof Error ? err.name : typeof err,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        detail: "Backend unreachable from server runtime",
        hint: "Check API_URL (Vercel env) and backend deployment availability.",
      },
      { status: 502 }
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    debugLog("H3", "signup upstream non-OK", {
      ...safeApiUrlMeta(),
      upstreamStatus: res.status,
      hasDetail: Boolean((data as any)?.detail),
    });
    return NextResponse.json(
      { detail: data?.detail ?? "Signup failed" },
      { status: res.status }
    );
  }

  const accessToken = data?.access_token;
  if (!accessToken) {
    return NextResponse.json(
      { detail: "No token in response" },
      { status: 502 }
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProduction,
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true });
}

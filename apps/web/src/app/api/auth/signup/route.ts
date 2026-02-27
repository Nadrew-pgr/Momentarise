import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL, COOKIE_NAME } from "@/lib/constants";

const isProduction = process.env.NODE_ENV === "production";

export async function POST(request: Request) {
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

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
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

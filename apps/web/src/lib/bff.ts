import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL, COOKIE_NAME } from "./constants";

export async function proxyWithAuth(
  path: string,
  init?: RequestInit
): Promise<NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { detail: "Unauthorized" },
      { status: 401 }
    );
  }
  const url = `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

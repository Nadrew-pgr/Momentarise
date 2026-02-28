import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_URL, COOKIE_NAME } from "./constants";

function hasContentTypeHeader(headers: RequestInit["headers"]): boolean {
  if (!headers) return false;
  if (headers instanceof Headers) return headers.has("content-type");
  if (Array.isArray(headers)) {
    return headers.some(([name]) => name.toLowerCase() === "content-type");
  }
  return Object.keys(headers).some((name) => name.toLowerCase() === "content-type");
}

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
  const isFormDataBody =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  const shouldSetJsonContentType =
    !isFormDataBody && !hasContentTypeHeader(init?.headers);
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(shouldSetJsonContentType ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  }
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: contentType ? { "Content-Type": contentType } : undefined,
  });
}

export async function proxyStreamWithAuth(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const url = `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const shouldSetJsonContentType = !hasContentTypeHeader(init?.headers);
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(shouldSetJsonContentType ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const headers = new Headers();
  headers.set(
    "Content-Type",
    res.headers.get("content-type") ?? "application/x-ndjson"
  );
  headers.set("Cache-Control", "no-store");
  return new Response(res.body, {
    status: res.status,
    headers,
  });
}

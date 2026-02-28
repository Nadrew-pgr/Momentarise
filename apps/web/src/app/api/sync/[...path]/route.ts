import { NextRequest } from "next/server";
import { proxyStreamWithAuth, proxyWithAuth } from "@/lib/bff";

function buildTarget(path: string[], request: NextRequest): string {
  const clean = path.join("/");
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  const base = `/api/v1/sync/${clean}`;
  return qs ? `${base}?${qs}` : base;
}

async function forward(
  request: NextRequest,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  params: Promise<{ path: string[] }>
) {
  const { path } = await params;
  const target = buildTarget(path, request);
  const isStream = method === "POST" && path[path.length - 1] === "stream";

  if (method === "GET" || method === "DELETE") {
    return proxyWithAuth(target, { method });
  }

  const rawBody = await request.text();
  const headers = {
    "Content-Type": request.headers.get("content-type") ?? "application/json",
  };

  if (isStream) {
    return proxyStreamWithAuth(target, {
      method,
      headers,
      body: rawBody,
    });
  }

  return proxyWithAuth(target, {
    method,
    headers,
    body: rawBody,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return forward(request, "GET", params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return forward(request, "POST", params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return forward(request, "PATCH", params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return forward(request, "DELETE", params);
}

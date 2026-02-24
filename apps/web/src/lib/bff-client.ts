"use client";

/**
 * Client fetch for BFF routes that require auth.
 * On 401: clears session via /api/auth/logout and redirects to /login.
 */
export async function fetchWithAuth(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
  });
  if (res.status === 401) {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  return res;
}

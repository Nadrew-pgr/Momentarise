import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "@/lib/store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "access_token";

function extractErrorMessage(payload: unknown): string | null {
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const detail = obj.detail;
    if (typeof detail === "string" && detail.trim().length > 0) return detail;
    const message = obj.message;
    if (typeof message === "string" && message.trim().length > 0) return message;
    const error = obj.error;
    if (typeof error === "string" && error.trim().length > 0) return error;
  }
  return null;
}

export async function readApiError(
  res: Response,
  fallback: string
): Promise<string> {
  const base = `${fallback} (${res.status})`;
  const contentType = res.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const json = await res.json();
      const msg = extractErrorMessage(json);
      return msg ? `${base}: ${msg}` : base;
    }
    const text = (await res.text()).trim();
    return text ? `${base}: ${text.slice(0, 200)}` : base;
  } catch {
    return base;
  }
}

export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const token = await SecureStore.getItemAsync("access_token");
  const url = `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const isFormDataBody =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error(
      `Network error. Unable to reach API at ${API_URL}. Check backend and EXPO_PUBLIC_API_URL.`
    );
  }
  if (res.status === 401) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    useAuthStore.getState().setAuthenticated(false);
    throw new Error("Session expired. Please log in again.");
  }
  return res;
}

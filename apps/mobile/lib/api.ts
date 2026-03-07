import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "@/lib/store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const TOKEN_KEY = "access_token";

function extractErrorMessage(payload: unknown): string | null {
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const detail = obj.detail;
    if (typeof detail === "string" && detail.trim().length > 0) return detail;
    if (detail && typeof detail === "object") {
      const detailObj = detail as Record<string, unknown>;
      const detailMessage = detailObj.message;
      if (typeof detailMessage === "string" && detailMessage.trim().length > 0) {
        return detailMessage;
      }
      const detailCode = detailObj.code;
      if (typeof detailCode === "string" && detailCode.trim().length > 0) {
        return detailCode;
      }
    }
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
      const requestId =
        json &&
        typeof json === "object" &&
        typeof (json as Record<string, unknown>).request_id === "string"
          ? ((json as Record<string, unknown>).request_id as string)
          : null;
      const suffix = requestId ? ` [request_id=${requestId}]` : "";
      if (msg) return `${base}: ${msg}${suffix}`;
      return `${base}${suffix}`;
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

import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "@/lib/store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "access_token";

export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const token = await SecureStore.getItemAsync("access_token");
  const url = `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    useAuthStore.getState().setAuthenticated(false);
    throw new Error("Session expired. Please log in again.");
  }
  return res;
}

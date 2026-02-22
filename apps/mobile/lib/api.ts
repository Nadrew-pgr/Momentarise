import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const token = await SecureStore.getItemAsync("access_token");
  const url = `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
}

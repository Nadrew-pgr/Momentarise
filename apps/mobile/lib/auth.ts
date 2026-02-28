import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "access_token";
const ONBOARDING_KEY = "has_completed_onboarding";

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? "Login failed");
  }
  const { access_token } = await res.json();
  await SecureStore.setItemAsync(TOKEN_KEY, access_token);
}

export async function signup(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? "Signup failed");
  }
  const { access_token } = await res.json();
  await SecureStore.setItemAsync(TOKEN_KEY, access_token);
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getOnboardingCompleted(): Promise<boolean> {
  const raw = await SecureStore.getItemAsync(ONBOARDING_KEY);
  return raw === "1";
}

export async function setOnboardingCompleted(value: boolean): Promise<void> {
  if (value) {
    await SecureStore.setItemAsync(ONBOARDING_KEY, "1");
    return;
  }
  await SecureStore.deleteItemAsync(ONBOARDING_KEY);
}

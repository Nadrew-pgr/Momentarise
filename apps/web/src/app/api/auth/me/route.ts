import { proxyWithAuth } from "@/lib/bff";

export async function GET() {
  return proxyWithAuth("/api/v1/auth/me");
}

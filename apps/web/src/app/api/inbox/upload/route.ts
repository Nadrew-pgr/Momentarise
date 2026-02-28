import { proxyWithAuth } from "@/lib/bff";

export async function POST(request: Request) {
  const formData = await request.formData();
  return proxyWithAuth("/api/v1/inbox/upload", {
    method: "POST",
    body: formData,
  });
}

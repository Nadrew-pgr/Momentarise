import { proxyWithAuth } from "@/lib/bff";

export async function GET(request: Request) {
    return proxyWithAuth("/api/v1/projects");
}

export async function POST(request: Request) {
    const body = await request.json();
    return proxyWithAuth("/api/v1/projects", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

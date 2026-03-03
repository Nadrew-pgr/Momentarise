import { proxyWithAuth } from "@/lib/bff";

export async function GET(request: Request) {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("project_id");
    const suffix = projectId ? `?project_id=${projectId}` : "";
    return proxyWithAuth(`/api/v1/series${suffix}`);
}

export async function POST(request: Request) {
    const body = await request.json();
    return proxyWithAuth("/api/v1/series", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

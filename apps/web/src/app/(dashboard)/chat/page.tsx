import { redirect } from "next/navigation";

type ChatPageSearchParams = Record<string, string | string[] | undefined>;

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<ChatPageSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (typeof value === "string") {
      params.append(key, value);
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    }
  }

  const queryString = params.toString();
  redirect(queryString ? `/sync?${queryString}` : "/sync");
}

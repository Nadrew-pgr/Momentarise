"use client";

import dynamic from "next/dynamic";
import "./sync-chat.css";

const SyncChatShell = dynamic(
  () => import("@/components/sync-chat/chat-shell").then((mod) => mod.SyncChatShell),
  { ssr: false }
);

export default function SyncPage() {
  return (
    <div className="sync-chat-page -mx-4 -mb-4 flex min-h-0 flex-1 overflow-hidden">
      <SyncChatShell />
    </div>
  );
}

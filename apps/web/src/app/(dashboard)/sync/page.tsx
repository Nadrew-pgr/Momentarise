"use client";

import "./sync-chat.css";
import { SyncChatShell } from "@/components/sync-chat/chat-shell";

export default function SyncPage() {
  return (
    <div className="sync-chat-page -mx-4 -mb-4 flex min-h-0 flex-1 overflow-hidden">
      <SyncChatShell />
    </div>
  );
}

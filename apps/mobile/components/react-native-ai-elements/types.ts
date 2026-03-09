import type { SyncPreview } from "@momentarise/shared";

export type Role = "user" | "assistant" | "system";

export interface SyncMessageContextLink {
    kind: "capture" | "item";
    id: string;
    label: string;
    internalPath: string;
    source?: string;
    status?: string;
    captureType?: string;
}

export interface ChatMessage {
    id: string;
    role: Role;
    content: string;
    planPreviews?: SyncPreview[];
    contextLinks?: SyncMessageContextLink[];
}

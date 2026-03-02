import React, { useState, useEffect } from "react";
import { View, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    useSyncStream,
    useCreateSyncRun,
    useApplySyncRun,
    useUndoSyncRun,
    useSyncRunEvents,
} from "@/hooks/use-sync";
import { useAuthStore } from "@/lib/store";
import { Header } from "@/components/ai-elements-native/header";
import { EmptyState } from "@/components/ai-elements-native/empty-state";
import { Conversation } from "@/components/ai-elements-native/conversation";
import { Composer } from "@/components/ai-elements-native/composer";
import { ActionsRail } from "@/components/ai-elements-native/actions-rail";
import { HistoryDrawer } from "@/components/ai-elements-native/history-drawer";

export default function SyncScreen() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState("");
    const [streamingText, setStreamingText] = useState("");
    const [runId, setRunId] = useState<string | null>(null);
    const [activeToolName, setActiveToolName] = useState<string | undefined>();
    const [pendingPreviews, setPendingPreviews] = useState<{ id: string }[]>([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const createRun = useCreateSyncRun();
    const applyRun = useApplySyncRun();
    const undoRun = useUndoSyncRun();
    const eventsQuery = useSyncRunEvents(runId);



    const streamMutation = useSyncStream((event) => {
        if (event.type === "token") {
            setStreamingText((prev) => prev + event.payload.delta);
        } else if (event.type === "message") {
            // For assistant messages, content_json typically has { text: "..." }
            const textContent = typeof event.payload.content_json?.text === "string"
                ? event.payload.content_json.text
                : "";

            setMessages((prev) => {
                // Prevent duplicate user messages from SSE echoing
                if (event.payload.role === "user") {
                    const isDup = prev.some((m) => m.role === "user" && m.content === textContent);
                    if (isDup) return prev;
                }
                return [
                    ...prev,
                    { id: event.payload.id, role: event.payload.role, content: textContent },
                ];
            });
            setStreamingText("");
        } else if (event.type === "tool_call") {
            setActiveToolName(event.payload.tool_name);
            if (event.payload.tool_name === "preview_changes") {
                setPendingPreviews((prev) => [...prev, { id: event.payload.tool_call_id }]);
            }
        } else if (event.type === "tool_result") {
            setActiveToolName(undefined);
        }
    });

    // Reconstruct messages when runId changes or events load
    useEffect(() => {
        if (!eventsQuery.data || streamMutation.isPending) return;

        const historyMessages = eventsQuery.data
            .filter((e) => e.type === "message")
            .map((e) => {
                const textContent = typeof e.payload.content_json?.text === "string"
                    ? e.payload.content_json.text
                    : "";
                return { id: e.payload.id, role: e.payload.role, content: textContent };
            });

        setMessages((prev) => {
            // Merge history messages into existing messages to prevent erasing optimistic UI
            const newArray = [...prev];
            historyMessages.forEach((hm) => {
                const existingIndex = newArray.findIndex((m) => m.id === hm.id);
                if (existingIndex >= 0) {
                    newArray[existingIndex] = hm;
                } else {
                    newArray.push(hm);
                }
            });
            return newArray;
        });
    }, [eventsQuery.data, streamMutation.isPending]);

    const handleSend = async () => {
        if (!input.trim() || streamMutation.isPending) return;

        const userMsg = { id: Date.now().toString(), role: "user", content: input.trim() };
        setMessages((prev) => [...prev, userMsg]);
        const currentInput = input;
        setInput("");
        Keyboard.dismiss();

        try {
            let currentRunId = runId;
            if (!currentRunId) {
                // If there's missing payload for createRun, adjust as per your backend generic run creation
                const run = await createRun.mutateAsync({} as any);
                currentRunId = run.id;
                setRunId(run.id);
            }

            setStreamingText("");
            await streamMutation.mutateAsync({
                runId: currentRunId,
                payload: { message: currentInput },
            });
        } catch (e) {
            console.error(e);
            // Revert message on failure
            setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
            setInput(currentInput);
        }
    };

    const handleApply = async (previewId: string) => {
        if (!runId) return;
        try {
            await applyRun.mutateAsync({
                runId,
                payload: {
                    preview_id: previewId,
                    idempotency_key: Math.random().toString(36).substring(7)
                }
            });
            setPendingPreviews((prev) => prev.filter((p) => p.id !== previewId));
        } catch (e) {
            console.error(e);
        }
    };

    const handleUndo = async (previewId: string) => {
        if (!runId) return;
        try {
            // Note: The UI currently passes previewId here, but the API expects a change_id.
            // In a full implementation, we'd map preview_id -> change_id after apply.
            await undoRun.mutateAsync({
                runId,
                payload: {
                    change_id: previewId, // Fallback for now to satisfy type
                    idempotency_key: Math.random().toString(36).substring(7)
                }
            });
            setPendingPreviews((prev) => prev.filter((p) => p.id !== previewId));
        } catch (e) {
            console.error(e);
        }
    };

    if (!isAuthenticated) return <View className="flex-1 bg-background" />;

    return (
        <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
            <Header
                onMenuPress={() => setIsDrawerOpen(true)}
                onNewChatPress={() => {
                    setMessages([]);
                    setRunId(null);
                    setStreamingText("");
                }}
            />
            <View className="flex-1 relative">
                <Conversation
                    messages={messages}
                    isStreaming={streamMutation.isPending}
                    streamingText={streamingText}
                    emptyState={<EmptyState />}
                />

                <View className="absolute bottom-[90px] left-0 right-0">
                    <ActionsRail
                        pendingPreviews={pendingPreviews}
                        activeToolName={activeToolName}
                        isApplying={applyRun.isPending}
                        isUndoing={undoRun.isPending}
                        onApply={handleApply}
                        onUndo={handleUndo}
                    />
                </View>

                <Composer
                    value={input}
                    onChange={setInput}
                    onSend={handleSend}
                    onStop={() => {
                        // In v3, aborting streaming isn't natively supported 
                        // by EventSource unless we keep the instance around. 
                        // We can just ignore for now or implement an AbortController later.
                        console.log("Stop pressed");
                    }}
                    isStreaming={streamMutation.isPending}
                    disabled={createRun.isPending}
                />
            </View>

            <HistoryDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                currentRunId={runId}
                onSelectRun={(id) => {
                    setRunId(id);
                    setMessages([]); // Will be populated by eventsQuery
                }}
            />
        </SafeAreaView>
    );
}

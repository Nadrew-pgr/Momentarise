import React, { useEffect, useRef, useMemo } from "react";
import { ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import { AnimatedOrb } from "./animated-orb";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import type { SyncEventEnvelope } from "@momentarise/shared";

interface SyncChatMessage {
    id: string;
    seq: number;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
}

interface MessageListProps {
    messages: SyncChatMessage[];
    streamingBuffer: string;
    isStreaming: boolean;
    emptyTitle: string;
    emptySubtitle: string;
}

export function MessageList({
    messages,
    streamingBuffer,
    isStreaming,
    emptyTitle,
    emptySubtitle,
}: MessageListProps) {
    const scrollRef = useRef<ScrollView>(null);

    const displayMessages = useMemo(() => {
        if (!isStreaming || !streamingBuffer.trim()) return messages;
        const transientMessage: SyncChatMessage = {
            id: "sync-streaming-assistant",
            seq: Number.MAX_SAFE_INTEGER,
            role: "assistant",
            content: streamingBuffer,
        };
        return [...messages, transientMessage];
    }, [messages, isStreaming, streamingBuffer]);

    useEffect(() => {
        // Scroll to end when messages change
        setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [displayMessages.length, streamingBuffer]);

    const showTypingIndicator = isStreaming && !streamingBuffer.trim();

    return (
        <ScrollView
            ref={scrollRef}
            className="flex-1 px-4 pt-4"
            contentContainerClassName="pb-32" // Padding for composer
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            {displayMessages.length === 0 && !isStreaming ? (
                <View className="mt-20 items-center justify-center px-4 text-center">
                    <AnimatedOrb size={100} className="mb-6" />
                    <Text className="text-center text-lg font-medium text-foreground">
                        {emptyTitle}
                    </Text>
                    <Text className="mt-2 text-center text-sm text-muted-foreground">
                        {emptySubtitle}
                    </Text>
                </View>
            ) : null}

            <View className="space-y-4">
                {displayMessages.map((message) => (
                    <MessageBubble
                        key={`${message.id}-${message.seq}`}
                        message={message}
                        isStreaming={message.id === "sync-streaming-assistant"}
                    />
                ))}

                {showTypingIndicator && <TypingIndicator />}
            </View>
        </ScrollView>
    );
}

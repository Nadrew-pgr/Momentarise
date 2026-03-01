import React from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { useTranslation } from "react-i18next";
import Animated, {
    FadeInUp,
    FadeOutDown,
    Layout,
} from "react-native-reanimated";

import { MarkdownRenderer } from "./markdown-renderer";

interface SyncChatMessage {
    id: string;
    seq: number;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    delivery?: "pending" | "sent" | "failed";
}

interface MessageBubbleProps {
    message: SyncChatMessage;
    isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
    const { role, content, delivery } = message;
    const isUser = role === "user";

    return (
        <Animated.View
            layout={Layout.springify().damping(15)}
            entering={FadeInUp.duration(400).springify()}
            exiting={FadeOutDown.duration(200)}
            className={`mb-4 flex-row ${isUser ? "justify-end" : "justify-start"}`}
        >
            <View
                className={
                    isUser
                        ? "max-w-[85%] rounded-3xl px-5 py-3.5 bg-primary"
                        : "w-full py-2"
                }
            >
                {isUser ? (
                    <Text className="text-[16px] leading-[22px] text-primary-foreground">
                        {content}
                    </Text>
                ) : (
                    <MarkdownRenderer content={content} isStreaming={isStreaming} />
                )}

                {isStreaming && (
                    <View className="mt-2 h-3 w-3 rounded-full bg-muted-foreground/50 animate-pulse" />
                )}
                {delivery === "pending" && (
                    <Text className="mt-1 text-right text-[10px] text-primary-foreground/70">
                        Sending...
                    </Text>
                )}
                {delivery === "failed" && (
                    <Text className="mt-1 text-right text-[10px] text-destructive">
                        Failed to send
                    </Text>
                )}
            </View>
        </Animated.View>
    );
}

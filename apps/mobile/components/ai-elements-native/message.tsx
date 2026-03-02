import React from 'react';
import { View, Text } from 'react-native';
import { MarkdownRenderer } from './markdown-renderer';

interface MessageProps {
    message: {
        role: "user" | "assistant" | "system";
        content: string;
    };
    isStreaming?: boolean;
}

export function Message({ message, isStreaming = false }: MessageProps) {
    if (message.role === "system") return null;

    if (message.role === "user") {
        return (
            <View className="mb-6 flex-row shrink-0 justify-end px-4">
                <View className="bg-primary/95 max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
                    <Text className="text-primary-foreground text-[16px] leading-[24px]">
                        {message.content}
                    </Text>
                </View>
            </View>
        );
    }

    // Assistant message: Library quality, inline, zero bubble.
    return (
        <View className="mb-6 px-4">
            <MarkdownRenderer content={message.content} isStreaming={isStreaming} />
        </View>
    );
}

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from "expo-router";
import { MarkdownRenderer } from './markdown-renderer';
import { ChatMessage } from './types';

interface MessageProps {
    message: ChatMessage;
    isStreaming?: boolean;
}

export function Message({ message, isStreaming = false }: MessageProps) {
    const router = useRouter();

    const openContextLink = (internalPath: string) => {
        if (internalPath.startsWith("/inbox/captures/")) {
            const id = internalPath.slice("/inbox/captures/".length);
            if (id) router.push(`/inbox/${id}`);
            return;
        }
        if (internalPath.startsWith("/inbox/items/")) {
            const id = internalPath.slice("/inbox/items/".length);
            if (id) router.push(`/items/${id}`);
        }
    };

    if (message.role === "system") return null;

    if (message.role === "user") {
        return (
            <View className="mb-6 shrink-0 px-4">
                {message.contextLinks && message.contextLinks.length > 0 ? (
                    <View className="mb-2 flex-row flex-wrap justify-end gap-1.5">
                        {message.contextLinks.map((link) => (
                            <TouchableOpacity
                                key={`${message.id}-${link.kind}-${link.id}`}
                                className="flex-row items-center rounded-full border border-border/70 bg-muted/50 px-2.5 py-1"
                                onPress={() => openContextLink(link.internalPath)}
                                accessibilityRole="button"
                                accessibilityLabel={link.label}
                            >
                                <View className="mr-1 rounded-full bg-background/70 px-1.5 py-0.5">
                                    <Text className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                        {link.kind}
                                    </Text>
                                </View>
                                <Text className="max-w-[180px] text-[11px] text-foreground/85" numberOfLines={1}>
                                    @{link.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : null}
                <View className="ml-auto max-w-[75%] rounded-2xl rounded-tr-sm border border-border/60 bg-secondary px-4 py-2.5">
                    <Text className="text-foreground text-[16px] leading-[24px]">{message.content}</Text>
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

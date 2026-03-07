import React, { useEffect, useRef, useMemo, useState } from 'react';
import { FlatList, View, StyleSheet, Keyboard, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Message } from './message';
import { TypingIndicator } from './typing-indicator';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ArrowDown } from 'lucide-react-native';
import { ChatMessage } from './types';
import type { SyncPreview } from "@momentarise/shared";

interface ConversationProps {
    messages: ChatMessage[];
    isStreaming: boolean;
    streamingText: string;
    emptyState?: React.ReactElement;
    bottomInset?: number;
    renderPlanPreview?: (preview: SyncPreview) => React.ReactNode;
}

export function Conversation({
    messages,
    isStreaming,
    streamingText,
    emptyState,
    bottomInset = 96,
    renderPlanPreview,
}: ConversationProps) {
    const listRef = useRef<FlatList>(null);
    const contentHeight = useRef(0);
    const listHeight = useRef(0);
    const [showScrollButton, setShowScrollButton] = useState(false);

    const scrollToBottom = () => {
        if (listRef.current) {
            listRef.current.scrollToOffset({ offset: 1000000, animated: true });
        }
    };

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        // Check if we are close to the bottom (within 50px)
        const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
        setShowScrollButton(!isCloseToBottom);
    };

    useEffect(() => {
        const showSubscription = Keyboard.addListener("keyboardDidShow", scrollToBottom);
        return () => {
            showSubscription.remove();
        };
    }, []);

    // Also auto-scroll slightly when streaming new chunks if already near bottom
    useEffect(() => {
        if (isStreaming) {
            scrollToBottom();
        }
    }, [streamingText, messages.length, isStreaming]);

    // Data consists of messages + the live streaming assistant message, if there's any running stream right now
    const data: ChatMessage[] = useMemo(() => {
        const items = [...messages];
        if (isStreaming && streamingText) {
            items.push({ id: "streaming-temp", role: "assistant", content: streamingText });
        }
        return items;
    }, [messages, isStreaming, streamingText]);

    return (
        <View className="flex-1">
            <FlatList
                ref={listRef}
                data={data}
                keyExtractor={item => item.id}
                contentContainerStyle={[
                    styles.contentContainerStyle,
                    { paddingBottom: Math.max(16, bottomInset + 16) },
                ]}
                indicatorStyle="white"
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onContentSizeChange={(_w, h) => {
                    contentHeight.current = h;
                    scrollToBottom();
                }}
                onLayout={(e) => {
                    listHeight.current = e.nativeEvent.layout.height;
                    scrollToBottom();
                }}
                renderItem={({ item }) => (
                    <View>
                        <Message
                            message={item}
                            isStreaming={isStreaming && item.id === "streaming-temp"}
                        />
                        {item.planPreviews && item.planPreviews.length > 0 && renderPlanPreview ? (
                            <View className="mb-6 px-4">
                                {item.planPreviews.map((preview: SyncPreview) => (
                                    <View key={`preview-${item.id}-${preview.id}`} className="mb-3">
                                        {renderPlanPreview(preview)}
                                    </View>
                                ))}
                            </View>
                        ) : null}
                    </View>
                )}
                ListEmptyComponent={emptyState}
                ListFooterComponent={
                    <View className="h-4">
                        {isStreaming && !streamingText && (
                            <Animated.View entering={FadeIn} exiting={FadeOut} className="px-4">
                                <TypingIndicator />
                            </Animated.View>
                        )}
                    </View>
                }
            />

            {showScrollButton && (
                <Animated.View
                    entering={FadeIn}
                    exiting={FadeOut}
                    className="absolute self-center"
                    style={{ bottom: Math.max(24, bottomInset + 12) }}
                >
                    <TouchableOpacity
                        onPress={scrollToBottom}
                        className="h-10 w-10 bg-background border border-border rounded-full items-center justify-center shadow-lg"
                        style={{ elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}
                    >
                        <ArrowDown size={18} className="text-foreground" />
                    </TouchableOpacity>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    contentContainerStyle: {
        paddingTop: 24,
    }
});

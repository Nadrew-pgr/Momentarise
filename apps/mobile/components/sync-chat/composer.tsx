import React, { useRef, useState } from "react";
import { View, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity, StyleSheet } from "react-native";
import { Square, ArrowUp } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

interface ComposerProps {
    value: string;
    onChange: (val: string) => void;
    onSend: () => void;
    onStop: () => void;
    isStreaming: boolean;
    placeholder?: string;
    disabled?: boolean;
}

export function Composer({
    value,
    onChange,
    onSend,
    onStop,
    isStreaming,
    placeholder = "Ask Sync...",
    disabled = false,
}: ComposerProps) {
    const insets = useSafeAreaInsets();
    const inputRef = useRef<TextInput>(null);
    const hasContent = value.trim().length > 0;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0} // Adjust based on header/tab spacing
            className="absolute bottom-0 left-0 right-0"
        >
            <Animated.View
                entering={FadeInDown.duration(400).springify()}
                exiting={FadeOutDown.duration(200)}
                className="px-4"
                style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            >
                <View
                    className="border-border bg-background/90 flex-row items-end rounded-3xl border p-2"
                    style={styles.shadow}
                >
                    <TextInput
                        ref={inputRef}
                        value={value}
                        onChangeText={onChange}
                        placeholder={placeholder}
                        placeholderTextColor="hsl(var(--muted-foreground))"
                        multiline
                        maxLength={2000}
                        className="text-foreground min-h-[44px] flex-1 px-4 py-3 text-[16px] leading-6"
                        style={{ maxHeight: 120 }}
                        editable={!disabled}
                    />

                    <View className="mb-1 ml-2 mr-1">
                        {isStreaming ? (
                            <TouchableOpacity
                                onPress={onStop}
                                className="bg-muted flex h-10 w-10 items-center justify-center rounded-full"
                                accessibilityRole="button"
                                accessibilityLabel="Stop generating"
                            >
                                <Square size={18} className="text-foreground" strokeWidth={2.5} />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onPress={() => {
                                    if (hasContent && !disabled) onSend();
                                }}
                                disabled={!hasContent || disabled}
                                className={`flex h-10 w-10 items-center justify-center rounded-full ${hasContent && !disabled ? "bg-primary" : "bg-muted"
                                    }`}
                                accessibilityRole="button"
                                accessibilityLabel="Send message"
                            >
                                <ArrowUp
                                    size={20}
                                    className={
                                        hasContent && !disabled
                                            ? "text-primary-foreground"
                                            : "text-muted-foreground"
                                    }
                                    strokeWidth={2.5}
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Animated.View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    shadow: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
});

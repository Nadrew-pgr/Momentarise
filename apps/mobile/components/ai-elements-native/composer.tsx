import React, { useRef } from "react";
import { View, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity, StyleSheet, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { ArrowUp, Square } from "lucide-react-native";

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
    placeholder = "Ask anything...",
    disabled = false,
}: ComposerProps) {
    const insets = useSafeAreaInsets();
    const inputRef = useRef<TextInput>(null);
    const hasContent = value.trim().length > 0;
    const [isKeyboardVisible, setKeyboardVisible] = React.useState(false);

    React.useEffect(() => {
        const kbShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => setKeyboardVisible(true)
        );
        const kbHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardVisible(false)
        );
        return () => {
            kbShow.remove();
            kbHide.remove();
        };
    }, []);

    // When keyboard is visible, we don't need the bottom safe area padding!
    const paddingBottom = isKeyboardVisible ? 16 : Math.max(insets.bottom, 16);

    return (
        <>
            <Animated.View
                entering={FadeInDown.duration(400).springify()}
                exiting={FadeOutDown.duration(200)}
                className="absolute bottom-0 left-0 right-0 px-4"
                style={{ paddingBottom }}
            >
                {/* Premium input wrapper */}
                <View
                    className="border-border bg-background/95 flex-row items-end rounded-[28px] border p-[10px]"
                    style={styles.shadow}
                >
                    <TextInput
                        ref={inputRef}
                        value={value}
                        onChangeText={onChange}
                        placeholder={placeholder}
                        placeholderTextColor="#888888"
                        multiline
                        maxLength={2000}
                        className="text-foreground min-h-[44px] flex-1 px-3 py-[10px] text-[16px] leading-[24px]"
                        style={{ maxHeight: 120 }}
                        editable={!disabled}
                    />

                    <View className="ml-2 mb-[4px]">
                        {isStreaming ? (
                            <TouchableOpacity
                                onPress={onStop}
                                className="bg-muted-foreground flex h-9 w-9 items-center justify-center rounded-full"
                                accessibilityRole="button"
                                accessibilityLabel="Stop generating"
                            >
                                <Square size={16} color="#FFFFFF" fill="currentColor" />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onPress={() => {
                                    if (hasContent && !disabled) onSend();
                                }}
                                disabled={!hasContent || disabled}
                                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${hasContent && !disabled ? "bg-primary" : "bg-muted"
                                    }`}
                                accessibilityRole="button"
                                accessibilityLabel="Send message"
                            >
                                <ArrowUp
                                    size={18}
                                    color={hasContent && !disabled ? "#FFFFFF" : "#888888"}
                                    strokeWidth={3}
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Animated.View>
        </>
    );
}

const styles = StyleSheet.create({
    shadow: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 8,
    },
});

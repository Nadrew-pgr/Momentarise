import React, { useRef } from "react";
import { View, TextInput, Text, KeyboardAvoidingView, Platform, TouchableOpacity, TouchableWithoutFeedback, StyleSheet, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut, FadeInDown, FadeOutDown, ZoomIn, ZoomOut } from "react-native-reanimated";
import { ArrowUp, Plus, X, Camera, FileText, Mic, Inbox, Square } from "lucide-react-native";
import { SpeechInput } from "./speech-input";

export type ComposerPlusActionKey = "photo" | "file" | "voice" | "inbox";

type ComposerPlusActionLabelMap = Partial<Record<ComposerPlusActionKey, string>>;

interface ComposerProps {
    value: string;
    onChange: (val: string) => void;
    onSelectionChange?: (selection: { start: number; end: number }) => void;
    onSend: () => void;
    onStop: () => void;
    isStreaming: boolean;
    placeholder?: string;
    disabled?: boolean;
    onAudioRecorded?: (uri: string) => Promise<string>;
    onPlusAction?: (key: ComposerPlusActionKey) => void;
    onHeightChange?: (height: number) => void;
    canSend?: boolean;
    addAttachmentLabel?: string;
    stopLabel?: string;
    sendLabel?: string;
    plusActionLabels?: ComposerPlusActionLabelMap;
}

export function Composer({
    value,
    onChange,
    onSelectionChange,
    onSend,
    onStop,
    isStreaming,
    placeholder = "Ask anything...",
    disabled = false,
    onAudioRecorded,
    onPlusAction,
    onHeightChange,
    canSend = true,
    addAttachmentLabel = "Add attachment",
    stopLabel = "Stop generating",
    sendLabel = "Send message",
    plusActionLabels = {},
}: ComposerProps) {
    const insets = useSafeAreaInsets();
    const inputRef = useRef<TextInput>(null);
    const hasContent = value.trim().length > 0;
    const [isKeyboardVisible, setKeyboardVisible] = React.useState(false);
    const [isPlusMenuOpen, setIsPlusMenuOpen] = React.useState(false);

    const PLUS_MENU_ITEMS: { icon: typeof Camera; label: string; key: ComposerPlusActionKey }[] = [
        { icon: Camera, label: plusActionLabels.photo ?? "Photo", key: "photo" },
        { icon: FileText, label: plusActionLabels.file ?? "File", key: "file" },
        { icon: Mic, label: plusActionLabels.voice ?? "Voice", key: "voice" },
        { icon: Inbox, label: plusActionLabels.inbox ?? "Inbox", key: "inbox" },
    ];

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
                onLayout={(event) => {
                    onHeightChange?.(event.nativeEvent.layout.height);
                }}
            >
                {/* Plus Menu Popup */}
                {isPlusMenuOpen && (
                    <Animated.View
                        entering={FadeInDown.duration(200)}
                        exiting={FadeOutDown.duration(150)}
                        className="mb-3 w-48 rounded-2xl border border-border bg-background/95 overflow-hidden"
                        style={styles.shadow}
                    >
                        {PLUS_MENU_ITEMS.map((item, i) => (
                            <TouchableOpacity
                                key={item.key}
                                onPress={() => {
                                    setIsPlusMenuOpen(false);
                                    onPlusAction?.(item.key);
                                }}
                                className={`flex-row items-center px-4 py-3 ${i < PLUS_MENU_ITEMS.length - 1 ? 'border-b border-border/30' : ''}`}
                                activeOpacity={0.6}
                            >
                                <View className="w-8 h-8 rounded-full bg-muted/60 items-center justify-center mr-3">
                                    <item.icon size={16} className="text-foreground" strokeWidth={2} />
                                </View>
                                <Text className="text-foreground text-[15px] font-medium">{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </Animated.View>
                )}

                {/* Premium input wrapper */}
                <View
                    className="border-border bg-background/95 flex-row items-end rounded-[28px] border p-[10px]"
                    style={styles.shadow}
                >
                    {/* Plus Button */}
                    <View className="mr-2 mb-[4px]">
                        <TouchableOpacity
                            onPress={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                            className={`flex h-9 w-9 items-center justify-center rounded-full ${isPlusMenuOpen ? 'bg-primary' : 'bg-muted'}`}
                            accessibilityRole="button"
                            accessibilityLabel={addAttachmentLabel}
                        >
                            {isPlusMenuOpen ? (
                                <Animated.View entering={ZoomIn.duration(150)} exiting={ZoomOut.duration(100)}>
                                    <X size={18} color="#FFFFFF" strokeWidth={2.5} />
                                </Animated.View>
                            ) : (
                                <Animated.View entering={ZoomIn.duration(150)} exiting={ZoomOut.duration(100)}>
                                    <Plus size={20} className="text-muted-foreground" strokeWidth={2.5} />
                                </Animated.View>
                            )}
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        ref={inputRef}
                        value={value}
                        onChangeText={onChange}
                        onSelectionChange={(event) => {
                            onSelectionChange?.(event.nativeEvent.selection);
                        }}
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
                                accessibilityLabel={stopLabel}
                            >
                                <Square size={16} color="#FFFFFF" fill="currentColor" />
                            </TouchableOpacity>
                        ) : hasContent ? (
                            <Animated.View entering={ZoomIn} exiting={ZoomOut}>
                                <TouchableOpacity
                                    onPress={() => {
                                        if (hasContent && !disabled && canSend) onSend();
                                    }}
                                    disabled={disabled || !canSend}
                                    className="flex h-9 w-9 items-center justify-center rounded-full transition-colors bg-primary"
                                    accessibilityRole="button"
                                    accessibilityLabel={sendLabel}
                                    style={{ opacity: canSend ? 1 : 0.45 }}
                                >
                                    <ArrowUp
                                        size={18}
                                        color="#FFFFFF"
                                        strokeWidth={3}
                                    />
                                </TouchableOpacity>
                            </Animated.View>
                        ) : (
                            <Animated.View entering={ZoomIn} exiting={ZoomOut}>
                                <SpeechInput
                                    onAudioRecorded={onAudioRecorded}
                                    onTranscriptionChange={(text) => {
                                        // Append or replace the text in the composer
                                        const newText = value ? `${value} ${text}` : text;
                                        onChange(newText);
                                    }}
                                    disabled={disabled}
                                />
                            </Animated.View>
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

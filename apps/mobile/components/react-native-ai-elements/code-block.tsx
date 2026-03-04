import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Copy, Check } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

export interface CodeBlockProps {
    code: string;
    language?: string;
    filename?: string;
}

export function CodeBlock({ code, language = 'text', filename }: CodeBlockProps) {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
        await Clipboard.setStringAsync(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const displayTitle = filename || language;

    return (
        <Animated.View entering={FadeIn} className="my-3 rounded-xl overflow-hidden border border-border/20 bg-zinc-950">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-2 bg-zinc-900 border-b border-white/10">
                <Text className="text-xs font-mono text-zinc-400 capitalize">
                    {displayTitle}
                </Text>
                <TouchableOpacity
                    onPress={handleCopy}
                    className="flex-row items-center py-1 px-2 -mr-2 rounded-md active:bg-white/10"
                >
                    {copied ? (
                        <>
                            <Check size={14} className="text-green-400 mr-1.5" />
                            <Text className="text-xs text-green-400 font-medium">Copied!</Text>
                        </>
                    ) : (
                        <>
                            <Copy size={14} className="text-zinc-400 mr-1.5" />
                            <Text className="text-xs text-zinc-400 font-medium">Copy code</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Code Content */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="px-4 py-3">
                    <Text className="font-mono text-[13px] leading-[20px] text-zinc-300">
                        {code}
                    </Text>
                </View>
            </ScrollView>
        </Animated.View>
    );
}

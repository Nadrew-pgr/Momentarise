import React, { Fragment } from 'react';
import { Text, View, Linking, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface MarkdownRendererProps {
    content: string;
    isStreaming?: boolean;
}

function AnimatedWord({ word, index }: { word: string; index: number }) {
    return (
        <Animated.Text
            entering={FadeIn.duration(250).delay(index * 20)}
            style={styles.text} // In NativeWind v4, styling inline text is best, but we'll adapt className for color
            className="text-foreground text-[16px] leading-[24px]"
        >
            {word}
        </Animated.Text>
    );
}

function renderWords(text: string, keyPrefix: string, animated: boolean): React.ReactNode[] {
    const tokens = text.split(/(\s+)/);
    return tokens.map((token, idx) => {
        if (!token) return null;
        if (/\s+/.test(token)) {
            // Whitespace is just plain text
            return <Text key={`${keyPrefix}-ws-${idx}`}>{token}</Text>;
        }
        if (!animated) {
            return <Text key={`${keyPrefix}-tx-${idx}`} className="text-foreground text-[16px] leading-[24px]" style={styles.text}>{token}</Text>;
        }
        return <AnimatedWord key={`${keyPrefix}-an-${idx}`} word={token} index={idx} />;
    });
}

function renderInline(text: string, animated: boolean, keyPrefix: string): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    let remaining = text;
    let part = 0;

    while (remaining.length > 0) {
        // Code
        const codeMatch = remaining.match(/^`([^`]+)`/);
        if (codeMatch) {
            nodes.push(
                <Text key={`${keyPrefix}-code-${part++}`} style={styles.inlineCode}>
                    {codeMatch[1]}
                </Text>
            );
            remaining = remaining.slice(codeMatch[0].length);
            continue;
        }

        // Bold
        const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
        if (boldMatch) {
            nodes.push(
                <Text key={`${keyPrefix}-bold-${part++}`} style={styles.bold}>
                    {renderWords(boldMatch[1], `${keyPrefix}-boldw-${part}`, animated)}
                </Text>
            );
            remaining = remaining.slice(boldMatch[0].length);
            continue;
        }

        // Italic
        const italicMatch = remaining.match(/^\*([^*]+)\*/);
        if (italicMatch) {
            nodes.push(
                <Text key={`${keyPrefix}-italic-${part++}`} style={styles.italic}>
                    {renderWords(italicMatch[1], `${keyPrefix}-itw-${part}`, animated)}
                </Text>
            );
            remaining = remaining.slice(italicMatch[0].length);
            continue;
        }

        // Link
        const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)\s]+)\)/);
        if (linkMatch) {
            const url = linkMatch[2];
            nodes.push(
                <Text
                    key={`${keyPrefix}-link-${part++}`}
                    style={styles.link}
                    onPress={() => Linking.openURL(url)}
                >
                    {linkMatch[1]}
                </Text>
            );
            remaining = remaining.slice(linkMatch[0].length);
            continue;
        }

        // Plain text sequence up to next special char
        const nextSpecial = remaining.search(/[`*\[]/);
        if (nextSpecial === -1) {
            nodes.push(...renderWords(remaining, `${keyPrefix}-txt-${part++}`, animated));
            break;
        }

        if (nextSpecial === 0) {
            // Escaped or literal special character not matching patterns
            nodes.push(<Text key={`${keyPrefix}-lit-${part++}`} style={styles.text}>{remaining[0]}</Text>);
            remaining = remaining.slice(1);
            continue;
        }

        const plain = remaining.slice(0, nextSpecial);
        nodes.push(...renderWords(plain, `${keyPrefix}-pl-${part++}`, animated));
        remaining = remaining.slice(nextSpecial);
    }

    return nodes;
}

function renderCodeBlock(block: string, key: string): React.ReactNode {
    const raw = block.slice(3, -3);
    const firstLineBreak = raw.indexOf("\n");
    const language = firstLineBreak > 0 ? raw.slice(0, firstLineBreak).trim() : "";
    const code = firstLineBreak > 0 ? raw.slice(firstLineBreak + 1) : raw;

    return (
        <View key={key} className="my-2 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            {language ? (
                <View className="bg-zinc-800/50 px-3 py-1.5 border-b border-zinc-800">
                    <Text className="text-zinc-400 text-[11px] font-mono">{language}</Text>
                </View>
            ) : null}
            <View className="p-3">
                <Text className="text-zinc-100 font-mono text-[13px] leading-[20px]">{code}</Text>
            </View>
        </View>
    );
}

export function MarkdownRenderer({ content, isStreaming = false }: MarkdownRendererProps) {
    if (!content) return null;

    // Split by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
        <View className="flex-col w-full">
            {parts.map((part, idx) => {
                const key = `part-${idx}`;
                if (part.startsWith("```") && part.endsWith("```")) {
                    return renderCodeBlock(part, key);
                }
                if (!part) return null;

                // For regular text blocks, wrap in a Text so inline spans flow correctly natively
                return (
                    <Text key={key} className="mb-2 w-full">
                        {renderInline(part, isStreaming, key)}
                    </Text>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    text: {
        fontSize: 16,
        lineHeight: 24,
    },
    bold: {
        fontWeight: '600',
    },
    italic: {
        fontStyle: 'italic',
    },
    inlineCode: {
        fontFamily: 'Courier',
        backgroundColor: '#e4e4e7', // zinc-200
        fontSize: 14,
        overflow: 'hidden',
    },
    link: {
        textDecorationLine: 'underline',
    },
});
